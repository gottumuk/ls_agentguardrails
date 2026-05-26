"""
Guardrails Data Protection Lambda Function

This Lambda function queries DynamoDB for sensitive records and applies
Amazon Bedrock Guardrails to intercept and sanitize PII/PHI/PCI data.

Requirements: 3.1, 3.2, 3.4, 3.5
"""

import json
import os
import uuid
from datetime import datetime
from typing import Dict, Any, List
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError


# Initialize AWS clients
bedrock_runtime = boto3.client('bedrock-runtime')
dynamodb = boto3.resource('dynamodb')

# Environment variables
AUDIT_TRAIL_TABLE = os.environ.get('AUDIT_TRAIL_TABLE', 'AuditTrailTable')
SENSITIVE_RECORDS_TABLE = os.environ.get('SENSITIVE_RECORDS_TABLE', 'SensitiveRecordsTable')

# Guardrail IDs from environment variables (set by CloudFormation)
BANKING_GUARDRAIL_ID = os.environ.get('BANKING_GUARDRAIL_ID')
HEALTHCARE_GUARDRAIL_ID = os.environ.get('HEALTHCARE_GUARDRAIL_ID')
RETAIL_GUARDRAIL_ID = os.environ.get('RETAIL_GUARDRAIL_ID')
HR_GUARDRAIL_ID = os.environ.get('HR_GUARDRAIL_ID')

# Industry-specific Guardrails policy IDs
GUARDRAILS_POLICIES = {
    'Banking': {
        'policy_id': BANKING_GUARDRAIL_ID,
        'version': 'DRAFT'
    },
    'Healthcare': {
        'policy_id': HEALTHCARE_GUARDRAIL_ID,
        'version': 'DRAFT'
    },
    'Retail': {
        'policy_id': RETAIL_GUARDRAIL_ID,
        'version': 'DRAFT'
    },
    'HROperations': {
        'policy_id': HR_GUARDRAIL_ID,
        'version': 'DRAFT'
    }
}


def query_dynamodb_record(record_id: str) -> Dict[str, Any]:
    """
    Query DynamoDB for a sensitive record by record_id.
    
    Requirements: 3.1
    """
    table = dynamodb.Table(SENSITIVE_RECORDS_TABLE)
    
    response = table.get_item(Key={'record_id': record_id})
    
    if 'Item' not in response:
        raise ValueError(f"Record not found: {record_id}")
    
    return response['Item']


def apply_guardrails(record: Dict[str, Any], industry_context: str) -> Dict[str, Any]:
    """
    Apply Bedrock Guardrails to sanitize sensitive data.
    
    Requirements: 3.2
    """
    # Get the appropriate Guardrails policy for the industry
    policy_config = GUARDRAILS_POLICIES.get(industry_context)
    if not policy_config:
        raise ValueError(f"No Guardrails policy configured for industry: {industry_context}")
    
    # Convert Decimals before JSON serialization
    record_converted = convert_decimals(record)
    
    # Convert record to text format for Guardrails processing
    record_text = json.dumps(record_converted, indent=2)
    
    # Apply Bedrock Guardrails - NO FALLBACK
    # If the policy doesn't exist, this will raise an exception
    response = bedrock_runtime.apply_guardrail(
        guardrailIdentifier=policy_config['policy_id'],
        guardrailVersion=policy_config['version'],
        source='INPUT',
        content=[
            {
                'text': {
                    'text': record_text
                }
            }
        ]
    )
    
    # Check if Guardrails intervened (blocked or anonymized content)
    action = response.get('action', 'NONE')
    
    if action == 'GUARDRAIL_INTERVENED':
        # Guardrails blocked or anonymized content
        # Extract which fields were detected and redact them
        sanitized_record = record_converted.copy()
        
        assessments = response.get('assessments', [])
        if assessments:
            sensitive_info = assessments[0].get('sensitiveInformationPolicy', {})
            
            # Get all detected PII entities and regexes
            detected_fields = set()
            for pii in sensitive_info.get('piiEntities', []):
                if pii.get('detected'):
                    detected_fields.add(pii.get('match', ''))
            
            for regex in sensitive_info.get('regexes', []):
                if regex.get('detected'):
                    detected_fields.add(regex.get('match', ''))
            
            # Redact detected values in the record
            for key, value in sanitized_record.items():
                if isinstance(value, str) and value in detected_fields:
                    sanitized_record[key] = '[REDACTED]'
        
        return sanitized_record
    else:
        # No intervention - return as-is
        outputs = response.get('outputs', [])
        if outputs:
            sanitized_text = outputs[0].get('text', record_text)
        else:
            sanitized_text = record_text
        
        try:
            sanitized_record = json.loads(sanitized_text)
        except json.JSONDecodeError:
            sanitized_record = record_converted.copy()
        
        return sanitized_record


def convert_decimals(obj: Any) -> Any:
    """
    Recursively convert Decimal objects to float for JSON serialization.
    DynamoDB returns numeric values as Decimal objects which are not JSON serializable.
    """
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    return obj


def identify_redacted_fields(raw_record: Dict[str, Any], sanitized_record: Dict[str, Any]) -> List[str]:
    """
    Compare raw and sanitized records to identify which fields were redacted.
    
    Requirements: 3.4
    """
    redacted_fields = []
    
    for key, raw_value in raw_record.items():
        sanitized_value = sanitized_record.get(key)
        
        # Check if value was redacted or changed
        if sanitized_value != raw_value:
            # Handle different types of redaction
            if sanitized_value == '[REDACTED]' or sanitized_value is None:
                redacted_fields.append(key)
            elif isinstance(raw_value, str) and isinstance(sanitized_value, str):
                # Check if content was modified (partial redaction)
                if '[REDACTED]' in sanitized_value or len(sanitized_value) < len(raw_value):
                    redacted_fields.append(key)
    
    return redacted_fields


def write_audit_trail(query_result: Dict[str, Any]) -> None:
    """
    Write query result to DynamoDB audit trail.
    
    Requirements: 3.5
    """
    table = dynamodb.Table(AUDIT_TRAIL_TABLE)
    
    # Don't convert Decimals when writing to DynamoDB - it expects Decimals
    audit_entry = {
        'event_id': query_result['query_id'],
        'timestamp': query_result['timestamp'],
        'event_type': 'GUARDRAILS_QUERY',
        'demo_id': 2,
        'industry_context': query_result['industry_context'],
        'event_data': query_result
    }
    
    table.put_item(Item=audit_entry)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for Guardrails query requests.
    
    Expected event format:
    {
        "record_id": "BANK-001",
        "industry_context": "Banking"
    }
    
    Requirements: 3.1, 3.2, 3.4, 3.5
    """
    overall_start_time = datetime.now()
    
    try:
        # Parse API Gateway proxy integration event
        if 'body' in event and isinstance(event['body'], str):
            body = json.loads(event['body'])
        else:
            body = event
        
        # Extract and validate input
        record_id = body.get('record_id', '')
        industry_context = body.get('industry_context', 'Banking')
        
        if not record_id:
            return {
                'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                    'error': True,
                    'message': 'record_id is required'
                })
            }
        
        # Validate industry context
        if industry_context not in GUARDRAILS_POLICIES:
            return {
                'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                    'error': True,
                    'message': f'Invalid industry context: {industry_context}'
                })
            }
        
        # Query DynamoDB for the record
        dynamodb_start_time = datetime.now()
        raw_record = query_dynamodb_record(record_id)
        dynamodb_end_time = datetime.now()
        dynamodb_latency_ms = int((dynamodb_end_time - dynamodb_start_time).total_seconds() * 1000)
        
        # Apply Guardrails to sanitize the record
        guardrails_start_time = datetime.now()
        sanitized_record = apply_guardrails(raw_record, industry_context)
        guardrails_end_time = datetime.now()
        guardrails_latency_ms = int((guardrails_end_time - guardrails_start_time).total_seconds() * 1000)
        
        # Identify which fields were redacted
        fields_redacted = identify_redacted_fields(raw_record, sanitized_record)
        
        # Calculate total latency
        overall_end_time = datetime.now()
        total_latency_ms = int((overall_end_time - overall_start_time).total_seconds() * 1000)
        
        # Get Guardrails policy ID
        policy_config = GUARDRAILS_POLICIES[industry_context]
        
        # Build result (keep Decimals for DynamoDB)
        from decimal import Decimal as D
        
        # Convert sanitized_record back to Decimals for DynamoDB
        def floats_to_decimals(obj):
            if isinstance(obj, float):
                return D(str(obj))
            elif isinstance(obj, dict):
                return {k: floats_to_decimals(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [floats_to_decimals(item) for item in obj]
            return obj
        
        sanitized_record_with_decimals = floats_to_decimals(sanitized_record)
        
        result = {
            'query_id': str(uuid.uuid4()),
            'timestamp': int(datetime.now().timestamp()),
            'record_id': record_id,
            'industry_context': industry_context,
            'raw_record': raw_record,
            'sanitized_record': sanitized_record_with_decimals,
            'fields_redacted': fields_redacted,
            'guardrails_policy_id': policy_config['policy_id'],
            'latency': {
                'dynamodb_ms': D(str(dynamodb_latency_ms)),
                'guardrails_ms': D(str(guardrails_latency_ms)),
                'total_ms': D(str(total_latency_ms))
            }
        }
        
        # Write to audit trail (with Decimals)
        write_audit_trail(result)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps(convert_decimals(result))
        }
        
    except ValueError as e:
        # Record not found or validation error
        print(f"Validation Error: {str(e)}")
        
        return {
            'statusCode': 404,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'error': True,
                'message': str(e)
            })
        }
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        # Log error
        print(f"AWS Service Error: {error_code} - {error_message}")
        
        # Determine which service failed
        service = 'DynamoDB' if 'dynamodb' in str(e).lower() else 'Bedrock'
        
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'error': True,
                'service': service,
                'message': f'AWS service error: {error_message}'
            })
        }
        
    except Exception as e:
        # Unexpected error
        import traceback
        print(f"Unexpected Error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'error': True,
                'message': 'Internal server error'
            })
        }


"""
Audit Trail Lambda Function

This Lambda function provides universal audit logging for all demos.
Supports writing audit trail entries and querying with chronological ordering.

Requirements: 10.1, 10.2, 10.3, 10.4, 10.6, 10.7
"""

import json
import os
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError


# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')

# Environment variables
AUDIT_TRAIL_TABLE = os.environ.get('AUDIT_TRAIL_TABLE', 'AuditTrailTable')

# Supported event types
SUPPORTED_EVENT_TYPES = {
    'TACT_EVALUATION',
    'GUARDRAILS_QUERY',
    'TRUST_SCORE_CALCULATED',
    'APPROVAL_REQUESTED',
    'APPROVAL_DECISION',
    'WORKFLOW_TIMEOUT',
    'DEMO_RESET'
}


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal types from DynamoDB."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def validate_event_type(event_type: str) -> bool:
    """
    Validate that the event type is supported.
    
    Requirements: 10.1, 10.2, 10.3, 10.4
    """
    return event_type in SUPPORTED_EVENT_TYPES


def write_audit_entry(
    event_type: str,
    event_data: Dict[str, Any],
    demo_id: Optional[int] = None,
    industry_context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Write an audit trail entry to DynamoDB.
    Ensures atomic and idempotent writes.
    
    Requirements: 10.1, 10.2, 10.3, 10.4, 10.6
    
    Args:
        event_type: Type of event (must be in SUPPORTED_EVENT_TYPES)
        event_data: Event-specific data to store
        demo_id: Optional demo identifier (1-4)
        industry_context: Optional industry context
        
    Returns:
        Dict containing event_id and timestamp
    """
    # Validate event type
    if not validate_event_type(event_type):
        raise ValueError(f"Unsupported event type: {event_type}. Must be one of {SUPPORTED_EVENT_TYPES}")
    
    # Generate event ID (idempotency key can be provided in event_data)
    event_id = event_data.get('event_id') or str(uuid.uuid4())
    
    # Get current timestamp
    timestamp = int(datetime.utcnow().timestamp())
    
    # Build audit entry
    audit_entry = {
        'event_id': event_id,
        'timestamp': timestamp,
        'event_type': event_type,
        'event_data': event_data,
        'created_at': datetime.utcnow().isoformat()
    }
    
    # Add optional fields
    if demo_id is not None:
        audit_entry['demo_id'] = demo_id
    
    if industry_context:
        audit_entry['industry_context'] = industry_context
    
    # Write to DynamoDB with conditional check for idempotency
    table = dynamodb.Table(AUDIT_TRAIL_TABLE)
    
    try:
        # Use condition expression to prevent duplicate writes
        table.put_item(
            Item=audit_entry,
            ConditionExpression='attribute_not_exists(event_id)'
        )
        
        return {
            'event_id': event_id,
            'timestamp': timestamp,
            'success': True
        }
        
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            # Entry already exists - this is expected for idempotent writes
            return {
                'event_id': event_id,
                'timestamp': timestamp,
                'success': True,
                'duplicate': True
            }
        else:
            raise


def query_audit_trail(
    limit: int = 100,
    demo_id: Optional[int] = None,
    event_type: Optional[str] = None,
    start_time: Optional[int] = None,
    end_time: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Query audit trail with chronological ordering.
    
    Requirements: 10.7
    
    Args:
        limit: Maximum number of records to return
        demo_id: Filter by demo ID
        event_type: Filter by event type
        start_time: Filter by start timestamp (Unix timestamp)
        end_time: Filter by end timestamp (Unix timestamp)
        
    Returns:
        List of audit entries in chronological order (oldest first)
    """
    table = dynamodb.Table(AUDIT_TRAIL_TABLE)
    
    # Build scan parameters
    scan_params = {
        'Limit': limit
    }
    
    # Build filter expression
    filter_expressions = []
    expression_attribute_values = {}
    expression_attribute_names = {}
    
    if demo_id is not None:
        filter_expressions.append('#demo_id = :demo_id')
        expression_attribute_values[':demo_id'] = demo_id
        expression_attribute_names['#demo_id'] = 'demo_id'
    
    if event_type:
        filter_expressions.append('#event_type = :event_type')
        expression_attribute_values[':event_type'] = event_type
        expression_attribute_names['#event_type'] = 'event_type'
    
    if start_time is not None:
        filter_expressions.append('#timestamp >= :start_time')
        expression_attribute_values[':start_time'] = start_time
        expression_attribute_names['#timestamp'] = 'timestamp'
    
    if end_time is not None:
        filter_expressions.append('#timestamp <= :end_time')
        expression_attribute_values[':end_time'] = end_time
        expression_attribute_names['#timestamp'] = 'timestamp'
    
    if filter_expressions:
        scan_params['FilterExpression'] = ' AND '.join(filter_expressions)
        scan_params['ExpressionAttributeValues'] = expression_attribute_values
        scan_params['ExpressionAttributeNames'] = expression_attribute_names
    
    # Execute scan
    response = table.scan(**scan_params)
    items = response.get('Items', [])
    
    # Sort by timestamp (chronological order)
    items.sort(key=lambda x: x['timestamp'])
    
    return items


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for audit trail operations.
    
    Supports two operations:
    1. write: Write a new audit trail entry
    2. query: Query audit trail with filters
    
    Expected event format for write:
    {
        "operation": "write",
        "event_type": "TACT_EVALUATION",
        "event_data": {...},
        "demo_id": 1,
        "industry_context": "Banking"
    }
    
    Expected event format for query:
    {
        "operation": "query",
        "limit": 100,
        "demo_id": 1,
        "event_type": "TACT_EVALUATION",
        "start_time": 1704067200,
        "end_time": 1704153600
    }
    
    Requirements: 10.1, 10.2, 10.3, 10.4, 10.6, 10.7
    """
    try:
        # Parse request body if from API Gateway
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event
        
        operation = body.get('operation', 'write')
        
        if operation == 'write':
            # Write audit trail entry
            event_type = body.get('event_type')
            event_data = body.get('event_data', {})
            demo_id = body.get('demo_id')
            industry_context = body.get('industry_context')
            
            if not event_type:
                return error_response(400, 'Missing required field: event_type')
            
            result = write_audit_entry(
                event_type=event_type,
                event_data=event_data,
                demo_id=demo_id,
                industry_context=industry_context
            )
            
            return success_response(result)
        
        elif operation == 'query':
            # Query audit trail
            limit = body.get('limit', 100)
            demo_id = body.get('demo_id')
            event_type = body.get('event_type')
            start_time = body.get('start_time')
            end_time = body.get('end_time')
            
            items = query_audit_trail(
                limit=limit,
                demo_id=demo_id,
                event_type=event_type,
                start_time=start_time,
                end_time=end_time
            )
            
            return success_response({
                'count': len(items),
                'items': items
            })
        
        else:
            return error_response(400, f'Unsupported operation: {operation}')
    
    except ValueError as e:
        # Validation error
        return error_response(400, str(e))
    
    except ClientError as e:
        # AWS service error
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        print(f"AWS Service Error: {error_code} - {error_message}")
        
        return error_response(500, f'DynamoDB error: {error_message}')
    
    except Exception as e:
        # Unexpected error
        print(f"Unexpected Error: {str(e)}")
        
        return error_response(500, 'Internal server error')


def success_response(data: Dict[str, Any], status_code: int = 200) -> Dict[str, Any]:
    """Format successful API response."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data, cls=DecimalEncoder)
    }


def error_response(status_code: int, message: str) -> Dict[str, Any]:
    """Format error API response."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'error': True,
            'message': message
        })
    }

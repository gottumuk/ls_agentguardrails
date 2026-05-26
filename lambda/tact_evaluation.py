"""
TACT Decision Engine Lambda Function

This Lambda function evaluates agent action proposals using the TACT framework
(Traceability, Accountability, Consequence, Trust Boundary) via Amazon Bedrock.

Requirements: 1.1, 1.2, 1.4, 1.6, 2.1, 2.3, 6.4
"""

import json
import os
import re
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError


# Initialize AWS clients with explicit region
import boto3
session = boto3.Session()
bedrock_runtime = session.client('bedrock-runtime')
dynamodb = session.resource('dynamodb')

# Environment variables
AUDIT_TRAIL_TABLE = os.environ.get('AUDIT_TRAIL_TABLE', 'AuditTrailTable')
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20241022-v2:0')

# Trust Spectrum mapping thresholds
TRUST_SPECTRUM_MAPPING = {
    (1.0, 1.5): 'BLOCKED',
    (1.6, 2.5): 'RESTRICTED',
    (2.6, 3.5): 'SUPERVISED',
    (3.6, 4.5): 'VERIFIED',
    (4.6, 5.0): 'TRUSTED'
}

# Industry-specific context for prompt framing
INDUSTRY_CONTEXTS = {
    'Banking': {
        'regulations': 'FINRA, OCC, and anti-money laundering regulations',
        'focus': 'regulatory compliance and financial impact'
    },
    'Healthcare': {
        'regulations': 'HIPAA, patient safety protocols, and clinical guidelines',
        'focus': 'patient safety and clinical protocols'
    },
    'Retail': {
        'regulations': 'PCI-DSS and consumer protection laws',
        'focus': 'fraud prevention and customer impact'
    },
    'HROperations': {
        'regulations': 'EEOC, labor law, and employment regulations',
        'focus': 'legal compliance and employee rights'
    }
}


def sanitize_custom_input(input_text: str) -> str:
    """
    Sanitize custom input by removing special characters and limiting length.
    
    Requirements: 1.4, 6.4
    """
    if not input_text:
        return ""
    
    # Remove potentially malicious characters
    sanitized = re.sub(r'[<>{}\\]', '', input_text)
    
    # Limit to 500 characters
    sanitized = sanitized[:500]
    
    return sanitized.strip()


def build_tact_prompt(action_proposal: str, industry_context: str) -> str:
    """
    Build the TACT evaluation prompt with industry-specific framing.
    
    Requirements: 1.1, 2.1, 2.3
    """
    industry_config = INDUSTRY_CONTEXTS.get(industry_context, INDUSTRY_CONTEXTS['Banking'])
    
    prompt = f"""You are an AI agent governance classifier. Evaluate the following action proposal across four dimensions.

Industry Context: {industry_context}
You are evaluating actions in the {industry_context} industry. Consider {industry_config['regulations']} when assessing risk. Focus on {industry_config['focus']}.

Action Proposal: {action_proposal}

Evaluate each dimension on a scale of 1-5:

1. TRACEABILITY: Can we track who initiated this action and reconstruct the decision chain?
   - 1: No audit trail, anonymous action
   - 3: Partial logging, some gaps
   - 5: Complete audit trail with timestamps and actor identity

2. ACCOUNTABILITY: Is there a clear owner responsible for this action's outcome?
   - 1: No owner, diffuse responsibility
   - 3: Shared responsibility across multiple parties
   - 5: Single accountable party with authority to act

3. CONSEQUENCE: What is the potential impact if this action goes wrong?
   - 1: Catastrophic (regulatory violation, major financial loss, safety risk)
   - 3: Moderate (customer complaint, minor financial impact)
   - 5: Minimal (easily reversible, low impact)

4. TRUST BOUNDARY: Does this action cross organizational or regulatory boundaries?
   - 1: Crosses external boundaries (regulatory, inter-org)
   - 3: Crosses internal boundaries (department, team)
   - 5: Within single team/system boundary

Provide your evaluation in JSON format:
{{
  "traceability": <score>,
  "accountability": <score>,
  "consequence": <score>,
  "trust_boundary": <score>,
  "reasoning": "<brief explanation>"
}}"""
    
    return prompt


def invoke_bedrock(prompt: str) -> Dict[str, Any]:
    """
    Invoke Bedrock API to evaluate the action proposal.
    
    Requirements: 1.1, 1.6
    """
    # Nova uses different API format than Claude
    if 'nova' in BEDROCK_MODEL_ID.lower():
        request_body = {
            "messages": [
                {
                    "role": "user",
                    "content": [{"text": prompt}]
                }
            ],
            "inferenceConfig": {
                "temperature": 0.0,
                "max_new_tokens": 1000
            }
        }
    else:
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "temperature": 0.0,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }
    
    response = bedrock_runtime.invoke_model(
        modelId=BEDROCK_MODEL_ID,
        body=json.dumps(request_body)
    )
    
    response_body = json.loads(response['body'].read())
    return response_body


def parse_bedrock_response(response: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse Bedrock response and extract dimension scores.
    
    Requirements: 1.1, 1.2
    """
    # Extract the content from the response (different format for Nova vs Claude)
    if 'output' in response:
        # Nova format
        text_content = response['output']['message']['content'][0]['text']
    else:
        # Claude format
        content = response.get('content', [])
        if not content:
            raise ValueError("Empty response from Bedrock")
        text_content = content[0].get('text', '')
    
    # Extract JSON from the response (it might be wrapped in markdown code blocks)
    json_match = re.search(r'\{[^}]+\}', text_content, re.DOTALL)
    if not json_match:
        raise ValueError(f"Could not extract JSON from response: {text_content}")
    
    evaluation = json.loads(json_match.group(0))
    
    # Validate that all required dimensions are present
    required_dimensions = ['traceability', 'accountability', 'consequence', 'trust_boundary']
    for dimension in required_dimensions:
        if dimension not in evaluation:
            raise ValueError(f"Missing dimension: {dimension}")
        
        score = evaluation[dimension]
        if not isinstance(score, (int, float)) or score < 1 or score > 5:
            raise ValueError(f"Invalid score for {dimension}: {score}")
    
    return evaluation


def calculate_trust_spectrum(dimensions: Dict[str, float]) -> str:
    """
    Calculate Trust Spectrum level from dimension scores.
    
    Requirements: 1.2
    """
    # Calculate average score
    scores = [
        dimensions['traceability'],
        dimensions['accountability'],
        dimensions['consequence'],
        dimensions['trust_boundary']
    ]
    average_score = sum(scores) / len(scores)
    
    # Map to Trust Spectrum level
    for (min_score, max_score), level in TRUST_SPECTRUM_MAPPING.items():
        if min_score <= average_score <= max_score:
            return level
    
    # Default to BLOCKED if outside range
    return 'BLOCKED'



def write_audit_trail(evaluation_result: Dict[str, Any]) -> None:
    """
    Write evaluation result to DynamoDB audit trail.
    
    Requirements: 1.6
    """
    table = dynamodb.Table(AUDIT_TRAIL_TABLE)
    
    # Convert floats to Decimal for DynamoDB
    def convert_floats(obj):
        if isinstance(obj, float):
            return Decimal(str(obj))
        elif isinstance(obj, dict):
            return {k: convert_floats(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_floats(item) for item in obj]
        return obj
    
    audit_entry = {
        'event_id': evaluation_result['evaluation_id'],
        'timestamp': evaluation_result['timestamp'],
        'event_type': 'TACT_EVALUATION',
        'demo_id': 1,
        'industry_context': evaluation_result['industry_context'],
        'event_data': convert_floats(evaluation_result)
    }
    
    table.put_item(Item=audit_entry)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for TACT evaluation requests.
    
    Expected event format:
    {
        "action_proposal": "Transfer $47,000 between accounts",
        "industry_context": "Banking",
        "is_custom_input": false
    }
    
    Requirements: 1.1, 1.2, 1.4, 1.6, 2.1, 2.3, 6.4
    """
    start_time = datetime.now()
    
    try:
        # Parse API Gateway proxy integration event
        if 'body' in event and isinstance(event['body'], str):
            body = json.loads(event['body'])
        else:
            body = event
        
        # Extract and validate input
        action_proposal = body.get('action_proposal', '')
        industry_context = body.get('industry_context', 'Banking')
        is_custom_input = body.get('is_custom_input', False)
        
        # Validate industry context
        if industry_context not in INDUSTRY_CONTEXTS:
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
        
        # Sanitize custom input if needed
        if is_custom_input:
            action_proposal = sanitize_custom_input(action_proposal)
            
            # Validate input is not empty after sanitization
            if not action_proposal:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS'
                    },
                    'body': json.dumps({
                        'error': True,
                        'message': 'Action proposal cannot be empty'
                    })
                }
        
        # Build TACT prompt with industry context
        prompt = build_tact_prompt(action_proposal, industry_context)
        
        # Invoke Bedrock
        bedrock_response = invoke_bedrock(prompt)
        
        # Parse response and extract dimension scores
        evaluation = parse_bedrock_response(bedrock_response)
        
        # Calculate Trust Spectrum level
        trust_spectrum = calculate_trust_spectrum(evaluation)
        
        # Calculate average score
        dimensions = {
            'traceability': evaluation['traceability'],
            'accountability': evaluation['accountability'],
            'consequence': evaluation['consequence'],
            'trust_boundary': evaluation['trust_boundary']
        }
        average_score = sum(dimensions.values()) / len(dimensions)
        
        # Calculate latency
        end_time = datetime.now()
        latency_ms = int((end_time - start_time).total_seconds() * 1000)
        
        # Build result
        result = {
            'evaluation_id': str(uuid.uuid4()),
            'timestamp': int(datetime.now().timestamp()),
            'action_proposal': action_proposal,
            'industry_context': industry_context,
            'dimensions': dimensions,
            'average_score': round(average_score, 2),
            'trust_spectrum': trust_spectrum,
            'reasoning': evaluation.get('reasoning', ''),
            'latency_ms': latency_ms,
            'is_custom_input': is_custom_input
        }
        
        # Write to audit trail
        write_audit_trail(result)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps(result)
        }
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        # Log error
        print(f"AWS Service Error: {error_code} - {error_message}")
        
        # Handle throttling with retry suggestion
        if error_code == 'ThrottlingException':
            return {
                'statusCode': 429,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'error': True,
                    'service': 'Bedrock',
                    'message': 'Rate limit exceeded',
                    'retry_after': 1000
                })
            }
        
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'error': True,
                'service': 'Bedrock',
                'message': f'AWS service error: {error_message}'
            })
        }
        
    except ValueError as e:
        # Validation or parsing error
        print(f"Validation Error: {str(e)}")
        
        return {
            'statusCode': 400,
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
        
    except Exception as e:
        # Unexpected error
        print(f"Unexpected Error: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
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
                'message': f'Internal server error: {str(e)}'
            })
        }

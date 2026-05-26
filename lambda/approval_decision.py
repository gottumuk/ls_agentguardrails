"""
Demo 4 - Approval Decision Lambda
Sends task token response to Step Functions and records decision in audit trail.
"""

import json
import os
import logging
import uuid
from datetime import datetime
import boto3
from botocore.exceptions import ClientError

# Configure logging
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
logger = logging.getLogger()
logger.setLevel(LOG_LEVEL)

# Initialize AWS clients
stepfunctions = boto3.client('stepfunctions')
dynamodb = boto3.resource('dynamodb')

# Environment variables
AUDIT_TRAIL_TABLE = os.environ.get('AUDIT_TRAIL_TABLE', 'AuditTrailTable')


def lambda_handler(event, context):
    """
    Lambda handler to process approval decision and send task token response.
    
    Args:
        event: API Gateway event containing task_token and decision (APPROVE/DENY)
        context: Lambda context
        
    Returns:
        Response with decision status
    """
    logger.info(f"Received approval decision: {json.dumps(event)}")
    
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event
        
        task_token = body.get('task_token')
        decision = body.get('decision', '').upper()
        reviewer_identity = body.get('reviewer_identity', 'Unknown')
        action_context = body.get('action_context', {})
        
        # Validate required fields
        if not task_token:
            return error_response(400, "Missing required field: task_token")
        
        if decision not in ['APPROVE', 'DENY']:
            return error_response(400, "Invalid decision. Must be APPROVE or DENY")
        
        logger.info(f"Processing {decision} decision from {reviewer_identity}")
        
        # Prepare output for Step Functions
        output = {
            'decision': decision,
            'reviewer_identity': reviewer_identity,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Send task token response to Step Functions
        if decision == 'APPROVE':
            stepfunctions.send_task_success(
                taskToken=task_token,
                output=json.dumps(output)
            )
            logger.info("Sent task success to Step Functions")
        else:  # DENY
            stepfunctions.send_task_success(
                taskToken=task_token,
                output=json.dumps(output)
            )
            logger.info("Sent task success (with DENY decision) to Step Functions")
        
        # Write decision to audit trail
        write_audit_trail(
            decision=decision,
            reviewer_identity=reviewer_identity,
            action_context=action_context
        )
        
        return success_response({
            'decision': decision,
            'reviewer_identity': reviewer_identity,
            'message': f'Decision {decision} recorded successfully'
        })
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        logger.error(f"AWS service error ({error_code}): {error_message}")
        
        # Handle specific error cases
        if error_code == 'TaskTimedOut':
            return error_response(410, "Approval request has expired")
        elif error_code == 'InvalidToken':
            return error_response(400, "Invalid or expired task token")
        else:
            return error_response(500, f"AWS service error: {error_message}")
            
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return error_response(500, f"Internal server error: {str(e)}")


def write_audit_trail(decision, reviewer_identity, action_context):
    """
    Write approval decision to audit trail table.
    
    Args:
        decision: APPROVE or DENY
        reviewer_identity: Identity of the reviewer
        action_context: Context of the action being approved/denied
    """
    try:
        table = dynamodb.Table(AUDIT_TRAIL_TABLE)
        
        event_id = str(uuid.uuid4())
        timestamp = int(datetime.utcnow().timestamp())
        
        item = {
            'event_id': event_id,
            'timestamp': timestamp,
            'event_type': 'APPROVAL_DECISION',
            'decision': decision,
            'reviewer_identity': reviewer_identity,
            'action_context': action_context,
            'created_at': datetime.utcnow().isoformat()
        }
        
        table.put_item(Item=item)
        logger.info(f"Wrote audit trail entry: {event_id}")
        
    except Exception as e:
        logger.error(f"Failed to write audit trail: {str(e)}")
        # Don't fail the request if audit trail write fails
        # The Step Functions state machine will also record the decision


def success_response(data, status_code=200):
    """Format successful API response."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data)
    }


def error_response(status_code, message):
    """Format error API response."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'error': message
        })
    }

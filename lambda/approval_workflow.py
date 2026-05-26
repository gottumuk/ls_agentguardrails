"""
Demo 4 - Approval Workflow Lambda
Starts Step Functions execution for human-in-the-loop approval workflow.
"""

import json
import os
import logging
import uuid
import time
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
STATE_MACHINE_ARN = os.environ.get('STATE_MACHINE_ARN')
WORKFLOW_STATE_TABLE = os.environ.get('WORKFLOW_STATE_TABLE')


def lambda_handler(event, context):
    """
    Lambda handler for approval workflow operations.
    Handles:
    - POST /approval - Start new workflow
    - POST /approval/decide - Submit decision
    - GET /approval/{workflow_id}/token - Get task token
    
    Args:
        event: API Gateway event
        context: Lambda context
        
    Returns:
        Response with workflow details or decision confirmation
    """
    logger.info(f"Received approval workflow request: {json.dumps(event)}")
    
    try:
        # Check the request path and method to determine which operation
        path = event.get('path', event.get('resource', ''))
        method = event.get('httpMethod', 'POST')
        
        # Handle GET /approval/{workflow_id}/token
        if method == 'GET' and 'token' in path:
            return handle_get_token(event, context)
        
        # Handle /approval/decide endpoint
        if 'decide' in path:
            return handle_decision(event, context)
        
        # Handle /approval endpoint (start workflow)
        return handle_start_workflow(event, context)
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return error_response(500, f"Internal server error: {str(e)}")


def handle_get_token(event, context):
    """Retrieve task token for a workflow from DynamoDB."""
    try:
        # Extract workflow_id from path parameters
        path_params = event.get('pathParameters', {})
        workflow_id = path_params.get('workflow_id')
        
        logger.info(f"Getting token for workflow_id: {workflow_id}")
        
        if not workflow_id:
            logger.error("Missing workflow_id in path parameters")
            return error_response(400, "Missing workflow_id")
        
        # Query DynamoDB for the task token
        table = dynamodb.Table(WORKFLOW_STATE_TABLE)
        logger.info(f"Querying DynamoDB table: {WORKFLOW_STATE_TABLE}")
        response = table.get_item(Key={'workflow_id': workflow_id})
        
        logger.info(f"DynamoDB response: {json.dumps(response, default=str)}")
        
        if 'Item' not in response:
            logger.error(f"Workflow {workflow_id} not found in DynamoDB")
            return error_response(404, "Workflow not found")
        
        item = response['Item']
        task_token = item.get('task_token')
        
        logger.info(f"Task token present: {bool(task_token)}")
        
        if not task_token:
            logger.error(f"Task token not yet available for workflow {workflow_id}")
            return error_response(404, "Task token not yet available")
        
        result = {
            'workflow_id': workflow_id,
            'task_token': task_token,
            'status': item.get('status', 'UNKNOWN')
        }
        logger.info(f"Returning success response: {json.dumps(result, default=str)}")
        return success_response(result)
        
    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return error_response(500, f"Database error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in handle_get_token: {str(e)}", exc_info=True)
        return error_response(500, f"Internal server error: {str(e)}")


def handle_decision(event, context):
    """Handle approval decision submission."""
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event
        
        task_token = body.get('task_token')
        decision = body.get('decision', '').upper()
        
        if not task_token:
            return error_response(400, "Missing required field: task_token")
        
        if decision not in ['APPROVE', 'DENY']:
            return error_response(400, "Invalid decision. Must be APPROVE or DENY")
        
        logger.info(f"Processing {decision} decision")
        
        # Prepare output for Step Functions
        output = {
            'decision': decision,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Send task token response to Step Functions
        stepfunctions.send_task_success(
            taskToken=task_token,
            output=json.dumps(output)
        )
        
        logger.info("Sent task success to Step Functions")
        
        return success_response({
            'decision': decision,
            'message': f'Decision {decision} recorded successfully'
        })
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        logger.error(f"AWS service error ({error_code}): {error_message}")
        
        if error_code == 'TaskTimedOut':
            return error_response(410, "Approval request has expired")
        elif error_code == 'InvalidToken':
            return error_response(400, "Invalid or expired task token")
        else:
            return error_response(500, f"AWS service error: {error_message}")


def handle_start_workflow(event, context):
    """Handle starting a new approval workflow."""
    
    try:
        # Parse API Gateway proxy integration event
        if 'body' in event and isinstance(event['body'], str):
            body = json.loads(event['body'])
        else:
            body = event
        
        action_context = body.get('action_context', {})
        industry_context = body.get('industry_context', 'Banking')
        reviewer = body.get('reviewer', get_default_reviewer(industry_context))
        
        # Validate required fields
        if not action_context:
            return error_response(400, "Missing required field: action_context")
        
        # Generate workflow ID
        workflow_id = str(uuid.uuid4())
        
        # Prepare state machine input
        state_machine_input = {
            'workflow_id': workflow_id,
            'action_context': action_context,
            'industry_context': industry_context,
            'reviewer': reviewer,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        logger.info(f"Starting Step Functions execution with input: {json.dumps(state_machine_input)}")
        
        # Start Step Functions execution
        response = stepfunctions.start_execution(
            stateMachineArn=STATE_MACHINE_ARN,
            name=workflow_id,
            input=json.dumps(state_machine_input)
        )
        
        execution_arn = response['executionArn']
        logger.info(f"Started execution: {execution_arn}")
        
        timestamp_started = int(datetime.utcnow().timestamp() * 1000)
        timestamp_expires = int((datetime.utcnow().timestamp() + 900) * 1000)
        
        # Store workflow state in DynamoDB
        table = dynamodb.Table(WORKFLOW_STATE_TABLE)
        table.put_item(
            Item={
                'workflow_id': workflow_id,
                'execution_arn': execution_arn,
                'status': 'PENDING',
                'action_context': action_context,
                'industry_context': industry_context,
                'reviewer': reviewer,
                'created_at': datetime.utcnow().isoformat(),
                'ttl': int(datetime.utcnow().timestamp()) + 86400  # 24 hour TTL
            }
        )
        
        # The task token will be stored by the SNS notification Lambda
        # when the WaitForApproval state invokes it
        return success_response({
            'workflow_id': workflow_id,
            'execution_arn': execution_arn,
            'timestamp_started': timestamp_started,
            'timestamp_expires': timestamp_expires,
            'status': 'PENDING',
            'message': 'Approval workflow started successfully. Task token will be available shortly.',
            'action_context': action_context,
            'industry_context': industry_context,
            'reviewer_identity': reviewer
        })
        
    except ClientError as e:
        logger.error(f"AWS service error: {str(e)}")
        return error_response(500, f"AWS service error: {e.response['Error']['Message']}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return error_response(500, f"Internal server error: {str(e)}")


def get_default_reviewer(industry_context):
    """Get default reviewer role based on industry context."""
    reviewers = {
        'Banking': 'Compliance Officer',
        'Healthcare': 'Prescribing MD',
        'Retail': 'Fraud Operations',
        'HROperations': 'VP HR and Legal'
    }
    return reviewers.get(industry_context, 'Compliance Officer')


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


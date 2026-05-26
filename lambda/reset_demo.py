"""
Demo Reset Lambda
Clears in-progress workflows, resets demo state, and reloads preset data.
Preserves audit trail records for compliance.
"""

import json
import os
import logging
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
SENSITIVE_RECORDS_TABLE = os.environ.get('SENSITIVE_RECORDS_TABLE')

# Industry-specific preset data
PRESET_DATA = {
    'Banking': {
        'action_proposal': 'Transfer $47,000 between accounts',
        'sensitive_records': [
            {
                'record_id': 'BANK-001',
                'account_holder': 'John Smith',
                'ssn': '123-45-6789',
                'account_number': '9876543210',
                'dob': '1985-03-15',
                'balance': 47000.00,
                'last_transaction': '2024-01-15'
            }
        ]
    },
    'Healthcare': {
        'action_proposal': 'Prescribe 90-day opioid refill and notify pharmacy',
        'sensitive_records': [
            {
                'record_id': 'HEALTH-001',
                'patient_name': 'Jane Doe',
                'mrn': 'MRN-789456',
                'icd10_codes': ['M79.3', 'G89.29'],
                'prescription_history': ['Oxycodone 30mg', 'Hydrocodone 10mg'],
                'prescribing_md': 'Dr. Smith',
                'last_visit': '2024-01-10'
            }
        ]
    },
    'Retail': {
        'action_proposal': 'Issue $12,400 refund and waive return window',
        'sensitive_records': [
            {
                'record_id': 'RETAIL-001',
                'customer_name': 'Bob Johnson',
                'card_number': '4532-1234-5678-9010',
                'cvv': '123',
                'refund_amount': 12400.00,
                'order_id': 'ORD-456789',
                'purchase_date': '2023-12-20'
            }
        ]
    },
    'HROperations': {
        'action_proposal': 'Terminate 47 contractors in APAC immediately',
        'sensitive_records': [
            {
                'record_id': 'HR-001',
                'employee_name': 'Alice Chen',
                'government_id': 'A12345678',
                'salary': 125000,
                'department': 'Engineering',
                'location': 'APAC',
                'hire_date': '2022-06-01'
            }
        ]
    }
}


def lambda_handler(event, context):
    """
    Lambda handler to reset demo state.
    
    Args:
        event: API Gateway event containing demo_id and industry_context
        context: Lambda context
        
    Returns:
        Response with reset status
    """
    logger.info(f"Received demo reset request: {json.dumps(event)}")
    
    try:
        # Parse request body
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event
        
        demo_id = body.get('demo_id', 'all')
        industry_context = body.get('industry_context', 'Banking')
        
        # Validate industry context
        if industry_context not in PRESET_DATA:
            return error_response(400, f"Invalid industry_context: {industry_context}")
        
        logger.info(f"Resetting demo {demo_id} for industry {industry_context}")
        
        reset_results = {}
        
        # Cancel in-progress Step Functions executions
        if demo_id in ['all', 'demo4']:
            cancelled_count = cancel_in_progress_workflows()
            reset_results['workflows_cancelled'] = cancelled_count
            logger.info(f"Cancelled {cancelled_count} in-progress workflows")
        
        # Clear workflow state table
        if demo_id in ['all', 'demo4']:
            cleared_count = clear_workflow_state()
            reset_results['workflow_states_cleared'] = cleared_count
            logger.info(f"Cleared {cleared_count} workflow state records")
        
        # Reload preset data for current industry
        if demo_id in ['all', 'demo2']:
            loaded_count = reload_preset_data(industry_context)
            reset_results['preset_records_loaded'] = loaded_count
            logger.info(f"Loaded {loaded_count} preset records for {industry_context}")
        
        # Note: Audit trail is preserved (no deletion)
        reset_results['audit_trail_preserved'] = True
        
        return success_response({
            'demo_id': demo_id,
            'industry_context': industry_context,
            'reset_results': reset_results,
            'message': f'Demo {demo_id} reset successfully',
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except ClientError as e:
        logger.error(f"AWS service error: {str(e)}")
        return error_response(500, f"AWS service error: {e.response['Error']['Message']}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return error_response(500, f"Internal server error: {str(e)}")


def cancel_in_progress_workflows():
    """
    Cancel all in-progress Step Functions executions.
    
    Returns:
        Number of executions cancelled
    """
    cancelled_count = 0
    
    try:
        if not STATE_MACHINE_ARN:
            logger.warning("STATE_MACHINE_ARN environment variable not set")
            return cancelled_count
        
        # List running executions
        response = stepfunctions.list_executions(
            stateMachineArn=STATE_MACHINE_ARN,
            statusFilter='RUNNING',
            maxResults=100
        )
        
        executions = response.get('executions', [])
        logger.info(f"Found {len(executions)} running executions")
        
        # Cancel each execution
        for execution in executions:
            execution_arn = execution['executionArn']
            try:
                stepfunctions.stop_execution(
                    executionArn=execution_arn,
                    error='DemoReset',
                    cause='Demo reset requested by user'
                )
                cancelled_count += 1
                logger.info(f"Cancelled execution: {execution_arn}")
            except ClientError as e:
                # Execution may have already completed
                if e.response['Error']['Code'] != 'ExecutionDoesNotExist':
                    logger.warning(f"Failed to cancel execution {execution_arn}: {str(e)}")
        
        return cancelled_count
        
    except Exception as e:
        logger.error(f"Error cancelling workflows: {str(e)}")
        return cancelled_count


def clear_workflow_state():
    """
    Clear all records from WorkflowStateTable.
    
    Returns:
        Number of records cleared
    """
    cleared_count = 0
    
    try:
        if not WORKFLOW_STATE_TABLE:
            logger.warning("WORKFLOW_STATE_TABLE environment variable not set")
            return cleared_count
        
        table = dynamodb.Table(WORKFLOW_STATE_TABLE)
        
        # Scan table to get all items
        response = table.scan()
        items = response.get('Items', [])
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))
        
        logger.info(f"Found {len(items)} workflow state records to clear")
        
        # Delete each item
        for item in items:
            try:
                table.delete_item(
                    Key={'workflow_id': item['workflow_id']}
                )
                cleared_count += 1
            except ClientError as e:
                logger.warning(f"Failed to delete workflow state {item['workflow_id']}: {str(e)}")
        
        return cleared_count
        
    except Exception as e:
        logger.error(f"Error clearing workflow state: {str(e)}")
        return cleared_count


def reload_preset_data(industry_context):
    """
    Reload preset sensitive records for the specified industry.
    
    Args:
        industry_context: Industry context (Banking, Healthcare, Retail, HROperations)
        
    Returns:
        Number of records loaded
    """
    loaded_count = 0
    
    try:
        if not SENSITIVE_RECORDS_TABLE:
            logger.warning("SENSITIVE_RECORDS_TABLE environment variable not set")
            return loaded_count
        
        table = dynamodb.Table(SENSITIVE_RECORDS_TABLE)
        preset_records = PRESET_DATA[industry_context]['sensitive_records']
        
        logger.info(f"Loading {len(preset_records)} preset records for {industry_context}")
        
        # Write each preset record
        for record in preset_records:
            try:
                table.put_item(Item=record)
                loaded_count += 1
                logger.info(f"Loaded preset record: {record['record_id']}")
            except ClientError as e:
                logger.warning(f"Failed to load record {record.get('record_id')}: {str(e)}")
        
        return loaded_count
        
    except Exception as e:
        logger.error(f"Error reloading preset data: {str(e)}")
        return loaded_count


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

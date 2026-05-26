"""
Demo 4 - SNS Notification Lambda
Sends approval notifications to reviewers via SNS and stores task token in DynamoDB.
"""

import json
import os
import logging
from datetime import datetime, timedelta
import boto3
from botocore.exceptions import ClientError

# Configure logging
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
logger = logging.getLogger()
logger.setLevel(LOG_LEVEL)

# Initialize AWS clients
sns = boto3.client('sns')
dynamodb = boto3.resource('dynamodb')

# Environment variables
SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')
WORKFLOW_STATE_TABLE = os.environ.get('WORKFLOW_STATE_TABLE')
APPROVAL_BASE_URL = os.environ.get('APPROVAL_BASE_URL', 'https://demo.example.com')


def lambda_handler(event, context):
    """
    Lambda handler to send SNS notification for approval request and store task token.
    
    Args:
        event: Contains reviewer, action_context, industry_context, workflow_id, and task_token
        context: Lambda context
        
    Returns:
        Response with notification status
    """
    logger.info(f"Sending approval notification: {json.dumps(event)}")
    
    try:
        # Extract parameters from event
        reviewer = event.get('reviewer', 'Reviewer')
        action_context = event.get('action_context', {})
        industry_context = event.get('industry_context', 'Banking')
        workflow_id = event.get('workflow_id', '')
        task_token = event.get('task_token', '')
        
        # Store task token in DynamoDB for later retrieval
        if workflow_id and task_token:
            logger.info(f"Storing task token for workflow {workflow_id}")
            table = dynamodb.Table(WORKFLOW_STATE_TABLE)
            table.update_item(
                Key={'workflow_id': workflow_id},
                UpdateExpression='SET task_token = :token, #status = :status, updated_at = :updated',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':token': task_token,
                    ':status': 'WAITING_FOR_APPROVAL',
                    ':updated': datetime.utcnow().isoformat()
                }
            )
            logger.info("Task token stored successfully")
        
        # Extract action details
        action_proposal = action_context.get('action_proposal', 'Unknown action')
        trust_score = action_context.get('trust_score', 0)
        risk_factors = action_context.get('risk_factors', [])
        
        # Calculate expiration time (15 minutes from now)
        expires_at = (datetime.utcnow() + timedelta(minutes=15)).isoformat()
        
        # Build notification message
        subject = f"Action Approval Required - {industry_context}"
        
        message_body = format_notification_message(
            reviewer=reviewer,
            action_proposal=action_proposal,
            industry_context=industry_context,
            trust_score=trust_score,
            risk_factors=risk_factors,
            task_token=task_token,
            expires_at=expires_at
        )
        
        # Publish to SNS
        logger.info(f"Publishing to SNS topic: {SNS_TOPIC_ARN}")
        response = sns.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=subject,
            Message=message_body,
            MessageAttributes={
                'industry_context': {
                    'DataType': 'String',
                    'StringValue': industry_context
                },
                'trust_score': {
                    'DataType': 'Number',
                    'StringValue': str(trust_score)
                }
            }
        )
        
        message_id = response['MessageId']
        logger.info(f"SNS notification sent successfully: {message_id}")
        
        return {
            'statusCode': 200,
            'message_id': message_id,
            'notification_sent': True
        }
        
    except ClientError as e:
        logger.error(f"AWS service error: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise


def format_notification_message(reviewer, action_proposal, industry_context, 
                                trust_score, risk_factors, task_token, expires_at):
    """
    Format the notification message with action context and decision links.
    
    Args:
        reviewer: Reviewer role/identity
        action_proposal: Description of the proposed action
        industry_context: Industry context (Banking, Healthcare, etc.)
        trust_score: Calculated trust score (0-100)
        risk_factors: List of identified risk factors
        task_token: Step Functions task token for decision callback
        expires_at: ISO timestamp when approval expires
        
    Returns:
        Formatted message string
    """
    # Build approve and deny URLs with task token
    approve_url = f"{APPROVAL_BASE_URL}/approve?token={task_token}"
    deny_url = f"{APPROVAL_BASE_URL}/deny?token={task_token}"
    
    # Format risk factors
    risk_factors_text = "\n".join([f"  - {factor}" for factor in risk_factors]) if risk_factors else "  - None identified"
    
    message = f"""
ACTION APPROVAL REQUIRED

Reviewer: {reviewer}
Industry Context: {industry_context}

ACTION PROPOSAL:
{action_proposal}

TRUST ANALYSIS:
Trust Score: {trust_score}/100
Risk Factors:
{risk_factors_text}

DECISION REQUIRED:
This action requires your approval before proceeding.

Approve: {approve_url}
Deny: {deny_url}

IMPORTANT:
- This approval request expires at {expires_at} UTC (15 minutes)
- If no decision is made within 15 minutes, the action will be automatically DENIED
- Your decision will be recorded in the audit trail

Please review the action carefully and make your decision.
"""
    
    return message.strip()

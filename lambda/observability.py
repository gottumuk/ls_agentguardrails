"""
Observability Lambda Function

This Lambda function provides real-time log streaming and request/response inspection
for all demos. Streams CloudWatch Logs to WebSocket clients with filtering capabilities.
Also handles WebSocket connections and voting for Demo 4.

Requirements: 13.2, 13.3, 13.4, 13.12, 13.13
"""

import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Generator

import boto3
from botocore.exceptions import ClientError


# Initialize AWS clients
logs_client = boto3.client('logs')
dynamodb = boto3.resource('dynamodb')

# Environment variables
WEBSOCKET_API_ENDPOINT = os.environ.get('WEBSOCKET_API_ENDPOINT', '')
POLLING_INTERVAL_MS = int(os.environ.get('POLLING_INTERVAL_MS', '500'))
CONNECTIONS_TABLE = os.environ.get('CONNECTIONS_TABLE', 'websocket-connections')
VOTES_TABLE = os.environ.get('VOTES_TABLE', 'workflow-votes')

# Log groups for each Lambda function
LOG_GROUPS = {
    'tact': '/aws/lambda/TACTEvaluationLambda',
    'guardrails': '/aws/lambda/GuardrailsQueryLambda',
    'neptune': '/aws/lambda/NeptuneScoringLambda',
    'approval_workflow': '/aws/lambda/ApprovalWorkflowLambda',
    'approval_decision': '/aws/lambda/ApprovalDecisionLambda',
    'audit_trail': '/aws/lambda/AuditTrailLambda',
    'sns_notification': '/aws/lambda/SNSNotificationLambda',
    'step_functions': '/aws/states/ApprovalStateMachine'
}


def filter_log_events(
    log_group: str,
    execution_id: Optional[str] = None,
    start_time: Optional[int] = None,
    filter_pattern: Optional[str] = None,
    next_token: Optional[str] = None
) -> Dict[str, Any]:
    """
    Filter CloudWatch Logs events with optional execution ID filtering.
    
    Requirements: 13.2, 13.3, 13.4
    
    Args:
        log_group: CloudWatch Logs group name
        execution_id: Optional execution ID to filter by
        start_time: Optional start time (Unix timestamp in milliseconds)
        filter_pattern: Optional CloudWatch Logs filter pattern
        next_token: Optional pagination token
        
    Returns:
        Dict containing events and next token
    """
    # Default start time: 5 minutes ago
    if start_time is None:
        start_time = int((datetime.now() - timedelta(minutes=5)).timestamp() * 1000)
    
    # Build filter parameters
    params = {
        'logGroupName': log_group,
        'startTime': start_time
    }
    
    # Add execution ID to filter pattern if provided
    if execution_id:
        if filter_pattern:
            params['filterPattern'] = f'{filter_pattern} {execution_id}'
        else:
            params['filterPattern'] = execution_id
    elif filter_pattern:
        params['filterPattern'] = filter_pattern
    
    # Add pagination token if provided
    if next_token:
        params['nextToken'] = next_token
    
    try:
        response = logs_client.filter_log_events(**params)
        
        return {
            'events': response.get('events', []),
            'nextToken': response.get('nextToken'),
            'searchedLogStreams': response.get('searchedLogStreams', [])
        }
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        print(f"CloudWatch Logs Error: {error_code} - {error_message}")
        
        # Return empty result on error
        return {
            'events': [],
            'nextToken': None,
            'error': error_message
        }


def stream_logs(
    log_group: str,
    execution_id: Optional[str] = None,
    duration_seconds: int = 60
) -> Generator[Dict[str, Any], None, None]:
    """
    Stream CloudWatch Logs events in real-time with 500ms polling interval.
    
    Requirements: 13.2, 13.3, 13.4
    
    Args:
        log_group: CloudWatch Logs group name
        execution_id: Optional execution ID to filter by
        duration_seconds: How long to stream logs (default 60 seconds)
        
    Yields:
        Log events as they arrive
    """
    start_time = int(datetime.now().timestamp() * 1000)
    end_time = start_time + (duration_seconds * 1000)
    next_token = None
    seen_event_ids = set()
    
    while int(datetime.now().timestamp() * 1000) < end_time:
        # Filter log events
        result = filter_log_events(
            log_group=log_group,
            execution_id=execution_id,
            start_time=start_time,
            next_token=next_token
        )
        
        # Yield new events (deduplicate by event ID)
        for event in result['events']:
            event_id = event.get('eventId')
            if event_id and event_id not in seen_event_ids:
                seen_event_ids.add(event_id)
                yield format_log_event(event, log_group)
        
        # Update next token for pagination
        next_token = result.get('nextToken')
        
        # If no more events and no next token, wait before polling again
        if not result['events'] and not next_token:
            time.sleep(POLLING_INTERVAL_MS / 1000.0)
            next_token = None  # Reset token for next poll


def format_log_event(event: Dict[str, Any], log_group: str) -> Dict[str, Any]:
    """
    Format a CloudWatch Logs event for WebSocket transmission.
    
    Requirements: 13.2, 13.3
    
    Args:
        event: Raw CloudWatch Logs event
        log_group: Log group name
        
    Returns:
        Formatted log event
    """
    message = event.get('message', '')
    
    # Determine severity from message content
    severity = 'INFO'
    if 'ERROR' in message or 'Exception' in message:
        severity = 'ERROR'
    elif 'WARN' in message or 'Warning' in message:
        severity = 'WARN'
    
    # Extract function name from log group
    function_name = log_group.split('/')[-1]
    
    return {
        'timestamp': event.get('timestamp'),
        'message': message,
        'logStreamName': event.get('logStreamName', ''),
        'eventId': event.get('eventId', ''),
        'severity': severity,
        'functionName': function_name,
        'logGroup': log_group
    }


def extract_request_details(log_message: str) -> Optional[Dict[str, Any]]:
    """
    Extract request details from log messages for inspection.
    
    Requirements: 13.12, 13.13
    
    Args:
        log_message: Log message text
        
    Returns:
        Dict containing request details if found, None otherwise
    """
    request_details = {}
    
    # Extract Bedrock prompts
    if 'Bedrock prompt:' in log_message or 'BEDROCK_PROMPT' in log_message:
        # Try to extract JSON prompt
        try:
            start_idx = log_message.find('{')
            if start_idx != -1:
                json_str = log_message[start_idx:]
                prompt_data = json.loads(json_str)
                request_details['type'] = 'bedrock_request'
                request_details['prompt'] = prompt_data
        except json.JSONDecodeError:
            pass
    
    # Extract Gremlin queries
    if 'Gremlin query:' in log_message or 'GREMLIN_QUERY' in log_message:
        # Extract query text
        if 'g.V()' in log_message:
            start_idx = log_message.find('g.V()')
            query = log_message[start_idx:].split('\n')[0]
            request_details['type'] = 'neptune_request'
            request_details['query'] = query
    
    # Extract DynamoDB queries
    if 'DynamoDB query:' in log_message or 'DYNAMODB_QUERY' in log_message:
        try:
            start_idx = log_message.find('{')
            if start_idx != -1:
                json_str = log_message[start_idx:]
                query_data = json.loads(json_str)
                request_details['type'] = 'dynamodb_request'
                request_details['query'] = query_data
        except json.JSONDecodeError:
            pass
    
    return request_details if request_details else None


def extract_response_metrics(log_message: str) -> Optional[Dict[str, Any]]:
    """
    Extract response time metrics from log messages.
    
    Requirements: 13.13
    
    Args:
        log_message: Log message text
        
    Returns:
        Dict containing response metrics if found, None otherwise
    """
    import re
    
    metrics = {}
    
    # Extract latency metrics
    # Look for patterns like "123ms" or "latency: 456" or "in 123ms"
    ms_match = re.search(r'(\d+)\s*ms', log_message)
    if ms_match:
        metrics['latency_ms'] = int(ms_match.group(1))
    
    if not metrics:
        latency_match = re.search(r'latency[:\s]+(\d+)', log_message, re.IGNORECASE)
        if latency_match:
            metrics['latency_ms'] = int(latency_match.group(1))
    
    # Extract response status
    if 'statusCode' in log_message or 'status_code' in log_message:
        try:
            start_idx = log_message.find('{')
            if start_idx != -1:
                json_str = log_message[start_idx:]
                response_data = json.loads(json_str)
                metrics['status_code'] = response_data.get('statusCode') or response_data.get('status_code')
        except json.JSONDecodeError:
            pass
    
    return metrics if metrics else None


def send_to_websocket(connection_id: str, data: Dict[str, Any]) -> bool:
    """
    Send data to WebSocket client.
    
    Requirements: 13.2, 13.4
    
    Args:
        connection_id: WebSocket connection ID
        data: Data to send
        
    Returns:
        True if successful, False otherwise
    """
    if not WEBSOCKET_API_ENDPOINT:
        print("WebSocket API endpoint not configured")
        return False
    
    try:
        # Initialize API Gateway Management API client with endpoint
        mgmt_client = boto3.client(
            'apigatewaymanagementapi',
            endpoint_url=WEBSOCKET_API_ENDPOINT
        )
        
        # Send message
        mgmt_client.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(data).encode('utf-8')
        )
        
        return True
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        
        # Connection is gone, client disconnected
        if error_code == 'GoneException':
            print(f"Connection {connection_id} is gone")
            return False
        
        print(f"WebSocket Error: {error_code} - {e.response['Error']['Message']}")
        return False


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for observability operations and WebSocket connections.
    
    Handles WebSocket routes:
    - $connect: Register new WebSocket connection
    - $disconnect: Remove WebSocket connection
    - $default: Handle custom messages (SUBMIT_VOTE, RESET_VOTES, etc.)
    
    Also supports HTTP operations:
    1. stream: Stream CloudWatch Logs to WebSocket client
    2. query: Query logs for a specific time range
    3. inspect: Extract request/response details from logs
    
    Requirements: 13.2, 13.3, 13.4, 13.12, 13.13
    """
    try:
        # Check if this is a WebSocket event
        request_context = event.get('requestContext', {})
        route_key = request_context.get('routeKey')
        connection_id = request_context.get('connectionId')
        
        if route_key == '$connect':
            # Register new connection
            return handle_connect(connection_id)
        
        elif route_key == '$disconnect':
            # Remove connection
            return handle_disconnect(connection_id)
        
        elif route_key == '$default':
            # Handle custom messages
            body = json.loads(event.get('body', '{}'))
            message_type = body.get('type')
            
            if message_type == 'SUBMIT_VOTE':
                return handle_vote(body, connection_id)
            elif message_type == 'RESET_VOTES':
                return handle_reset_votes(body, connection_id)
            else:
                return websocket_response(200, {'message': 'Message received'})
        
        # HTTP operations (existing functionality)
        # Parse request body if from API Gateway
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event
        
        operation = body.get('operation', 'query')
        log_group_key = body.get('log_group', 'tact')
        
        # Resolve log group name
        log_group = LOG_GROUPS.get(log_group_key, log_group_key)
        
        if operation == 'stream':
            # Stream logs to WebSocket client
            connection_id = body.get('connection_id')
            execution_id = body.get('execution_id')
            duration_seconds = body.get('duration_seconds', 60)
            
            if not connection_id:
                return error_response(400, 'Missing required field: connection_id')
            
            # Stream logs and send to WebSocket
            event_count = 0
            for log_event in stream_logs(log_group, execution_id, duration_seconds):
                # Send log event to WebSocket
                message = {
                    'type': 'LOG_EVENT',
                    'data': log_event
                }
                
                if send_to_websocket(connection_id, message):
                    event_count += 1
                else:
                    # Connection closed, stop streaming
                    break
            
            return success_response({
                'events_streamed': event_count,
                'log_group': log_group
            })
        
        elif operation == 'query':
            # Query logs for a specific time range
            execution_id = body.get('execution_id')
            start_time = body.get('start_time')
            filter_pattern = body.get('filter_pattern')
            next_token = body.get('next_token')
            
            result = filter_log_events(
                log_group=log_group,
                execution_id=execution_id,
                start_time=start_time,
                filter_pattern=filter_pattern,
                next_token=next_token
            )
            
            # Format events
            formatted_events = [
                format_log_event(event, log_group)
                for event in result['events']
            ]
            
            return success_response({
                'events': formatted_events,
                'nextToken': result.get('nextToken'),
                'count': len(formatted_events)
            })
        
        elif operation == 'inspect':
            # Extract request/response details from logs
            execution_id = body.get('execution_id')
            start_time = body.get('start_time')
            
            result = filter_log_events(
                log_group=log_group,
                execution_id=execution_id,
                start_time=start_time
            )
            
            # Extract request and response details
            requests = []
            responses = []
            
            for event in result['events']:
                message = event.get('message', '')
                
                # Extract request details
                request_details = extract_request_details(message)
                if request_details:
                    request_details['timestamp'] = event.get('timestamp')
                    requests.append(request_details)
                
                # Extract response metrics
                response_metrics = extract_response_metrics(message)
                if response_metrics:
                    response_metrics['timestamp'] = event.get('timestamp')
                    responses.append(response_metrics)
            
            return success_response({
                'requests': requests,
                'responses': responses,
                'log_group': log_group
            })
        
        else:
            return error_response(400, f'Unsupported operation: {operation}')
    
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        print(f"AWS Service Error: {error_code} - {error_message}")
        
        return error_response(500, f'AWS service error: {error_message}')
    
    except Exception as e:
        print(f"Unexpected Error: {str(e)}")
        
        return error_response(500, 'Internal server error')


def handle_connect(connection_id: str) -> Dict[str, Any]:
    """Handle WebSocket $connect route."""
    try:
        table = dynamodb.Table(CONNECTIONS_TABLE)
        table.put_item(
            Item={
                'connection_id': connection_id,
                'connected_at': datetime.utcnow().isoformat(),
                'ttl': int(datetime.utcnow().timestamp()) + 7200  # 2 hour TTL
            }
        )
        print(f"Connection registered: {connection_id}")
        return websocket_response(200, {'message': 'Connected'})
    except Exception as e:
        print(f"Error registering connection: {str(e)}")
        return websocket_response(500, {'message': 'Failed to connect'})


def handle_disconnect(connection_id: str) -> Dict[str, Any]:
    """Handle WebSocket $disconnect route."""
    try:
        table = dynamodb.Table(CONNECTIONS_TABLE)
        table.delete_item(Key={'connection_id': connection_id})
        print(f"Connection removed: {connection_id}")
        return websocket_response(200, {'message': 'Disconnected'})
    except Exception as e:
        print(f"Error removing connection: {str(e)}")
        return websocket_response(200, {'message': 'Disconnected'})


def handle_vote(body: Dict[str, Any], connection_id: str) -> Dict[str, Any]:
    """Handle SUBMIT_VOTE message."""
    try:
        workflow_id = body.get('workflow_id')
        vote = body.get('vote')  # 'APPROVE' or 'DENY'
        
        if not workflow_id or not vote:
            return websocket_response(400, {'error': 'Missing workflow_id or vote'})
        
        # Store vote in DynamoDB
        votes_table = dynamodb.Table(VOTES_TABLE)
        votes_table.put_item(
            Item={
                'workflow_id': workflow_id,
                'connection_id': connection_id,
                'vote': vote,
                'timestamp': datetime.utcnow().isoformat(),
                'ttl': int(datetime.utcnow().timestamp()) + 3600  # 1 hour TTL
            }
        )
        
        # Get current vote counts
        vote_counts = get_vote_counts(workflow_id)
        
        # Broadcast vote counts to all connected clients
        broadcast_to_all({
            'type': 'VOTE_UPDATE',
            'workflow_id': workflow_id,
            'approve': vote_counts['approve'],
            'deny': vote_counts['deny']
        })
        
        return websocket_response(200, {
            'message': 'Vote recorded',
            'vote_counts': vote_counts
        })
    except Exception as e:
        print(f"Error handling vote: {str(e)}")
        return websocket_response(500, {'error': 'Failed to record vote'})


def handle_reset_votes(body: Dict[str, Any], connection_id: str) -> Dict[str, Any]:
    """Handle RESET_VOTES message."""
    try:
        workflow_id = body.get('workflow_id')
        
        if not workflow_id:
            return websocket_response(400, {'error': 'Missing workflow_id'})
        
        # Delete all votes for this workflow
        votes_table = dynamodb.Table(VOTES_TABLE)
        
        # Query all votes for this workflow
        response = votes_table.query(
            KeyConditionExpression='workflow_id = :wid',
            ExpressionAttributeValues={':wid': workflow_id}
        )
        
        # Delete each vote
        for item in response.get('Items', []):
            votes_table.delete_item(
                Key={
                    'workflow_id': workflow_id,
                    'connection_id': item['connection_id']
                }
            )
        
        # Broadcast reset to all connected clients
        broadcast_to_all({
            'type': 'VOTE_UPDATE',
            'workflow_id': workflow_id,
            'approve': 0,
            'deny': 0
        })
        
        return websocket_response(200, {'message': 'Votes reset'})
    except Exception as e:
        print(f"Error resetting votes: {str(e)}")
        return websocket_response(500, {'error': 'Failed to reset votes'})


def get_vote_counts(workflow_id: str) -> Dict[str, int]:
    """Get current vote counts for a workflow."""
    try:
        votes_table = dynamodb.Table(VOTES_TABLE)
        response = votes_table.query(
            KeyConditionExpression='workflow_id = :wid',
            ExpressionAttributeValues={':wid': workflow_id}
        )
        
        approve_count = 0
        deny_count = 0
        
        for item in response.get('Items', []):
            if item.get('vote') == 'APPROVE':
                approve_count += 1
            elif item.get('vote') == 'DENY':
                deny_count += 1
        
        return {'approve': approve_count, 'deny': deny_count}
    except Exception as e:
        print(f"Error getting vote counts: {str(e)}")
        return {'approve': 0, 'deny': 0}


def broadcast_to_all(message: Dict[str, Any]):
    """Broadcast message to all connected WebSocket clients."""
    try:
        connections_table = dynamodb.Table(CONNECTIONS_TABLE)
        response = connections_table.scan()
        
        for item in response.get('Items', []):
            connection_id = item['connection_id']
            send_to_websocket(connection_id, message)
    except Exception as e:
        print(f"Error broadcasting message: {str(e)}")


def websocket_response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Format WebSocket response."""
    return {
        'statusCode': status_code,
        'body': json.dumps(body)
    }


def success_response(data: Dict[str, Any], status_code: int = 200) -> Dict[str, Any]:
    """Format successful API response."""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data)
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

"""
Lambda function to seed DynamoDB and Neptune with demo data.

This function is triggered by CloudFormation custom resource during stack creation.
It loads industry-specific seed data for both DynamoDB (sensitive records) and 
Neptune (trust graph).
"""

import json
import os
import logging
import boto3
from decimal import Decimal
from typing import Dict, List, Any
import urllib3
from gremlin_python.driver import client, serializer
from gremlin_python.process.traversal import T
from error_handler import lambda_error_handler, handle_aws_error

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
http = urllib3.PoolManager()

# Environment variables
SENSITIVE_RECORDS_TABLE = os.environ.get('SENSITIVE_RECORDS_TABLE', 'SensitiveRecordsTable')
NEPTUNE_ENDPOINT = os.environ.get('NEPTUNE_ENDPOINT', '')
NEPTUNE_PORT = int(os.environ.get('NEPTUNE_PORT', '8182'))


def convert_floats_to_decimal(obj: Any) -> Any:
    """
    Recursively convert all float values to Decimal for DynamoDB compatibility.
    
    Args:
        obj: Object to convert (dict, list, or primitive)
        
    Returns:
        Object with floats converted to Decimal
    """
    if isinstance(obj, list):
        return [convert_floats_to_decimal(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_floats_to_decimal(value) for key, value in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
    else:
        return obj


def load_seed_file(filename: str) -> Dict[str, Any]:
    """Load seed data from JSON file."""
    seed_data_dir = os.path.join(os.path.dirname(__file__), 'seed_data')
    filepath = os.path.join(seed_data_dir, filename)
    
    with open(filepath, 'r') as f:
        data = json.load(f)
        # Convert all floats to Decimal for DynamoDB
        return convert_floats_to_decimal(data)


def seed_dynamodb_records(industry: str) -> int:
    """
    Seed DynamoDB with sensitive records for the specified industry.
    
    Args:
        industry: Industry context (Banking, Healthcare, Retail, HROperations)
        
    Returns:
        Number of records inserted
    """
    # Map industry to seed file
    industry_files = {
        'Banking': 'dynamodb_banking.json',
        'Healthcare': 'dynamodb_healthcare.json',
        'Retail': 'dynamodb_retail.json',
        'HROperations': 'dynamodb_hr.json'
    }
    
    filename = industry_files.get(industry)
    if not filename:
        raise ValueError(f"Unknown industry: {industry}")
    
    # Load seed data
    seed_data = load_seed_file(filename)
    records = seed_data.get('sensitive_records', [])
    
    # Get DynamoDB table
    table = dynamodb.Table(SENSITIVE_RECORDS_TABLE)
    
    # Insert records
    inserted_count = 0
    for record in records:
        table.put_item(Item=record)
        inserted_count += 1
        print(f"Inserted record: {record['record_id']}")
    
    return inserted_count


def seed_neptune_graph(industry: str) -> Dict[str, int]:
    """
    Seed Neptune with graph data for the specified industry.
    
    Args:
        industry: Industry context (Banking, Healthcare, Retail, HROperations)
        
    Returns:
        Dictionary with counts of nodes and edges inserted
    """
    # Map industry to seed file
    industry_files = {
        'Banking': 'neptune_banking.json',
        'Healthcare': 'neptune_healthcare.json',
        'Retail': 'neptune_retail.json',
        'HROperations': 'neptune_hr.json'
    }
    
    filename = industry_files.get(industry)
    if not filename:
        raise ValueError(f"Unknown industry: {industry}")
    
    # Load seed data
    seed_data = load_seed_file(filename)
    nodes = seed_data.get('nodes', [])
    edges = seed_data.get('edges', [])
    
    # Connect to Neptune
    neptune_client = client.Client(
        f'wss://{NEPTUNE_ENDPOINT}:{NEPTUNE_PORT}/gremlin',
        'g',
        message_serializer=serializer.GraphSONSerializersV2d0()
    )
    
    try:
        # Only clear on first industry (Banking) to avoid wiping data between industries
        # Check if any vertices exist first
        vertex_count = neptune_client.submit("g.V().count()").all().result()[0]
        if vertex_count > 0 and industry == 'Banking':
            print(f"Clearing existing Neptune data (found {vertex_count} vertices)...")
            neptune_client.submit("g.V().drop()").all().result()
            print("Neptune cleared")
        else:
            print(f"Skipping clear for {industry} (vertex_count={vertex_count})")
        
        # Insert nodes with custom node_id property
        nodes_inserted = 0
        node_label_map = {}
        
        for node in nodes:
            query = f"g.addV('{node['label']}').property('node_id', '{node['id']}')"
            node_label_map[node['id']] = node['label']
            
            # Add properties
            for key, value in node['properties'].items():
                if isinstance(value, str):
                    query += f".property('{key}', '{value}')"
                else:
                    query += f".property('{key}', {value})"
            
            neptune_client.submit(query).all().result()
            nodes_inserted += 1
            print(f"Inserted node: {node['id']}")
        
        # Insert edges - use as() to store source vertex, then reference it in to()
        edges_inserted = 0
        for edge in edges:
            from_label = node_label_map.get(edge['from'], 'Account')
            to_label = node_label_map.get(edge['to'], 'Account')
            
            # Build edge query using as() to store source vertex reference
            # Pattern: g.V().has(...).as('a').V().has(...).addE(...).from('a')
            query = f"g.V().hasLabel('{from_label}').has('node_id', '{edge['from']}').as('source').V().hasLabel('{to_label}').has('node_id', '{edge['to']}').addE('{edge['label']}').from('source')"
            
            # Add properties
            for key, value in edge['properties'].items():
                if isinstance(value, str):
                    query += f".property('{key}', '{value}')"
                else:
                    query += f".property('{key}', {value})"
            
            neptune_client.submit(query).all().result()
            edges_inserted += 1
            print(f"Inserted edge: {edge['from']} -> {edge['to']}")
        
        return {
            'nodes': nodes_inserted,
            'edges': edges_inserted
        }
    
    finally:
        neptune_client.close()


def send_cfn_response(event: Dict[str, Any], context: Any, status: str, 
                      response_data: Dict[str, Any], physical_resource_id: str = None):
    """
    Send response to CloudFormation custom resource.
    
    Args:
        event: CloudFormation event
        context: Lambda context
        status: SUCCESS or FAILED
        response_data: Data to return to CloudFormation
        physical_resource_id: Physical resource ID
    """
    response_url = event.get('ResponseURL')
    if not response_url:
        print("No ResponseURL in event, skipping CFN response")
        return
    
    response_body = {
        'Status': status,
        'Reason': f'See CloudWatch Log Stream: {context.log_stream_name}',
        'PhysicalResourceId': physical_resource_id or context.log_stream_name,
        'StackId': event['StackId'],
        'RequestId': event['RequestId'],
        'LogicalResourceId': event['LogicalResourceId'],
        'Data': response_data
    }
    
    json_response = json.dumps(response_body)
    
    headers = {
        'content-type': '',
        'content-length': str(len(json_response))
    }
    
    try:
        http.request('PUT', response_url, body=json_response, headers=headers)
        print(f"CloudFormation response sent: {status}")
    except Exception as e:
        print(f"Failed to send CloudFormation response: {str(e)}")


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for seeding demo data.
    
    Supports two invocation modes:
    1. CloudFormation custom resource (Create/Update/Delete)
    2. Direct invocation with industry parameter
    
    Args:
        event: Lambda event containing RequestType (for CFN) or industry
        context: Lambda context
        
    Returns:
        Response with seeding results
    """
    print(f"Received event: {json.dumps(event)}")
    
    # Check if this is a CloudFormation custom resource request
    request_type = event.get('RequestType')
    
    if request_type:
        # CloudFormation custom resource mode - ALWAYS respond to CFN
        try:
            if request_type in ['Create', 'Update']:
                # Get industries to seed from resource properties
                industries = event.get('ResourceProperties', {}).get('Industries', 
                    ['Banking', 'Healthcare', 'Retail', 'HROperations'])
                
                results = {}
                for industry in industries:
                    print(f"Seeding data for {industry}...")
                    
                    # Seed DynamoDB
                    dynamodb_count = seed_dynamodb_records(industry)
                    
                    # Seed Neptune
                    neptune_counts = seed_neptune_graph(industry)
                    
                    results[industry] = {
                        'dynamodb_records': dynamodb_count,
                        'neptune_nodes': neptune_counts['nodes'],
                        'neptune_edges': neptune_counts['edges']
                    }
                
                send_cfn_response(event, context, 'SUCCESS', results)
                return {'statusCode': 200, 'body': json.dumps(results)}
            
            elif request_type == 'Delete':
                # On delete, just acknowledge (don't delete data for demo purposes)
                send_cfn_response(event, context, 'SUCCESS', 
                    {'message': 'Seed data preserved for demo purposes'})
                return {'statusCode': 200, 'body': 'Delete acknowledged'}
        
        except Exception as e:
            error_msg = f"Failed to seed data: {str(e)}"
            logger.error(error_msg, exc_info=True)
            # CRITICAL: Always send response to CloudFormation to prevent hanging
            try:
                send_cfn_response(event, context, 'FAILED', {'error': error_msg})
            except Exception as send_error:
                logger.error(f"Failed to send CFN response: {str(send_error)}")
            # Return error response but don't raise to ensure CFN gets notified
            return {'statusCode': 500, 'body': json.dumps({'error': error_msg})}
    
    else:
        # Direct invocation mode
        industry = event.get('industry')
        if not industry:
            raise ValueError("Missing 'industry' parameter")
        
        print(f"Seeding data for {industry}...")
        
        # Seed DynamoDB
        dynamodb_count = seed_dynamodb_records(industry)
        
        # Seed Neptune
        neptune_counts = seed_neptune_graph(industry)
        
        result = {
            'industry': industry,
            'dynamodb_records': dynamodb_count,
            'neptune_nodes': neptune_counts['nodes'],
            'neptune_edges': neptune_counts['edges']
        }
        
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }

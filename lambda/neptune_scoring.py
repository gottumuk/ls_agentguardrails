"""
Neptune Trust Graph Scoring Lambda Function

This Lambda function executes Gremlin traversal queries on Amazon Neptune
to calculate trust scores based on proximity to risk clusters.

Requirements: 4.2, 4.3, 4.6, 4.7, 4.8, 2.5, 4.9
"""

import json
import os
import uuid
from datetime import datetime
from typing import Dict, Any, List, Tuple

import boto3
from gremlin_python.driver import client, serializer
from gremlin_python.driver.protocol import GremlinServerError
from botocore.exceptions import ClientError


# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')

# Environment variables
AUDIT_TRAIL_TABLE = os.environ.get('AUDIT_TRAIL_TABLE', 'AuditTrailTable')
NEPTUNE_ENDPOINT = os.environ.get('NEPTUNE_ENDPOINT', 'localhost')
NEPTUNE_PORT = int(os.environ.get('NEPTUNE_PORT', '8182'))
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')

# Industry-specific risk cluster types
RISK_CLUSTER_TYPES = {
    'Banking': 'fraud_cluster',
    'Healthcare': 'prescription_mill',
    'Retail': 'refund_ring',
    'HROperations': 'legal_case'
}

# Trust score configuration
BASE_TRUST_SCORE = 100
VERDICT_THRESHOLD = 60


def get_neptune_client():
    """
    Create and return a Gremlin client for Neptune.
    
    Requirements: 4.2
    """
    neptune_url = f'wss://{NEPTUNE_ENDPOINT}:{NEPTUNE_PORT}/gremlin'
    
    return client.Client(
        neptune_url,
        'g',
        message_serializer=serializer.GraphSONSerializersV2d0()
    )


def build_gremlin_query(target_node_id: str, risk_cluster_type: str) -> str:
    """
    Build Gremlin traversal query for up to 2-hop risk cluster detection.
    
    The query finds paths from target node to risk clusters within 1-2 hops.
    Uses emit-first pattern to capture paths at each step.
    
    Requirements: 4.2, 4.3, 2.5, 4.9
    """
    # Use emit-first pattern and filter to only vertices in path
    # This avoids including edges which would double the hop count
    query = f"""
g.V().has('node_id', '{target_node_id}')
  .repeat(both().simplePath())
  .emit(hasLabel('RiskCluster').has('cluster_type', '{risk_cluster_type}'))
  .times(2)
  .path()
  .by(valueMap(true))
""".strip()
    
    return query


def execute_gremlin_query(gremlin_client, query: str) -> List[Any]:
    """
    Execute Gremlin query and return results.
    
    Requirements: 4.2, 4.8
    """
    try:
        result_set = gremlin_client.submit(query)
        results = result_set.all().result()
        return results
    except GremlinServerError as e:
        print(f"Gremlin query error: {str(e)}")
        raise ValueError(f"Neptune query failed: {str(e)}")
    except Exception as e:
        print(f"Unexpected error executing Gremlin query: {str(e)}")
        raise


def parse_traversal_results(results: List[Any]) -> List[Dict[str, Any]]:
    """
    Parse Gremlin traversal results into structured path data.
    
    Requirements: 4.2
    """
    parsed_paths = []
    
    for path in results:
        # Path contains only vertices (nodes) since we used both() not bothE()
        nodes = []
        
        for element in path:
            if isinstance(element, dict):
                # Extract node_id from properties
                node_id = element.get('node_id', [''])[0] if isinstance(element.get('node_id'), list) else element.get('node_id', '')
                
                # Extract label
                label_value = element.get('label', [''])[0] if isinstance(element.get('label'), list) else element.get('label', '')
                
                # Extract all properties
                properties = {}
                for key, value in element.items():
                    if key not in ['id', 'label']:
                        properties[key] = value[0] if isinstance(value, list) and len(value) > 0 else value
                
                nodes.append({
                    'id': str(node_id),
                    'label': label_value,
                    'properties': properties
                })
        
        if nodes:
            parsed_paths.append({
                'nodes': nodes,
                'edges': []
            })
    
    return parsed_paths


def calculate_trust_score(target_node_id: str, traversal_paths: List[Dict[str, Any]]) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Calculate trust score based on risk cluster proximity.
    
    Algorithm:
    - Base score: 100
    - Direct connection (1 hop): Deduct risk_level * 30 points
    - 2-hop connection: Deduct risk_level * 15 points
    - Floor at 0
    
    Requirements: 4.3, 4.6, 4.7
    """
    score = BASE_TRUST_SCORE
    risk_factors = []
    
    for path in traversal_paths:
        nodes = path['nodes']
        
        # Calculate hop distance (number of nodes - 1)
        hops = len(nodes) - 1
        
        # Find the risk cluster node (should be the last node in the path)
        risk_cluster_node = None
        for node in nodes:
            if node['label'] == 'RiskCluster':
                risk_cluster_node = node
                break
        
        if risk_cluster_node:
            # Get risk level from the cluster node properties
            risk_level = risk_cluster_node['properties'].get('risk_level', 2)
            
            # Convert to int if it's a string
            if isinstance(risk_level, str):
                try:
                    risk_level = int(risk_level)
                except ValueError:
                    risk_level = 2  # Default to medium risk
            
            # Calculate deduction based on hop distance
            if hops == 1:
                deduction = risk_level * 30
                proximity = 'direct'
            elif hops == 2:
                deduction = risk_level * 15
                proximity = '2-hop'
            else:
                deduction = 0
                proximity = f'{hops}-hop'
            
            score -= deduction
            
            # Record risk factor
            cluster_type = risk_cluster_node['properties'].get('cluster_type', 'unknown')
            description = risk_cluster_node['properties'].get('description', f'Risk cluster detected at {proximity} distance')
            
            risk_factors.append({
                'type': f'{cluster_type}_proximity',
                'description': f'{description} ({proximity} connection)',
                'score_impact': -deduction,
                'risk_level': risk_level,
                'hops': hops
            })
    
    # Floor at 0
    score = max(score, 0)
    
    return score, risk_factors


def determine_verdict(trust_score: int) -> str:
    """
    Determine verdict based on trust score threshold.
    
    - Score >= 60: PROCEED (action allowed)
    - Score < 60: ESCALATE (requires human approval)
    
    Requirements: 4.6, 4.7
    """
    return 'PROCEED' if trust_score >= VERDICT_THRESHOLD else 'ESCALATE'


def write_audit_trail(score_result: Dict[str, Any]) -> None:
    """
    Write trust score result to DynamoDB audit trail.
    
    Requirements: 4.8
    """
    table = dynamodb.Table(AUDIT_TRAIL_TABLE)
    
    # Convert all numeric values to int to avoid Decimal issues
    audit_entry = {
        'event_id': str(score_result['score_id']),
        'timestamp': int(score_result['timestamp']),
        'event_type': 'TRUST_SCORE_CALCULATED',
        'demo_id': 3,
        'industry_context': score_result['industry_context'],
        'event_data': {
            'score_id': str(score_result['score_id']),
            'target_node_id': score_result['target_node_id'],
            'trust_score': int(score_result['trust_score']),
            'verdict': score_result['verdict'],
            'risk_factors': score_result['risk_factors'],
            'latency_ms': int(score_result['latency_ms'])
        }
    }
    
    table.put_item(Item=audit_entry)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for Neptune trust scoring requests.
    
    Expected event format:
    {
        "target_node_id": "ACCOUNT-001",
        "industry_context": "Banking"
    }
    
    Requirements: 4.2, 4.3, 4.6, 4.7, 4.8, 2.5, 4.9
    """
    start_time = datetime.now()
    gremlin_client = None
    
    try:
        # Parse API Gateway proxy integration event
        if 'body' in event and isinstance(event['body'], str):
            body = json.loads(event['body'])
        else:
            body = event
        
        # Extract and validate input
        target_node_id = body.get('target_node_id', '')
        industry_context = body.get('industry_context', 'Banking')
        
        if not target_node_id:
            return {
                'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                    'error': True,
                    'message': 'target_node_id is required'
                })
            }
        
        # Validate industry context
        if industry_context not in RISK_CLUSTER_TYPES:
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
        
        # Get industry-specific risk cluster type
        risk_cluster_type = RISK_CLUSTER_TYPES[industry_context]
        
        # Build Gremlin query
        gremlin_query = build_gremlin_query(target_node_id, risk_cluster_type)
        
        if LOG_LEVEL == 'DEBUG':
            print(f"Executing Gremlin query: {gremlin_query}")
        
        # Connect to Neptune and execute query
        gremlin_client = get_neptune_client()
        
        # First, verify the target node exists
        verify_query = f"g.V().has('node_id', '{target_node_id}').count()"
        node_count = gremlin_client.submit(verify_query).all().result()[0]
        print(f"Target node '{target_node_id}' exists: {node_count > 0} (count={node_count})")
        
        # Verify risk clusters exist
        risk_query = f"g.V().hasLabel('RiskCluster').has('cluster_type', '{risk_cluster_type}').count()"
        risk_count = gremlin_client.submit(risk_query).all().result()[0]
        print(f"RiskCluster nodes with type '{risk_cluster_type}' exist: {risk_count > 0} (count={risk_count})")
        
        query_results = execute_gremlin_query(gremlin_client, gremlin_query)
        
        print(f"Query returned {len(query_results)} results")
        if LOG_LEVEL == 'DEBUG' or len(query_results) == 0:
            print(f"Raw query results: {query_results}")
        
        # Parse traversal results
        traversal_paths = parse_traversal_results(query_results)
        
        print(f"Parsed {len(traversal_paths)} traversal paths")
        
        # Calculate trust score
        trust_score, risk_factors = calculate_trust_score(target_node_id, traversal_paths)
        
        # Determine verdict
        verdict = determine_verdict(trust_score)
        
        # Calculate latency
        end_time = datetime.now()
        latency_ms = int((end_time - start_time).total_seconds() * 1000)
        
        # Build result - convert all numeric types to int to avoid Decimal issues
        result = {
            'score_id': str(uuid.uuid4()),
            'timestamp': int(datetime.now().timestamp()),
            'target_node_id': target_node_id,
            'industry_context': industry_context,
            'trust_score': int(trust_score),
            'verdict': verdict,
            'risk_factors': [
                {
                    'type': rf['type'],
                    'description': rf['description'],
                    'score_impact': int(rf['score_impact']),
                    'risk_level': int(rf['risk_level']),
                    'hops': int(rf['hops'])
                }
                for rf in risk_factors
            ],
            'traversal_paths': traversal_paths,
            'gremlin_query': gremlin_query,
            'latency_ms': int(latency_ms)
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
            'body': json.dumps(result, default=str)
        }
        
    except ValueError as e:
        # Query error or validation error
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
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        # Log error
        print(f"AWS Service Error: {error_code} - {error_message}")
        
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                'error': True,
                'service': 'DynamoDB',
                'message': f'AWS service error: {error_message}'
            })
        }
        
    except Exception as e:
        # Neptune connection or unexpected error
        print(f"Unexpected Error: {str(e)}")
        
        # Check if it's a Neptune connection error
        error_message = str(e)
        if 'neptune' in error_message.lower() or 'gremlin' in error_message.lower():
            return {
                'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({
                    'error': True,
                    'service': 'Neptune',
                    'message': f'Neptune connection error: {error_message}'
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
                'message': 'Internal server error'
            })
        }
        
    finally:
        # Close Gremlin client connection
        if gremlin_client:
            try:
                gremlin_client.close()
            except Exception as e:
                print(f"Error closing Gremlin client: {str(e)}")


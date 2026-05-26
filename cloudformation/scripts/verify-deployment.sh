#!/bin/bash
set -e

# AWS Agent Governance Demos - Post-Deployment Verification Script
# Usage: ./verify-deployment.sh <environment>
# Example: ./verify-deployment.sh dev

ENVIRONMENT=${1:-dev}
STACK_NAME="aws-governance-demos-${ENVIRONMENT}"
REGION=${AWS_REGION:-us-east-1}

echo "=========================================="
echo "Post-Deployment Verification"
echo "=========================================="
echo "Environment: ${ENVIRONMENT}"
echo "Stack Name: ${STACK_NAME}"
echo "Region: ${REGION}"
echo ""

# Check stack status
echo "1. Checking stack status..."
STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [ "$STACK_STATUS" == "CREATE_COMPLETE" ] || [ "$STACK_STATUS" == "UPDATE_COMPLETE" ]; then
    echo "  ✓ Stack status: ${STACK_STATUS}"
else
    echo "  ✗ Stack status: ${STACK_STATUS}"
    exit 1
fi

# Get stack outputs
OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs' \
    --output json)

# Extract resource identifiers
API_ENDPOINT=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="RestApiEndpoint") | .OutputValue')
WEBSOCKET_ENDPOINT=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="WebSocketApiEndpoint") | .OutputValue')
SENSITIVE_RECORDS_TABLE=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="SensitiveRecordsTable") | .OutputValue')
AUDIT_TRAIL_TABLE=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="AuditTrailTable") | .OutputValue')
NEPTUNE_ENDPOINT=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="NeptuneEndpoint") | .OutputValue')

# Verify Lambda functions
echo ""
echo "2. Verifying Lambda functions..."
LAMBDA_FUNCTIONS=(
    "TACTEvaluationLambda"
    "GuardrailsQueryLambda"
    "NeptuneScoringLambda"
    "ApprovalWorkflowLambda"
    "ApprovalDecisionLambda"
    "AuditTrailLambda"
    "ObservabilityLambda"
    "ResetDemoLambda"
)

for func in "${LAMBDA_FUNCTIONS[@]}"; do
    FUNCTION_NAME="${STACK_NAME}-${func}"
    if aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION} &>/dev/null; then
        echo "  ✓ ${func}"
    else
        echo "  ✗ ${func} not found"
    fi
done

# Verify DynamoDB tables
echo ""
echo "3. Verifying DynamoDB tables..."
if [ -n "$SENSITIVE_RECORDS_TABLE" ]; then
    TABLE_STATUS=$(aws dynamodb describe-table \
        --table-name ${SENSITIVE_RECORDS_TABLE} \
        --region ${REGION} \
        --query 'Table.TableStatus' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$TABLE_STATUS" == "ACTIVE" ]; then
        RECORD_COUNT=$(aws dynamodb scan \
            --table-name ${SENSITIVE_RECORDS_TABLE} \
            --select COUNT \
            --region ${REGION} \
            --query 'Count' \
            --output text)
        echo "  ✓ Sensitive Records Table (${RECORD_COUNT} records)"
    else
        echo "  ✗ Sensitive Records Table status: ${TABLE_STATUS}"
    fi
fi

if [ -n "$AUDIT_TRAIL_TABLE" ]; then
    TABLE_STATUS=$(aws dynamodb describe-table \
        --table-name ${AUDIT_TRAIL_TABLE} \
        --region ${REGION} \
        --query 'Table.TableStatus' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$TABLE_STATUS" == "ACTIVE" ]; then
        echo "  ✓ Audit Trail Table"
    else
        echo "  ✗ Audit Trail Table status: ${TABLE_STATUS}"
    fi
fi

# Verify Neptune cluster
echo ""
echo "4. Verifying Neptune cluster..."
if [ -n "$NEPTUNE_ENDPOINT" ] && [ "$NEPTUNE_ENDPOINT" != "null" ]; then
    CLUSTER_ID=$(echo $NEPTUNE_ENDPOINT | cut -d'.' -f1)
    CLUSTER_STATUS=$(aws neptune describe-db-clusters \
        --db-cluster-identifier ${CLUSTER_ID} \
        --region ${REGION} \
        --query 'DBClusters[0].Status' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$CLUSTER_STATUS" == "available" ]; then
        echo "  ✓ Neptune cluster available"
    else
        echo "  ⚠ Neptune cluster status: ${CLUSTER_STATUS}"
    fi
else
    echo "  ⚠ Neptune endpoint not found"
fi

# Verify API Gateway
echo ""
echo "5. Verifying API Gateway..."
if [ -n "$API_ENDPOINT" ] && [ "$API_ENDPOINT" != "null" ]; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${API_ENDPOINT}/health 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "404" ]; then
        echo "  ✓ REST API endpoint accessible: ${API_ENDPOINT}"
    else
        echo "  ⚠ REST API endpoint returned HTTP ${HTTP_STATUS}"
    fi
else
    echo "  ⚠ REST API endpoint not found"
fi

if [ -n "$WEBSOCKET_ENDPOINT" ] && [ "$WEBSOCKET_ENDPOINT" != "null" ]; then
    echo "  ✓ WebSocket API endpoint: ${WEBSOCKET_ENDPOINT}"
else
    echo "  ⚠ WebSocket endpoint not found"
fi

# Verify Step Functions state machine
echo ""
echo "6. Verifying Step Functions..."
STATE_MACHINE_ARN=$(aws stepfunctions list-state-machines \
    --region ${REGION} \
    --query "stateMachines[?contains(name, '${STACK_NAME}')].stateMachineArn" \
    --output text 2>/dev/null || echo "")

if [ -n "$STATE_MACHINE_ARN" ]; then
    echo "  ✓ Approval workflow state machine found"
else
    echo "  ⚠ State machine not found"
fi

# Verify CloudWatch Log Groups
echo ""
echo "7. Verifying CloudWatch Log Groups..."
LOG_GROUP_COUNT=$(aws logs describe-log-groups \
    --region ${REGION} \
    --query "logGroups[?contains(logGroupName, '${STACK_NAME}')] | length(@)" \
    --output text)

echo "  ✓ CloudWatch Log Groups: ${LOG_GROUP_COUNT}"

# Verify IAM roles
echo ""
echo "8. Verifying IAM roles..."
ROLE_COUNT=$(aws iam list-roles \
    --query "Roles[?contains(RoleName, '${STACK_NAME}')] | length(@)" \
    --output text)

echo "  ✓ IAM Roles: ${ROLE_COUNT}"

# Test Lambda invocation (optional)
echo ""
echo "9. Testing Lambda invocation (optional)..."
read -p "Test TACT Evaluation Lambda? (yes/no): " TEST_LAMBDA

if [ "$TEST_LAMBDA" == "yes" ]; then
    FUNCTION_NAME="${STACK_NAME}-TACTEvaluationLambda"
    TEST_PAYLOAD='{"action_proposal":"Test action","industry_context":"Banking"}'
    
    echo "Invoking ${FUNCTION_NAME}..."
    RESPONSE=$(aws lambda invoke \
        --function-name ${FUNCTION_NAME} \
        --payload "${TEST_PAYLOAD}" \
        --region ${REGION} \
        /tmp/lambda-response.json 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "  ✓ Lambda invocation successful"
        echo "  Response: $(cat /tmp/lambda-response.json)"
        rm /tmp/lambda-response.json
    else
        echo "  ✗ Lambda invocation failed"
        echo "  Error: ${RESPONSE}"
    fi
fi

# Summary
echo ""
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo ""
echo "Stack Status: ${STACK_STATUS}"
echo "API Endpoint: ${API_ENDPOINT:-Not configured}"
echo "WebSocket Endpoint: ${WEBSOCKET_ENDPOINT:-Not configured}"
echo "Neptune Endpoint: ${NEPTUNE_ENDPOINT:-Not configured}"
echo ""
echo "Next steps:"
echo "  1. Test demo functionality in the frontend UI"
echo "  2. Configure Bedrock Guardrails policies"
echo "  3. Seed demo data if not already done"
echo "  4. Monitor CloudWatch Logs for errors"
echo "  5. Review CloudTrail for API activity"

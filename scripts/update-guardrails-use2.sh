#!/bin/bash
# Quick update for Guardrails policies in us-east-2
set -e

REGION="us-east-2"
STACK_NAME="aws-agent-governance-demos-use2"
BUCKET="aws-governance-demos-use2-1773692569"

echo "Updating Guardrails policies in ${STACK_NAME}..."
echo ""

# Update the stack with existing parameters
aws cloudformation update-stack \
  --stack-name ${STACK_NAME} \
  --template-body file://cloudformation/main-stack.yaml \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=Environment,ParameterValue=staging \
    ParameterKey=TemplateBucket,ParameterValue=${BUCKET} \
    ParameterKey=LambdaCodeBucket,ParameterValue=${BUCKET} \
    ParameterKey=LambdaMemorySize,ParameterValue=512 \
    ParameterKey=LambdaTimeout,ParameterValue=30 \
    ParameterKey=LogLevel,ParameterValue=INFO \
    ParameterKey=NeptuneMinCapacity,ParameterValue=2.5 \
    ParameterKey=NeptuneMaxCapacity,ParameterValue=4.5 \
    ParameterKey=ApiGatewayRateLimit,ParameterValue=100 \
    ParameterKey=ApiGatewayBurstLimit,ParameterValue=200 \
  --region ${REGION}

echo ""
echo "Update initiated. Monitoring progress..."
echo ""

# Wait for update to complete
aws cloudformation wait stack-update-complete \
  --stack-name ${STACK_NAME} \
  --region ${REGION}

echo ""
echo "✓ Guardrails policies updated successfully in ${REGION}"
echo ""
echo "Verify with:"
echo "  aws bedrock get-guardrail --guardrail-identifier <id> --region ${REGION}"

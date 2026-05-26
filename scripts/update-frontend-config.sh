#!/bin/bash
# Update frontend config.json with CloudFormation outputs
set -e

REGION=${1:-us-east-2}
STACK_NAME=${2:-aws-agent-governance-demos-use2}

echo "Updating frontend config for ${STACK_NAME} in ${REGION}..."

# Get outputs from CloudFormation
API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayURL`].OutputValue' --output text)
WS_ENDPOINT=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==`WebSocketApiURL`].OutputValue' --output text)
FRONTEND_BUCKET=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' --output text)
CLOUDFRONT_ID=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' --output text)

echo "API Endpoint: ${API_ENDPOINT}"
echo "WebSocket Endpoint: ${WS_ENDPOINT}"
echo "Frontend Bucket: ${FRONTEND_BUCKET}"

# Create config.json
cat > /tmp/config.json << EOF
{
  "apiEndpoint": "${API_ENDPOINT}",
  "websocketEndpoint": "${WS_ENDPOINT}",
  "region": "${REGION}",
  "environment": "staging"
}
EOF

# Upload to S3
aws s3 cp /tmp/config.json s3://${FRONTEND_BUCKET}/config.json --region ${REGION}
echo "✓ Config uploaded to S3"

# Invalidate CloudFront
if [ ! -z "$CLOUDFRONT_ID" ]; then
  aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_ID} --paths "/config.json" --region ${REGION}
  echo "✓ CloudFront cache invalidated"
fi

echo "Frontend config updated successfully!"

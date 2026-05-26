#!/bin/bash
set -e

# Complete deployment script for AWS Agent Governance Demos
# This script handles EVERYTHING: Lambda packaging, CloudFormation, frontend build & upload

REGION="${1:-us-west-2}"
ENVIRONMENT="${2:-staging}"
STACK_NAME="aws-agent-governance-demos-${REGION}"
BUCKET_NAME="aws-governance-demos-${REGION}-$(date +%s)"

echo "=========================================="
echo "AWS Agent Governance Demos - Full Deploy"
echo "=========================================="
echo "Region: $REGION"
echo "Environment: $ENVIRONMENT"
echo "Stack: $STACK_NAME"
echo ""

# Step 1: Create S3 bucket if it doesn't exist
echo "Step 1: Setting up S3 bucket..."
if aws s3 ls "s3://${BUCKET_NAME}" --region $REGION 2>&1 | grep -q 'NoSuchBucket'; then
    aws s3 mb "s3://${BUCKET_NAME}" --region $REGION
    echo "✓ Created bucket: $BUCKET_NAME"
else
    echo "✓ Bucket exists: $BUCKET_NAME"
fi

# Step 2: Package ALL Lambda functions
echo -e "\nStep 2: Packaging Lambda functions..."
cd lambda
for func in tact_evaluation guardrails_query neptune_scoring approval_workflow approval_decision sns_notification audit_trail observability reset_demo seed_data; do
    if [ -f "${func}.py" ]; then
        echo "  Packaging ${func}..."
        zip -q ${func}.zip ${func}.py
    fi
done
echo "✓ All Lambda functions packaged"

# Step 3: Upload Lambda functions to S3
echo -e "\nStep 3: Uploading Lambda functions..."
aws s3 sync . "s3://${BUCKET_NAME}/lambda/" --exclude "*" --include "*.zip" --region $REGION --quiet
echo "✓ Lambda functions uploaded"
cd ..

# Step 4: Upload CloudFormation templates
echo -e "\nStep 4: Uploading CloudFormation templates..."
aws s3 sync cloudformation/nested-stacks/ "s3://${BUCKET_NAME}/nested-stacks/" --region $REGION --quiet
echo "✓ Nested stacks uploaded"

# Step 5: Package main stack
echo -e "\nStep 5: Packaging main CloudFormation stack..."
cd cloudformation
aws cloudformation package \
    --template-file main-stack.yaml \
    --s3-bucket $BUCKET_NAME \
    --s3-prefix cloudformation \
    --output-template-file packaged-main-stack.yaml \
    --region $REGION --quiet

aws s3 cp packaged-main-stack.yaml "s3://${BUCKET_NAME}/main-stack.yaml" --region $REGION --quiet
echo "✓ Main stack packaged and uploaded"
cd ..

# Step 6: Create parameter file
echo -e "\nStep 6: Creating parameter file..."
cat > cloudformation/parameters/deploy-params.json <<EOF
[
  {
    "ParameterKey": "Environment",
    "ParameterValue": "$ENVIRONMENT"
  },
  {
    "ParameterKey": "TemplateBucket",
    "ParameterValue": "$BUCKET_NAME"
  },
  {
    "ParameterKey": "LambdaCodeBucket",
    "ParameterValue": "$BUCKET_NAME"
  },
  {
    "ParameterKey": "LambdaMemorySize",
    "ParameterValue": "512"
  },
  {
    "ParameterKey": "LambdaTimeout",
    "ParameterValue": "30"
  },
  {
    "ParameterKey": "LogLevel",
    "ParameterValue": "INFO"
  },
  {
    "ParameterKey": "ApiGatewayRateLimit",
    "ParameterValue": "100"
  },
  {
    "ParameterKey": "ApiGatewayBurstLimit",
    "ParameterValue": "200"
  }
]
EOF
echo "✓ Parameter file created"

# Step 7: Deploy CloudFormation stack
echo -e "\nStep 7: Deploying CloudFormation stack..."
echo "This will take 15-20 minutes (Neptune cluster is slow)..."

aws cloudformation create-stack \
    --stack-name $STACK_NAME \
    --template-url "https://s3.${REGION}.amazonaws.com/${BUCKET_NAME}/main-stack.yaml" \
    --parameters file://cloudformation/parameters/deploy-params.json \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $REGION

echo "✓ Stack creation initiated"
echo "Waiting for stack to complete..."

aws cloudformation wait stack-create-complete \
    --stack-name $STACK_NAME \
    --region $REGION

echo "✓ Stack deployed successfully"

# Step 8: Get stack outputs
echo -e "\nStep 8: Retrieving stack outputs..."
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayURL`].OutputValue' \
    --output text)

WS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`WebSocketApiURL`].OutputValue' \
    --output text)

IDENTITY_POOL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`IdentityPoolId`].OutputValue' \
    --output text)

FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
    --output text)

CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text)

FRONTEND_URL=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendURL`].OutputValue' \
    --output text)

echo "✓ Stack outputs retrieved"

# Step 9: Create frontend config
echo -e "\nStep 9: Creating frontend configuration..."
cat > frontend/src/config/deploy.ts <<EOF
export const deployConfig = {
  environment: '$ENVIRONMENT' as const,
  
  api: {
    restEndpoint: '$API_ENDPOINT',
    websocketEndpoint: '$WS_ENDPOINT',
    apiKey: '',
  },
  
  aws: {
    region: '$REGION',
    identityPoolId: '$IDENTITY_POOL',
    
    cloudwatch: {
      logGroupPrefix: '/aws/lambda/',
      pollingIntervalMs: 1000,
      maxLogEvents: 50,
    },
    
    dynamodb: {
      auditTrailTable: '${STACK_NAME}-AuditTrail',
      sensitiveRecordsTable: '${STACK_NAME}-SensitiveRecords',
      workflowStateTable: '${STACK_NAME}-WorkflowState',
    },
  },
  
  rateLimit: {
    requestsPerMinute: 100,
    burstLimit: 200,
  },
  
  logging: {
    level: 'INFO' as const,
    enableConsole: true,
    enableCloudWatch: false,
  },
  
  features: {
    enableTwitchIntegration: false,
    enableAudienceVoting: true,
    enableCustomInput: true,
    enableObservabilitySidebar: true,
    enableMultiScreenLayout: true,
  },
  
  demo: {
    tact: {
      timeoutMs: 10000,
      bedrockModel: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      temperature: 0.0,
      maxTokens: 1000,
    },
    guardrails: {
      timeoutMs: 10000,
      latencyWarningThresholdMs: 100,
      latencyErrorThresholdMs: 500,
    },
    neptune: {
      timeoutMs: 10000,
      trustScoreThreshold: 60,
      maxTraversalHops: 2,
    },
    approval: {
      timeoutMs: 900000,
      votingDurationMs: 60000,
      countdownWarningThresholds: [300000, 60000],
    },
  },
  
  websocket: {
    reconnectAttempts: 5,
    reconnectDelayMs: 1000,
    reconnectBackoffMultiplier: 2,
    pingIntervalMs: 30000,
    connectionTimeoutMs: 10000,
  },
  
  ui: {
    contextSwitchDelayMs: 500,
    visualizationUpdateDelayMs: 200,
    autoScrollLogs: true,
    syntaxHighlighting: true,
  },
};

export type EnvironmentConfig = typeof deployConfig;
EOF

# Update index.ts to use deploy config
cat > frontend/src/config/index.ts <<EOF
import { deployConfig } from './deploy';

export const config = deployConfig;

console.log('Using deploy config');
console.log('REST API:', config.api.restEndpoint);
console.log('WebSocket:', config.api.websocketEndpoint);

export type EnvironmentConfig = typeof deployConfig;
EOF

echo "✓ Frontend config created"

# Step 10: Build frontend
echo -e "\nStep 10: Building frontend..."
cd frontend
npm run build
echo "✓ Frontend built"

# Step 11: Upload frontend to S3
echo -e "\nStep 11: Uploading frontend to S3..."
aws s3 sync dist/ "s3://${FRONTEND_BUCKET}/" --region $REGION --delete --quiet
echo "✓ Frontend uploaded"

# Step 12: Invalidate CloudFront cache
echo -e "\nStep 12: Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_ID \
    --paths "/*" \
    --region $REGION --output json > /dev/null
echo "✓ CloudFront cache invalidated"
cd ..

# Done!
echo ""
echo "=========================================="
echo "✓ DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Frontend URL: $FRONTEND_URL"
echo "API Endpoint: $API_ENDPOINT"
echo "WebSocket: $WS_ENDPOINT"
echo "Region: $REGION"
echo "Stack: $STACK_NAME"
echo ""
echo "The UI will be available in 1-2 minutes after CloudFront cache clears."
echo ""
echo "To clean up everything:"
echo "  ./cleanup-usw2.sh"
echo ""

#!/bin/bash
set -e

# Clean Deployment Script for AWS Agent Governance Demos
# This script performs a fresh deployment with all fixes baked into CloudFormation templates

# Load configuration
CONFIG_FILE="deployment-config.json"
ADHOC_FIXES_LOG="adhoc-fixes-$(date +%Y%m%d-%H%M%S).log"

# Parse command line arguments
REGION=${1:-us-east-2}
STACK_NAME_SUFFIX=${2:-use2}

echo "=== AWS Agent Governance Demos - Clean Deployment ==="
echo "Region: $REGION"
echo "Stack Name Suffix: $STACK_NAME_SUFFIX"
echo ""

# Validate region
if ! aws ec2 describe-regions --region us-east-1 --query "Regions[?RegionName=='$REGION'].RegionName" --output text | grep -q "$REGION"; then
    echo "Error: Invalid AWS region: $REGION"
    exit 1
fi

# Set variables
STACK_NAME="aws-agent-governance-demos-${STACK_NAME_SUFFIX}"
BUCKET_NAME="aws-governance-demos-${STACK_NAME_SUFFIX}-$(date +%s)"
ENVIRONMENT="staging"

echo "Stack Name: $STACK_NAME"
echo "S3 Bucket: $BUCKET_NAME"
echo ""

# Create S3 bucket for deployment artifacts
echo "Step 1: Creating S3 bucket for deployment artifacts..."
aws s3 mb s3://${BUCKET_NAME} --region ${REGION}
echo "✓ S3 bucket created"
echo ""

# Package Lambda functions
echo "Step 2: Packaging Lambda functions..."
./scripts/package-lambdas.sh
echo "✓ Lambda functions packaged"
echo ""

# Upload Lambda packages to S3
echo "Step 3: Uploading Lambda packages..."
for zip_file in lambda/*.zip; do
    if [ -f "$zip_file" ]; then
        aws s3 cp "$zip_file" s3://${BUCKET_NAME}/lambda/ --region ${REGION}
        echo "  Uploaded: $(basename $zip_file)"
    fi
done
echo "✓ Lambda packages uploaded"
echo ""

# Upload Lambda layers to S3
echo "Step 3.5: Uploading Lambda layers..."
if [ -d "layers" ]; then
    for zip_file in layers/*.zip; do
        if [ -f "$zip_file" ]; then
            aws s3 cp "$zip_file" s3://${BUCKET_NAME}/layers/ --region ${REGION}
            echo "  Uploaded: $(basename $zip_file)"
        fi
    done
    echo "✓ Lambda layers uploaded"
else
    echo "⚠ No layers directory found, skipping"
fi
echo ""

# Upload CloudFormation templates
echo "Step 4: Uploading CloudFormation templates..."
aws s3 cp cloudformation/nested-stacks/ s3://${BUCKET_NAME}/cloudformation/nested-stacks/ --recursive --region ${REGION}
echo "✓ CloudFormation templates uploaded"
echo ""

# Deploy main stack
echo "Step 5: Deploying CloudFormation stack..."
aws cloudformation create-stack \
    --stack-name ${STACK_NAME} \
    --template-body file://cloudformation/main-stack.yaml \
    --parameters \
        ParameterKey=Environment,ParameterValue=${ENVIRONMENT} \
        ParameterKey=LambdaCodeBucket,ParameterValue=${BUCKET_NAME} \
        ParameterKey=TemplateBucket,ParameterValue=${BUCKET_NAME} \
        ParameterKey=LogLevel,ParameterValue=INFO \
        ParameterKey=LambdaMemorySize,ParameterValue=512 \
        ParameterKey=LambdaTimeout,ParameterValue=30 \
        ParameterKey=ApiGatewayRateLimit,ParameterValue=100 \
        ParameterKey=ApiGatewayBurstLimit,ParameterValue=200 \
        ParameterKey=NeptuneMinCapacity,ParameterValue=2.5 \
        ParameterKey=NeptuneMaxCapacity,ParameterValue=4.5 \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
    --region ${REGION}

echo "✓ Stack creation initiated"
echo ""

echo "Step 6: Waiting for stack creation to complete..."
echo "This may take 15-20 minutes due to Neptune cluster provisioning..."
aws cloudformation wait stack-create-complete --stack-name ${STACK_NAME} --region ${REGION}
echo "✓ Stack creation completed"
echo ""

# Get stack outputs
echo "Step 7: Retrieving stack outputs..."
API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayURL`].OutputValue' --output text)
WS_ENDPOINT=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==`WebSocketApiURL`].OutputValue' --output text)
CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==`FrontendURL`].OutputValue' --output text)
CLOUDFRONT_DIST_ID=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' --output text)

echo "API Endpoint: $API_ENDPOINT"
echo "WebSocket Endpoint: $WS_ENDPOINT"
echo "CloudFront URL: $CLOUDFRONT_URL"
echo "CloudFront Distribution ID: $CLOUDFRONT_DIST_ID"
echo ""

# Build and deploy frontend
echo "Step 8: Building and deploying frontend..."
cd frontend

# Create region-specific config by copying usw2 and replacing endpoints
cp src/config/usw2.ts src/config/index.ts.tmp

# Replace endpoints with actual values from CloudFormation
sed -i.bak "s|restEndpoint: '.*'|restEndpoint: '${API_ENDPOINT}'|g" src/config/index.ts.tmp
sed -i.bak "s|websocketEndpoint: '.*'|websocketEndpoint: '${WS_ENDPOINT}'|g" src/config/index.ts.tmp
sed -i.bak "s|region: '.*'|region: '${REGION}'|g" src/config/index.ts.tmp
sed -i.bak "s|environment: '.*' as const|environment: '${ENVIRONMENT}' as const|g" src/config/index.ts.tmp

# Create index.ts that exports this config
cat > src/config/index.ts << 'EOF'
import { usw2Config } from './usw2';
export const config = usw2Config;
export type EnvironmentConfig = typeof usw2Config;
EOF

# Temporarily replace usw2.ts with region-specific values
mv src/config/usw2.ts src/config/usw2.ts.original
mv src/config/index.ts.tmp src/config/usw2.ts

npm run build
echo "✓ Frontend built"

# Restore original files
mv src/config/usw2.ts.original src/config/usw2.ts
rm -f src/config/*.bak

# Upload to S3
FRONTEND_BUCKET=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' --output text)
aws s3 sync dist/ s3://${FRONTEND_BUCKET}/ --delete --region ${REGION}
echo "✓ Frontend uploaded to S3"

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_DIST_ID} --paths "/*" --region ${REGION}
echo "✓ CloudFront cache invalidated"

cd ..
echo ""

# Verification
echo "Step 9: Running post-deployment verification..."
echo ""
echo "Testing API endpoint..."
curl -s ${API_ENDPOINT}/health | jq . || echo "Health check endpoint not available"
echo ""

echo "=== Deployment Complete ==="
echo ""
echo "Frontend URL: $CLOUDFRONT_URL"
echo "API Endpoint: $API_ENDPOINT"
echo "Region: $REGION"
echo "Stack Name: $STACK_NAME"
echo ""
echo "IMPORTANT: Check for any adhoc fixes needed and log them to: $ADHOC_FIXES_LOG"
echo ""
echo "Next steps:"
echo "1. Test all 4 demos in the frontend"
echo "2. Check CloudWatch logs for any errors"
echo "3. Document any adhoc fixes required"
echo "4. Update CloudFormation templates with fixes"

#!/bin/bash
set -e

# AWS Agent Governance Demos - Lambda Packaging Script
# Usage: ./package.sh <environment>

ENVIRONMENT=${1:-dev}
LAMBDA_BUCKET="aws-governance-demos-lambda-${ENVIRONMENT}"
TEMPLATE_BUCKET="aws-governance-demos-templates-${ENVIRONMENT}"
REGION=${AWS_REGION:-us-east-1}

echo "Packaging Lambda functions and CloudFormation templates..."
echo "Lambda Bucket: ${LAMBDA_BUCKET}"
echo "Template Bucket: ${TEMPLATE_BUCKET}"

# Create S3 buckets if they don't exist
echo "Ensuring S3 buckets exist..."
aws s3 mb s3://${LAMBDA_BUCKET} --region ${REGION} 2>/dev/null || true
aws s3 mb s3://${TEMPLATE_BUCKET} --region ${REGION} 2>/dev/null || true

# Package Lambda functions with dependencies
echo "Packaging Lambda functions with dependencies..."
PACKAGE_DIR="/tmp/lambda-packages-${ENVIRONMENT}"
rm -rf ${PACKAGE_DIR}
mkdir -p ${PACKAGE_DIR}

# Install dependencies once
echo "Installing Python dependencies..."
pip install -q -t ${PACKAGE_DIR} boto3 gremlinpython urllib3 aiohttp typing_extensions -U

# Copy all Lambda Python files
cp lambda/*.py ${PACKAGE_DIR}/

# Copy seed_data directory for seed_data and reset_demo Lambdas
echo "Copying seed_data directory..."
cp -r lambda/seed_data ${PACKAGE_DIR}/

# Package each Lambda function
for lambda in tact_evaluation guardrails_query neptune_scoring approval_workflow approval_decision audit_trail sns_notification observability seed_data reset_demo; do
    if [ -f "lambda/${lambda}.py" ]; then
        echo "Creating ${lambda}.zip"
        (cd ${PACKAGE_DIR} && zip -q -r /tmp/${lambda}.zip .)
        aws s3 cp /tmp/${lambda}.zip s3://${LAMBDA_BUCKET}/lambda/${lambda}.zip
        rm /tmp/${lambda}.zip
    else
        echo "  ⚠ Skipping ${lambda}.py (not found)"
    fi
done

# Upload nested stack templates
echo "Uploading nested stack templates..."
aws s3 sync cloudformation/nested-stacks/ s3://${TEMPLATE_BUCKET}/nested-stacks/ \
    --exclude "*" --include "*.yaml" --exclude "*.bak*"

echo "Packaging complete!"
echo ""
echo "Uploaded Lambda packages:"
aws s3 ls s3://${LAMBDA_BUCKET}/lambda/ --human-readable


#!/bin/bash
set -e

# AWS Agent Governance Demos - Cleanup Script
# Usage: ./cleanup.sh <environment>
# Example: ./cleanup.sh dev

ENVIRONMENT=${1:-dev}
STACK_NAME="aws-governance-demos-${ENVIRONMENT}"
REGION=${AWS_REGION:-us-east-1}

echo "Cleaning up AWS Agent Governance Demos for ${ENVIRONMENT} environment..."
echo "Stack Name: ${STACK_NAME}"
echo "Region: ${REGION}"

# Delete CloudFormation stack
echo "Deleting CloudFormation stack..."
aws cloudformation delete-stack --stack-name ${STACK_NAME} --region ${REGION} 2>/dev/null || echo "Stack does not exist or already deleted"

# Wait for stack deletion (with timeout)
echo "Waiting for stack deletion to complete..."
aws cloudformation wait stack-delete-complete --stack-name ${STACK_NAME} --region ${REGION} 2>/dev/null || echo "Stack deletion completed or failed"

# Clean up retained DynamoDB tables
echo "Cleaning up retained DynamoDB tables..."
for table in $(aws dynamodb list-tables --region ${REGION} --query "TableNames[?contains(@, '${STACK_NAME}')]" --output text); do
    echo "Deleting table: $table"
    aws dynamodb delete-table --table-name $table --region ${REGION} 2>/dev/null || echo "Table already deleted"
done

# Clean up S3 buckets (empty and delete)
echo "Cleaning up S3 buckets..."
for bucket in $(aws s3 ls | grep "${STACK_NAME}" | awk '{print $3}'); do
    echo "Emptying and deleting bucket: $bucket"
    aws s3 rm s3://$bucket --recursive 2>/dev/null || echo "Bucket already empty"
    aws s3 rb s3://$bucket 2>/dev/null || echo "Bucket already deleted"
done

# Clean up CloudWatch Log Groups
echo "Cleaning up CloudWatch Log Groups..."
for log_group in $(aws logs describe-log-groups --region ${REGION} --query "logGroups[?contains(logGroupName, '${STACK_NAME}')].logGroupName" --output text); do
    echo "Deleting log group: $log_group"
    aws logs delete-log-group --log-group-name $log_group --region ${REGION} 2>/dev/null || echo "Log group already deleted"
done

echo "Cleanup complete!"

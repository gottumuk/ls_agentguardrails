#!/bin/bash
set -e

# AWS Agent Governance Demos - Emergency Rollback Script
# Usage: ./rollback.sh <environment> [--to-version VERSION]
# Example: ./rollback.sh dev
# Example: ./rollback.sh prod --to-version v1.2.0

ENVIRONMENT=${1:-dev}
STACK_NAME="aws-governance-demos-${ENVIRONMENT}"
REGION=${AWS_REGION:-us-east-1}
TARGET_VERSION=""

# Parse arguments
shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --to-version)
            TARGET_VERSION="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "=========================================="
echo "AWS Agent Governance Demos - ROLLBACK"
echo "=========================================="
echo "Environment: ${ENVIRONMENT}"
echo "Stack Name: ${STACK_NAME}"
echo "Region: ${REGION}"
echo ""

# Confirm rollback
read -p "⚠️  WARNING: This will rollback the deployment. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled."
    exit 0
fi

# Check if stack exists
echo ""
echo "Checking stack status..."
STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [ "$STACK_STATUS" == "DOES_NOT_EXIST" ]; then
    echo "Error: Stack ${STACK_NAME} does not exist"
    exit 1
fi

echo "Current stack status: ${STACK_STATUS}"

# Backup current audit trail data
echo ""
echo "Backing up audit trail data..."
AUDIT_TRAIL_TABLE=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`AuditTrailTable`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$AUDIT_TRAIL_TABLE" ]; then
    BACKUP_FILE="audit-trail-backup-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
    echo "Backing up audit trail to: ${BACKUP_FILE}"
    
    aws dynamodb scan \
        --table-name ${AUDIT_TRAIL_TABLE} \
        --region ${REGION} \
        --output json > ${BACKUP_FILE}
    
    echo "  ✓ Audit trail backed up ($(wc -l < ${BACKUP_FILE}) lines)"
else
    echo "  ⚠ Could not find audit trail table, skipping backup"
fi

# Determine rollback strategy
echo ""
echo "Determining rollback strategy..."

if [ -n "$TARGET_VERSION" ]; then
    # Rollback to specific version
    echo "Strategy: Rollback to version ${TARGET_VERSION}"
    
    # Check if version exists in S3
    TEMPLATE_BUCKET="aws-governance-demos-templates-${ENVIRONMENT}"
    VERSION_EXISTS=$(aws s3 ls s3://${TEMPLATE_BUCKET}/versions/${TARGET_VERSION}/ 2>/dev/null || echo "")
    
    if [ -z "$VERSION_EXISTS" ]; then
        echo "Error: Version ${TARGET_VERSION} not found in S3"
        exit 1
    fi
    
    # Download version template
    echo "Downloading version ${TARGET_VERSION} template..."
    aws s3 cp s3://${TEMPLATE_BUCKET}/versions/${TARGET_VERSION}/main-stack.yaml /tmp/rollback-template.yaml
    
    # Deploy previous version
    echo "Deploying version ${TARGET_VERSION}..."
    aws cloudformation deploy \
        --template-file /tmp/rollback-template.yaml \
        --stack-name ${STACK_NAME} \
        --parameter-overrides file://cloudformation/parameters/${ENVIRONMENT}.json \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --region ${REGION} \
        --no-fail-on-empty-changeset
    
    rm /tmp/rollback-template.yaml
else
    # Rollback to last stable state using CloudFormation change sets
    echo "Strategy: Rollback using CloudFormation stack update cancellation"
    
    # Check if there's an in-progress update
    if [[ "$STACK_STATUS" == *"IN_PROGRESS"* ]]; then
        echo "Cancelling in-progress stack update..."
        aws cloudformation cancel-update-stack \
            --stack-name ${STACK_NAME} \
            --region ${REGION}
        
        echo "Waiting for cancellation to complete..."
        aws cloudformation wait stack-update-complete \
            --stack-name ${STACK_NAME} \
            --region ${REGION} 2>/dev/null || true
    else
        echo "No in-progress update found."
        echo ""
        echo "Available rollback options:"
        echo "  1. Specify --to-version to rollback to a specific version"
        echo "  2. Manually redeploy a previous version using deploy.sh"
        echo "  3. Use AWS Console to view stack history and rollback"
        exit 1
    fi
fi

# Verify rollback
echo ""
echo "Verifying rollback..."
FINAL_STATUS=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].StackStatus' \
    --output text)

echo "Final stack status: ${FINAL_STATUS}"

if [[ "$FINAL_STATUS" == "UPDATE_COMPLETE" ]] || [[ "$FINAL_STATUS" == "UPDATE_ROLLBACK_COMPLETE" ]]; then
    echo "  ✓ Rollback successful"
else
    echo "  ⚠ Rollback may have issues, check AWS Console"
fi

# Get stack outputs
echo ""
echo "Stack outputs after rollback:"
aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs' \
    --output table

echo ""
echo "=========================================="
echo "Rollback complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Verify demo functionality"
echo "  2. Check CloudWatch Logs for errors"
echo "  3. Review audit trail backup: ${BACKUP_FILE:-N/A}"
echo "  4. Notify team of rollback"
echo ""
echo "To restore audit trail data (if needed):"
echo "  aws dynamodb batch-write-item --request-items file://${BACKUP_FILE:-audit-trail-backup.json}"

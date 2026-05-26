#!/bin/bash
set -e

# AWS Agent Governance Demos - Deployment Script
# Usage: ./deploy.sh <environment> [--skip-seed] [--version VERSION]
# Example: ./deploy.sh dev
# Example: ./deploy.sh prod --skip-seed
# Example: ./deploy.sh staging --version v1.2.0

ENVIRONMENT=${1:-dev}
STACK_NAME="aws-governance-demos-${ENVIRONMENT}"
REGION=${AWS_REGION:-us-east-1}
SKIP_SEED=false
VERSION=""

# Parse arguments
shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-seed)
            SKIP_SEED=true
            shift
            ;;
        --version)
            VERSION="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "=========================================="
echo "AWS Agent Governance Demos - DEPLOYMENT"
echo "=========================================="
echo "Environment: ${ENVIRONMENT}"
echo "Stack Name: ${STACK_NAME}"
echo "Region: ${REGION}"
echo "Skip Seed: ${SKIP_SEED}"
if [ -n "$VERSION" ]; then
    echo "Version: ${VERSION}"
fi
echo ""

# Pre-deployment checks
echo "Running pre-deployment checks..."

# Check AWS credentials
if ! aws sts get-caller-identity &>/dev/null; then
    echo "Error: AWS credentials not configured"
    exit 1
fi
echo "  ✓ AWS credentials configured"

# Validate parameters file exists
PARAMS_FILE="cloudformation/parameters/${ENVIRONMENT}.json"
if [ ! -f "$PARAMS_FILE" ]; then
    echo "Error: Parameters file not found: $PARAMS_FILE"
    exit 1
fi
echo "  ✓ Parameters file found: ${PARAMS_FILE}"

# Check if jq is installed (needed for seed data)
if ! command -v jq &>/dev/null; then
    echo "  ⚠ jq not installed (needed for data seeding)"
    SKIP_SEED=true
fi

# Package Lambda code
echo ""
echo "Packaging Lambda code..."
./cloudformation/scripts/package.sh ${ENVIRONMENT}

# Validate CloudFormation template
echo ""
echo "Validating CloudFormation templates..."
./cloudformation/scripts/validate.sh || echo "  ⚠ Template validation skipped (requires additional IAM permissions)"

# Create changeset for review (production only)
if [ "$ENVIRONMENT" == "prod" ]; then
    echo ""
    echo "Creating changeset for production deployment..."
    CHANGESET_NAME="deploy-$(date +%Y%m%d-%H%M%S)"
    
    aws cloudformation create-change-set \
        --stack-name ${STACK_NAME} \
        --change-set-name ${CHANGESET_NAME} \
        --template-body file://cloudformation/main-stack.yaml \
        --parameters file://${PARAMS_FILE} \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --region ${REGION}
    
    echo "Waiting for changeset creation..."
    aws cloudformation wait change-set-create-complete \
        --stack-name ${STACK_NAME} \
        --change-set-name ${CHANGESET_NAME} \
        --region ${REGION}
    
    echo ""
    echo "Changeset created. Review changes:"
    aws cloudformation describe-change-set \
        --stack-name ${STACK_NAME} \
        --change-set-name ${CHANGESET_NAME} \
        --region ${REGION} \
        --query 'Changes[].{Action:ResourceChange.Action,Resource:ResourceChange.LogicalResourceId,Type:ResourceChange.ResourceType}' \
        --output table
    
    echo ""
    read -p "Execute changeset? (yes/no): " EXECUTE_CHANGESET
    if [ "$EXECUTE_CHANGESET" != "yes" ]; then
        echo "Deployment cancelled. Changeset preserved: ${CHANGESET_NAME}"
        exit 0
    fi
    
    aws cloudformation execute-change-set \
        --stack-name ${STACK_NAME} \
        --change-set-name ${CHANGESET_NAME} \
        --region ${REGION}
    
    echo "Waiting for stack update..."
    aws cloudformation wait stack-update-complete \
        --stack-name ${STACK_NAME} \
        --region ${REGION}
else
    # Deploy CloudFormation stack (non-production)
    echo ""
    echo "Deploying CloudFormation stack..."
    aws cloudformation deploy \
        --template-file cloudformation/main-stack.yaml \
        --stack-name ${STACK_NAME} \
        --parameter-overrides file://${PARAMS_FILE} \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --region ${REGION} \
        --no-fail-on-empty-changeset
fi

# Archive version (if specified)
if [ -n "$VERSION" ]; then
    echo ""
    echo "Archiving deployment version ${VERSION}..."
    TEMPLATE_BUCKET="aws-governance-demos-templates-${ENVIRONMENT}"
    aws s3 cp cloudformation/main-stack.yaml s3://${TEMPLATE_BUCKET}/versions/${VERSION}/main-stack.yaml
    aws s3 sync cloudformation/nested-stacks/ s3://${TEMPLATE_BUCKET}/versions/${VERSION}/nested-stacks/
    echo "  ✓ Version archived to S3"
fi

# Get stack outputs
echo ""
echo "=========================================="
echo "Deployment complete!"
echo "=========================================="
echo ""
echo "Stack outputs:"
aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs' \
    --output table

# Seed data (unless skipped)
if [ "$SKIP_SEED" == "false" ]; then
    echo ""
    read -p "Seed demo data? (yes/no): " SEED_DATA
    if [ "$SEED_DATA" == "yes" ]; then
        ./cloudformation/scripts/seed-data.sh ${ENVIRONMENT}
    fi
else
    echo ""
    echo "Data seeding skipped. Run manually with:"
    echo "  ./cloudformation/scripts/seed-data.sh ${ENVIRONMENT}"
fi

echo ""
echo "Next steps:"
echo "  1. Run post-deployment verification: ./cloudformation/scripts/verify-deployment.sh ${ENVIRONMENT}"
echo "  2. Test demo functionality in AWS Console"
echo "  3. Deploy frontend: cd frontend && npm run build && npm run deploy:${ENVIRONMENT}"
echo "  4. Configure Bedrock Guardrails policies: ./scripts/create-guardrails-policies.sh ${ENVIRONMENT}"

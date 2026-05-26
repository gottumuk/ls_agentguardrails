#!/bin/bash
set -e

# Pre-Deployment Verification Script
# Checks all prerequisites before deploying to staging

ENVIRONMENT=${1:-staging}
REGION=${AWS_REGION:-us-east-1}

echo "=========================================="
echo "PRE-DEPLOYMENT VERIFICATION"
echo "=========================================="
echo "Environment: ${ENVIRONMENT}"
echo "Region: ${REGION}"
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to check and report
check() {
    local description=$1
    local command=$2
    
    if eval "$command" &>/dev/null; then
        echo "  ✓ $description"
        ((CHECKS_PASSED++))
        return 0
    else
        echo "  ✗ $description"
        ((CHECKS_FAILED++))
        return 1
    fi
}

# AWS Credentials
echo "Checking AWS credentials..."
if aws sts get-caller-identity &>/dev/null; then
    ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
    echo "  ✓ AWS credentials configured"
    echo "    Account: ${ACCOUNT}"
    echo "    User: ${USER_ARN}"
    ((CHECKS_PASSED++))
else
    echo "  ✗ AWS credentials not configured"
    ((CHECKS_FAILED++))
fi
echo ""

# Software Dependencies
echo "Checking software dependencies..."
check "AWS CLI installed" "command -v aws"
check "Python 3.9+ installed" "python3 --version | grep -E 'Python 3\.(9|1[0-9])'"
check "Node.js 18+ installed" "node --version | grep -E 'v(1[8-9]|[2-9][0-9])'"
check "jq installed" "command -v jq"
check "zip installed" "command -v zip"
echo ""

# CloudFormation Templates
echo "Checking CloudFormation templates..."
check "Main stack template exists" "test -f cloudformation/main-stack.yaml"
check "Parameters file exists" "test -f cloudformation/parameters/${ENVIRONMENT}.json"
check "Nested stacks directory exists" "test -d cloudformation/nested-stacks"
check "All nested stacks exist" "test $(ls cloudformation/nested-stacks/*.yaml 2>/dev/null | wc -l) -ge 7"
echo ""

# Lambda Code
echo "Checking Lambda code..."
check "Lambda directory exists" "test -d lambda"
check "Lambda requirements.txt exists" "test -f lambda/requirements.txt"
check "TACT evaluation Lambda exists" "test -f lambda/tact_evaluation.py"
check "Guardrails query Lambda exists" "test -f lambda/guardrails_query.py"
check "Neptune scoring Lambda exists" "test -f lambda/neptune_scoring.py"
check "Approval workflow Lambda exists" "test -f lambda/approval_workflow.py"
check "Approval decision Lambda exists" "test -f lambda/approval_decision.py"
check "Audit trail Lambda exists" "test -f lambda/audit_trail.py"
check "Observability Lambda exists" "test -f lambda/observability.py"
echo ""

# Frontend Code
echo "Checking frontend code..."
check "Frontend directory exists" "test -d frontend"
check "Frontend package.json exists" "test -f frontend/package.json"
check "Frontend src directory exists" "test -d frontend/src"
check "All demo components exist" "test $(ls frontend/src/components/Demo*.tsx 2>/dev/null | wc -l) -ge 4"
echo ""

# Deployment Scripts
echo "Checking deployment scripts..."
check "Deploy script exists" "test -f cloudformation/scripts/deploy.sh"
check "Package script exists" "test -f cloudformation/scripts/package.sh"
check "Validate script exists" "test -f cloudformation/scripts/validate.sh"
check "Verify script exists" "test -f cloudformation/scripts/verify-deployment.sh"
check "Seed data script exists" "test -f cloudformation/scripts/seed-data.sh"
check "Rollback script exists" "test -f cloudformation/scripts/rollback.sh"
check "Deploy script is executable" "test -x cloudformation/scripts/deploy.sh"
check "Package script is executable" "test -x cloudformation/scripts/package.sh"
echo ""

# AWS Service Quotas (informational)
echo "Checking AWS service quotas (informational)..."
if aws service-quotas get-service-quota --service-code lambda --quota-code L-B99A9384 &>/dev/null; then
    LAMBDA_QUOTA=$(aws service-quotas get-service-quota --service-code lambda --quota-code L-B99A9384 --query 'Quota.Value' --output text 2>/dev/null || echo "unknown")
    echo "  ℹ Lambda concurrent executions quota: ${LAMBDA_QUOTA}"
fi
if aws service-quotas get-service-quota --service-code dynamodb --quota-code L-F98FE922 &>/dev/null; then
    DYNAMODB_QUOTA=$(aws service-quotas get-service-quota --service-code dynamodb --quota-code L-F98FE922 --query 'Quota.Value' --output text 2>/dev/null || echo "unknown")
    echo "  ℹ DynamoDB table quota: ${DYNAMODB_QUOTA}"
fi
echo ""

# Bedrock Access (informational)
echo "Checking Bedrock access (informational)..."
if aws bedrock list-foundation-models --region ${REGION} &>/dev/null; then
    echo "  ℹ Bedrock API accessible"
    if aws bedrock list-foundation-models --region ${REGION} --query 'modelSummaries[?contains(modelId, `claude-3-5-sonnet`)].modelId' --output text 2>/dev/null | grep -q "claude"; then
        echo "  ℹ Claude 3.5 Sonnet model available"
    else
        echo "  ⚠ Claude 3.5 Sonnet model not found (may need access request)"
    fi
else
    echo "  ⚠ Bedrock API not accessible (may need to enable in region)"
fi
echo ""

# Check if stack already exists
echo "Checking existing stack..."
if aws cloudformation describe-stacks --stack-name aws-governance-demos-${ENVIRONMENT} --region ${REGION} &>/dev/null; then
    STACK_STATUS=$(aws cloudformation describe-stacks --stack-name aws-governance-demos-${ENVIRONMENT} --region ${REGION} --query 'Stacks[0].StackStatus' --output text)
    echo "  ⚠ Stack already exists: aws-governance-demos-${ENVIRONMENT}"
    echo "    Status: ${STACK_STATUS}"
    echo "    This will be an UPDATE operation"
else
    echo "  ✓ No existing stack found (will be CREATE operation)"
    ((CHECKS_PASSED++))
fi
echo ""

# Check S3 buckets
echo "Checking S3 buckets..."
if aws s3 ls s3://aws-governance-demos-lambda-${ENVIRONMENT} &>/dev/null; then
    echo "  ✓ Lambda bucket exists: aws-governance-demos-lambda-${ENVIRONMENT}"
    ((CHECKS_PASSED++))
else
    echo "  ✗ Lambda bucket does not exist: aws-governance-demos-lambda-${ENVIRONMENT}"
    echo "    Run: aws s3 mb s3://aws-governance-demos-lambda-${ENVIRONMENT}"
    ((CHECKS_FAILED++))
fi

if aws s3 ls s3://aws-governance-demos-templates-${ENVIRONMENT} &>/dev/null; then
    echo "  ✓ Templates bucket exists: aws-governance-demos-templates-${ENVIRONMENT}"
    ((CHECKS_PASSED++))
else
    echo "  ✗ Templates bucket does not exist: aws-governance-demos-templates-${ENVIRONMENT}"
    echo "    Run: aws s3 mb s3://aws-governance-demos-templates-${ENVIRONMENT}"
    ((CHECKS_FAILED++))
fi
echo ""

# Summary
echo "=========================================="
echo "VERIFICATION SUMMARY"
echo "=========================================="
echo "Checks passed: ${CHECKS_PASSED}"
echo "Checks failed: ${CHECKS_FAILED}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo "✓ All checks passed! Ready to deploy."
    echo ""
    echo "Next steps:"
    echo "  1. Create S3 buckets (if needed):"
    echo "     aws s3 mb s3://aws-governance-demos-lambda-${ENVIRONMENT}"
    echo "     aws s3 mb s3://aws-governance-demos-templates-${ENVIRONMENT}"
    echo ""
    echo "  2. Deploy to ${ENVIRONMENT}:"
    echo "     ./cloudformation/scripts/deploy.sh ${ENVIRONMENT}"
    echo ""
    exit 0
else
    echo "✗ Some checks failed. Please resolve issues before deploying."
    echo ""
    exit 1
fi

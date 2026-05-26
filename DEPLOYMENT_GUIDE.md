# AWS Agent Governance Demos - Deployment Guide

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Deployment Commands](#deployment-commands)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Rollback Procedure](#rollback-procedure)
6. [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

Before deploying the AWS Agent Governance Demos system, ensure the following prerequisites are met:

### AWS Account Requirements

- [ ] AWS account with appropriate permissions
- [ ] IAM user or role with CloudFormation, Lambda, DynamoDB, Neptune, Step Functions, SNS, API Gateway, CloudWatch, and CloudTrail permissions
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] AWS credentials configured with appropriate region (default: us-east-1)

### Software Requirements

- [ ] Bash shell (macOS/Linux) or WSL (Windows)
- [ ] AWS CLI v2.x or later
- [ ] Python 3.9 or later
- [ ] Node.js 18.x or later (for frontend deployment)
- [ ] jq (JSON processor) - `brew install jq` or `apt-get install jq`
- [ ] Git (for version control)

### Service Quotas

Verify your AWS account has sufficient service quotas:

- [ ] Lambda concurrent executions: At least 10
- [ ] DynamoDB tables: At least 3
- [ ] Neptune clusters: At least 1 (Serverless)
- [ ] Step Functions state machines: At least 1
- [ ] API Gateway APIs: At least 2 (REST + WebSocket)
- [ ] CloudWatch Log Groups: At least 10

### Bedrock Model Access

- [ ] Amazon Bedrock access enabled in your region
- [ ] Claude 3.5 Sonnet model access requested and approved
- [ ] Bedrock Guardrails feature enabled

### Cost Estimation

Estimated monthly costs for each environment:

- **Development**: $50-100/month (minimal usage)
- **Staging**: $100-200/month (moderate usage)
- **Production**: $500-1000/month (high usage with live demos)


## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd aws-agent-governance-demos
```

### 2. Configure Environment Parameters

Edit the parameter files for each environment:

```bash
# Development environment
vim cloudformation/parameters/dev.json

# Staging environment
vim cloudformation/parameters/staging.json

# Production environment
vim cloudformation/parameters/prod.json
```

Required parameters:
- `Environment`: dev, staging, or prod
- `ProjectName`: aws-governance-demos
- `BedrockModelId`: anthropic.claude-3-5-sonnet-20241022-v2:0
- `NeptuneMinNCU`: 2.5 (minimum Neptune capacity units)
- `NeptuneMaxNCU`: 4.5 (maximum Neptune capacity units)
- `NotificationEmail`: Email for approval notifications

### 3. Set AWS Region

```bash
export AWS_REGION=us-east-1
```

### 4. Verify AWS Credentials

```bash
aws sts get-caller-identity
```

Expected output should show your AWS account ID and user/role ARN.


## Deployment Commands

### Development Environment

#### Initial Deployment

```bash
# Navigate to scripts directory
cd cloudformation/scripts

# Deploy infrastructure
./deploy.sh dev

# Seed demo data (when prompted, answer 'yes')
# Or run manually:
./seed-data.sh dev

# Verify deployment
./verify-deployment.sh dev
```

#### Update Deployment

```bash
# Deploy with version tagging
./deploy.sh dev --version v1.1.0

# Deploy without re-seeding data
./deploy.sh dev --skip-seed
```

### Staging Environment

```bash
# Deploy to staging
./deploy.sh staging --version v1.1.0

# Seed data
./seed-data.sh staging

# Verify deployment
./verify-deployment.sh staging
```

### Production Environment

Production deployments require additional approval steps:

```bash
# Deploy to production (creates changeset for review)
./deploy.sh prod --version v1.2.0

# Review changeset in AWS Console or CLI output
# Approve when prompted (type 'yes')

# Verify deployment
./verify-deployment.sh prod

# Seed data (if needed)
./seed-data.sh prod
```

### Frontend Deployment

After backend infrastructure is deployed:

```bash
cd frontend

# Install dependencies
npm install

# Build for environment
npm run build

# Deploy to S3/CloudFront (configure in package.json)
npm run deploy:dev
npm run deploy:staging
npm run deploy:prod
```

### Bedrock Guardrails Configuration

```bash
# Create Guardrails policies for all industries
./scripts/create-guardrails-policies.sh dev
./scripts/create-guardrails-policies.sh staging
./scripts/create-guardrails-policies.sh prod
```


## Post-Deployment Verification

### Automated Verification

Run the verification script:

```bash
./cloudformation/scripts/verify-deployment.sh <environment>
```

The script checks:
- ✓ CloudFormation stack status
- ✓ Lambda functions deployed
- ✓ DynamoDB tables active
- ✓ Neptune cluster available
- ✓ API Gateway endpoints accessible
- ✓ Step Functions state machine created
- ✓ CloudWatch Log Groups created
- ✓ IAM roles configured

### Manual Verification Steps

#### 1. Test Demo 1 - TACT Engine

```bash
# Get API endpoint from stack outputs
API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name aws-governance-demos-dev \
    --query 'Stacks[0].Outputs[?OutputKey==`RestApiEndpoint`].OutputValue' \
    --output text)

# Test TACT evaluation
curl -X POST ${API_ENDPOINT}/tact/evaluate \
    -H "Content-Type: application/json" \
    -d '{
        "action_proposal": "Transfer $47,000 between accounts",
        "industry_context": "Banking"
    }'
```

Expected response: JSON with TACT dimension scores and Trust Spectrum level.

#### 2. Test Demo 2 - Guardrails

```bash
# Query sensitive record
curl -X GET ${API_ENDPOINT}/guardrails/query?record_id=BANK-001
```

Expected response: Raw and sanitized records with redacted fields.

#### 3. Test Demo 3 - Neptune Trust Graph

```bash
# Calculate trust score
curl -X POST ${API_ENDPOINT}/neptune/score \
    -H "Content-Type: application/json" \
    -d '{
        "target_node_id": "ACC-001",
        "industry_context": "Banking"
    }'
```

Expected response: Trust score, verdict, and risk factors.

#### 4. Test Demo 4 - Approval Workflow

```bash
# Start approval workflow
curl -X POST ${API_ENDPOINT}/approval/start \
    -H "Content-Type: application/json" \
    -d '{
        "action_context": {
            "action_proposal": "High-risk transaction",
            "trust_score": 45
        },
        "industry_context": "Banking"
    }'
```

Expected response: Execution ARN and task token.

#### 5. Verify Data Seeding

```bash
# Check DynamoDB record count
aws dynamodb scan \
    --table-name <SensitiveRecordsTable> \
    --select COUNT

# Expected: At least 20 records (5 per industry)
```

#### 6. Check CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/aws-governance-demos-dev-TACTEvaluationLambda --follow
```

#### 7. Verify Frontend Access

Open browser and navigate to:
- Development: `http://<CloudFrontDomain>`
- Staging: `https://staging.example.com`
- Production: `https://demos.example.com`

Test all four demos and verify:
- Industry context switching works
- Observability sidebar displays logs
- WebSocket connection established
- Audit trail updates in real-time


## Rollback Procedure

### Emergency Rollback

If a deployment causes critical issues:

```bash
# Rollback to previous stable version
./cloudformation/scripts/rollback.sh <environment>

# Or rollback to specific version
./cloudformation/scripts/rollback.sh <environment> --to-version v1.1.0
```

The rollback script will:
1. Backup current audit trail data
2. Cancel in-progress stack updates (if any)
3. Restore previous CloudFormation template
4. Verify rollback success
5. Display stack outputs

### Rollback Verification

After rollback:

```bash
# Verify stack status
aws cloudformation describe-stacks \
    --stack-name aws-governance-demos-<environment> \
    --query 'Stacks[0].StackStatus'

# Run verification script
./cloudformation/scripts/verify-deployment.sh <environment>

# Test critical functionality
curl ${API_ENDPOINT}/health
```

### Restore Audit Trail (if needed)

If audit trail data was lost during rollback:

```bash
# Find backup file
ls -lt audit-trail-backup-*.json

# Restore from backup
aws dynamodb batch-write-item \
    --request-items file://audit-trail-backup-<timestamp>.json
```

### Manual Rollback (AWS Console)

If scripts fail:

1. Open AWS CloudFormation Console
2. Select stack: `aws-governance-demos-<environment>`
3. Click "Stack actions" → "View change sets"
4. Select previous successful changeset
5. Click "Execute" to rollback

### Post-Rollback Actions

- [ ] Notify team of rollback
- [ ] Document rollback reason
- [ ] Create incident report
- [ ] Fix issues in development environment
- [ ] Test fixes before redeploying
- [ ] Update deployment documentation


## Troubleshooting

For detailed troubleshooting information, see [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md).

Common issues:
- CloudFormation deployment failures
- Data seeding issues
- Runtime errors (Bedrock rate limits, Neptune timeouts)
- Frontend WebSocket connection issues
- API Gateway 403 errors

## Additional Resources

- **Quick Reference**: [DEPLOYMENT_QUICK_REFERENCE.md](DEPLOYMENT_QUICK_REFERENCE.md) - Essential commands and testing
- **Infrastructure Details**: [INFRASTRUCTURE.md](INFRASTRUCTURE.md) - Complete infrastructure documentation
- **Verification Checklist**: [DEPLOYMENT_VERIFICATION.md](DEPLOYMENT_VERIFICATION.md) - Post-deployment verification steps
- **CloudFormation README**: [cloudformation/README.md](cloudformation/README.md) - Template structure and resources

## Deployment Workflow Summary

```
1. Pre-Deployment Checklist
   ├── Verify AWS credentials
   ├── Check service quotas
   ├── Configure parameters
   └── Enable Bedrock model access

2. Deploy Infrastructure
   ├── Run deploy.sh <environment>
   ├── Review changeset (production only)
   └── Wait for stack creation

3. Seed Demo Data
   ├── Run seed-data.sh <environment>
   ├── Verify DynamoDB records
   └── Verify Neptune graph data

4. Post-Deployment Verification
   ├── Run verify-deployment.sh <environment>
   ├── Test all four demos
   ├── Check CloudWatch Logs
   └── Verify frontend access

5. Configure Guardrails
   ├── Run create-guardrails-policies.sh
   └── Test Guardrails filtering

6. Deploy Frontend
   ├── Build frontend application
   ├── Deploy to S3/CloudFront
   └── Test end-to-end functionality

7. Monitor and Maintain
   ├── Monitor CloudWatch metrics
   ├── Review audit trail
   ├── Update as needed
   └── Rollback if issues occur
```

## Support and Feedback

For issues or questions:
1. Check troubleshooting guide
2. Review CloudWatch Logs
3. Check AWS Service Health Dashboard
4. Contact AWS Support
5. Open GitHub issue with details

## Version History

- v1.0.0 - Initial release
- v1.1.0 - Added data seeding scripts
- v1.2.0 - Enhanced deployment with rollback support

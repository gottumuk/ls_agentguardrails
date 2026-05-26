# AWS Agent Governance Demos - CloudFormation Infrastructure

This directory contains the CloudFormation templates and deployment scripts for the AWS Agent Governance Demos system.

## Structure

```
cloudformation/
├── main-stack.yaml              # Main stack template
├── nested-stacks/               # Nested stack templates
│   ├── tact-demo.yaml           # Demo 1: TACT Decision Engine
│   ├── guardrails-demo.yaml     # Demo 2: Guardrails Data Protection
│   ├── neptune-demo.yaml        # Demo 3: Neptune Trust Graph
│   ├── approval-demo.yaml       # Demo 4: Approval Workflow
│   ├── api-gateway.yaml         # REST and WebSocket APIs
│   └── observability.yaml       # Observability layer
├── parameters/                  # Environment-specific parameters
│   ├── dev.json                 # Development environment
│   ├── staging.json             # Staging environment
│   └── prod.json                # Production environment
└── scripts/                     # Deployment scripts
    ├── deploy.sh                # Main deployment script
    ├── validate.sh              # Template validation
    └── package.sh               # Lambda packaging
```

## Prerequisites

- AWS CLI configured with appropriate credentials
- Bash shell
- AWS account with permissions to create:
  - CloudFormation stacks
  - DynamoDB tables
  - Lambda functions
  - Neptune clusters
  - API Gateway APIs
  - Step Functions state machines
  - IAM roles and policies
  - CloudWatch Logs
  - SNS topics

## Deployment

**📖 For complete deployment instructions, see [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)**

**🚀 Quick Reference: [DEPLOYMENT_QUICK_REFERENCE.md](../DEPLOYMENT_QUICK_REFERENCE.md)**

**🔧 Troubleshooting: [DEPLOYMENT_TROUBLESHOOTING.md](../DEPLOYMENT_TROUBLESHOOTING.md)**

### Quick Start

```bash
# Deploy to development
./cloudformation/scripts/deploy.sh dev

# Seed demo data
./cloudformation/scripts/seed-data.sh dev

# Verify deployment
./cloudformation/scripts/verify-deployment.sh dev
```

### Available Scripts

- `deploy.sh <env>` - Deploy CloudFormation stack
- `seed-data.sh <env>` - Seed DynamoDB and Neptune with demo data
- `verify-deployment.sh <env>` - Run post-deployment verification
- `rollback.sh <env>` - Emergency rollback to previous version
- `cleanup.sh <env>` - Delete stack and all resources
- `validate.sh` - Validate CloudFormation templates
- `package.sh <env>` - Package Lambda code and upload to S3

### Deployment Options

```bash
# Deploy with version tagging
./deploy.sh dev --version v1.1.0

# Deploy without re-seeding data
./deploy.sh dev --skip-seed

# Rollback to specific version
./rollback.sh dev --to-version v1.0.0
```

Supported environments: `dev`, `staging`, `prod`

## Resources Created

### DynamoDB Tables

1. **AuditTrailTable**: Immutable audit log of all decisions
   - Partition key: `event_id` (String)
   - Sort key: `timestamp` (Number)
   - Point-in-time recovery: Enabled
   - Streams: Enabled

2. **SensitiveRecordsTable**: Records containing PII/PHI/PCI
   - Partition key: `record_id` (String)
   - Point-in-time recovery: Enabled

3. **WorkflowStateTable**: Approval workflow state tracking
   - Partition key: `workflow_id` (String)

### Neptune Cluster

- Engine: Neptune 1.3.0.0
- Configuration: Serverless (2.5-4.5 NCUs)
- VPC: Private subnets in 2 availability zones
- Security: Lambda-to-Neptune connectivity only

### Lambda Functions

1. **TACTEvaluationLambda**: TACT dimension evaluation using Bedrock
2. **GuardrailsQueryLambda**: DynamoDB query with Guardrails filtering
3. **NeptuneScoringLambda**: Graph traversal for trust scoring
4. **ApprovalWorkflowLambda**: Step Functions workflow initiation
5. **ApprovalDecisionLambda**: Task token response handling
6. **AuditTrailLambda**: Audit log writing
7. **SNSNotificationLambda**: Approval notifications
8. **ObservabilityLambda**: CloudWatch Logs streaming

### API Gateway

- **REST API**: Demo operations endpoints
  - `/tact` - TACT evaluation
  - `/guardrails` - Guardrails query
  - `/neptune` - Trust scoring
  - `/approval` - Approval workflow
- **WebSocket API**: Real-time updates for observability

### Step Functions

- **ApprovalStateMachine**: Human-in-the-loop approval workflow
  - Timeout: 15 minutes (900 seconds)
  - States: RecordApprovalRequest, SendNotification, WaitForApproval, ProcessDecision, RecordApproval, RecordDenial, HandleTimeout

### CloudWatch Logs

- Log groups for all Lambda functions
- Retention: 7 days for demo logs, 90 days for audit logs
- Step Functions execution logs

### IAM Roles

All roles follow least-privilege principle:
- TACTEvaluationLambdaRole: Bedrock InvokeModel, DynamoDB PutItem
- GuardrailsQueryLambdaRole: Bedrock ApplyGuardrail, DynamoDB GetItem/Query/PutItem
- NeptuneScoringLambdaRole: Neptune ReadDataViaQuery, DynamoDB PutItem
- ApprovalWorkflowLambdaRole: Step Functions StartExecution
- ApprovalDecisionLambdaRole: Step Functions SendTaskSuccess/SendTaskFailure
- AuditTrailLambdaRole: DynamoDB PutItem/Query
- SNSNotificationLambdaRole: SNS Publish
- ObservabilityLambdaRole: CloudWatch Logs FilterLogEvents
- StepFunctionsExecutionRole: Lambda InvokeFunction

## Environment Configuration

### Development (dev)
- Lambda Memory: 512 MB
- Log Level: DEBUG
- Rate Limit: 1000 req/min (no throttling for testing)
- Neptune: 2.5-4.5 NCUs

### Staging (staging)
- Lambda Memory: 1024 MB
- Log Level: INFO
- Rate Limit: 100 req/min
- Neptune: 2.5-4.5 NCUs

### Production (prod)
- Lambda Memory: 1024 MB
- Log Level: WARN
- Rate Limit: 100 req/min
- Neptune: 2.5-4.5 NCUs

## Stack Outputs

After deployment, the following outputs are available:

- `AuditTrailTableName`: DynamoDB audit trail table name
- `SensitiveRecordsTableName`: DynamoDB sensitive records table name
- `WorkflowStateTableName`: DynamoDB workflow state table name
- `ApiGatewayURL`: REST API endpoint
- `WebSocketApiURL`: WebSocket API endpoint
- `NeptuneEndpoint`: Neptune cluster endpoint

## Cleanup

To delete the stack:

```bash
aws cloudformation delete-stack --stack-name aws-governance-demos-<environment>
```

Note: DynamoDB tables have `DeletionPolicy: Retain` to prevent accidental data loss.

## Troubleshooting

### Template Validation Errors

Run validation script to check for syntax errors:
```bash
./cloudformation/scripts/validate.sh
```

### Deployment Failures

Check CloudFormation events:
```bash
aws cloudformation describe-stack-events --stack-name aws-governance-demos-<environment>
```

### Lambda Packaging Issues

Ensure S3 buckets exist and are accessible:
```bash
aws s3 ls s3://aws-governance-demos-lambda-<environment>
aws s3 ls s3://aws-governance-demos-templates-<environment>
```

## Security Considerations

- All IAM roles use least-privilege permissions
- Neptune cluster is in private VPC subnets
- DynamoDB tables have point-in-time recovery enabled
- CloudTrail logs all AWS API calls
- Audit trail table has deletion protection
- No public endpoints except API Gateway

## Cost Estimation

Estimated monthly costs for production environment (100 demo executions/day):
- Lambda: ~$50
- Neptune Serverless: ~$200
- DynamoDB: ~$25
- API Gateway: ~$10
- CloudWatch Logs: ~$15
- S3 + CloudFront: ~$20
- **Total: ~$320/month**

Development environment costs are lower due to reduced usage.

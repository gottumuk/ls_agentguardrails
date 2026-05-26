# AWS Agent Governance Demos - Infrastructure Documentation

## Overview

This document describes the complete AWS infrastructure for the Agent Governance Demos system, including all CloudFormation templates, resources, IAM roles, and deployment procedures.

## Architecture Summary

The system uses a multi-tier architecture with the following components:

1. **Frontend Layer**: React SPA with WebSocket connectivity
2. **API Layer**: API Gateway (REST + WebSocket)
3. **Compute Layer**: Lambda functions for each demo
4. **Data Layer**: DynamoDB tables, Neptune graph database
5. **Orchestration Layer**: Step Functions for approval workflows
6. **Observability Layer**: CloudWatch Logs, CloudTrail, SNS
7. **Security Layer**: IAM roles with least-privilege permissions

## CloudFormation Stack Structure

### Main Stack (`main-stack.yaml`)

The main stack creates shared resources and orchestrates nested stacks:

**Shared Resources:**
- AuditTrailTable (DynamoDB)
- SensitiveRecordsTable (DynamoDB)
- WorkflowStateTable (DynamoDB)

**Nested Stacks:**
- TACTDemoStack (Demo 1)
- GuardrailsDemoStack (Demo 2)
- NeptuneDemoStack (Demo 3)
- ApprovalDemoStack (Demo 4)
- ObservabilityStack
- APIGatewayStack
- CloudTrailStack

### Nested Stack Details

#### 1. TACT Demo Stack (`tact-demo.yaml`)

**Purpose**: Demo 1 - TACT Decision Engine

**Resources:**
- TACTEvaluationLambda: Evaluates actions using Bedrock Claude 3.5 Sonnet
- TACTEvaluationLambdaRole: IAM role with Bedrock InvokeModel permissions
- TACTLambdaLogGroup: CloudWatch Logs (7-day retention)

**Requirements Validated**: 8.1, 8.7

#### 2. Guardrails Demo Stack (`guardrails-demo.yaml`)

**Purpose**: Demo 2 - Guardrails Data Protection

**Resources:**
- GuardrailsQueryLambda: Queries DynamoDB and applies Bedrock Guardrails
- GuardrailsQueryLambdaRole: IAM role with DynamoDB and Guardrails permissions
- GuardrailsLambdaLogGroup: CloudWatch Logs (7-day retention)

**Requirements Validated**: 8.1, 8.7

#### 3. Neptune Demo Stack (`neptune-demo.yaml`)

**Purpose**: Demo 3 - Neptune Trust Graph

**Resources:**
- NeptuneVPC: VPC for Neptune cluster (10.0.0.0/16)
- PrivateSubnet1, PrivateSubnet2: Private subnets in 2 AZs
- NeptuneSubnetGroup: Subnet group for Neptune
- NeptuneSecurityGroup: Security group for Neptune (port 8182)
- LambdaSecurityGroup: Security group for Lambda functions
- NeptuneCluster: Neptune Serverless cluster (2.5-4.5 NCUs)
- NeptuneInstance: Neptune instance (db.serverless)
- NeptuneScoringLambda: Executes Gremlin queries for trust scoring
- NeptuneScoringLambdaRole: IAM role with Neptune and DynamoDB permissions
- NeptuneLambdaLogGroup: CloudWatch Logs (7-day retention)

**Requirements Validated**: 8.3, 8.7

#### 4. Approval Demo Stack (`approval-demo.yaml`)

**Purpose**: Demo 4 - Human-in-the-Loop Approval Workflow

**Resources:**
- ApprovalNotificationTopic: SNS topic for approval notifications
- StepFunctionsExecutionRole: IAM role for Step Functions
- AuditTrailLambda: Writes audit records to DynamoDB
- SNSNotificationLambda: Sends SNS notifications
- ApprovalWorkflowLambda: Starts Step Functions executions
- ApprovalDecisionLambda: Sends task token responses
- ApprovalStateMachine: Step Functions state machine with 15-minute timeout
- Multiple CloudWatch Log Groups (7-day retention for demos, 90-day for audit)

**Requirements Validated**: 8.5, 8.7, 8.8

#### 5. API Gateway Stack (`api-gateway.yaml`)

**Purpose**: REST and WebSocket APIs for demo operations

**Resources:**
- RestApi: API Gateway REST API
- TACTResource, GuardrailsResource, NeptuneResource, ApprovalResource: API resources
- TACTMethod, GuardrailsMethod, NeptuneMethod, ApprovalMethod: POST methods
- ApiUsagePlan: Rate limiting (100 req/min, 200 burst)
- RestApiDeployment: API deployment to environment stage
- Lambda permissions for API Gateway invocation

**Requirements Validated**: 8.5

#### 6. Observability Stack (`observability.yaml`)

**Purpose**: WebSocket API and CloudWatch Logs streaming

**Resources:**
- WebSocketApi: API Gateway WebSocket API
- WebSocketStage: WebSocket stage with auto-deploy
- ObservabilityLambda: Streams CloudWatch Logs to WebSocket clients
- ObservabilityLambdaRole: IAM role with CloudWatch Logs read permissions
- ObservabilityLogGroup: CloudWatch Logs (7-day retention)

**Requirements Validated**: 8.8, 8.9

#### 7. CloudTrail Stack (`cloudtrail.yaml`)

**Purpose**: AWS API call logging and audit trail

**Resources:**
- CloudTrailBucket: S3 bucket for CloudTrail logs (90-day retention)
- CloudTrailBucketPolicy: S3 bucket policy for CloudTrail
- DemoCloudTrail: CloudTrail with log file validation enabled

**Requirements Validated**: 8.8, 8.9

## DynamoDB Tables

### AuditTrailTable

**Purpose**: Immutable audit log of all decisions and actions

**Schema:**
- Partition Key: `event_id` (String) - UUID
- Sort Key: `timestamp` (Number) - Unix timestamp

**Attributes:**
- event_type: TACT_EVALUATION | GUARDRAILS_QUERY | TRUST_SCORE_CALCULATED | APPROVAL_REQUESTED | APPROVAL_DECISION | WORKFLOW_TIMEOUT | DEMO_RESET
- demo_id: 1-4
- industry_context: Banking | Healthcare | Retail | HROperations
- event_data: JSON object with event-specific data
- execution_context: Lambda request ID, Step Functions ARN, API Gateway request ID

**Configuration:**
- Billing Mode: PAY_PER_REQUEST
- Point-in-time Recovery: ENABLED
- Streams: ENABLED (NEW_IMAGE)
- Deletion Policy: RETAIN
- Log Retention: 90 days

**Requirements Validated**: 8.5, 10.5

### SensitiveRecordsTable

**Purpose**: Records containing PII/PHI/PCI for Guardrails demo

**Schema:**
- Partition Key: `record_id` (String)

**Attributes (vary by industry):**
- Banking: ssn, account_number, dob, balance
- Healthcare: mrn, icd10_codes, prescription_history
- Retail: card_number, cvv, refund_amount
- HR/Operations: government_id, salary, department

**Configuration:**
- Billing Mode: PAY_PER_REQUEST
- Point-in-time Recovery: ENABLED

**Requirements Validated**: 8.5, 10.5

### WorkflowStateTable

**Purpose**: Tracks in-progress approval workflows

**Schema:**
- Partition Key: `workflow_id` (String) - UUID

**Attributes:**
- execution_arn: Step Functions execution ARN
- task_token: waitForTaskToken value (encrypted)
- timestamp_started: Unix timestamp
- timestamp_expires: timestamp_started + 900 seconds
- action_context: JSON object with action details
- reviewer_identity: Email or role name
- status: PENDING | APPROVED | DENIED | TIMEOUT
- decision: APPROVE | DENY | TIMEOUT (optional)
- decision_timestamp: Unix timestamp (optional)
- response_time_seconds: Number (optional)

**Configuration:**
- Billing Mode: PAY_PER_REQUEST

**Requirements Validated**: 8.5, 10.5

## Neptune Graph Database

### Cluster Configuration

- Engine: Neptune 1.3.0.0
- Type: Serverless
- Min Capacity: 2.5 NCUs
- Max Capacity: 4.5 NCUs
- VPC: Private subnets in 2 availability zones
- Security: Lambda-to-Neptune connectivity only (port 8182)

### Graph Schema

**Node Types:**
- Account: Bank accounts, customers, patients, employees
  - Properties: id, name, type, industry_context, created_date
- RiskCluster: Known risk patterns
  - Properties: id, cluster_type, risk_level, description
- Entity: External parties (merchants, pharmacies, vendors)
  - Properties: id, name, entity_type

**Edge Types:**
- TRANSACTS_WITH: Account → Account
  - Properties: amount, timestamp, frequency
- ASSOCIATED_WITH: Account → RiskCluster
  - Properties: distance, confidence_score
- INTERACTS_WITH: Account → Entity
  - Properties: interaction_count, last_interaction

**Risk Cluster Types by Industry:**
- Banking: fraud_cluster
- Healthcare: prescription_mill
- Retail: refund_ring
- HR/Operations: legal_case

**Requirements Validated**: 8.3

## IAM Security Model

### Principle of Least Privilege

All IAM roles follow least-privilege principles:
- Resource-level permissions (specific ARNs, no wildcards)
- Action-level permissions (read vs write separated)
- No DeleteItem or UpdateItem on AuditTrailTable (immutability)
- Permission boundaries prevent privilege escalation

### IAM Roles Summary

| Role | Services | Actions |
|------|----------|---------|
| TACTEvaluationLambdaRole | Bedrock, DynamoDB, CloudWatch | InvokeModel, PutItem, Logs |
| GuardrailsQueryLambdaRole | Bedrock, DynamoDB, CloudWatch | ApplyGuardrail, GetItem, Query, PutItem, Logs |
| NeptuneScoringLambdaRole | Neptune, DynamoDB, CloudWatch | ReadDataViaQuery, PutItem, Logs |
| ApprovalWorkflowLambdaRole | Step Functions, DynamoDB, CloudWatch | StartExecution, PutItem, Logs |
| ApprovalDecisionLambdaRole | Step Functions, CloudWatch | SendTaskSuccess, SendTaskFailure, Logs |
| AuditTrailLambdaRole | DynamoDB, CloudWatch | PutItem, Query, Logs |
| SNSNotificationLambdaRole | SNS, CloudWatch | Publish, Logs |
| ObservabilityLambdaRole | CloudWatch | FilterLogEvents, DescribeLogStreams, ManageConnections |
| StepFunctionsExecutionRole | Lambda, CloudWatch | InvokeFunction, Logs |

**Requirements Validated**: 8.7

## CloudWatch Logs Configuration

### Log Groups and Retention

| Log Group | Retention | Purpose |
|-----------|-----------|---------|
| /aws/lambda/TACTEvaluationLambda | 7 days | Demo execution logs |
| /aws/lambda/GuardrailsQueryLambda | 7 days | Demo execution logs |
| /aws/lambda/NeptuneScoringLambda | 7 days | Demo execution logs |
| /aws/lambda/ApprovalWorkflowLambda | 7 days | Demo execution logs |
| /aws/lambda/ApprovalDecisionLambda | 7 days | Demo execution logs |
| /aws/lambda/AuditTrailLambda | 90 days | Audit logs |
| /aws/lambda/SNSNotificationLambda | 7 days | Notification logs |
| /aws/lambda/ObservabilityLambda | 7 days | Observability logs |
| /aws/states/ApprovalStateMachine | 90 days | Step Functions execution logs |

**Requirements Validated**: 8.8, 8.9

## API Gateway Configuration

### REST API Endpoints

- `POST /tact` - TACT evaluation
- `POST /guardrails` - Guardrails query
- `POST /neptune` - Trust scoring
- `POST /approval` - Approval workflow

### Rate Limiting

- Rate Limit: 100 requests per minute
- Burst Limit: 200 requests

### CORS Configuration

- Allowed Origins: * (configurable per environment)
- Allowed Headers: Content-Type, X-Amz-Date, Authorization, X-Api-Key
- Allowed Methods: GET, POST, OPTIONS

**Requirements Validated**: 8.5

## Step Functions State Machine

### ApprovalStateMachine

**States:**
1. RecordApprovalRequest: Write APPROVAL_REQUESTED to audit trail
2. SendNotification: Send SNS notification to reviewer
3. WaitForApproval: Wait for task token (15-minute timeout)
4. ProcessDecision: Choice state (APPROVE or DENY)
5. RecordApproval: Write APPROVED to audit trail
6. RecordDenial: Write DENIED to audit trail
7. HandleTimeout: Write TIMEOUT to audit trail

**Timeout Handling:**
- Timeout: 900 seconds (15 minutes)
- On timeout: Catch States.Timeout error → HandleTimeout state
- Automatic DENY on timeout

**Requirements Validated**: 8.5

## Deployment Procedures

### Prerequisites

- AWS CLI configured
- Bash shell
- AWS account with CloudFormation, Lambda, DynamoDB, Neptune, API Gateway, Step Functions, IAM permissions

### Deployment Steps

1. **Validate Templates**
   ```bash
   ./cloudformation/scripts/validate.sh
   ```

2. **Package Lambda Code**
   ```bash
   ./cloudformation/scripts/package.sh <environment>
   ```

3. **Deploy Stack**
   ```bash
   ./cloudformation/scripts/deploy.sh <environment>
   ```

### Environment Configuration

| Parameter | Dev | Staging | Prod |
|-----------|-----|---------|------|
| Lambda Memory | 512 MB | 1024 MB | 1024 MB |
| Log Level | DEBUG | INFO | WARN |
| Rate Limit | 1000/min | 100/min | 100/min |
| Neptune NCUs | 2.5-4.5 | 2.5-4.5 | 2.5-4.5 |

## Security Considerations

1. **Network Security**
   - Neptune in private VPC subnets
   - Lambda functions in VPC for Neptune access
   - No public endpoints except API Gateway

2. **Data Security**
   - DynamoDB point-in-time recovery enabled
   - Audit trail table has deletion protection
   - CloudTrail log file validation enabled
   - S3 bucket versioning for CloudTrail logs

3. **Access Control**
   - IAM roles with least-privilege permissions
   - Permission boundaries prevent privilege escalation
   - No wildcard permissions
   - Resource-level permissions only

4. **Audit and Compliance**
   - CloudTrail logs all AWS API calls
   - Audit trail table is immutable
   - 90-day retention for audit logs
   - CloudWatch Logs for all executions

**Requirements Validated**: 8.7, 8.8, 8.9

## Cost Optimization

### Resource Sizing

- Lambda: Right-sized memory (512-1024 MB)
- Neptune: Serverless for variable workload
- DynamoDB: On-demand billing
- CloudWatch Logs: 7-day retention for demos, 90-day for audit

### Estimated Monthly Costs

**Production Environment (100 executions/day):**
- Lambda: ~$50
- Neptune Serverless: ~$200
- DynamoDB: ~$25
- API Gateway: ~$10
- CloudWatch Logs: ~$15
- S3 + CloudFront: ~$20
- **Total: ~$320/month**

**Development Environment:**
- Significantly lower due to reduced usage
- Estimated: ~$50-100/month

## Monitoring and Observability

### CloudWatch Dashboards

Automatic dashboard creation includes:
- Lambda invocations and errors
- API Gateway latency
- DynamoDB throttling
- Neptune connection failures

### CloudWatch Alarms

- Lambda error rate > 5%
- DynamoDB throttling detected
- Neptune connection failures
- IAM policy changes
- Failed authentication attempts

### CloudTrail Events

All AWS API calls logged with:
- Service name
- Operation
- Timestamp
- Request ID
- User identity

## Troubleshooting

### Common Issues

1. **Template Validation Errors**
   - Run `./cloudformation/scripts/validate.sh`
   - Check for syntax errors in YAML

2. **Deployment Failures**
   - Check CloudFormation events
   - Verify IAM permissions
   - Ensure S3 buckets exist

3. **Lambda Errors**
   - Check CloudWatch Logs
   - Verify environment variables
   - Check IAM role permissions

4. **Neptune Connection Issues**
   - Verify Lambda is in VPC
   - Check security group rules
   - Verify Neptune endpoint

5. **Step Functions Timeouts**
   - Check CloudWatch Logs for state machine
   - Verify task token handling
   - Check SNS notification delivery

## References

- Requirements Document: `.kiro/specs/aws-agent-governance-demos/requirements.md`
- Design Document: `.kiro/specs/aws-agent-governance-demos/design.md`
- CloudFormation Templates: `cloudformation/`
- Deployment Scripts: `cloudformation/scripts/`

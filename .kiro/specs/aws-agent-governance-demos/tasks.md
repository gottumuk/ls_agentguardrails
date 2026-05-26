# Implementation Plan: AWS Agent Governance Demos

## Overview

This implementation plan breaks down the AWS Agent Governance Demos system into discrete coding tasks. The system demonstrates AI agent governance patterns using the TACT framework across four interactive demos running on real AWS infrastructure (Bedrock, Guardrails, Neptune, Step Functions, DynamoDB, SNS).

The implementation follows a bottom-up approach: infrastructure first, then backend Lambda functions, then frontend components, with testing integrated throughout. Each task builds on previous work, with checkpoints to validate functionality before proceeding.

## Tasks

- [x] 1. Set up CloudFormation templates and shared infrastructure
  - [x] 1.1 Create CloudFormation template structure
    - Create main-stack.yaml with parameters and nested stacks
    - Create nested stack templates for each demo
    - Set up parameters files for dev/staging/prod environments
    - Create deployment scripts (deploy.sh, validate.sh, package.sh)
    - _Requirements: 8.1, 8.7_
  
  - [x] 1.2 Create DynamoDB tables (AuditTrailTable, SensitiveRecordsTable, WorkflowStateTable)
    - Define AuditTrailTable with partition key (event_id) and sort key (timestamp)
    - Enable point-in-time recovery and DynamoDB Streams
    - Define SensitiveRecordsTable with partition key (record_id)
    - Define WorkflowStateTable with partition key (workflow_id)
    - _Requirements: 8.5, 10.5_
  
  - [x] 1.3 Create Neptune Serverless cluster
    - Define Neptune cluster with Serverless configuration (2.5-4.5 NCUs)
    - Configure VPC with private subnets for Neptune access
    - Set up security groups for Lambda-to-Neptune connectivity
    - _Requirements: 8.3_
  
  - [x] 1.4 Create API Gateway (REST and WebSocket)
    - Define REST API for demo operations
    - Define WebSocket API for real-time updates
    - Configure CORS for frontend origin
    - Set up rate limiting (100 requests per minute)
    - _Requirements: 8.5_
  
  - [x] 1.5 Create IAM roles with least-privilege permissions
    - Define execution roles for each Lambda function
    - Define Step Functions execution role
    - Define Cognito Identity Pool role for frontend
    - Apply permission boundaries to prevent privilege escalation
    - _Requirements: 8.7_
  
  - [x] 1.6 Configure CloudWatch Logs and CloudTrail
    - Create log groups for each Lambda function
    - Enable CloudTrail for all AWS API calls
    - Configure log retention policies (7 days for demo logs, 90 days for audit)
    - _Requirements: 8.8, 8.9_

- [x] 2. Checkpoint - Verify infrastructure deployment
  - Deploy CloudFormation stack to development environment
  - Verify all resources created successfully
  - Test Neptune connectivity from Lambda
  - Ensure all tests pass, ask the user if questions arise

- [x] 3. Implement Demo 1 - TACT Decision Engine
  - [x] 3.1 Create TACTEvaluationLambda function
    - Implement Lambda handler with Bedrock API integration
    - Build TACT prompt template with four dimensions (Traceability, Accountability, Consequence, Trust Boundary)
    - Parse Bedrock response and extract dimension scores
    - Calculate average score and map to Trust Spectrum level
    - Write evaluation result to AuditTrailTable
    - _Requirements: 1.1, 1.2, 1.6_
  
  - [ ]* 3.2 Write property test for TACT evaluation completeness
    - **Property 1: TACT Evaluation Completeness**
    - **Validates: Requirements 1.1, 1.2**
  
  - [x] 3.3 Implement industry context switching in TACT prompts
    - Create industry-specific prompt framing for Banking, Healthcare, Retail, HR/Operations
    - Inject industry context and regulations into Bedrock prompt
    - _Requirements: 2.1, 2.3_
  
  - [x] 3.4 Implement custom input handling
    - Sanitize custom input (remove special characters, limit to 500 characters)
    - Validate input is non-empty
    - Evaluate custom input using same TACT prompt template
    - _Requirements: 1.4, 6.4_
  
  - [ ]* 3.5 Write property test for custom input evaluation
    - **Property 2: Custom Input Evaluation**
    - **Validates: Requirements 1.4, 6.4**
  
  - [ ]* 3.6 Write unit tests for TACT Lambda
    - Test preset actions for each industry (wire transfer, opioid prescription, bulk refund, mass termination)
    - Test Trust Spectrum mapping edge cases (scores at boundaries)
    - Test Bedrock API error handling (rate limits, timeouts)
    - _Requirements: 1.1, 1.2, 1.6_

- [x] 4. Implement Demo 2 - Guardrails & Data Protection
  - [x] 4.1 Create GuardrailsQueryLambda function
    - Implement Lambda handler with DynamoDB query logic
    - Query SensitiveRecordsTable by record_id
    - Invoke Bedrock Guardrails API with raw record
    - Compare raw and sanitized records, identify redacted fields
    - Measure latency (DynamoDB query time, Guardrails processing time)
    - Write query result to AuditTrailTable
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  
  - [x] 4.2 Configure Bedrock Guardrails policies for each industry
    - Create Banking policy (block SSN, account numbers, DOB)
    - Create Healthcare policy (anonymize MRN, ICD-10 codes, prescription history)
    - Create Retail policy (anonymize card numbers, CVV)
    - Create HR/Operations policy (anonymize government ID, salary)
    - _Requirements: 3.6, 3.7, 3.8, 3.9_
  
  - [ ]* 4.3 Write property test for Guardrails redaction universality
    - **Property 6: Guardrails Redaction Universality**
    - **Validates: Requirements 3.3, 3.10**
  
  - [ ]* 4.4 Write unit tests for Guardrails Lambda
    - Test SSN redaction in Banking context
    - Test MRN redaction in Healthcare context
    - Test card number redaction in Retail context
    - Test salary redaction in HR/Operations context
    - Test DynamoDB query error handling
    - _Requirements: 3.6, 3.7, 3.8, 3.9_

- [x] 5. Implement Demo 3 - Neptune Trust Graph
  - [x] 5.1 Create NeptuneScoringLambda function
    - Implement Lambda handler with Neptune connection setup
    - Build Gremlin traversal query (2-hop search for RiskCluster nodes)
    - Execute Gremlin query and parse results
    - Implement trust score calculation algorithm (base 100, deduct for risk proximity)
    - Determine verdict (PROCEED if score >= 60, ESCALATE if score < 60)
    - Write trust score result to AuditTrailTable
    - _Requirements: 4.2, 4.3, 4.6, 4.7, 4.8_
  
  - [ ]* 5.2 Write property test for risk cluster proximity score reduction
    - **Property 9: Risk Cluster Proximity Score Reduction**
    - **Validates: Requirements 4.3**
  
  - [x] 5.3 Implement industry-specific risk cluster types
    - Configure fraud_cluster for Banking
    - Configure prescription_mill for Healthcare
    - Configure refund_ring for Retail
    - Configure legal_case for HR/Operations
    - _Requirements: 2.5, 4.9_
  
  - [ ]* 5.4 Write unit tests for Neptune Lambda
    - Test trust score calculation with direct risk cluster connection (1 hop)
    - Test trust score calculation with 2-hop risk cluster connection
    - Test trust score at threshold boundary (exactly 60)
    - Test Neptune connection failure handling
    - _Requirements: 4.3, 4.6, 4.7_

- [x] 6. Checkpoint - Verify first three demos
  - Test Demo 1 with preset and custom actions
  - Test Demo 2 with sensitive records from all industries
  - Test Demo 3 with various trust score scenarios
  - Verify audit trail entries written correctly
  - Ensure all tests pass, ask the user if questions arise

- [x] 7. Implement Demo 4 - Human-in-the-Loop Approval Workflow
  - [x] 7.1 Create Step Functions state machine definition
    - Define states: RecordApprovalRequest, SendNotification, WaitForApproval, ProcessDecision, RecordApproval, RecordDenial, HandleTimeout
    - Configure waitForTaskToken with 900-second timeout
    - Add timeout error handling (catch States.Timeout)
    - _Requirements: 5.1, 5.3, 5.7_
  
  - [x] 7.2 Create ApprovalWorkflowLambda function
    - Implement Lambda handler to start Step Functions execution
    - Pass action context and industry context to state machine
    - Return execution ARN and task token
    - _Requirements: 5.1_
  
  - [x] 7.3 Create SNSNotificationLambda function
    - Implement Lambda handler to publish SNS notification
    - Format notification message with action context, trust score, risk factors
    - Include approve/deny URLs with task token
    - _Requirements: 5.2_
  
  - [x] 7.4 Create ApprovalDecisionLambda function
    - Implement Lambda handler to send task token response
    - Handle APPROVE decision (SendTaskSuccess)
    - Handle DENY decision (SendTaskFailure)
    - Write decision to AuditTrailTable
    - _Requirements: 5.5, 5.6, 5.8_
  
  - [ ]* 7.5 Write property test for escalation triggers workflow
    - **Property 11: Escalation Triggers Workflow**
    - **Validates: Requirements 5.1**
  
  - [ ]* 7.6 Write property test for decision audit trail
    - **Property 13: Decision Audit Trail**
    - **Validates: Requirements 5.5, 5.6, 5.8**
  
  - [ ]* 7.7 Write unit tests for approval workflow
    - Test workflow execution with APPROVE decision
    - Test workflow execution with DENY decision
    - Test workflow timeout after 15 minutes
    - Test SNS notification delivery
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 5.7_

- [x] 8. Implement AuditTrailLambda and universal audit logging
  - [x] 8.1 Create AuditTrailLambda function
    - Implement Lambda handler to write audit trail entries
    - Support all event types (TACT_EVALUATION, GUARDRAILS_QUERY, TRUST_SCORE_CALCULATED, APPROVAL_REQUESTED, APPROVAL_DECISION, WORKFLOW_TIMEOUT, DEMO_RESET)
    - Ensure writes are atomic and idempotent
    - Query audit trail with chronological ordering
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.7_
  
  - [ ]* 8.2 Write property test for universal audit trail
    - **Property 17: Universal Audit Trail**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
  
  - [ ]* 8.3 Write property test for audit trail chronological ordering
    - **Property 19: Audit Trail Chronological Ordering**
    - **Validates: Requirements 10.7**
  
  - [ ]* 8.4 Write unit tests for audit trail
    - Test audit trail write for each event type
    - Test audit trail query returns records in chronological order
    - Test DynamoDB write error handling
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.7_

- [x] 9. Implement ObservabilityLambda for real-time log streaming
  - [x] 9.1 Create ObservabilityLambda function
    - Implement Lambda handler to stream CloudWatch Logs
    - Use FilterLogEvents API with 500ms polling interval
    - Filter by log group and execution ID
    - Stream log events to WebSocket clients
    - _Requirements: 13.2, 13.3, 13.4_
  
  - [x] 9.2 Implement request/response inspection
    - Capture Bedrock prompts before API calls
    - Capture Gremlin queries before Neptune execution
    - Capture DynamoDB query expressions before table scans
    - Display response time metrics in milliseconds
    - _Requirements: 13.12, 13.13_
  
  - [ ]* 9.3 Write property test for observability data completeness
    - **Property 16: Observability Data Completeness**
    - **Validates: Requirements 7.1, 7.2, 7.4, 7.5, 7.6**
  
  - [ ]* 9.4 Write unit tests for observability Lambda
    - Test CloudWatch Logs streaming with various log groups
    - Test log filtering by execution ID
    - Test WebSocket message delivery
    - _Requirements: 13.2, 13.3, 13.4_

- [x] 10. Checkpoint - Verify backend implementation
  - Test all Lambda functions independently
  - Test Step Functions state machine execution
  - Test audit trail writes for all event types
  - Test observability log streaming
  - Ensure all tests pass, ask the user if questions arise

- [x] 11. Implement frontend React application
  - [x] 11.1 Set up React project with TypeScript
    - Initialize React app with Create React App or Vite
    - Configure TypeScript and ESLint
    - Set up AWS SDK for JavaScript (browser)
    - Configure WebSocket client for real-time updates
    - _Requirements: 7.1, 7.2_
  
  - [x] 11.2 Create IndustryContext provider
    - Define industry context with Banking, Healthcare, Retail, HR/Operations
    - Create industry configuration objects (preset actions, sensitive fields, risk cluster types, reviewer roles)
    - Implement context switching logic with <500ms update propagation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ]* 11.3 Write property test for industry context configuration consistency
    - **Property 4: Industry Context Configuration Consistency**
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6**
  
  - [x] 11.4 Create Demo 1 UI component (TACT Engine)
    - Display preset action buttons for each industry
    - Display custom input text area with character counter
    - Display TACT evaluation results (four dimension scores, Trust Spectrum badge)
    - Display evaluation reasoning in expandable section
    - _Requirements: 1.3, 1.4, 1.5_
  
  - [x] 11.5 Create Demo 2 UI component (Guardrails)
    - Display side-by-side viewer (raw record vs sanitized record)
    - Highlight redacted fields in red
    - Display latency metrics (DynamoDB, Guardrails, total)
    - Color-code latency (green <100ms, yellow 100-500ms, red >500ms)
    - _Requirements: 3.4, 3.5_
  
  - [x] 11.6 Create Demo 3 UI component (Neptune Trust Graph)
    - Display target node selector dropdown
    - Display Gremlin query text with syntax highlighting
    - Display D3.js force-directed graph visualization
    - Display trust score (0-100), verdict badge (PROCEED/ESCALATE), factor breakdown
    - Animate graph traversal during query execution
    - _Requirements: 4.4, 4.5_
  
  - [x] 11.7 Create Demo 4 UI component (Approval Workflow)
    - Display action context (proposal, trust score, risk factors)
    - Display reviewer identity badge (changes per industry)
    - Display countdown timer (MM:SS format) with warnings at 5 min and 1 min
    - Display Approve/Deny buttons
    - Display audit trail timeline (scrollable list of events)
    - _Requirements: 5.3, 5.4, 5.9_

- [x] 12. Implement observability sidebar
  - [x] 12.1 Create log viewer component
    - Display scrolling terminal-style log view
    - Color-code logs by severity (INFO, WARN, ERROR)
    - Filter logs by Lambda function name and execution ID
    - Auto-scroll to latest log entry
    - _Requirements: 13.2, 13.3, 13.4_
  
  - [x] 12.2 Create code display component with Monaco Editor
    - Embed Monaco Editor with syntax highlighting (Python, JSON, Gremlin)
    - Display source code for Lambda functions, Step Functions definitions, Gremlin queries
    - Highlight current line during execution
    - _Requirements: 13.1, 13.11_
  
  - [x] 12.3 Create request/response inspector component
    - Display request details (HTTP method, endpoint, headers, body)
    - Display response details (status code, headers, body, latency)
    - Format JSON with syntax highlighting
    - _Requirements: 13.12, 13.13_
  
  - [x] 12.4 Create AWS Console deep linking
    - Generate deep links to Bedrock, Neptune, Step Functions, DynamoDB, CloudWatch consoles
    - Include execution ARN, log group, table name in links
    - Open links in new tab to preserve demo UI state
    - _Requirements: 13.10_
  
  - [x] 12.5 Implement multi-screen layout management
    - Create three layout modes: Demo Only, Demo + Code, Demo + Code + Logs
    - Implement resizable panels with drag handles
    - Persist layout state to localStorage
    - Add keyboard shortcuts for layout switching (Ctrl+1, Ctrl+2, Ctrl+3)
    - _Requirements: 13.14_

- [x] 13. Implement WebSocket integration for real-time updates
  - [x] 13.1 Create WebSocket connection manager
    - Establish WebSocket connection to API Gateway
    - Implement connection health check (ping every 30 seconds)
    - Implement automatic reconnection with exponential backoff (up to 5 attempts)
    - _Requirements: 7.2, 7.7_
  
  - [x] 13.2 Handle WebSocket message types
    - Handle DEMO_STATE_UPDATE messages (update demo UI)
    - Handle LOG_EVENT messages (append to log viewer)
    - Handle AUDIT_TRAIL_ENTRY messages (append to audit trail timeline)
    - Handle VOTE_UPDATE messages (update vote counts)
    - Handle ERROR messages (display error banner)
    - Handle CONTEXT_SWITCH messages (update all demos)
    - _Requirements: 7.2, 7.7_
  
  - [ ]* 13.3 Write unit tests for WebSocket integration
    - Test WebSocket connection establishment
    - Test message handling for each message type
    - Test automatic reconnection on disconnection
    - _Requirements: 7.2, 7.7_

- [x] 14. Implement audience interaction features
  - [x] 14.1 Implement voting UI for Demo 4
    - Display vote buttons (APPROVE, DENY)
    - Display real-time vote counts with progress bars
    - Submit majority vote as reviewer decision after 60 seconds
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ]* 14.2 Write property test for vote majority selection
    - **Property 15: Vote Majority Selection**
    - **Validates: Requirements 6.3**
  
  - [ ]* 14.3 Write unit tests for voting
    - Test vote aggregation with various distributions
    - Test majority calculation (>50%)
    - Test vote submission to ApprovalDecisionLambda
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 15. Checkpoint - Verify frontend implementation
  - Test all four demo UI components
  - Test industry context switching across all demos
  - Test observability sidebar (logs, code, inspector)
  - Test WebSocket real-time updates
  - Test audience voting
  - Ensure all tests pass, ask the user if questions arise

- [x] 16. Implement demo reset functionality
  - [x] 16.1 Create ResetDemoLambda function
    - Implement Lambda handler to clear in-progress workflows
    - Cancel Step Functions executions
    - Clear demo state from WorkflowStateTable
    - Reload preset data for current industry context
    - Preserve audit trail records (no deletion)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [ ]* 16.2 Write property test for demo reset state restoration
    - **Property 20: Demo Reset State Restoration**
    - **Validates: Requirements 11.3, 11.5**
  
  - [ ]* 16.3 Write property test for demo reset audit preservation
    - **Property 21: Demo Reset Audit Preservation**
    - **Validates: Requirements 11.4**
  
  - [ ]* 16.4 Write property test for demo isolation
    - **Property 22: Demo Isolation**
    - **Validates: Requirements 11.6**
  
  - [ ]* 16.5 Write unit tests for demo reset
    - Test reset clears in-progress workflows
    - Test reset preserves audit trail
    - Test reset does not affect other demos
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [x] 17. Implement error handling and resilience
  - [x] 17.1 Add error handling to all Lambda functions
    - Catch AWS SDK exceptions and log to CloudWatch
    - Return structured error responses to frontend
    - Implement exponential backoff retry for transient errors
    - _Requirements: 12.1, 12.2_
  
  - [ ]* 17.2 Write property test for error message display
    - **Property 23: Error Message Display**
    - **Validates: Requirements 12.1**
  
  - [ ]* 17.3 Write property test for error logging
    - **Property 24: Error Logging**
    - **Validates: Requirements 12.2**
  
  - [x] 17.4 Implement frontend error boundaries
    - Create error boundary for each demo component
    - Display error message without crashing other demos
    - Provide "Reset Demo" button to clear error state
    - _Requirements: 12.7_
  
  - [ ]* 17.5 Write property test for graceful degradation
    - **Property 25: Graceful Degradation**
    - **Validates: Requirements 12.7**
  
  - [ ]* 17.6 Write unit tests for error handling
    - Test Bedrock rate limit handling
    - Test Neptune connection failure handling
    - Test Step Functions execution failure handling
    - Test WebSocket disconnection handling
    - Test demo isolation on error
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 18. Implement data seeding
  - [x] 18.1 Create seed data files
    - Create DynamoDB seed data for each industry (Banking, Healthcare, Retail, HR/Operations)
    - Create Neptune graph seed data for each industry
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  
  - [x] 18.2 Create SeedDataLambda function
    - Implement Lambda handler to load DynamoDB seed data
    - Implement Lambda handler to load Neptune graph seed data
    - Use CloudFormation custom resource to trigger seeding on stack creation
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  
  - [ ]* 18.3 Write unit tests for data seeding
    - Test DynamoDB seed data loads correctly
    - Test Neptune graph seed data loads correctly
    - Test seed data for all four industries
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [ ] 19. Implement remaining property-based tests
  - [ ]* 19.1 Write property test for TACT result display completeness
    - **Property 3: TACT Result Display Completeness**
    - **Validates: Requirements 1.5**
  
  - [ ]* 19.2 Write property test for sensitive data persistence and retrieval
    - **Property 5: Sensitive Data Persistence and Retrieval**
    - **Validates: Requirements 3.1**
  
  - [ ]* 19.3 Write property test for Guardrails output completeness
    - **Property 7: Guardrails Output Completeness**
    - **Validates: Requirements 3.4, 3.5**
  
  - [ ]* 19.4 Write property test for graph data persistence and retrieval
    - **Property 8: Graph Data Persistence and Retrieval**
    - **Validates: Requirements 4.1**
  
  - [ ]* 19.5 Write property test for trust score output completeness
    - **Property 10: Trust Score Output Completeness**
    - **Validates: Requirements 4.4, 4.5**
  
  - [ ]* 19.6 Write property test for workflow notification
    - **Property 12: Workflow Notification**
    - **Validates: Requirements 5.2**
  
  - [ ]* 19.7 Write property test for workflow timeout handling
    - **Property 14: Workflow Timeout Handling**
    - **Validates: Requirements 5.7**
  
  - [ ]* 19.8 Write property test for audit trail immutability
    - **Property 18: Audit Trail Immutability**
    - **Validates: Requirements 10.6**
  
  - [ ]* 19.9 Write property test for source code display
    - **Property 26: Source Code Display**
    - **Validates: Requirements 13.1**
  
  - [ ]* 19.10 Write property test for request/response inspection
    - **Property 27: Request/Response Inspection**
    - **Validates: Requirements 13.12, 13.13**

- [x] 20. Checkpoint - Verify complete system integration
  - Run all unit tests and property-based tests
  - Test end-to-end flows for all four demos
  - Test industry context switching across all demos
  - Test error handling and resilience
  - Test demo reset and isolation
  - Ensure all tests pass, ask the user if questions arise

- [x] 21. Configure deployment environments
  - [x] 21.1 Create environment configuration files
    - Create dev.ts with development environment settings
    - Create staging.ts with staging environment settings
    - Create prod.ts with production environment settings
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_
  
  - [x] 21.2 Configure CloudWatch dashboards and alarms
    - Create dashboard with Lambda invocations, errors, and latency metrics
    - Create alarms for Lambda error rate, DynamoDB throttling, Neptune connection failures
    - _Requirements: 8.9_
  
  - [x] 21.3 Set up frontend hosting with CloudFront
    - Create S3 bucket for frontend static files
    - Create CloudFront distribution with custom domain and SSL
    - Configure cache policies for optimal performance
    - _Requirements: 8.1_

- [x] 22. Create deployment scripts and documentation
  - [x] 22.1 Create deployment scripts
    - Create deploy.sh script for CloudFormation deployment
    - Create seed-data.sh script for data seeding
    - Create rollback.sh script for emergency rollback
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_
  
  - [x] 22.2 Write deployment documentation
    - Document pre-deployment checklist
    - Document deployment commands for each environment
    - Document post-deployment verification steps
    - Document rollback procedure
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

- [x] 23. Final checkpoint - Production readiness
  - Deploy to staging environment
  - Run smoke tests against staging
  - Verify all demos work end-to-end
  - Verify observability layer displays correctly
  - Verify error handling works as expected
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties (27 total)
- Unit tests validate specific examples and edge cases
- All Lambda functions use Python with boto3 for AWS SDK
- Frontend uses React with TypeScript and AWS SDK for JavaScript
- Infrastructure uses AWS CloudFormation with YAML templates
- Neptune queries use Gremlin
- Step Functions state machines use JSON definitions

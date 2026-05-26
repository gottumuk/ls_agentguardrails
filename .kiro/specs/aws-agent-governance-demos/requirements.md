# Requirements Document

## Introduction

This specification defines the requirements for a 60-minute AWS live stream demonstration system showcasing AI agent governance patterns. The system consists of four interactive demos that run on real AWS infrastructure, demonstrating how to control AI agent autonomy using the TACT framework (Traceability, Accountability, Consequence, Trust Boundary) across four industries: Banking, Healthcare, Retail, and HR/Operations.

The demos illustrate a universal architecture problem: determining appropriate trust levels for autonomous AI agents with production access. Each demo uses the same AWS services (Bedrock, Guardrails, Neptune, Step Functions, DynamoDB, SNS) but applies them to industry-specific scenarios, proving that agent governance is an architecture pattern, not an industry-specific solution.

## Glossary

- **Demo_System**: The complete live stream demonstration application consisting of four integrated demos
- **TACT_Engine**: The Amazon Bedrock-powered classification system that evaluates agent actions across four dimensions
- **Trust_Spectrum**: A five-level classification scale (BLOCKED, RESTRICTED, SUPERVISED, VERIFIED, TRUSTED)
- **Guardrails_Filter**: Amazon Bedrock Guardrails service that intercepts and sanitizes sensitive data
- **Trust_Graph**: Amazon Neptune Serverless graph database that scores trust via relationship traversal
- **Approval_Workflow**: AWS Step Functions state machine implementing human-in-the-loop approval
- **Industry_Context**: One of four supported domains (Banking, Healthcare, Retail, HR/Operations)
- **Sensitive_Field**: Data requiring protection (SSN, MRN, ICD-10, card number, CVV, salary, government ID)
- **Risk_Cluster**: A graph node pattern indicating elevated risk (fraud cluster, prescription mill, refund ring, legal case)
- **Audit_Trail**: Immutable DynamoDB record of all decisions, approvals, denials, and timeouts
- **Reviewer**: Human decision-maker whose identity varies by Industry_Context
- **Action_Proposal**: A specific operation an AI agent requests to perform
- **Custom_Input**: Audience-provided Action_Proposal for live evaluation

## Requirements

### Requirement 1: TACT Decision Engine

**User Story:** As a live stream presenter, I want to classify agent actions in real time using the TACT framework, so that the audience can see how any proposed action maps to the Trust Spectrum.

#### Acceptance Criteria

1. WHEN an Action_Proposal is submitted, THE TACT_Engine SHALL evaluate all four TACT dimensions (Traceability, Accountability, Consequence, Trust Boundary) using Amazon Bedrock
2. WHEN evaluation completes, THE TACT_Engine SHALL assign exactly one Trust_Spectrum level (BLOCKED, RESTRICTED, SUPERVISED, VERIFIED, or TRUSTED)
3. THE Demo_System SHALL provide preset Action_Proposals for each Industry_Context (wire transfer for Banking, opioid prescription for Healthcare, bulk refund for Retail, mass termination for HR/Operations)
4. WHERE Custom_Input mode is enabled, THE TACT_Engine SHALL accept and evaluate audience-provided Action_Proposals
5. WHEN displaying results, THE Demo_System SHALL show the evaluation for all four TACT dimensions and the final Trust_Spectrum placement
6. THE TACT_Engine SHALL complete evaluation and return results within 3 seconds

### Requirement 2: Industry Context Switching

**User Story:** As a live stream presenter, I want to switch between industry contexts with one click, so that I can demonstrate the same AWS architecture solving problems across Banking, Healthcare, Retail, and HR/Operations.

#### Acceptance Criteria

1. THE Demo_System SHALL support exactly four Industry_Contexts: Banking, Healthcare, Retail, and HR/Operations
2. WHEN Industry_Context is changed, THE Demo_System SHALL update all four demos to reflect the selected context within 500 milliseconds
3. WHEN Industry_Context changes, THE Demo_System SHALL update preset Action_Proposals to match the selected industry
4. WHEN Industry_Context changes, THE Demo_System SHALL update Sensitive_Field types to match industry requirements (SSN for Banking, MRN and ICD-10 for Healthcare, card numbers for Retail, salary for HR/Operations)
5. WHEN Industry_Context changes, THE Demo_System SHALL update Risk_Cluster types to match industry patterns (fraud cluster for Banking, prescription mill for Healthcare, refund ring for Retail, legal case for HR/Operations)
6. WHEN Industry_Context changes, THE Demo_System SHALL update Reviewer identity labels to match industry roles (compliance officer for Banking, prescribing MD for Healthcare, fraud ops for Retail, VP HR and Legal for HR/Operations)
7. THE Demo_System SHALL preserve the same AWS service architecture across all Industry_Context switches

### Requirement 3: Guardrails Data Protection

**User Story:** As a live stream presenter, I want to demonstrate real-time PII/PHI/PCI interception, so that the audience can see Guardrails block sensitive data before it reaches the AI agent.

#### Acceptance Criteria

1. THE Demo_System SHALL store records containing Sensitive_Fields in Amazon DynamoDB
2. WHEN an agent queries DynamoDB, THE Guardrails_Filter SHALL intercept the response before the agent receives it
3. WHEN Sensitive_Fields are detected, THE Guardrails_Filter SHALL redact or block them according to the current Industry_Context
4. THE Demo_System SHALL display a side-by-side comparison showing the raw DynamoDB record and the sanitized agent response
5. WHEN processing a query, THE Demo_System SHALL measure and display the Guardrails_Filter latency in milliseconds
6. THE Guardrails_Filter SHALL block SSN, account numbers, and DOB for Banking context
7. THE Guardrails_Filter SHALL block MRN, ICD-10 codes, and prescription history for Healthcare context
8. THE Guardrails_Filter SHALL block card numbers and CVV for Retail context
9. THE Guardrails_Filter SHALL block salary and government ID for HR/Operations context
10. FOR ALL valid DynamoDB records containing Sensitive_Fields, THE Guardrails_Filter SHALL prevent those fields from appearing in the agent response

### Requirement 4: Neptune Trust Graph Scoring

**User Story:** As a live stream presenter, I want to execute live graph traversals that discover hidden risk patterns, so that the audience can see how relationship analysis detects risks that static rules cannot.

#### Acceptance Criteria

1. THE Trust_Graph SHALL store nodes and relationships in Amazon Neptune Serverless
2. WHEN a trust score is requested for a target node, THE Trust_Graph SHALL execute a Gremlin traversal query
3. WHEN traversal discovers the target node is within 2 hops of a Risk_Cluster, THE Trust_Graph SHALL reduce the trust score
4. THE Demo_System SHALL display the Gremlin query text during execution
5. WHEN scoring completes, THE Demo_System SHALL display the numeric trust score (0-100 scale) and factor breakdown
6. WHEN the trust score is below 60, THE Trust_Graph SHALL return a verdict of ESCALATE
7. WHEN the trust score is 60 or above, THE Trust_Graph SHALL return a verdict of PROCEED
8. THE Trust_Graph SHALL complete scoring and return results within 2 seconds
9. WHEN Industry_Context changes, THE Trust_Graph SHALL reframe Risk_Cluster types without modifying the Gremlin traversal logic

### Requirement 5: Human-in-the-Loop Approval Workflow

**User Story:** As a live stream presenter, I want to pause agent execution and require human approval, so that the audience can see Step Functions implement a complete human-in-the-loop pattern with timeout handling.

#### Acceptance Criteria

1. WHEN Trust_Graph returns an ESCALATE verdict, THE Approval_Workflow SHALL invoke an AWS Step Functions state machine with waitForTaskToken
2. WHEN the state machine starts, THE Approval_Workflow SHALL send an SNS notification to the Reviewer with full action context
3. WHEN the notification is sent, THE Approval_Workflow SHALL start a 15-minute countdown timer
4. THE Demo_System SHALL display the countdown timer in real time
5. WHEN a Reviewer responds with APPROVE, THE Approval_Workflow SHALL resume execution and write the decision to the Audit_Trail
6. WHEN a Reviewer responds with DENY, THE Approval_Workflow SHALL halt execution and write the decision to the Audit_Trail
7. IF the 15-minute timer expires without a response, THEN THE Approval_Workflow SHALL automatically DENY the action and write the timeout to the Audit_Trail
8. THE Approval_Workflow SHALL write all decisions to Amazon DynamoDB with timestamp, Reviewer identity, action context, and verdict
9. THE Demo_System SHALL display Audit_Trail entries in real time as they are written
10. WHEN Industry_Context changes, THE Approval_Workflow SHALL update Reviewer identity labels without modifying the Step Functions state machine definition

### Requirement 6: Live Audience Interaction

**User Story:** As a live stream presenter, I want the audience to vote on decisions and submit custom actions, so that the demos are interactive and engaging rather than pre-recorded.

#### Acceptance Criteria

1. THE Demo_System SHALL accept audience votes of APPROVE or DENY during Demo 4
2. WHEN votes are received, THE Demo_System SHALL display vote counts in real time
3. WHEN the voting period ends, THE Demo_System SHALL submit the majority vote as the Reviewer decision
4. THE Demo_System SHALL accept Custom_Input text from the audience for Demo 1
5. WHEN Custom_Input is received, THE TACT_Engine SHALL evaluate it and display results within 3 seconds
6. THE Demo_System SHALL display audience interaction elements (vote buttons, input fields) prominently during the relevant demo segments

### Requirement 7: Real-Time Visualization

**User Story:** As a live stream presenter, I want all processing steps and data flows to be visible in real time, so that the audience can follow the architecture as it executes.

#### Acceptance Criteria

1. WHEN any demo is executing, THE Demo_System SHALL display the current processing step
2. WHEN AWS services are invoked, THE Demo_System SHALL display which service is being called
3. WHEN data flows between services, THE Demo_System SHALL display the data transformation visually
4. WHEN latency is measured, THE Demo_System SHALL display timing in milliseconds
5. WHEN queries execute, THE Demo_System SHALL display query text (Gremlin, DynamoDB query expressions)
6. WHEN decisions are made, THE Demo_System SHALL display the decision logic and factors
7. THE Demo_System SHALL update all visualizations within 200 milliseconds of the underlying state change

### Requirement 8: AWS Infrastructure Integration

**User Story:** As a live stream presenter, I want all demos to run on real AWS infrastructure, so that the audience sees actual service behavior rather than simulations.

#### Acceptance Criteria

1. THE TACT_Engine SHALL use Amazon Bedrock API for all classification requests
2. THE Guardrails_Filter SHALL use Amazon Bedrock Guardrails API for all interception requests
3. THE Trust_Graph SHALL use Amazon Neptune Serverless for all graph storage and traversal
4. THE Approval_Workflow SHALL use AWS Step Functions for all state machine executions
5. THE Demo_System SHALL use Amazon DynamoDB for record storage and Audit_Trail persistence
6. THE Approval_Workflow SHALL use Amazon SNS for all Reviewer notifications
7. THE Demo_System SHALL use AWS IAM roles with least-privilege permissions for all service access
8. THE Demo_System SHALL log all AWS API calls to AWS CloudTrail
9. THE Demo_System SHALL emit metrics to Amazon CloudWatch for all demo operations

### Requirement 9: Preset Industry Scenarios

**User Story:** As a live stream presenter, I want pre-configured scenarios for each industry, so that I can quickly demonstrate relevant use cases without manual setup.

#### Acceptance Criteria

1. THE Demo_System SHALL provide a Banking preset with Action_Proposal "Transfer $47,000 between accounts"
2. THE Demo_System SHALL provide a Healthcare preset with Action_Proposal "Prescribe 90-day opioid refill and notify pharmacy"
3. THE Demo_System SHALL provide a Retail preset with Action_Proposal "Issue $12,400 refund and waive return window"
4. THE Demo_System SHALL provide an HR/Operations preset with Action_Proposal "Terminate 47 contractors in APAC immediately"
5. WHEN a preset is selected, THE Demo_System SHALL populate all four demos with consistent scenario data
6. WHEN a preset is selected, THE Demo_System SHALL configure DynamoDB records with appropriate Sensitive_Fields for that Industry_Context
7. WHEN a preset is selected, THE Demo_System SHALL configure Trust_Graph with appropriate Risk_Cluster patterns for that Industry_Context

### Requirement 10: Audit Trail Immutability

**User Story:** As a compliance officer, I want all agent decisions and human approvals to be recorded immutably, so that I can review the complete decision history for regulatory purposes.

#### Acceptance Criteria

1. THE Demo_System SHALL write every TACT_Engine evaluation to the Audit_Trail with timestamp, Action_Proposal, all four dimension scores, and Trust_Spectrum placement
2. THE Demo_System SHALL write every Guardrails_Filter interception to the Audit_Trail with timestamp, query, Sensitive_Fields detected, and action taken
3. THE Demo_System SHALL write every Trust_Graph scoring to the Audit_Trail with timestamp, target node, trust score, Risk_Cluster proximity, and verdict
4. THE Demo_System SHALL write every Approval_Workflow decision to the Audit_Trail with timestamp, Reviewer identity, action context, decision (APPROVE/DENY/TIMEOUT), and response time
5. THE Audit_Trail SHALL use DynamoDB with point-in-time recovery enabled
6. THE Audit_Trail SHALL not allow modification or deletion of existing records
7. WHEN querying the Audit_Trail, THE Demo_System SHALL return records in chronological order

### Requirement 11: Demo Isolation and Reset

**User Story:** As a live stream presenter, I want to reset demo state between scenarios, so that each demonstration starts from a clean baseline.

#### Acceptance Criteria

1. THE Demo_System SHALL provide a reset function for each demo
2. WHEN reset is invoked, THE Demo_System SHALL clear all in-progress workflows within 2 seconds
3. WHEN reset is invoked, THE Demo_System SHALL reset all visualization displays to initial state
4. WHEN reset is invoked, THE Demo_System SHALL preserve the Audit_Trail (no deletion of historical records)
5. WHEN reset is invoked, THE Demo_System SHALL reload preset data for the current Industry_Context
6. THE Demo_System SHALL allow resetting individual demos without affecting other demos

### Requirement 12: Error Handling and Resilience

**User Story:** As a live stream presenter, I want graceful error handling for AWS service failures, so that a single service issue does not crash the entire demo.

#### Acceptance Criteria

1. WHEN an AWS service call fails, THE Demo_System SHALL display an error message indicating which service failed
2. WHEN an AWS service call fails, THE Demo_System SHALL log the error to CloudWatch with full context
3. WHEN an AWS service call times out, THE Demo_System SHALL display a timeout message after 10 seconds
4. WHEN Bedrock API rate limits are exceeded, THE Demo_System SHALL display a rate limit message and retry after 1 second
5. WHEN Neptune query fails, THE Demo_System SHALL display the query error without crashing the demo
6. WHEN Step Functions execution fails, THE Demo_System SHALL display the execution error and allow manual retry
7. THE Demo_System SHALL continue operating other demos when one demo encounters an error

### Requirement 13: Livestream Observability and Developer Experience

**User Story:** As a live stream presenter, I want to display live code, logs, database queries, and AWS service calls in real-time, so that the audience can see the actual infrastructure in action and follow along with the implementation.

#### Acceptance Criteria

1. THE Demo_System SHALL display the source code for Lambda functions, Step Functions definitions, Gremlin queries, and Bedrock API calls being executed
2. WHEN Lambda functions execute, THE Demo_System SHALL stream CloudWatch Logs in real-time with visible function names and execution IDs
3. WHEN Step Functions state machines transition, THE Demo_System SHALL stream CloudWatch Logs showing state changes and waitForTaskToken status
4. WHEN Bedrock API calls complete, THE Demo_System SHALL stream CloudWatch Logs showing prompts sent and responses received
5. THE Demo_System SHALL provide a DynamoDB table viewer that displays Audit_Trail contents updating in real-time as decisions are recorded
6. WHEN Demo 3 executes, THE Demo_System SHALL provide a Neptune graph visualization showing nodes, relationships, and traversal paths during Gremlin query execution
7. WHEN Approval_Workflow executes, THE Demo_System SHALL display the Step Functions execution console showing current state, including waitForTaskToken pause state
8. THE Demo_System SHALL display the Bedrock Guardrails policy configuration showing which Sensitive_Fields are blocked for the current Industry_Context
9. THE Demo_System SHALL provide a CloudTrail event viewer displaying recent API calls made by the Demo_System with service name, operation, and timestamp
10. THE Demo_System SHALL support switching between the demo UI and AWS Console views for each service (Bedrock, Neptune, Step Functions, DynamoDB, CloudWatch)
11. THE Demo_System SHALL display source code files for each demo component with syntax highlighting and the ability to navigate between related files
12. WHEN AWS API requests are sent, THE Demo_System SHALL display the request inspector showing Bedrock prompts, Gremlin queries, and DynamoDB query expressions before execution
13. WHEN AWS API responses are received, THE Demo_System SHALL display response time metrics in milliseconds for each service call
14. THE Demo_System SHALL support multi-screen layout configurations allowing simultaneous display of demo UI, source code, logs, and AWS Console views
15. WHEN any AWS service is invoked, THE Demo_System SHALL update observability displays within 500 milliseconds to maintain real-time synchronization


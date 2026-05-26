# Design Document: AWS Agent Governance Demos

## Overview

The AWS Agent Governance Demos system is a live stream demonstration platform that showcases AI agent governance patterns using the TACT framework (Traceability, Accountability, Consequence, Trust Boundary). The system consists of four interactive demos that run on real AWS infrastructure, demonstrating how to control AI agent autonomy across four industries: Banking, Healthcare, Retail, and HR/Operations.

The core architectural insight is that agent governance is a universal pattern, not an industry-specific solution. Each demo uses the same AWS services (Bedrock, Guardrails, Neptune, Step Functions, DynamoDB, SNS) but applies them to industry-specific scenarios, proving that the architecture scales across domains.

The system is designed for a 60-minute live stream presentation with real-time audience interaction, live code display, AWS service observability, and complete audit trails. All processing happens on actual AWS infrastructure, not simulations.

### Key Design Goals

1. **Real-time Interactivity**: Audience can vote on decisions and submit custom actions
2. **Live Infrastructure**: All demos run on real AWS services with visible API calls
3. **Industry Portability**: Single architecture adapts to Banking, Healthcare, Retail, and HR/Operations
4. **Complete Observability**: Code, logs, queries, and AWS Console views visible during execution
5. **Immutable Audit Trail**: All decisions recorded for compliance review
6. **Graceful Degradation**: Individual demo failures don't crash the entire system

## Architecture

### System Architecture Overview


The system follows a multi-tier architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Demo UI Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Demo 1  │  │  Demo 2  │  │  Demo 3  │  │  Demo 4  │        │
│  │   TACT   │  │Guardrails│  │ Neptune  │  │  Human   │        │
│  │  Engine  │  │   Data   │  │  Trust   │  │   Loop   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         Observability Layer (Logs, Code, Console)         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway + Lambda Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ TACT Lambda  │  │Guardrails    │  │ Neptune      │          │
│  │              │  │Lambda        │  │ Lambda       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Approval     │  │ Audit Trail  │  │ Observability│          │
│  │ Lambda       │  │ Lambda       │  │ Lambda       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Services Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Bedrock  │  │ Neptune  │  │  Step    │  │ DynamoDB │        │
│  │          │  │Serverless│  │Functions │  │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   SNS    │  │CloudWatch│  │CloudTrail│  │   IAM    │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### AWS Service Topology


**Amazon Bedrock**: Provides the TACT classification engine and Guardrails data protection. Two distinct uses:
- Bedrock Inference API for TACT dimension evaluation (Traceability, Accountability, Consequence, Trust Boundary)
- Bedrock Guardrails API for PII/PHI/PCI interception and redaction

**Amazon Neptune Serverless**: Graph database for trust scoring via relationship traversal. Stores nodes (accounts, users, entities) and edges (relationships, transactions) with properties. Gremlin queries traverse the graph to detect proximity to risk clusters.

**AWS Step Functions**: Orchestrates human-in-the-loop approval workflows with waitForTaskToken pattern. Pauses execution until human decision or timeout (15 minutes).

**Amazon DynamoDB**: Three tables:
- Sensitive records table (contains PII/PHI/PCI for Demo 2)
- Audit trail table (immutable log of all decisions)
- Workflow state table (tracks in-progress approvals)

**Amazon SNS**: Sends approval notifications to reviewers with action context and decision links.

**Amazon CloudWatch**: Logs all Lambda executions, Step Functions state transitions, and Bedrock API calls for real-time streaming to the observability layer.

**AWS CloudTrail**: Records all AWS API calls for compliance audit.

**AWS IAM**: Enforces least-privilege access with service-specific roles.

### Frontend Demo UI Architecture

The frontend is a single-page application with four demo panels and an observability sidebar:

**Technology Stack**:
- React for UI components
- WebSocket connection for real-time updates
- AWS SDK for JavaScript (browser) for direct CloudWatch Logs streaming
- D3.js for Neptune graph visualization
- Monaco Editor for code display with syntax highlighting

**Layout**:
- Top bar: Industry context switcher (Banking, Healthcare, Retail, HR/Operations)
- Main area: Four demo panels in 2x2 grid
- Right sidebar: Observability layer (logs, code, console links)
- Bottom bar: Audit trail timeline

**State Management**:
- Industry context stored in React context
- Demo state managed per-demo with Redux
- WebSocket messages update state in real-time
- Optimistic UI updates with rollback on error


### Backend Lambda Functions and API Gateway

**API Gateway Configuration**:
- WebSocket API for real-time bidirectional communication
- REST API for demo operations (evaluate, query, score, approve, deny, reset)
- CORS enabled for frontend origin
- API key authentication for demo operations
- Rate limiting: 100 requests per minute per IP

**Lambda Functions**:

1. **TACTEvaluationLambda**: Invokes Bedrock to evaluate action proposals across four TACT dimensions
   - Input: action_proposal, industry_context
   - Output: traceability_score, accountability_score, consequence_score, trust_boundary_score, trust_spectrum_level
   - Timeout: 10 seconds
   - Memory: 512 MB

2. **GuardrailsQueryLambda**: Queries DynamoDB and applies Bedrock Guardrails to response
   - Input: record_id, industry_context
   - Output: raw_record, sanitized_record, latency_ms, fields_redacted
   - Timeout: 10 seconds
   - Memory: 512 MB

3. **NeptuneScoringLambda**: Executes Gremlin traversal to calculate trust score
   - Input: target_node_id, industry_context
   - Output: trust_score, risk_cluster_proximity, verdict, traversal_path
   - Timeout: 10 seconds
   - Memory: 1024 MB

4. **ApprovalWorkflowLambda**: Starts Step Functions execution with waitForTaskToken
   - Input: action_context, industry_context
   - Output: execution_arn, task_token
   - Timeout: 5 seconds
   - Memory: 256 MB

5. **ApprovalDecisionLambda**: Sends task token response to Step Functions
   - Input: task_token, decision (APPROVE/DENY)
   - Output: success boolean
   - Timeout: 5 seconds
   - Memory: 256 MB

6. **AuditTrailLambda**: Writes immutable records to DynamoDB audit table
   - Input: event_type, timestamp, context, decision
   - Output: record_id
   - Timeout: 5 seconds
   - Memory: 256 MB

7. **ObservabilityLambda**: Streams CloudWatch Logs to WebSocket clients
   - Input: log_group, filter_pattern
   - Output: log_events (streamed)
   - Timeout: 60 seconds
   - Memory: 512 MB

8. **ResetDemoLambda**: Clears in-progress workflows and reloads preset data
   - Input: demo_id, industry_context
   - Output: success boolean
   - Timeout: 10 seconds
   - Memory: 256 MB

### Observability Layer Architecture


The observability layer provides real-time visibility into code execution, AWS service calls, and data flows:

**CloudWatch Logs Streaming**:
- ObservabilityLambda subscribes to CloudWatch Logs using FilterLogEvents API
- Polls every 500ms for new log events
- Filters by log group and execution ID
- Streams events to WebSocket clients with <500ms latency

**Real-Time Log Tailing**:
- Frontend maintains WebSocket connection to ObservabilityLambda
- Log events displayed in scrolling terminal-style view
- Color-coded by severity (INFO, WARN, ERROR)
- Filterable by Lambda function name and execution ID

**Code Display Integration**:
- Source code stored in S3 bucket
- Monaco Editor embedded in observability sidebar
- Syntax highlighting for Python (Lambda), JSON (Step Functions), Gremlin (Neptune)
- Code synchronized with execution: highlights current line during Lambda execution

**AWS Console Embedding/Linking**:
- Deep links to AWS Console for each service
- Links include execution ARN, log group, table name for direct navigation
- Console views open in new tab to preserve demo UI state

**Request/Response Inspection**:
- Bedrock prompts displayed before API call
- Gremlin queries displayed before Neptune execution
- DynamoDB query expressions displayed before table scan
- Response payloads displayed with JSON formatting
- Latency metrics displayed in milliseconds

**Multi-Screen Layout Management**:
- Three layout modes: Demo Only, Demo + Code, Demo + Code + Logs
- Resizable panels with drag handles
- Layout state persisted to localStorage
- Keyboard shortcuts for quick layout switching (Ctrl+1, Ctrl+2, Ctrl+3)

## Components and Interfaces

### Demo 1: TACT Decision Engine


**Purpose**: Classify agent actions in real-time using the TACT framework to determine appropriate trust levels.

**Bedrock API Integration**:
- Model: Claude 3.5 Sonnet (anthropic.claude-3-5-sonnet-20241022-v2:0)
- API: InvokeModel with streaming disabled for deterministic responses
- Temperature: 0.0 for consistent classification
- Max tokens: 1000

**Prompt Engineering for TACT Dimensions**:

The prompt structure follows a chain-of-thought pattern with explicit scoring criteria:

```
You are an AI agent governance classifier. Evaluate the following action proposal across four dimensions:

Industry Context: {industry_context}
Action Proposal: {action_proposal}

Evaluate each dimension on a scale of 1-5:

1. TRACEABILITY: Can we track who initiated this action and reconstruct the decision chain?
   - 1: No audit trail, anonymous action
   - 3: Partial logging, some gaps
   - 5: Complete audit trail with timestamps and actor identity

2. ACCOUNTABILITY: Is there a clear owner responsible for this action's outcome?
   - 1: No owner, diffuse responsibility
   - 3: Shared responsibility across multiple parties
   - 5: Single accountable party with authority to act

3. CONSEQUENCE: What is the potential impact if this action goes wrong?
   - 1: Catastrophic (regulatory violation, major financial loss, safety risk)
   - 3: Moderate (customer complaint, minor financial impact)
   - 5: Minimal (easily reversible, low impact)

4. TRUST BOUNDARY: Does this action cross organizational or regulatory boundaries?
   - 1: Crosses external boundaries (regulatory, inter-org)
   - 3: Crosses internal boundaries (department, team)
   - 5: Within single team/system boundary

Provide your evaluation in JSON format:
{
  "traceability": <score>,
  "accountability": <score>,
  "consequence": <score>,
  "trust_boundary": <score>,
  "reasoning": "<brief explanation>"
}
```

**Trust Spectrum Mapping**:

After receiving dimension scores, the system calculates the average and maps to Trust Spectrum:

- Average 1.0-1.5: BLOCKED (action rejected immediately)
- Average 1.6-2.5: RESTRICTED (action requires multiple approvals)
- Average 2.6-3.5: SUPERVISED (action requires single approval)
- Average 3.6-4.5: VERIFIED (action proceeds with audit)
- Average 4.6-5.0: TRUSTED (action proceeds automatically)

**Industry Context Switching Logic**:

Industry context affects prompt framing but not scoring logic:

- Banking: Emphasize regulatory compliance (FINRA, OCC), financial impact
- Healthcare: Emphasize patient safety (HIPAA), clinical protocols
- Retail: Emphasize fraud prevention, customer impact
- HR/Operations: Emphasize legal compliance (EEOC, labor law), employee rights

Context injected into prompt as: "You are evaluating actions in the {industry_context} industry. Consider {industry_specific_regulations} when assessing risk."

**Custom Input Handling**:

When audience submits custom action proposals:
1. Sanitize input (remove special characters, limit to 500 characters)
2. Validate input is not empty or malicious
3. Inject into same prompt template
4. Display evaluation results with disclaimer: "Audience-submitted action"

**UI Components**:
- Preset action buttons (one per industry)
- Custom input text area with character counter
- Submit button with loading spinner
- Results display: four dimension scores with visual bars, final Trust Spectrum badge
- Evaluation reasoning displayed in expandable section


### Demo 2: Guardrails & Data Protection

**Purpose**: Demonstrate real-time PII/PHI/PCI interception before data reaches AI agents.

**DynamoDB Schema for Sensitive Records**:

Table name: `SensitiveRecordsTable`

Primary key: `record_id` (String, partition key)

Attributes by industry context:

Banking records:
```json
{
  "record_id": "BANK-001",
  "account_holder": "John Smith",
  "ssn": "123-45-6789",
  "account_number": "9876543210",
  "dob": "1985-03-15",
  "balance": 47000.00,
  "last_transaction": "2024-01-15"
}
```

Healthcare records:
```json
{
  "record_id": "HEALTH-001",
  "patient_name": "Jane Doe",
  "mrn": "MRN-789456",
  "icd10_codes": ["M79.3", "G89.29"],
  "prescription_history": ["Oxycodone 30mg", "Hydrocodone 10mg"],
  "prescribing_md": "Dr. Smith",
  "last_visit": "2024-01-10"
}
```

Retail records:
```json
{
  "record_id": "RETAIL-001",
  "customer_name": "Bob Johnson",
  "card_number": "4532-1234-5678-9010",
  "cvv": "123",
  "refund_amount": 12400.00,
  "order_id": "ORD-456789",
  "purchase_date": "2023-12-20"
}
```

HR/Operations records:
```json
{
  "record_id": "HR-001",
  "employee_name": "Alice Chen",
  "government_id": "A12345678",
  "salary": 125000,
  "department": "Engineering",
  "location": "APAC",
  "hire_date": "2022-06-01"
}
```

**Bedrock Guardrails Policy Configuration**:

Guardrails are configured per industry with sensitive data filters:

Banking policy:
- Block SSN (regex: `\d{3}-\d{2}-\d{4}`)
- Block account numbers (regex: `\d{10,12}`)
- Block DOB (regex: `\d{4}-\d{2}-\d{2}`)
- Action: BLOCK (reject entire response if detected)

Healthcare policy:
- Block MRN (regex: `MRN-\d{6}`)
- Block ICD-10 codes (regex: `[A-Z]\d{2}\.\d`)
- Block prescription history (keyword list: opioid medication names)
- Action: ANONYMIZE (replace with [REDACTED])

Retail policy:
- Block card numbers (regex: `\d{4}-\d{4}-\d{4}-\d{4}`)
- Block CVV (regex: `\b\d{3}\b`)
- Action: ANONYMIZE (replace with [REDACTED])

HR/Operations policy:
- Block government ID (regex: `[A-Z]\d{8}`)
- Block salary (regex: `\$?\d{1,3}(,\d{3})*(\.\d{2})?`)
- Action: ANONYMIZE (replace with [REDACTED])

**Side-by-Side Viewer Architecture**:

UI displays two panels:
1. Left panel: Raw DynamoDB record (JSON formatted)
2. Right panel: Sanitized agent response after Guardrails processing

Flow:
1. User clicks "Query Record" button
2. GuardrailsQueryLambda fetches record from DynamoDB
3. Lambda invokes Bedrock Guardrails API with record as input
4. Guardrails returns sanitized version
5. Both versions sent to frontend via WebSocket
6. UI highlights redacted fields in red

**Latency Measurement Approach**:

Timing captured at three points:
1. `t0`: Lambda receives request
2. `t1`: DynamoDB query completes
3. `t2`: Guardrails API returns response

Metrics displayed:
- DynamoDB latency: `t1 - t0`
- Guardrails latency: `t2 - t1`
- Total latency: `t2 - t0`

Latency displayed in milliseconds with color coding:
- Green: <100ms
- Yellow: 100-500ms
- Red: >500ms


### Demo 3: Neptune Trust Graph

**Purpose**: Execute live graph traversals to discover hidden risk patterns through relationship analysis.

**Neptune Graph Schema**:

Node types:
- `Account`: Represents a bank account, customer, patient, or employee
  - Properties: `id`, `name`, `type`, `industry_context`, `created_date`
- `RiskCluster`: Represents a known risk pattern
  - Properties: `id`, `cluster_type`, `risk_level`, `description`
- `Entity`: Represents an external party (merchant, pharmacy, vendor)
  - Properties: `id`, `name`, `entity_type`

Edge types:
- `TRANSACTS_WITH`: Account → Account (financial transactions)
  - Properties: `amount`, `timestamp`, `frequency`
- `ASSOCIATED_WITH`: Account → RiskCluster (proximity to risk)
  - Properties: `distance`, `confidence_score`
- `INTERACTS_WITH`: Account → Entity (business relationships)
  - Properties: `interaction_count`, `last_interaction`

Industry-specific risk cluster types:
- Banking: `fraud_cluster` (accounts involved in suspicious transactions)
- Healthcare: `prescription_mill` (providers with abnormal opioid prescribing patterns)
- Retail: `refund_ring` (accounts with coordinated refund abuse)
- HR/Operations: `legal_case` (employees involved in active litigation)

**Gremlin Traversal Queries for Risk Scoring**:

Base query structure (industry-agnostic):

```gremlin
g.V().has('Account', 'id', target_id)
  .repeat(
    bothE().otherV().simplePath()
  ).times(2)
  .has('RiskCluster')
  .path()
  .by(valueMap(true))
```

This query:
1. Starts at target account node
2. Traverses up to 2 hops in any direction
3. Finds paths that end at RiskCluster nodes
4. Returns full path with all properties

**Trust Score Calculation Algorithm**:

```python
def calculate_trust_score(target_id, traversal_results):
    base_score = 100
    
    # Deduct points for risk cluster proximity
    for path in traversal_results:
        hops = len(path) - 1  # Distance to risk cluster
        risk_level = path[-1]['risk_level']  # Risk cluster severity
        
        if hops == 1:  # Direct connection
            deduction = risk_level * 30
        elif hops == 2:  # 2-hop connection
            deduction = risk_level * 15
        
        base_score -= deduction
    
    # Deduct points for high-frequency suspicious transactions
    suspicious_tx_count = count_suspicious_transactions(target_id)
    base_score -= min(suspicious_tx_count * 5, 20)
    
    # Floor at 0
    return max(base_score, 0)
```

Risk level values:
- 1: Low risk (monitoring only)
- 2: Medium risk (review recommended)
- 3: High risk (escalation required)

Verdict logic:
- Score >= 60: PROCEED (action allowed)
- Score < 60: ESCALATE (requires human approval)

**Graph Visualization Approach**:

Frontend uses D3.js force-directed graph:
- Nodes rendered as circles, sized by importance
- Edges rendered as lines, thickness indicates relationship strength
- RiskCluster nodes colored red
- Target node highlighted in blue
- Traversal path animated during query execution

Visualization updates:
1. Initial state: Show target node only
2. Query execution: Animate traversal, highlighting visited nodes
3. Query complete: Display full subgraph with risk clusters
4. Score display: Show numeric score and verdict badge

**UI Components**:
- Target node selector (dropdown with preset accounts)
- "Calculate Trust Score" button
- Gremlin query display (read-only, syntax highlighted)
- Graph visualization canvas
- Score display: numeric value (0-100), verdict badge (PROCEED/ESCALATE)
- Factor breakdown: list of deductions with explanations


### Demo 4: Human-in-the-Loop Approval Workflow

**Purpose**: Pause agent execution and require human approval with timeout handling.

**Step Functions State Machine Definition**:

```json
{
  "Comment": "Human-in-the-loop approval workflow with timeout",
  "StartAt": "RecordApprovalRequest",
  "States": {
    "RecordApprovalRequest": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:AuditTrailLambda",
      "Parameters": {
        "event_type": "APPROVAL_REQUESTED",
        "timestamp.$": "$$.State.EnteredTime",
        "context.$": "$.action_context"
      },
      "Next": "SendNotification"
    },
    "SendNotification": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:SNSNotificationLambda",
      "Parameters": {
        "reviewer.$": "$.reviewer",
        "action_context.$": "$.action_context",
        "industry_context.$": "$.industry_context"
      },
      "Next": "WaitForApproval"
    },
    "WaitForApproval": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
      "Parameters": {
        "FunctionName": "ApprovalWaitLambda",
        "Payload": {
          "task_token.$": "$$.Task.Token",
          "action_context.$": "$.action_context"
        }
      },
      "TimeoutSeconds": 900,
      "Catch": [
        {
          "ErrorEquals": ["States.Timeout"],
          "Next": "HandleTimeout"
        }
      ],
      "Next": "ProcessDecision"
    },
    "ProcessDecision": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.decision",
          "StringEquals": "APPROVE",
          "Next": "RecordApproval"
        },
        {
          "Variable": "$.decision",
          "StringEquals": "DENY",
          "Next": "RecordDenial"
        }
      ],
      "Default": "RecordDenial"
    },
    "RecordApproval": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:AuditTrailLambda",
      "Parameters": {
        "event_type": "APPROVED",
        "timestamp.$": "$$.State.EnteredTime",
        "context.$": "$.action_context",
        "reviewer.$": "$.reviewer_identity"
      },
      "End": true
    },
    "RecordDenial": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:AuditTrailLambda",
      "Parameters": {
        "event_type": "DENIED",
        "timestamp.$": "$$.State.EnteredTime",
        "context.$": "$.action_context",
        "reviewer.$": "$.reviewer_identity"
      },
      "End": true
    },
    "HandleTimeout": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:REGION:ACCOUNT:function:AuditTrailLambda",
      "Parameters": {
        "event_type": "TIMEOUT",
        "timestamp.$": "$$.State.EnteredTime",
        "context.$": "$.action_context"
      },
      "End": true
    }
  }
}
```

**SNS Notification Integration**:

SNS topic: `ApprovalNotificationTopic`

Notification message format:
```json
{
  "subject": "Action Approval Required - {industry_context}",
  "message": {
    "action_proposal": "{action_description}",
    "industry_context": "{industry}",
    "trust_score": "{score}",
    "risk_factors": ["{factor1}", "{factor2}"],
    "approve_url": "https://demo.example.com/approve?token={task_token}",
    "deny_url": "https://demo.example.com/deny?token={task_token}",
    "expires_at": "{timestamp + 15 minutes}"
  }
}
```

Subscription endpoints:
- Email (for demo purposes, presenter's email)
- HTTPS webhook (for Twitch chat integration)

**Twitch Chat Voting Integration**:

Twitch bot listens for chat commands:
- `!approve`: Vote to approve action
- `!deny`: Vote to deny action

Vote aggregation:
1. Bot collects votes for 60 seconds after notification
2. Calculates majority (>50% of votes)
3. Submits majority decision via ApprovalDecisionLambda
4. Displays vote counts in demo UI

Vote display format:
```
Approve: ████████░░ 45 votes (60%)
Deny:    ████░░░░░░ 30 votes (40%)
```

**Audit Trail DynamoDB Schema**:

Table name: `AuditTrailTable`

Primary key: `event_id` (String, partition key)
Sort key: `timestamp` (Number, Unix timestamp)

Attributes:
```json
{
  "event_id": "uuid-v4",
  "timestamp": 1704067200,
  "event_type": "APPROVAL_REQUESTED | APPROVED | DENIED | TIMEOUT",
  "action_context": {
    "action_proposal": "Transfer $47,000 between accounts",
    "industry_context": "Banking",
    "trust_score": 45,
    "risk_factors": ["Proximity to fraud cluster", "High transaction amount"]
  },
  "reviewer_identity": "compliance_officer@bank.com",
  "decision": "APPROVE | DENY | TIMEOUT",
  "response_time_seconds": 120,
  "execution_arn": "arn:aws:states:...",
  "task_token": "encrypted-token"
}
```

Table configuration:
- Point-in-time recovery: ENABLED
- Deletion protection: ENABLED
- Stream: ENABLED (for real-time UI updates)

**Timeout Handling Logic**:

Step Functions timeout: 900 seconds (15 minutes)

Timeout behavior:
1. Step Functions catches `States.Timeout` error
2. Transitions to `HandleTimeout` state
3. AuditTrailLambda writes timeout event
4. Execution ends with FAILED status
5. UI displays "Approval timeout - action denied"

Timeout prevention:
- UI displays countdown timer (15:00 → 0:00)
- Warning at 5 minutes remaining
- Warning at 1 minute remaining
- Auto-refresh approval link every 60 seconds

**UI Components**:
- Action context display (proposal, trust score, risk factors)
- Reviewer identity badge (changes per industry)
- Countdown timer (MM:SS format)
- Vote display (if Twitch integration enabled)
- Approve/Deny buttons (for manual testing)
- Audit trail timeline (scrollable list of events)


### Industry Context Switching

**Context Switching Mechanism**:

Industry context stored in React context provider:
```javascript
const IndustryContext = React.createContext({
  current: 'Banking',
  setCurrent: (industry) => {},
  config: {}
});
```

Context configuration per industry:
```javascript
const INDUSTRY_CONFIGS = {
  Banking: {
    preset_action: "Transfer $47,000 between accounts",
    sensitive_fields: ["ssn", "account_number", "dob"],
    risk_cluster_type: "fraud_cluster",
    reviewer_role: "Compliance Officer",
    guardrails_policy_id: "banking-pii-policy"
  },
  Healthcare: {
    preset_action: "Prescribe 90-day opioid refill and notify pharmacy",
    sensitive_fields: ["mrn", "icd10_codes", "prescription_history"],
    risk_cluster_type: "prescription_mill",
    reviewer_role: "Prescribing MD",
    guardrails_policy_id: "healthcare-phi-policy"
  },
  Retail: {
    preset_action: "Issue $12,400 refund and waive return window",
    sensitive_fields: ["card_number", "cvv"],
    risk_cluster_type: "refund_ring",
    reviewer_role: "Fraud Operations",
    guardrails_policy_id: "retail-pci-policy"
  },
  HROperations: {
    preset_action: "Terminate 47 contractors in APAC immediately",
    sensitive_fields: ["government_id", "salary"],
    risk_cluster_type: "legal_case",
    reviewer_role: "VP HR and Legal",
    guardrails_policy_id: "hr-pii-policy"
  }
};
```

Context switch flow:
1. User clicks industry button in top bar
2. `setCurrent()` updates context state
3. All demo components re-render with new config
4. Backend APIs receive `industry_context` parameter
5. AWS service calls use industry-specific configurations

Update propagation:
- Demo 1: Updates preset action button text and TACT prompt framing
- Demo 2: Updates DynamoDB query target and Guardrails policy ID
- Demo 3: Updates risk cluster type filter in Gremlin query
- Demo 4: Updates reviewer identity label and SNS notification template

Performance target: <500ms for complete context switch across all demos.

### Observability Integration

**CloudWatch Logs Streaming**:

Log groups:
- `/aws/lambda/TACTEvaluationLambda`
- `/aws/lambda/GuardrailsQueryLambda`
- `/aws/lambda/NeptuneScoringLambda`
- `/aws/lambda/ApprovalWorkflowLambda`
- `/aws/states/ApprovalStateMachine`

ObservabilityLambda implementation:
```python
def stream_logs(log_group, execution_id):
    client = boto3.client('logs')
    
    # Start time: 5 minutes ago
    start_time = int((datetime.now() - timedelta(minutes=5)).timestamp() * 1000)
    
    # Filter by execution ID
    filter_pattern = f'[..., request_id="{execution_id}", ...]'
    
    # Poll for new events
    next_token = None
    while True:
        params = {
            'logGroupName': log_group,
            'filterPattern': filter_pattern,
            'startTime': start_time
        }
        if next_token:
            params['nextToken'] = next_token
        
        response = client.filter_log_events(**params)
        
        for event in response['events']:
            yield {
                'timestamp': event['timestamp'],
                'message': event['message'],
                'log_stream': event['logStreamName']
            }
        
        next_token = response.get('nextToken')
        if not next_token:
            time.sleep(0.5)  # Poll every 500ms
```

**Code Display**:

Source code structure:
```
s3://demo-source-code/
  lambda/
    tact_evaluation.py
    guardrails_query.py
    neptune_scoring.py
    approval_workflow.py
  step_functions/
    approval_state_machine.json
  gremlin/
    trust_score_query.groovy
```

Monaco Editor configuration:
```javascript
monaco.editor.create(document.getElementById('code-viewer'), {
  value: sourceCode,
  language: 'python',
  theme: 'vs-dark',
  readOnly: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false
});
```

Code highlighting during execution:
- Lambda execution: Highlight function entry point
- Bedrock API call: Highlight boto3 invocation line
- Neptune query: Highlight Gremlin query string
- Step Functions transition: Highlight current state in JSON

**Request/Response Inspection**:

Request inspector displays:
- HTTP method and endpoint
- Request headers (with auth tokens redacted)
- Request body (JSON formatted)
- Timestamp

Response inspector displays:
- HTTP status code
- Response headers
- Response body (JSON formatted)
- Latency (milliseconds)

Example for Bedrock API call:
```
REQUEST (2024-01-15 10:30:45.123)
POST /model/anthropic.claude-3-5-sonnet-20241022-v2:0/invoke
Headers: {
  "Content-Type": "application/json",
  "Authorization": "[REDACTED]"
}
Body: {
  "prompt": "You are an AI agent governance classifier...",
  "max_tokens": 1000,
  "temperature": 0.0
}

RESPONSE (2024-01-15 10:30:47.456)
Status: 200 OK
Latency: 2333ms
Body: {
  "completion": "{\"traceability\": 4, \"accountability\": 3, ...}",
  "stop_reason": "end_turn"
}
```


## Data Models

### TACT Evaluation Result

```typescript
interface TACTEvaluationResult {
  evaluation_id: string;           // UUID
  timestamp: number;                // Unix timestamp
  action_proposal: string;          // Original action text
  industry_context: IndustryType;   // Banking | Healthcare | Retail | HROperations
  dimensions: {
    traceability: number;           // 1-5
    accountability: number;          // 1-5
    consequence: number;             // 1-5
    trust_boundary: number;          // 1-5
  };
  average_score: number;             // 1.0-5.0
  trust_spectrum: TrustLevel;        // BLOCKED | RESTRICTED | SUPERVISED | VERIFIED | TRUSTED
  reasoning: string;                 // Bedrock explanation
  latency_ms: number;                // API call duration
}

type IndustryType = 'Banking' | 'Healthcare' | 'Retail' | 'HROperations';
type TrustLevel = 'BLOCKED' | 'RESTRICTED' | 'SUPERVISED' | 'VERIFIED' | 'TRUSTED';
```

### Guardrails Query Result

```typescript
interface GuardrailsQueryResult {
  query_id: string;                  // UUID
  timestamp: number;                 // Unix timestamp
  record_id: string;                 // DynamoDB record ID
  industry_context: IndustryType;
  raw_record: Record<string, any>;   // Original DynamoDB item
  sanitized_record: Record<string, any>; // After Guardrails processing
  fields_redacted: string[];         // List of field names redacted
  guardrails_policy_id: string;      // Policy applied
  latency: {
    dynamodb_ms: number;             // DynamoDB query time
    guardrails_ms: number;           // Guardrails processing time
    total_ms: number;                // End-to-end time
  };
}
```

### Neptune Trust Score Result

```typescript
interface TrustScoreResult {
  score_id: string;                  // UUID
  timestamp: number;                 // Unix timestamp
  target_node_id: string;            // Account/entity being scored
  industry_context: IndustryType;
  trust_score: number;               // 0-100
  verdict: 'PROCEED' | 'ESCALATE';
  risk_factors: RiskFactor[];
  traversal_path: GraphPath[];
  gremlin_query: string;             // Query executed
  latency_ms: number;                // Query execution time
}

interface RiskFactor {
  type: string;                      // e.g., "fraud_cluster_proximity"
  description: string;               // Human-readable explanation
  score_impact: number;              // Points deducted
}

interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphNode {
  id: string;
  label: string;                     // Account | RiskCluster | Entity
  properties: Record<string, any>;
}

interface GraphEdge {
  id: string;
  label: string;                     // TRANSACTS_WITH | ASSOCIATED_WITH | INTERACTS_WITH
  source: string;                    // Node ID
  target: string;                    // Node ID
  properties: Record<string, any>;
}
```

### Approval Workflow State

```typescript
interface ApprovalWorkflowState {
  workflow_id: string;               // UUID
  execution_arn: string;             // Step Functions execution ARN
  task_token: string;                // waitForTaskToken value (encrypted)
  timestamp_started: number;         // Unix timestamp
  timestamp_expires: number;         // timestamp_started + 900 seconds
  action_context: {
    action_proposal: string;
    industry_context: IndustryType;
    trust_score: number;
    risk_factors: string[];
  };
  reviewer_identity: string;         // Email or role name
  status: WorkflowStatus;
  decision?: 'APPROVE' | 'DENY' | 'TIMEOUT';
  decision_timestamp?: number;
  response_time_seconds?: number;
}

type WorkflowStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'TIMEOUT';
```

### Audit Trail Entry

```typescript
interface AuditTrailEntry {
  event_id: string;                  // UUID (partition key)
  timestamp: number;                 // Unix timestamp (sort key)
  event_type: AuditEventType;
  demo_id: number;                   // 1-4
  industry_context: IndustryType;
  event_data: TACTEvaluationResult | GuardrailsQueryResult | TrustScoreResult | ApprovalWorkflowState;
  execution_context: {
    lambda_request_id?: string;
    step_functions_execution_arn?: string;
    api_gateway_request_id?: string;
  };
}

type AuditEventType = 
  | 'TACT_EVALUATION'
  | 'GUARDRAILS_QUERY'
  | 'TRUST_SCORE_CALCULATED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_DECISION'
  | 'WORKFLOW_TIMEOUT'
  | 'DEMO_RESET';
```

### Preset Scenario Data

```typescript
interface PresetScenario {
  industry_context: IndustryType;
  action_proposal: string;
  sensitive_record: {
    record_id: string;
    data: Record<string, any>;
  };
  trust_graph_target: string;        // Node ID to score
  expected_outcomes: {
    tact_trust_level: TrustLevel;
    guardrails_fields_redacted: string[];
    trust_score_verdict: 'PROCEED' | 'ESCALATE';
  };
}
```

### WebSocket Message Format

```typescript
interface WebSocketMessage {
  message_type: MessageType;
  timestamp: number;
  payload: any;
}

type MessageType =
  | 'DEMO_STATE_UPDATE'
  | 'LOG_EVENT'
  | 'AUDIT_TRAIL_ENTRY'
  | 'VOTE_UPDATE'
  | 'ERROR'
  | 'CONTEXT_SWITCH';

// Example: Log event message
interface LogEventMessage extends WebSocketMessage {
  message_type: 'LOG_EVENT';
  payload: {
    log_group: string;
    log_stream: string;
    timestamp: number;
    message: string;
    execution_id: string;
  };
}

// Example: Demo state update
interface DemoStateUpdateMessage extends WebSocketMessage {
  message_type: 'DEMO_STATE_UPDATE';
  payload: {
    demo_id: number;
    state: 'IDLE' | 'EXECUTING' | 'COMPLETE' | 'ERROR';
    result?: any;
  };
}
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:

- Properties 10.1-10.4 (audit trail writes for each demo) can be combined into a single comprehensive property about all operations being audited
- Properties 2.3-2.6 (industry context updates) can be combined into a single property about configuration consistency
- Properties 3.3 and 3.10 are redundant; 3.10 is the more comprehensive universal property
- Properties 5.5 and 5.6 (APPROVE and DENY responses) can be combined into a single property about decision handling
- Properties 7.1, 7.2, 7.4, 7.5, 7.6 (various UI displays) can be combined into a single property about observability data completeness

The following properties represent the unique, non-redundant correctness guarantees:

### Property 1: TACT Evaluation Completeness

For any action proposal submitted to the TACT Engine, the evaluation result must contain scores for all four dimensions (Traceability, Accountability, Consequence, Trust Boundary) and exactly one Trust Spectrum level from the valid set (BLOCKED, RESTRICTED, SUPERVISED, VERIFIED, TRUSTED).

**Validates: Requirements 1.1, 1.2**

### Property 2: Custom Input Evaluation

For any non-empty string submitted as custom input, the TACT Engine must successfully evaluate it and return a valid TACT evaluation result.

**Validates: Requirements 1.4, 6.4**

### Property 3: TACT Result Display Completeness

For any TACT evaluation result, the displayed output must contain all four dimension scores and the final Trust Spectrum placement.

**Validates: Requirements 1.5**

### Property 4: Industry Context Configuration Consistency

For any industry context (Banking, Healthcare, Retail, HROperations), the system configuration must include a preset action proposal, sensitive field definitions, risk cluster type, and reviewer role that are semantically appropriate for that industry domain.

**Validates: Requirements 2.3, 2.4, 2.5, 2.6**

### Property 5: Sensitive Data Persistence and Retrieval

For any record containing sensitive fields stored in DynamoDB, querying by record ID must return a record containing those same sensitive fields.

**Validates: Requirements 3.1**

### Property 6: Guardrails Redaction Universality

For all valid DynamoDB records containing sensitive fields, after Guardrails processing, those sensitive fields must not appear in the sanitized agent response.

**Validates: Requirements 3.3, 3.10**

### Property 7: Guardrails Output Completeness

For any Guardrails query result, the output must contain both the raw record and the sanitized record, along with latency measurements in milliseconds.

**Validates: Requirements 3.4, 3.5**

### Property 8: Graph Data Persistence and Retrieval

For any node or edge stored in Neptune, querying by ID must return that node or edge with its properties intact.

**Validates: Requirements 4.1**

### Property 9: Risk Cluster Proximity Score Reduction

For any target node within 2 hops of a Risk Cluster, the calculated trust score must be lower than the base score (100).

**Validates: Requirements 4.3**

### Property 10: Trust Score Output Completeness

For any trust score calculation, the output must contain the numeric score (0-100), verdict (PROCEED or ESCALATE), Gremlin query text, and factor breakdown.

**Validates: Requirements 4.4, 4.5**

### Property 11: Escalation Triggers Workflow

For any trust score result with verdict ESCALATE, the system must initiate an approval workflow execution.

**Validates: Requirements 5.1**

### Property 12: Workflow Notification

For any approval workflow execution, an SNS notification must be sent to the reviewer.

**Validates: Requirements 5.2**

### Property 13: Decision Audit Trail

For any approval decision (APPROVE or DENY), an audit trail entry must be written to DynamoDB containing the decision, timestamp, reviewer identity, and action context.

**Validates: Requirements 5.5, 5.6, 5.8**

### Property 14: Workflow Timeout Handling

For any approval workflow that receives no response within the timeout period, the workflow must automatically record a TIMEOUT decision in the audit trail.

**Validates: Requirements 5.7**

### Property 15: Vote Majority Selection

For any set of votes containing at least one APPROVE and one DENY vote, the system must select the decision type that received more than 50% of the votes.

**Validates: Requirements 6.3**

### Property 16: Observability Data Completeness

For any demo execution, the observability output must contain the current processing step, AWS service names being invoked, timing measurements in milliseconds, query text, and decision factors.

**Validates: Requirements 7.1, 7.2, 7.4, 7.5, 7.6**

### Property 17: Universal Audit Trail

For any operation (TACT evaluation, Guardrails query, trust score calculation, approval decision), a corresponding audit trail entry must be written to DynamoDB.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

### Property 18: Audit Trail Immutability

For any record written to the audit trail, subsequent attempts to modify or delete that record must fail.

**Validates: Requirements 10.6**

### Property 19: Audit Trail Chronological Ordering

For any query to the audit trail, the returned records must be sorted by timestamp in ascending order.

**Validates: Requirements 10.7**

### Property 20: Demo Reset State Restoration

For any demo, invoking reset must return the demo to its initial state with preset data loaded for the current industry context.

**Validates: Requirements 11.3, 11.5**

### Property 21: Demo Reset Audit Preservation

For any demo reset operation, all existing audit trail records must remain unchanged.

**Validates: Requirements 11.4**

### Property 22: Demo Isolation

For any demo, resetting that demo must not change the state of any other demo.

**Validates: Requirements 11.6**

### Property 23: Error Message Display

For any AWS service call failure, the system must display an error message indicating which service failed.

**Validates: Requirements 12.1**

### Property 24: Error Logging

For any AWS service call failure, a log entry must be written to CloudWatch containing the error details and full context.

**Validates: Requirements 12.2**

### Property 25: Graceful Degradation

For any demo encountering an error, all other demos must remain operational.

**Validates: Requirements 12.7**

### Property 26: Source Code Display

For any demo execution, the observability layer must display the source code for the Lambda functions, Step Functions definitions, Gremlin queries, or Bedrock API calls being executed.

**Validates: Requirements 13.1**

### Property 27: Request/Response Inspection

For any AWS API call, the observability layer must display the request details (including prompts, queries, or expressions) and response time metrics in milliseconds.

**Validates: Requirements 13.12, 13.13**


## Error Handling

### Error Categories

The system handles four categories of errors:

1. **AWS Service Errors**: Bedrock throttling, Neptune connection failures, Step Functions execution errors, DynamoDB capacity exceeded
2. **Validation Errors**: Invalid industry context, malformed action proposals, missing required fields
3. **Timeout Errors**: Lambda timeouts, Step Functions timeouts, API Gateway timeouts
4. **Integration Errors**: WebSocket disconnections, CloudWatch Logs streaming failures, SNS delivery failures

### Error Handling Strategy

**AWS Service Errors**:
- Catch AWS SDK exceptions in Lambda functions
- Log full error context to CloudWatch (service name, operation, error code, request ID)
- Return structured error response to frontend: `{ error: true, service: 'Bedrock', message: 'Rate limit exceeded', retry_after: 1000 }`
- Display error in demo UI with service name and user-friendly message
- For transient errors (throttling, timeouts), implement exponential backoff retry (1s, 2s, 4s)
- For permanent errors (invalid parameters, access denied), display error without retry

**Validation Errors**:
- Validate input at API Gateway level using JSON Schema
- Return 400 Bad Request with detailed validation errors
- Display validation errors in demo UI near input fields
- Prevent submission of invalid data (disable submit button until valid)

**Timeout Errors**:
- Lambda timeout: 10 seconds for most functions, 60 seconds for ObservabilityLambda
- Step Functions timeout: 900 seconds (15 minutes) for approval workflow
- API Gateway timeout: 29 seconds (AWS limit)
- When timeout occurs, log timeout event to CloudWatch
- Display timeout message in demo UI: "Operation timed out after {duration}. Please try again."
- For Step Functions timeout, automatically record TIMEOUT decision in audit trail

**Integration Errors**:
- WebSocket disconnection: Automatically reconnect with exponential backoff
- CloudWatch Logs streaming failure: Display "Log streaming unavailable" message, continue demo execution
- SNS delivery failure: Log error, display warning in demo UI, allow manual retry

### Error Recovery

**Demo-Level Recovery**:
- Each demo has independent error boundary
- Demo error does not crash other demos or the entire application
- "Reset Demo" button clears error state and restores initial state
- Error state persisted to localStorage to survive page refresh

**System-Level Recovery**:
- Frontend maintains WebSocket connection health check (ping every 30 seconds)
- If WebSocket disconnected, attempt reconnection up to 5 times
- If reconnection fails, display "Connection lost" banner with manual reconnect button
- CloudWatch Logs streaming runs in separate Lambda, failure does not affect demo execution

**Data Consistency**:
- All audit trail writes are atomic (single DynamoDB PutItem)
- If audit trail write fails, log error but continue demo execution
- Audit trail writes are idempotent (same event_id will not create duplicate)
- DynamoDB point-in-time recovery enabled for data loss recovery

### Error Logging Format

All errors logged to CloudWatch with structured format:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "ERROR",
  "demo_id": 1,
  "industry_context": "Banking",
  "error_type": "AWS_SERVICE_ERROR",
  "service": "Bedrock",
  "operation": "InvokeModel",
  "error_code": "ThrottlingException",
  "error_message": "Rate exceeded",
  "request_id": "abc-123-def",
  "execution_context": {
    "lambda_request_id": "xyz-789",
    "api_gateway_request_id": "ghi-456"
  },
  "stack_trace": "..."
}
```

### User-Facing Error Messages

Error messages are user-friendly and actionable:

- AWS Service Error: "Unable to connect to {service}. Please try again in a moment."
- Validation Error: "Invalid input: {field} must be {constraint}."
- Timeout Error: "Operation timed out. This may indicate high system load. Please try again."
- Integration Error: "Connection lost. Attempting to reconnect..."

Error messages avoid technical jargon and provide clear next steps.


## Testing Strategy

### Dual Testing Approach

The system requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

Both approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide input space.

### Property-Based Testing

**Library Selection**:
- Python (Lambda functions): Hypothesis
- TypeScript (Frontend): fast-check
- Gremlin (Neptune queries): Manual property test implementation using random graph generation

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each property test must reference its design document property
- Tag format: `# Feature: aws-agent-governance-demos, Property {number}: {property_text}`

**Property Test Implementation**:

Each correctness property from the design document must be implemented as a single property-based test. Examples:

Property 1 (TACT Evaluation Completeness):
```python
# Feature: aws-agent-governance-demos, Property 1: TACT Evaluation Completeness
@given(action_proposal=st.text(min_size=1, max_size=500))
@settings(max_examples=100)
def test_tact_evaluation_completeness(action_proposal):
    result = tact_engine.evaluate(action_proposal, industry_context="Banking")
    
    # Must contain all four dimension scores
    assert "traceability" in result["dimensions"]
    assert "accountability" in result["dimensions"]
    assert "consequence" in result["dimensions"]
    assert "trust_boundary" in result["dimensions"]
    
    # Each score must be 1-5
    for dimension, score in result["dimensions"].items():
        assert 1 <= score <= 5
    
    # Must contain exactly one trust spectrum level
    assert result["trust_spectrum"] in ["BLOCKED", "RESTRICTED", "SUPERVISED", "VERIFIED", "TRUSTED"]
```

Property 6 (Guardrails Redaction Universality):
```python
# Feature: aws-agent-governance-demos, Property 6: Guardrails Redaction Universality
@given(
    record=st.fixed_dictionaries({
        "record_id": st.text(min_size=1),
        "ssn": st.from_regex(r"\d{3}-\d{2}-\d{4}"),
        "account_number": st.from_regex(r"\d{10,12}"),
        "name": st.text(min_size=1)
    })
)
@settings(max_examples=100)
def test_guardrails_redaction_universality(record):
    result = guardrails_query(record["record_id"], industry_context="Banking")
    
    # Sensitive fields must not appear in sanitized response
    sanitized = json.dumps(result["sanitized_record"])
    assert record["ssn"] not in sanitized
    assert record["account_number"] not in sanitized
    
    # Non-sensitive fields should still be present
    assert record["name"] in sanitized
```

Property 9 (Risk Cluster Proximity Score Reduction):
```python
# Feature: aws-agent-governance-demos, Property 9: Risk Cluster Proximity Score Reduction
@given(
    target_node=st.text(min_size=1),
    risk_cluster_distance=st.integers(min_value=1, max_value=2)
)
@settings(max_examples=100)
def test_risk_cluster_proximity_score_reduction(target_node, risk_cluster_distance):
    # Create graph with target node connected to risk cluster
    setup_graph_with_risk_cluster(target_node, risk_cluster_distance)
    
    result = calculate_trust_score(target_node)
    
    # Score must be less than base score (100)
    assert result["trust_score"] < 100
    
    # Closer proximity should result in lower score
    if risk_cluster_distance == 1:
        assert result["trust_score"] <= 70  # Direct connection
    elif risk_cluster_distance == 2:
        assert result["trust_score"] <= 85  # 2-hop connection
```

### Unit Testing

**Test Coverage Areas**:

1. **Specific Examples**: Test preset scenarios for each industry
   - Banking: Wire transfer action, SSN redaction, fraud cluster detection
   - Healthcare: Opioid prescription action, MRN redaction, prescription mill detection
   - Retail: Bulk refund action, card number redaction, refund ring detection
   - HR/Operations: Mass termination action, salary redaction, legal case detection

2. **Edge Cases**:
   - Empty action proposals (should be rejected)
   - Trust score exactly at threshold (60) - should return PROCEED
   - Trust score just below threshold (59) - should return ESCALATE
   - Approval workflow timeout at exactly 15 minutes
   - Bedrock rate limit exceeded (should retry with backoff)
   - Neptune connection failure (should display error gracefully)

3. **Error Conditions**:
   - Invalid industry context (should return validation error)
   - Malformed DynamoDB record (should handle gracefully)
   - Step Functions execution failure (should log and allow retry)
   - WebSocket disconnection (should reconnect automatically)

4. **Integration Points**:
   - API Gateway → Lambda invocation
   - Lambda → Bedrock API call
   - Lambda → Neptune query execution
   - Lambda → Step Functions execution
   - Step Functions → SNS notification
   - Lambda → DynamoDB write
   - Lambda → CloudWatch Logs write

**Unit Test Examples**:

```python
def test_banking_preset_action():
    """Test that Banking preset action evaluates correctly"""
    result = tact_engine.evaluate(
        "Transfer $47,000 between accounts",
        industry_context="Banking"
    )
    assert result["trust_spectrum"] in ["RESTRICTED", "SUPERVISED"]

def test_trust_score_threshold_boundary():
    """Test trust score exactly at 60 threshold"""
    result = calculate_trust_score_with_fixed_value(60)
    assert result["verdict"] == "PROCEED"
    
    result = calculate_trust_score_with_fixed_value(59)
    assert result["verdict"] == "ESCALATE"

def test_approval_workflow_timeout():
    """Test that workflow times out after 15 minutes"""
    execution_arn = start_approval_workflow(action_context)
    
    # Wait for timeout (in test, use mock time)
    time.sleep(901)  # 15 minutes + 1 second
    
    # Check audit trail for timeout entry
    audit_entries = query_audit_trail(execution_arn)
    assert any(e["event_type"] == "TIMEOUT" for e in audit_entries)

def test_guardrails_ssn_redaction():
    """Test that SSN is redacted in Banking context"""
    record = {
        "record_id": "BANK-001",
        "name": "John Smith",
        "ssn": "123-45-6789"
    }
    
    result = guardrails_query("BANK-001", industry_context="Banking")
    
    assert "123-45-6789" not in json.dumps(result["sanitized_record"])
    assert "John Smith" in json.dumps(result["sanitized_record"])
```

### Integration Testing

**End-to-End Scenarios**:

1. **Complete Demo 1 Flow**: Submit action → Bedrock evaluation → Display results → Write audit trail
2. **Complete Demo 2 Flow**: Query DynamoDB → Apply Guardrails → Display side-by-side → Write audit trail
3. **Complete Demo 3 Flow**: Query Neptune → Calculate trust score → Display graph → Write audit trail
4. **Complete Demo 4 Flow**: Start workflow → Send SNS → Wait for decision → Write audit trail
5. **Industry Context Switch**: Change context → Verify all demos update → Verify configurations change

**Integration Test Environment**:
- Use LocalStack for local AWS service emulation (Bedrock, Neptune, Step Functions, DynamoDB, SNS)
- Use real AWS services in staging environment for pre-production testing
- Use Testcontainers for isolated test environments

### Performance Testing

**Load Testing**:
- Simulate 100 concurrent users submitting actions to Demo 1
- Verify TACT Engine completes within 3 seconds under load
- Verify Neptune scoring completes within 2 seconds under load
- Verify API Gateway rate limiting works correctly

**Stress Testing**:
- Test Bedrock API rate limit handling (retry with backoff)
- Test DynamoDB capacity exceeded handling
- Test Neptune connection pool exhaustion
- Test Step Functions concurrent execution limits

**Latency Testing**:
- Measure end-to-end latency for each demo
- Verify industry context switch completes within 500ms
- Verify observability updates within 500ms
- Verify WebSocket message delivery within 200ms

### Test Data Management

**Preset Test Data**:
- Four complete scenarios (one per industry) with known expected outcomes
- DynamoDB records with sensitive fields for each industry
- Neptune graph with known risk clusters and trust scores
- Step Functions test executions with known approval/deny/timeout outcomes

**Generated Test Data**:
- Hypothesis strategies for generating random action proposals
- Hypothesis strategies for generating random DynamoDB records with sensitive fields
- Random graph generation for Neptune trust score testing
- Random vote distributions for majority vote testing

**Test Data Cleanup**:
- Clear DynamoDB tables after each test
- Clear Neptune graph after each test
- Cancel in-progress Step Functions executions after each test
- Clear CloudWatch Logs after test suite completion

### Continuous Integration

**CI Pipeline**:
1. Run unit tests (fast, <2 minutes)
2. Run property-based tests (slower, ~10 minutes due to 100 iterations per property)
3. Run integration tests (requires LocalStack, ~5 minutes)
4. Run linting and type checking
5. Build and deploy to staging environment
6. Run smoke tests against staging
7. If all pass, deploy to production

**Test Execution Order**:
- Unit tests first (fast feedback)
- Property tests second (comprehensive coverage)
- Integration tests last (slowest, requires infrastructure)

**Test Failure Handling**:
- Property test failure: Display failing example from Hypothesis
- Integration test failure: Capture CloudWatch Logs and display in CI output
- Performance test failure: Display latency metrics and threshold violations


## IAM Security Model

### Principle of Least Privilege

Each AWS service and Lambda function has a dedicated IAM role with only the permissions required for its specific operations. No role has wildcard permissions or admin access.

### Role Definitions

**TACTEvaluationLambdaRole**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/TACTEvaluationLambda:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/AuditTrailTable"
    }
  ]
}
```

**GuardrailsQueryLambdaRole**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/SensitiveRecordsTable"
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:ApplyGuardrail"
      ],
      "Resource": "arn:aws:bedrock:*:*:guardrail/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/GuardrailsQueryLambda:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/AuditTrailTable"
    }
  ]
}
```

**NeptuneScoringLambdaRole**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "neptune-db:connect",
        "neptune-db:ReadDataViaQuery"
      ],
      "Resource": "arn:aws:neptune-db:*:*:*/database/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/NeptuneScoringLambda:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/AuditTrailTable"
    }
  ]
}
```

**ApprovalWorkflowLambdaRole**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "states:StartExecution"
      ],
      "Resource": "arn:aws:states:*:*:stateMachine:ApprovalStateMachine"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/ApprovalWorkflowLambda:*"
    }
  ]
}
```

**ApprovalDecisionLambdaRole**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "states:SendTaskSuccess",
        "states:SendTaskFailure"
      ],
      "Resource": "arn:aws:states:*:*:stateMachine:ApprovalStateMachine"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/ApprovalDecisionLambda:*"
    }
  ]
}
```

**AuditTrailLambdaRole**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/AuditTrailTable"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/AuditTrailLambda:*"
    }
  ]
}
```

**ObservabilityLambdaRole**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:FilterLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": [
        "arn:aws:logs:*:*:log-group:/aws/lambda/*",
        "arn:aws:logs:*:*:log-group:/aws/states/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/ObservabilityLambda:*"
    }
  ]
}
```

**StepFunctionsExecutionRole**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": [
        "arn:aws:lambda:*:*:function:AuditTrailLambda",
        "arn:aws:lambda:*:*:function:SNSNotificationLambda",
        "arn:aws:lambda:*:*:function:ApprovalWaitLambda"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogDelivery",
        "logs:GetLogDelivery",
        "logs:UpdateLogDelivery",
        "logs:DeleteLogDelivery",
        "logs:ListLogDeliveries",
        "logs:PutResourcePolicy",
        "logs:DescribeResourcePolicies",
        "logs:DescribeLogGroups"
      ],
      "Resource": "*"
    }
  ]
}
```

**SNSNotificationLambdaRole**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:*:*:ApprovalNotificationTopic"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/SNSNotificationLambda:*"
    }
  ]
}
```

### Permission Boundaries

All Lambda execution roles have a permission boundary that prevents privilege escalation:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:ApplyGuardrail",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "neptune-db:*",
        "states:StartExecution",
        "states:SendTaskSuccess",
        "states:SendTaskFailure",
        "sns:Publish",
        "logs:*"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Deny",
      "Action": [
        "iam:*",
        "organizations:*",
        "account:*"
      ],
      "Resource": "*"
    }
  ]
}
```

This boundary allows service-specific operations but denies IAM, Organizations, and Account management.

### STS Credential Management

**Frontend AWS SDK Configuration**:

The frontend uses AWS Cognito Identity Pool for temporary credentials:

```javascript
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: 'us-east-1:xxxx-xxxx-xxxx',
  RoleArn: 'arn:aws:iam::ACCOUNT:role/DemoUIRole'
});
```

**DemoUIRole** (assumed by frontend):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "execute-api:Invoke"
      ],
      "Resource": "arn:aws:execute-api:*:*:*/*/POST/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:FilterLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/*"
    }
  ]
}
```

Frontend credentials are scoped to:
- Invoke API Gateway endpoints
- Read CloudWatch Logs for observability display
- No write access to any AWS service

**Credential Rotation**:
- Cognito Identity Pool credentials expire after 1 hour
- Frontend automatically refreshes credentials before expiration
- Lambda execution role credentials managed by AWS (automatic rotation)

### Least Privilege Enforcement

**Resource-Level Permissions**:
- All policies use specific resource ARNs, not wildcards
- DynamoDB permissions scoped to specific tables
- Lambda permissions scoped to specific functions
- Bedrock permissions scoped to specific models

**Action-Level Permissions**:
- Read-only operations (GetItem, Query) separated from write operations (PutItem)
- No DeleteItem permissions on AuditTrailTable (immutability)
- No UpdateItem permissions on AuditTrailTable (immutability)

**Network-Level Security**:
- Lambda functions run in VPC with private subnets
- Neptune cluster in VPC with no public access
- API Gateway uses resource policies to restrict access by IP (optional for demo)
- CloudWatch Logs encrypted at rest with KMS

### Security Monitoring

**CloudTrail Logging**:
- All AWS API calls logged to CloudTrail
- CloudTrail logs stored in S3 with versioning and MFA delete
- CloudTrail log file validation enabled

**CloudWatch Alarms**:
- Alarm on IAM policy changes
- Alarm on failed authentication attempts
- Alarm on DynamoDB throttling (capacity exceeded)
- Alarm on Lambda error rate >5%

**AWS Config Rules**:
- Ensure all Lambda functions have execution roles
- Ensure all DynamoDB tables have encryption enabled
- Ensure all S3 buckets have versioning enabled
- Ensure CloudTrail is enabled in all regions


## Deployment

### Infrastructure as Code

The system uses AWS CloudFormation for infrastructure definition. CloudFormation provides declarative infrastructure as code with native AWS support and automatic rollback on failures.

**CloudFormation Template Structure**:

```
cloudformation/
├── main-stack.yaml              # Main stack template
├── nested-stacks/
│   ├── tact-demo.yaml           # Demo 1 resources
│   ├── guardrails-demo.yaml     # Demo 2 resources
│   ├── neptune-demo.yaml        # Demo 3 resources
│   ├── approval-demo.yaml       # Demo 4 resources
│   ├── observability.yaml       # Observability layer
│   └── frontend.yaml            # Frontend hosting
├── parameters/
│   ├── dev.json                 # Dev environment parameters
│   ├── staging.json             # Staging environment parameters
│   └── prod.json                # Production environment parameters
└── scripts/
    ├── deploy.sh                # Deployment script
    ├── validate.sh              # Template validation
    └── package.sh               # Package Lambda code
```

**Main Stack Definition**:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'AWS Agent Governance Demos - Main Stack'

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, prod]
    Default: dev
    Description: Deployment environment

Resources:
  # Shared DynamoDB Tables
  AuditTrailTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub '${AWS::StackName}-AuditTrail'
      AttributeDefinitions:
        - AttributeName: event_id
          AttributeType: S
        - AttributeName: timestamp
          AttributeType: N
      KeySchema:
        - AttributeName: event_id
          KeyType: HASH
        - AttributeName: timestamp
          KeyType: RANGE
      BillingMode: PAY_PER_REQUEST
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
      StreamSpecification:
        StreamViewType: NEW_IMAGE
      DeletionPolicy: Retain
      UpdateReplacePolicy: Retain

  # Nested Stack: Demo 1 - TACT Engine
  TACTDemoStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: !Sub 'https://s3.amazonaws.com/${TemplateBucket}/nested-stacks/tact-demo.yaml'
      Parameters:
        AuditTrailTableName: !Ref AuditTrailTable
        Environment: !Ref Environment

  # Nested Stack: Demo 2 - Guardrails
  GuardrailsDemoStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: !Sub 'https://s3.amazonaws.com/${TemplateBucket}/nested-stacks/guardrails-demo.yaml'
      Parameters:
        AuditTrailTableName: !Ref AuditTrailTable
        Environment: !Ref Environment

  # Nested Stack: Demo 3 - Neptune Trust Graph
  NeptuneDemoStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: !Sub 'https://s3.amazonaws.com/${TemplateBucket}/nested-stacks/neptune-demo.yaml'
      Parameters:
        AuditTrailTableName: !Ref AuditTrailTable
        Environment: !Ref Environment

  # Nested Stack: Demo 4 - Approval Workflow
  ApprovalDemoStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: !Sub 'https://s3.amazonaws.com/${TemplateBucket}/nested-stacks/approval-demo.yaml'
      Parameters:
        AuditTrailTableName: !Ref AuditTrailTable
        Environment: !Ref Environment

  # Nested Stack: Observability Layer
  ObservabilityStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: !Sub 'https://s3.amazonaws.com/${TemplateBucket}/nested-stacks/observability.yaml'
      Parameters:
        Environment: !Ref Environment

  # Nested Stack: Frontend
  FrontendStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: !Sub 'https://s3.amazonaws.com/${TemplateBucket}/nested-stacks/frontend.yaml'
      Parameters:
        ApiGatewayUrl: !GetAtt TACTDemoStack.Outputs.ApiGatewayUrl
        WebSocketApiUrl: !GetAtt ObservabilityStack.Outputs.WebSocketApiUrl
        Environment: !Ref Environment

Outputs:
  FrontendURL:
    Description: Demo UI URL
    Value: !GetAtt FrontendStack.Outputs.DistributionDomainName
    Export:
      Name: !Sub '${AWS::StackName}-FrontendURL'

  ApiGatewayURL:
    Description: API Gateway endpoint
    Value: !GetAtt TACTDemoStack.Outputs.ApiGatewayUrl
    Export:
      Name: !Sub '${AWS::StackName}-ApiGatewayURL'
```

### Environment Configuration

**Development Environment**:
- Single AWS region (us-east-1)
- Minimal resources (smallest Lambda memory, Neptune t3.medium)
- No CloudFront distribution (S3 static hosting only)
- Debug logging enabled
- No rate limiting

**Staging Environment**:
- Single AWS region (us-east-1)
- Production-equivalent resources
- CloudFront distribution with custom domain
- Info-level logging
- Rate limiting enabled (100 req/min)
- Used for pre-production testing and rehearsals

**Production Environment**:
- Single AWS region (us-east-1)
- Production resources (Lambda 1024MB, Neptune r5.large)
- CloudFront distribution with custom domain and SSL
- Warn-level logging (errors only)
- Rate limiting enabled (100 req/min)
- Used for live stream presentation

**Configuration Management**:

```json
// cloudformation/parameters/prod.json
[
  {
    "ParameterKey": "Environment",
    "ParameterValue": "production"
  },
  {
    "ParameterKey": "LambdaMemorySize",
    "ParameterValue": "1024"
  },
  {
    "ParameterKey": "LambdaTimeout",
    "ParameterValue": "10"
  },
  {
    "ParameterKey": "LogLevel",
    "ParameterValue": "WARN"
  },
  {
    "ParameterKey": "NeptuneInstanceType",
    "ParameterValue": "db.r5.large"
  },
  {
    "ParameterKey": "NeptuneMinCapacity",
    "ParameterValue": "2.5"
  },
  {
    "ParameterKey": "NeptuneMaxCapacity",
    "ParameterValue": "4.5"
  },
  {
    "ParameterKey": "ApiGatewayRateLimit",
    "ParameterValue": "100"
  },
  {
    "ParameterKey": "ApiGatewayBurstLimit",
    "ParameterValue": "200"
  },
  {
    "ParameterKey": "FrontendDomainName",
    "ParameterValue": "demo.aws-governance.example.com"
  },
  {
    "ParameterKey": "CertificateArn",
    "ParameterValue": "arn:aws:acm:us-east-1:ACCOUNT:certificate/xxx"
  }
]
```

### Demo Data Seeding

**Seed Data Structure**:

```
seed-data/
├── dynamodb/
│   ├── sensitive-records-banking.json
│   ├── sensitive-records-healthcare.json
│   ├── sensitive-records-retail.json
│   └── sensitive-records-hr.json
├── neptune/
│   ├── graph-banking.groovy
│   ├── graph-healthcare.groovy
│   ├── graph-retail.groovy
│   └── graph-hr.groovy
└── seed.sh
```

**Seeding Process**:

1. **DynamoDB Seeding**:
```bash
# Load sensitive records for each industry
aws dynamodb batch-write-item \
  --request-items file://seed-data/dynamodb/sensitive-records-banking.json

aws dynamodb batch-write-item \
  --request-items file://seed-data/dynamodb/sensitive-records-healthcare.json

# Repeat for retail and HR
```

2. **Neptune Seeding**:
```bash
# Load graph data using Gremlin
gremlin-console.sh -e seed-data/neptune/graph-banking.groovy
gremlin-console.sh -e seed-data/neptune/graph-healthcare.groovy
gremlin-console.sh -e seed-data/neptune/graph-retail.groovy
gremlin-console.sh -e seed-data/neptune/graph-hr.groovy
```

**Seed Data Examples**:

Banking DynamoDB records:
```json
{
  "SensitiveRecordsTable": [
    {
      "PutRequest": {
        "Item": {
          "record_id": {"S": "BANK-001"},
          "account_holder": {"S": "John Smith"},
          "ssn": {"S": "123-45-6789"},
          "account_number": {"S": "9876543210"},
          "dob": {"S": "1985-03-15"},
          "balance": {"N": "47000.00"}
        }
      }
    }
  ]
}
```

Banking Neptune graph:
```groovy
// Create accounts
g.addV('Account').property('id', 'ACC-001').property('name', 'John Smith').property('type', 'checking').next()
g.addV('Account').property('id', 'ACC-002').property('name', 'Jane Doe').property('type', 'savings').next()

// Create risk cluster
g.addV('RiskCluster').property('id', 'FRAUD-001').property('cluster_type', 'fraud_cluster').property('risk_level', 3).next()

// Create edges
g.V().has('Account', 'id', 'ACC-001').as('a')
  .V().has('Account', 'id', 'ACC-002').as('b')
  .addE('TRANSACTS_WITH').from('a').to('b').property('amount', 47000).next()

g.V().has('Account', 'id', 'ACC-002').as('a')
  .V().has('RiskCluster', 'id', 'FRAUD-001').as('r')
  .addE('ASSOCIATED_WITH').from('a').to('r').property('distance', 1).next()
```

**Automated Seeding**:

CloudFormation custom resource for automatic seeding on stack creation:

```yaml
SeedDataFunction:
  Type: AWS::Lambda::Function
  Properties:
    FunctionName: !Sub '${AWS::StackName}-SeedData'
    Runtime: python3.11
    Handler: seed.handler
    Code:
      S3Bucket: !Ref LambdaCodeBucket
      S3Key: lambda/seed.zip
    Timeout: 300
    Environment:
      Variables:
        DYNAMODB_TABLE: !Ref SensitiveRecordsTable
        NEPTUNE_ENDPOINT: !GetAtt NeptuneCluster.Endpoint
    Role: !GetAtt SeedDataFunctionRole.Arn

SeedDataCustomResource:
  Type: Custom::SeedData
  Properties:
    ServiceToken: !GetAtt SeedDataFunction.Arn
    Timestamp: !Ref AWS::StackId  # Force re-seed on every deployment
```

### Deployment Process

**Pre-Deployment Checklist**:
1. Run all tests (unit, property, integration)
2. Validate CloudFormation templates
3. Package Lambda code and upload to S3
4. Backup production data (DynamoDB export, Neptune snapshot)
5. Notify stakeholders of deployment window

**Deployment Commands**:

```bash
# Validate CloudFormation templates
aws cloudformation validate-template \
  --template-body file://cloudformation/main-stack.yaml

# Package Lambda code
./cloudformation/scripts/package.sh

# Deploy to development
aws cloudformation deploy \
  --template-file cloudformation/main-stack.yaml \
  --stack-name aws-governance-demos-dev \
  --parameter-overrides file://cloudformation/parameters/dev.json \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM

# Deploy to staging
aws cloudformation deploy \
  --template-file cloudformation/main-stack.yaml \
  --stack-name aws-governance-demos-staging \
  --parameter-overrides file://cloudformation/parameters/staging.json \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM

# Deploy to production (with change set for review)
aws cloudformation deploy \
  --template-file cloudformation/main-stack.yaml \
  --stack-name aws-governance-demos-prod \
  --parameter-overrides file://cloudformation/parameters/prod.json \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --no-execute-changeset
```

**Post-Deployment Verification**:
1. Run smoke tests against deployed environment
2. Verify all Lambda functions are healthy
3. Verify Neptune cluster is accessible
4. Verify API Gateway endpoints respond correctly
5. Verify frontend loads and connects to WebSocket
6. Verify CloudWatch Logs are streaming
7. Test one complete flow for each demo

**Rollback Procedure**:

If deployment fails or issues are discovered:

```bash
# Rollback to previous stack version
aws cloudformation rollback-stack --stack-name aws-governance-demos-prod

# Or deploy previous CloudFormation template version
git checkout <previous-commit>
aws cloudformation deploy \
  --template-file cloudformation/main-stack.yaml \
  --stack-name aws-governance-demos-prod \
  --parameter-overrides file://cloudformation/parameters/prod.json \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

**Blue-Green Deployment** (for zero-downtime):

Use AWS CodePipeline with CloudFormation actions:

```yaml
# codepipeline.yaml
Resources:
  Pipeline:
    Type: AWS::CodePipeline::Pipeline
    Properties:
      Name: aws-governance-demos-pipeline
      Stages:
        - Name: Source
          Actions:
            - Name: SourceAction
              ActionTypeId:
                Category: Source
                Owner: ThirdParty
                Provider: GitHub
                Version: 1
              Configuration:
                Owner: org
                Repo: repo
                Branch: main
              OutputArtifacts:
                - Name: SourceOutput

        - Name: DeployToStaging
          Actions:
            - Name: DeployStack
              ActionTypeId:
                Category: Deploy
                Owner: AWS
                Provider: CloudFormation
                Version: 1
              Configuration:
                ActionMode: CREATE_UPDATE
                StackName: aws-governance-demos-staging
                TemplatePath: SourceOutput::cloudformation/main-stack.yaml
                ParameterOverrides: file://cloudformation/parameters/staging.json
                Capabilities: CAPABILITY_IAM,CAPABILITY_NAMED_IAM
              InputArtifacts:
                - Name: SourceOutput

        - Name: ApproveProduction
          Actions:
            - Name: ManualApproval
              ActionTypeId:
                Category: Approval
                Owner: AWS
                Provider: Manual
                Version: 1

        - Name: DeployToProduction
          Actions:
            - Name: DeployStack
              ActionTypeId:
                Category: Deploy
                Owner: AWS
                Provider: CloudFormation
                Version: 1
              Configuration:
                ActionMode: CREATE_UPDATE
                StackName: aws-governance-demos-prod
                TemplatePath: SourceOutput::cloudformation/main-stack.yaml
                ParameterOverrides: file://cloudformation/parameters/prod.json
                Capabilities: CAPABILITY_IAM,CAPABILITY_NAMED_IAM
              InputArtifacts:
                - Name: SourceOutput
```

### Monitoring and Observability

**CloudWatch Dashboards**:

Automatic dashboard creation for each environment:

```typescript
const dashboard = new cloudwatch.Dashboard(this, 'DemoDashboard', {
  dashboardName: `aws-governance-demos-${environment}`
});

dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: 'Lambda Invocations',
    left: [
      tactLambda.metricInvocations(),
      guardrailsLambda.metricInvocations(),
      neptuneLambda.metricInvocations(),
      approvalLambda.metricInvocations()
    ]
  }),
  new cloudwatch.GraphWidget({
    title: 'Lambda Errors',
    left: [
      tactLambda.metricErrors(),
      guardrailsLambda.metricErrors(),
      neptuneLambda.metricErrors(),
      approvalLambda.metricErrors()
    ]
  }),
  new cloudwatch.GraphWidget({
    title: 'API Gateway Latency',
    left: [apiGateway.metricLatency()]
  })
);
```

**Alarms**:

```typescript
// Lambda error rate alarm
tactLambda.metricErrors().createAlarm(this, 'TACTLambdaErrors', {
  threshold: 5,
  evaluationPeriods: 2,
  alarmDescription: 'TACT Lambda error rate exceeded 5%'
});

// DynamoDB throttling alarm
auditTrailTable.metricUserErrors().createAlarm(this, 'DynamoDBThrottling', {
  threshold: 10,
  evaluationPeriods: 1,
  alarmDescription: 'DynamoDB throttling detected'
});

// Neptune connection alarm
new cloudwatch.Alarm(this, 'NeptuneConnectionFailures', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/Neptune',
    metricName: 'ClusterConnectionFailures',
    statistic: 'Sum'
  }),
  threshold: 5,
  evaluationPeriods: 1,
  alarmDescription: 'Neptune connection failures detected'
});
```

### Cost Optimization

**Resource Sizing**:
- Lambda: Right-size memory based on profiling (512MB-1024MB)
- Neptune: Use Serverless for variable workload (2.5-4.5 NCUs)
- DynamoDB: On-demand billing for unpredictable traffic
- CloudWatch Logs: 7-day retention for demo logs, 90-day for audit logs

**Cost Monitoring**:
- AWS Cost Explorer tags for each demo component
- Budget alerts at 80% and 100% of monthly budget
- Cost anomaly detection enabled

**Estimated Monthly Costs** (production environment, 100 demo executions/day):
- Lambda: $50 (1M invocations, 1024MB, 5s avg duration)
- Neptune Serverless: $200 (2.5 NCUs average, 730 hours)
- DynamoDB: $25 (on-demand, 10K writes/day, 1K reads/day)
- API Gateway: $10 (1M requests)
- CloudWatch Logs: $15 (10GB ingestion, 7-day retention)
- S3 + CloudFront: $20 (frontend hosting, 10K requests/day)
- Total: ~$320/month


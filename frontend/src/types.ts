export type IndustryType = 'Banking' | 'Healthcare' | 'Retail' | 'HROperations';
export type TrustLevel = 'BLOCKED' | 'RESTRICTED' | 'SUPERVISED' | 'VERIFIED' | 'TRUSTED';
export type WorkflowStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'TIMEOUT';

export interface IndustryConfig {
  preset_action: string;
  sensitive_fields: string[];
  risk_cluster_type: string;
  reviewer_role: string;
  guardrails_policy_id: string;
}

export interface TACTEvaluationResult {
  evaluation_id: string;
  timestamp: number;
  action_proposal: string;
  industry_context: IndustryType;
  dimensions: {
    traceability: number;
    accountability: number;
    consequence: number;
    trust_boundary: number;
  };
  average_score: number;
  trust_spectrum: TrustLevel;
  reasoning: string;
  latency_ms: number;
}

export interface GuardrailsQueryResult {
  query_id: string;
  timestamp: number;
  record_id: string;
  industry_context: IndustryType;
  raw_record: Record<string, any>;
  sanitized_record: Record<string, any>;
  fields_redacted: string[];
  guardrails_policy_id: string;
  latency: {
    dynamodb_ms: number;
    guardrails_ms: number;
    total_ms: number;
  };
}

export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  label: string;
  source: string;
  target: string;
  properties: Record<string, any>;
}

export interface RiskFactor {
  type: string;
  description: string;
  score_impact: number;
  risk_level?: number;
  hops?: number;
}

export interface TrustScoreResult {
  score_id: string;
  timestamp: number;
  target_node_id: string;
  industry_context: IndustryType;
  trust_score: number;
  verdict: 'PROCEED' | 'ESCALATE';
  risk_factors: RiskFactor[];
  traversal_path: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  }[];
  gremlin_query: string;
  latency_ms: number;
}

export interface ApprovalWorkflowState {
  workflow_id: string;
  execution_arn: string;
  task_token?: string;
  timestamp_started: number;
  timestamp_expires: number;
  action_context: {
    action_proposal: string;
    industry_context: IndustryType;
    trust_score: number;
    risk_factors: string[];
  };
  reviewer_identity: string;
  status: WorkflowStatus;
  decision?: 'APPROVE' | 'DENY' | 'TIMEOUT';
  decision_timestamp?: number;
  response_time_seconds?: number;
}

export interface AuditTrailEntry {
  event_id: string;
  timestamp: number;
  event_type: string;
  demo_id: number;
  industry_context: IndustryType;
  event_data: any;
}

export interface VoteCount {
  approve: number;
  deny: number;
}

export interface VoteSubmission {
  workflow_id: string;
  vote: 'APPROVE' | 'DENY';
  timestamp: number;
}

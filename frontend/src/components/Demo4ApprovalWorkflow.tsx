import React, { useState, useEffect } from 'react';
import { useIndustry } from '../contexts/IndustryContext';
import { ApprovalWorkflowState, AuditTrailEntry } from '../types';
import { apiClient } from '../api/client';

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  cardBody: {
    padding: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  button: {
    width: '100%',
    padding: '16px 20px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  flowStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
};

export const Demo4ApprovalWorkflow: React.FC = () => {
  const { config, current } = useIndustry();
  const [workflow, setWorkflow] = useState<ApprovalWorkflowState | null>(null);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (workflow && workflow.status === 'PENDING') {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, workflow.timestamp_expires - now);
        setTimeRemaining(remaining);

        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [workflow]);

  const startWorkflow = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.startApprovalWorkflow({
        action_proposal: config.preset_action,
        industry_context: current,
        trust_score: 45,
        risk_factors: ['Proximity to risk cluster', 'High transaction amount']
      });
      setWorkflow(data);
      
      // Poll for task token (it's stored asynchronously by SNS notification Lambda)
      pollForTaskToken(data.workflow_id);
    } catch (error) {
      console.error('Failed to start workflow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pollForTaskToken = async (workflowId: string) => {
    let attempts = 0;
    const maxAttempts = 10;
    const pollInterval = 1000; // 1 second

    const poll = async () => {
      try {
        const tokenData = await apiClient.getTaskToken(workflowId);
        if (tokenData.task_token) {
          setWorkflow(prev => prev ? { ...prev, task_token: tokenData.task_token } : null);
          console.log('Task token retrieved successfully');
          return;
        }
      } catch (error) {
        console.log(`Polling for task token (attempt ${attempts + 1}/${maxAttempts})...`);
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, pollInterval);
      } else {
        console.error('Failed to retrieve task token after maximum attempts');
      }
    };

    poll();
  };

  const submitDecision = async (decision: 'APPROVE' | 'DENY') => {
    if (!workflow) return;
    
    if (!workflow.task_token) {
      console.error('Task token not available yet');
      alert('Task token not available yet. Please wait a moment and try again.');
      return;
    }

    try {
      const data = await apiClient.submitApprovalDecision(workflow.task_token, decision);
      setWorkflow({ ...workflow, status: decision === 'APPROVE' ? 'APPROVED' : 'DENIED', decision });
      
      const entry: AuditTrailEntry = {
        event_id: `audit-${Date.now()}`,
        timestamp: Date.now(),
        event_type: decision === 'APPROVE' ? 'APPROVED' : 'DENIED',
        demo_id: 4,
        industry_context: workflow.action_context.industry_context,
        event_data: data
      };
      setAuditTrail([...auditTrail, entry]);
    } catch (error) {
      console.error('Failed to submit decision:', error);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining > 300000) return '#16a34a';
    if (timeRemaining > 60000) return '#eab308';
    return '#dc2626';
  };

  const getWorkflowDescription = (industry: string) => {
    const descriptions: Record<string, { title: string; description: string }> = {
      'Banking': {
        title: 'High-Risk Transaction Approval',
        description: 'Large transactions or those connected to risk clusters require compliance officer approval before execution.'
      },
      'Healthcare': {
        title: 'Prescription Override Approval',
        description: 'Prescriptions flagged by risk analysis require prescribing MD review before dispensing.'
      },
      'Retail': {
        title: 'Refund Exception Approval',
        description: 'High-value refunds or those connected to fraud patterns require fraud operations approval.'
      },
      'HROperations': {
        title: 'Termination Decision Approval',
        description: 'Employee terminations with legal risk factors require VP HR and Legal approval.'
      }
    };
    return descriptions[industry] || descriptions['Banking'];
  };

  const scenario = getWorkflowDescription(current);

  return (
    <div style={styles.container}>
      {/* Introduction */}
      <div style={styles.card}>
        <div style={{...styles.cardHeader, background: 'linear-gradient(to right, #ea580c, #f97316)'}}>
          <h2 style={{...styles.title, color: '#ffffff', marginBottom: '4px'}}>Human-in-the-Loop Approval</h2>
          <p style={{...styles.subtitle, color: '#fed7aa'}}>Step Functions Orchestrated Workflows</p>
        </div>
        
        <div style={styles.cardBody}>
          <p style={{fontSize: '15px', lineHeight: '1.6', color: '#374151', marginBottom: '20px'}}>
            Not all AI agent actions should be fully autonomous. High-risk actions require human judgment and approval 
            before execution. Step Functions provides durable workflow orchestration with callback patterns for human decisions.
          </p>
          
          <div style={{backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px', marginBottom: '20px'}}>
            <div style={{fontWeight: '600', color: '#92400e', marginBottom: '8px', fontSize: '16px'}}>
              📋 {scenario.title}
            </div>
            <div style={{fontSize: '14px', color: '#78350f', lineHeight: '1.6'}}>
              {scenario.description}
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px'}}>
            <div style={{backgroundColor: '#eff6ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '32px', marginBottom: '8px'}}>⚠️</div>
              <div style={{fontSize: '14px', fontWeight: '600', color: '#0c4a6e'}}>Risk Detection</div>
              <div style={{fontSize: '12px', color: '#075985'}}>Action flagged for review</div>
            </div>
            <div style={{backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '32px', marginBottom: '8px'}}>⏸️</div>
              <div style={{fontSize: '14px', fontWeight: '600', color: '#92400e'}}>Workflow Pause</div>
              <div style={{fontSize: '12px', color: '#78350f'}}>Step Functions waits</div>
            </div>
            <div style={{backgroundColor: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '32px', marginBottom: '8px'}}>👤</div>
              <div style={{fontSize: '14px', fontWeight: '600', color: '#065f46'}}>Human Decision</div>
              <div style={{fontSize: '12px', color: '#047857'}}>Approve or deny</div>
            </div>
          </div>
        </div>
      </div>

      {/* Start Workflow */}
      {!workflow && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.title}>Initiate Approval Workflow</h3>
            <p style={styles.subtitle}>Submit a high-risk action for human review</p>
          </div>
          <div style={styles.cardBody}>
            <div style={{backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', marginBottom: '20px'}}>
              <div style={{fontWeight: '600', color: '#991b1b', marginBottom: '8px'}}>
                ⚠️ High-Risk Action Detected
              </div>
              <div style={{fontSize: '14px', color: '#7f1d1d', marginBottom: '12px'}}>
                <strong>Action:</strong> {config.preset_action}
              </div>
              <div style={{fontSize: '14px', color: '#7f1d1d', marginBottom: '8px'}}>
                <strong>Why Approval Needed:</strong>
              </div>
              <ul style={{margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#7f1d1d'}}>
                <li>Trust score: 45 (below threshold of 60)</li>
                <li>Connected to risk cluster</li>
                <li>High transaction amount</li>
                <li>Requires {config.reviewer_role} approval</li>
              </ul>
            </div>

            <button
              onClick={startWorkflow}
              disabled={isLoading}
              style={{
                ...styles.button,
                ...(isLoading ? {backgroundColor: '#9ca3af', cursor: 'not-allowed'} : {}),
              }}
            >
              {isLoading ? 'Starting Workflow...' : 'Submit for Approval'}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{...styles.card, backgroundColor: '#fef3c7', borderColor: '#fde68a'}}>
          <div style={{padding: '32px', textAlign: 'center'}}>
            <div style={{fontSize: '18px', fontWeight: '600', color: '#92400e', marginBottom: '8px'}}>
              Starting Step Functions Workflow
            </div>
            <div style={{fontSize: '14px', color: '#78350f'}}>
              Creating approval task and notifying {config.reviewer_role}...
            </div>
          </div>
        </div>
      )}

      {/* Workflow Active */}
      {workflow && (
        <>
          {/* Step Functions Workflow Visualization */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.title}>Step Functions Workflow Status</h3>
              <p style={styles.subtitle}>Durable workflow orchestration with callback pattern</p>
            </div>
            <div style={styles.cardBody}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                <div style={{...styles.flowStep, borderLeft: '4px solid #10b981'}}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#10b981',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}>✓</div>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: '600', color: '#111827', marginBottom: '4px'}}>Workflow Started</div>
                    <div style={{fontSize: '14px', color: '#6b7280'}}>Step Functions execution initiated</div>
                  </div>
                  <div style={{fontSize: '12px', color: '#059669', fontWeight: '600'}}>
                    {new Date(workflow.timestamp_started).toLocaleTimeString()}
                  </div>
                </div>

                <div style={{textAlign: 'center', color: '#9ca3af', fontSize: '20px'}}>↓</div>

                <div style={{...styles.flowStep, borderLeft: `4px solid ${workflow.status === 'PENDING' ? '#eab308' : '#10b981'}`}}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: workflow.status === 'PENDING' ? '#eab308' : '#10b981',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}>{workflow.status === 'PENDING' ? '⏳' : '✓'}</div>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: '600', color: '#111827', marginBottom: '4px'}}>Approval Task Created</div>
                    <div style={{fontSize: '14px', color: '#6b7280'}}>Task assigned to {workflow.reviewer_identity}</div>
                  </div>
                  {workflow.status !== 'PENDING' && (
                    <div style={{fontSize: '12px', color: '#059669', fontWeight: '600'}}>Complete</div>
                  )}
                </div>

                <div style={{textAlign: 'center', color: '#9ca3af', fontSize: '20px'}}>↓</div>

                <div style={{...styles.flowStep, borderLeft: `4px solid ${workflow.status === 'PENDING' ? '#6b7280' : '#10b981'}`}}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: workflow.status === 'PENDING' ? '#6b7280' : '#10b981',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}>{workflow.status === 'PENDING' ? '⏸️' : '✓'}</div>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: '600', color: '#111827', marginBottom: '4px'}}>
                      {workflow.status === 'PENDING' ? 'Waiting for Decision' : 'Decision Received'}
                    </div>
                    <div style={{fontSize: '14px', color: '#6b7280'}}>
                      {workflow.status === 'PENDING' 
                        ? 'Step Functions paused with callback token' 
                        : `Decision: ${workflow.decision}`}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{marginTop: '20px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '16px'}}>
                <div style={{fontSize: '14px', fontWeight: '600', color: '#0c4a6e', marginBottom: '8px'}}>
                  Step Functions Callback Pattern
                </div>
                <div style={{fontSize: '14px', color: '#075985', lineHeight: '1.6'}}>
                  Step Functions generates a task token and pauses execution. The workflow remains durable and will resume 
                  when the human decision is submitted with the task token. This enables long-running human approval workflows 
                  without maintaining active connections.
                </div>
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.title}>Risk Assessment</h3>
              <p style={styles.subtitle}>Why this action requires human approval</p>
            </div>
            <div style={styles.cardBody}>
              <div style={{backgroundColor: '#fef2f2', border: '2px solid #fecaca', borderRadius: '8px', padding: '20px', marginBottom: '20px'}}>
                <div style={{display: 'flex', alignItems: 'start', gap: '16px'}}>
                  <div style={{fontSize: '48px'}}>⚠️</div>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: '18px', fontWeight: '700', color: '#991b1b', marginBottom: '12px'}}>
                      High-Risk Action Detected
                    </div>
                    <div style={{fontSize: '15px', color: '#7f1d1d', marginBottom: '16px', lineHeight: '1.6'}}>
                      {workflow.action_context.action_proposal}
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px'}}>
                      <div style={{backgroundColor: '#ffffff', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px'}}>
                        <div style={{fontSize: '12px', color: '#991b1b', marginBottom: '4px'}}>Trust Score</div>
                        <div style={{fontSize: '24px', fontWeight: '700', color: '#7f1d1d'}}>
                          {workflow.action_context.trust_score}
                        </div>
                        <div style={{fontSize: '11px', color: '#991b1b'}}>Below threshold (60)</div>
                      </div>
                      <div style={{backgroundColor: '#ffffff', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px'}}>
                        <div style={{fontSize: '12px', color: '#991b1b', marginBottom: '4px'}}>Risk Factors</div>
                        <div style={{fontSize: '24px', fontWeight: '700', color: '#7f1d1d'}}>
                          {workflow.action_context.risk_factors.length}
                        </div>
                        <div style={{fontSize: '11px', color: '#991b1b'}}>Detected</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{marginBottom: '16px'}}>
                <div style={{fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '8px'}}>
                  Risk Factors:
                </div>
                {workflow.action_context.risk_factors.map((factor, idx) => (
                  <div key={idx} style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '8px',
                    fontSize: '14px',
                    color: '#7f1d1d',
                  }}>
                    • {factor}
                  </div>
                ))}
              </div>

              <div style={{backgroundColor: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '8px', padding: '16px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <div style={{fontSize: '32px'}}>👤</div>
                  <div>
                    <div style={{fontSize: '14px', color: '#1e40af', marginBottom: '4px'}}>Assigned Reviewer</div>
                    <div style={{fontSize: '18px', fontWeight: '700', color: '#1e3a8a'}}>{workflow.reviewer_identity}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Countdown Timer (only if pending) */}
          {workflow.status === 'PENDING' && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.title}>Decision Timer</h3>
                <p style={styles.subtitle}>Time remaining to make approval decision</p>
              </div>
              <div style={styles.cardBody}>
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: `4px solid ${getTimerColor()}`,
                  borderRadius: '12px',
                  padding: '32px',
                  textAlign: 'center',
                }}>
                  <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '12px', fontWeight: '600'}}>
                    TIME REMAINING
                  </div>
                  <div style={{
                    fontSize: '72px',
                    fontWeight: '700',
                    color: getTimerColor(),
                    fontFamily: 'monospace',
                    lineHeight: 1,
                    marginBottom: '16px',
                  }}>
                    {formatTime(timeRemaining)}
                  </div>
                  
                  {timeRemaining > 300000 && (
                    <div style={{fontSize: '14px', color: '#16a34a', fontWeight: '600'}}>
                      ✓ Sufficient time to review
                    </div>
                  )}
                  {timeRemaining <= 300000 && timeRemaining > 60000 && (
                    <div style={{fontSize: '16px', color: '#ea580c', fontWeight: '700'}}>
                      ⚠️ Less than 5 minutes remaining
                    </div>
                  )}
                  {timeRemaining <= 60000 && timeRemaining > 0 && (
                    <div style={{fontSize: '18px', color: '#dc2626', fontWeight: '700'}}>
                      🚨 URGENT: Less than 1 minute remaining!
                    </div>
                  )}
                  {timeRemaining === 0 && (
                    <div style={{fontSize: '18px', color: '#991b1b', fontWeight: '700'}}>
                      ⏰ TIME EXPIRED - Workflow will timeout
                    </div>
                  )}
                </div>

                <div style={{marginTop: '16px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '16px'}}>
                  <div style={{fontSize: '14px', color: '#075985', lineHeight: '1.6'}}>
                    <strong>Timeout Behavior:</strong> If no decision is made within 15 minutes, the workflow will automatically 
                    timeout and the action will be denied. This ensures that high-risk actions don't remain in pending state indefinitely.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Decision Interface (only if pending) */}
          {workflow.status === 'PENDING' && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.title}>Make Your Decision</h3>
                <p style={styles.subtitle}>Approve or deny this high-risk action</p>
              </div>
              <div style={styles.cardBody}>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px'}}>
                  <div style={{backgroundColor: '#d1fae5', border: '2px solid #a7f3d0', borderRadius: '8px', padding: '20px'}}>
                    <div style={{fontSize: '32px', marginBottom: '12px', textAlign: 'center'}}>✓</div>
                    <div style={{fontSize: '16px', fontWeight: '700', color: '#065f46', marginBottom: '8px', textAlign: 'center'}}>
                      APPROVE
                    </div>
                    <div style={{fontSize: '14px', color: '#047857', lineHeight: '1.6'}}>
                      <strong>Consequences:</strong>
                      <ul style={{margin: '8px 0', paddingLeft: '20px'}}>
                        <li>Action will execute immediately</li>
                        <li>Step Functions workflow completes</li>
                        <li>Decision logged to audit trail</li>
                        <li>You assume responsibility</li>
                      </ul>
                    </div>
                  </div>

                  <div style={{backgroundColor: '#fee2e2', border: '2px solid #fecaca', borderRadius: '8px', padding: '20px'}}>
                    <div style={{fontSize: '32px', marginBottom: '12px', textAlign: 'center'}}>✗</div>
                    <div style={{fontSize: '16px', fontWeight: '700', color: '#991b1b', marginBottom: '8px', textAlign: 'center'}}>
                      DENY
                    </div>
                    <div style={{fontSize: '14px', color: '#7f1d1d', lineHeight: '1.6'}}>
                      <strong>Consequences:</strong>
                      <ul style={{margin: '8px 0', paddingLeft: '20px'}}>
                        <li>Action will be blocked</li>
                        <li>Step Functions workflow completes</li>
                        <li>Decision logged to audit trail</li>
                        <li>Agent notified of denial</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div style={{display: 'flex', gap: '16px'}}>
                  <button
                    onClick={() => submitDecision('APPROVE')}
                    style={{
                      flex: 1,
                      padding: '20px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '18px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                  >
                    ✓ APPROVE ACTION
                  </button>
                  <button
                    onClick={() => submitDecision('DENY')}
                    style={{
                      flex: 1,
                      padding: '20px',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '18px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                  >
                    ✗ DENY ACTION
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Decision Result (only if not pending) */}
          {workflow.status !== 'PENDING' && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.title}>Decision Result</h3>
                <p style={styles.subtitle}>Workflow completed with human decision</p>
              </div>
              <div style={styles.cardBody}>
                <div style={{
                  backgroundColor: workflow.status === 'APPROVED' ? '#d1fae5' : '#fee2e2',
                  border: `4px solid ${workflow.status === 'APPROVED' ? '#10b981' : '#dc2626'}`,
                  borderRadius: '12px',
                  padding: '32px',
                  textAlign: 'center',
                }}>
                  <div style={{fontSize: '64px', marginBottom: '16px'}}>
                    {workflow.status === 'APPROVED' ? '✓' : '✗'}
                  </div>
                  <div style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: workflow.status === 'APPROVED' ? '#065f46' : '#991b1b',
                    marginBottom: '12px',
                  }}>
                    {workflow.status === 'APPROVED' ? 'ACTION APPROVED' : 'ACTION DENIED'}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    color: workflow.status === 'APPROVED' ? '#047857' : '#7f1d1d',
                    lineHeight: '1.6',
                  }}>
                    {workflow.status === 'APPROVED' 
                      ? 'The action has been approved and will execute. Step Functions workflow completed successfully.' 
                      : 'The action has been denied and will not execute. Step Functions workflow completed successfully.'}
                  </div>
                </div>

                <div style={{marginTop: '20px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '16px'}}>
                  <div style={{fontSize: '14px', fontWeight: '600', color: '#0c4a6e', marginBottom: '8px'}}>
                    What Happened
                  </div>
                  <div style={{fontSize: '14px', color: '#075985', lineHeight: '1.6'}}>
                    1. Your decision was sent to Step Functions using the task token<br/>
                    2. Step Functions resumed execution from the paused state<br/>
                    3. The workflow completed and logged the decision to DynamoDB<br/>
                    4. The AI agent was notified of the {workflow.status?.toLowerCase()} decision
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AWS Services Highlight */}
          <div style={{...styles.card, background: 'linear-gradient(to right, #fed7aa, #fdba74)', borderColor: '#fdba74'}}>
            <div style={styles.cardBody}>
              <h3 style={{...styles.title, marginBottom: '12px'}}>⚡ Powered by AWS Step Functions</h3>
              <p style={{fontSize: '14px', color: '#7c2d12', marginBottom: '16px', lineHeight: '1.6'}}>
                AWS Step Functions provides serverless workflow orchestration with built-in support for human approval patterns. 
                The callback pattern allows workflows to pause and wait for external events (like human decisions) without maintaining 
                active connections or consuming resources.
              </p>
              <div style={styles.grid3}>
                <div style={{backgroundColor: '#ffffff', border: '1px solid #fdba74', borderRadius: '8px', padding: '12px'}}>
                  <div style={{fontSize: '12px', color: '#c2410c', marginBottom: '4px'}}>Workflow ID</div>
                  <div style={{fontSize: '11px', fontFamily: 'monospace', color: '#7c2d12', wordBreak: 'break-all'}}>
                    {workflow.workflow_id}
                  </div>
                </div>
                <div style={{backgroundColor: '#ffffff', border: '1px solid #fdba74', borderRadius: '8px', padding: '12px'}}>
                  <div style={{fontSize: '12px', color: '#c2410c', marginBottom: '4px'}}>Pattern</div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: '#7c2d12'}}>Callback with Task Token</div>
                </div>
                <div style={{backgroundColor: '#ffffff', border: '1px solid #fdba74', borderRadius: '8px', padding: '12px'}}>
                  <div style={{fontSize: '12px', color: '#c2410c', marginBottom: '4px'}}>Documentation</div>
                  <a 
                    href="https://docs.aws.amazon.com/step-functions/latest/dg/callback-task-sample-sqs.html" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{fontSize: '14px', fontWeight: '600', color: '#2563eb', textDecoration: 'none'}}
                  >
                    View Docs →
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Trail */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.title}>Audit Trail</h3>
              <p style={styles.subtitle}>Complete workflow history for compliance</p>
            </div>
            <div style={styles.cardBody}>
              <div style={{backgroundColor: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '20px', marginBottom: '16px'}}>
                <div style={{fontSize: '16px', fontWeight: '600', color: '#065f46', marginBottom: '16px'}}>
                  ✓ Workflow Logged to DynamoDB
                </div>
                <div style={styles.grid3}>
                  <div style={{backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px'}}>
                    <div style={{fontSize: '12px', color: '#047857', marginBottom: '4px'}}>Workflow ID</div>
                    <div style={{fontSize: '11px', fontFamily: 'monospace', color: '#065f46', wordBreak: 'break-all'}}>
                      {workflow.workflow_id}
                    </div>
                  </div>
                  <div style={{backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px'}}>
                    <div style={{fontSize: '12px', color: '#047857', marginBottom: '4px'}}>Started</div>
                    <div style={{fontSize: '12px', fontWeight: '500', color: '#065f46'}}>
                      {new Date(workflow.timestamp_started).toLocaleString()}
                    </div>
                  </div>
                  <div style={{backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px'}}>
                    <div style={{fontSize: '12px', color: '#047857', marginBottom: '4px'}}>Status</div>
                    <div style={{fontSize: '12px', fontWeight: '600', color: '#065f46'}}>{workflow.status}</div>
                  </div>
                </div>
                <p style={{fontSize: '13px', color: '#047857', margin: '12px 0 0 0', lineHeight: '1.5'}}>
                  All approval workflows are logged with complete state history, including the action context, risk assessment, 
                  reviewer identity, decision, and timestamps. This provides an immutable audit trail for regulatory compliance 
                  and demonstrates human oversight of high-risk AI agent actions.
                </p>
              </div>

              {auditTrail.length > 0 && (
                <div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px'}}>
                    Recent Events
                  </div>
                  <div style={{border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden'}}>
                    {auditTrail.map((entry) => (
                      <div 
                        key={entry.event_id}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #e5e7eb',
                          backgroundColor: '#f9fafb',
                        }}
                      >
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: entry.event_type === 'APPROVED' ? '#16a34a' : '#dc2626',
                          }}>
                            {entry.event_type}
                          </span>
                          <span style={{fontSize: '12px', color: '#6b7280'}}>
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div style={{fontSize: '13px', color: '#6b7280'}}>
                          Demo {entry.demo_id} - {entry.industry_context}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

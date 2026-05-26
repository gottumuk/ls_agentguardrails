import React, { useState } from 'react';
import { useIndustry } from '../contexts/IndustryContext';
import { TACTEvaluationResult } from '../types';
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
  buttonHover: {
    backgroundColor: '#1d4ed8',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
  },
  dimensionCard: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  progressBar: {
    width: '100%',
    height: '24px',
    backgroundColor: '#e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '12px',
  },
  spectrumBar: {
    display: 'flex',
    height: '48px',
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '20px',
  },
  spectrumItem: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: '600',
    transition: 'all 0.3s',
  },
};

export const Demo1TACTEngine: React.FC = () => {
  const { current, config } = useIndustry();
  const [customInput, setCustomInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TACTEvaluationResult | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [hoverButton, setHoverButton] = useState(false);

  const evaluateAction = async (actionProposal: string) => {
    setIsLoading(true);
    setResult(null);
    try {
      const data = await apiClient.evaluateTACT(actionProposal, current);
      setResult(data);
    } catch (error) {
      console.error('TACT evaluation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTrustSpectrumColor = (level: string) => {
    const colors: Record<string, string> = {
      BLOCKED: '#dc2626',
      RESTRICTED: '#ea580c',
      SUPERVISED: '#eab308',
      VERIFIED: '#16a34a',
      TRUSTED: '#059669'
    };
    return colors[level] || '#6b7280';
  };

  const getDimensionColor = (score: number) => {
    if (score >= 4) return '#16a34a';
    if (score >= 3) return '#eab308';
    return '#dc2626';
  };

  const getTrustSpectrumDescription = (level: string) => {
    const descriptions: Record<string, string> = {
      BLOCKED: 'Action is blocked. Requires manual review and approval before execution.',
      RESTRICTED: 'Action allowed with strict limitations. Enhanced monitoring required.',
      SUPERVISED: 'Action allowed with human oversight. Real-time monitoring active.',
      VERIFIED: 'Action allowed with standard monitoring. Periodic audits required.',
      TRUSTED: 'Action fully autonomous. Standard audit trail maintained.'
    };
    return descriptions[level] || '';
  };

  const getDimensionExplanation = (dimension: string, score: number) => {
    const explanations: Record<string, Record<string, string>> = {
      traceability: {
        low: 'Limited audit trail. Difficult to reconstruct decision chain.',
        medium: 'Partial logging with some gaps in traceability.',
        high: 'Complete audit trail with timestamps and actor identity.'
      },
      accountability: {
        low: 'No clear owner. Responsibility is diffuse.',
        medium: 'Shared responsibility across multiple parties.',
        high: 'Single accountable party with authority to act.'
      },
      consequence: {
        low: 'Catastrophic impact possible (regulatory violation, major loss).',
        medium: 'Moderate impact (customer complaint, minor financial loss).',
        high: 'Minimal impact. Easily reversible with low risk.'
      },
      trust_boundary: {
        low: 'Crosses external boundaries (regulatory, inter-organizational).',
        medium: 'Crosses internal boundaries (department, team).',
        high: 'Within single team/system boundary.'
      }
    };

    const level = score >= 4 ? 'high' : score >= 3 ? 'medium' : 'low';
    return explanations[dimension]?.[level] || '';
  };

  const getDimensionName = (key: string) => {
    const names: Record<string, string> = {
      traceability: 'Traceability',
      accountability: 'Accountability',
      consequence: 'Consequence',
      trust_boundary: 'Trust Boundary'
    };
    return names[key] || key;
  };

  return (
    <div style={styles.container}>
      {/* Introduction */}
      <div style={styles.card}>
        <div style={{...styles.cardHeader, background: 'linear-gradient(to right, #2563eb, #4f46e5)'}}>
          <h2 style={{...styles.title, color: '#ffffff', marginBottom: '4px'}}>TACT Framework</h2>
          <p style={{...styles.subtitle, color: '#dbeafe'}}>AI Agent Governance & Risk Assessment</p>
        </div>
        <div style={styles.cardBody}>
          <p style={{fontSize: '15px', lineHeight: '1.6', color: '#374151', marginBottom: '20px'}}>
            The TACT framework systematically evaluates AI agent actions across four critical dimensions to determine appropriate autonomy levels and risk controls.
          </p>
          
          <div style={styles.grid2}>
            <div style={{backgroundColor: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '8px', padding: '16px'}}>
              <div style={{fontWeight: '600', color: '#1e40af', marginBottom: '8px'}}>📊 Traceability</div>
              <p style={{fontSize: '14px', color: '#1e3a8a', margin: 0}}>Can we track who initiated this action and reconstruct the decision chain?</p>
            </div>
            
            <div style={{backgroundColor: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: '8px', padding: '16px'}}>
              <div style={{fontWeight: '600', color: '#7c3aed', marginBottom: '8px'}}>👤 Accountability</div>
              <p style={{fontSize: '14px', color: '#5b21b6', margin: 0}}>Is there a clear owner responsible for this action's outcome?</p>
            </div>
            
            <div style={{backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px'}}>
              <div style={{fontWeight: '600', color: '#b45309', marginBottom: '8px'}}>⚠️ Consequence</div>
              <p style={{fontSize: '14px', color: '#92400e', margin: 0}}>What's the potential impact if this action goes wrong?</p>
            </div>
            
            <div style={{backgroundColor: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '16px'}}>
              <div style={{fontWeight: '600', color: '#047857', marginBottom: '8px'}}>🔒 Trust Boundary</div>
              <p style={{fontSize: '14px', color: '#065f46', margin: 0}}>Does this action cross organizational or regulatory boundaries?</p>
            </div>
          </div>
          
          <div style={{backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px', marginTop: '16px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
              <span style={styles.badge}>AWS Service</span>
              <span style={{fontWeight: '600', color: '#111827'}}>Amazon Bedrock</span>
            </div>
            <p style={{fontSize: '14px', color: '#78350f', margin: 0}}>
              Bedrock's Claude Sonnet 4.5 model analyzes action proposals using industry-specific regulatory knowledge to score each dimension on a 1-5 scale.
            </p>
          </div>
        </div>
      </div>

      {/* Action Input */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.title}>Evaluate an Action</h3>
          <p style={styles.subtitle}>Test the TACT framework with preset or custom actions</p>
        </div>
        <div style={styles.cardBody}>
          <div style={{marginBottom: '24px'}}>
            <label style={{display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px'}}>
              Industry-Specific Preset Action
            </label>
            <button
              onClick={() => evaluateAction(config.preset_action)}
              disabled={isLoading}
              onMouseEnter={() => setHoverButton(true)}
              onMouseLeave={() => setHoverButton(false)}
              style={{
                ...styles.button,
                ...(isLoading ? styles.buttonDisabled : hoverButton ? styles.buttonHover : {}),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{textAlign: 'left'}}>
                <div style={{fontSize: '12px', opacity: 0.9, marginBottom: '4px'}}>{current} Industry</div>
                <div>{config.preset_action}</div>
              </div>
              <span>→</span>
            </button>
          </div>

          <div style={{position: 'relative', textAlign: 'center', margin: '24px 0'}}>
            <div style={{position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', backgroundColor: '#d1d5db'}}></div>
            <span style={{position: 'relative', backgroundColor: '#ffffff', padding: '0 12px', fontSize: '14px', color: '#6b7280'}}>
              or enter custom action
            </span>
          </div>

          <div>
            <label style={{display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px'}}>
              Custom Action Proposal
            </label>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="e.g., Transfer $50,000 to external account, Approve high-risk loan application, etc."
              style={styles.textarea}
              rows={3}
            />
            <button
              onClick={() => evaluateAction(customInput)}
              disabled={isLoading || !customInput.trim()}
              style={{
                ...styles.button,
                ...(isLoading || !customInput.trim() ? styles.buttonDisabled : {}),
                marginTop: '12px',
                backgroundColor: '#4f46e5',
              }}
            >
              {isLoading ? 'Analyzing...' : 'Evaluate with Bedrock'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{...styles.card, backgroundColor: '#eff6ff', borderColor: '#93c5fd'}}>
          <div style={{padding: '32px', textAlign: 'center'}}>
            <div style={{fontSize: '18px', fontWeight: '600', color: '#1e40af', marginBottom: '8px'}}>
              Analyzing with Amazon Bedrock
            </div>
            <div style={{fontSize: '14px', color: '#1e3a8a'}}>
              Evaluating action against {current} industry regulations...
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <>
          {/* Bedrock Analysis */}
          <div style={styles.card}>
            <div style={{...styles.cardHeader, backgroundColor: '#fef3c7', borderColor: '#fde68a'}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <h3 style={{...styles.title, margin: 0}}>⚡ Bedrock Analysis</h3>
                <span style={{...styles.badge, backgroundColor: '#ea580c', color: '#ffffff'}}>
                  claude-sonnet-4.5
                </span>
              </div>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.grid3}>
                <div style={{backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px'}}>
                  <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px'}}>Action Evaluated</div>
                  <div style={{fontSize: '14px', fontWeight: '500', color: '#111827'}}>{result.action_proposal}</div>
                </div>
                <div style={{backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px'}}>
                  <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px'}}>Industry Context</div>
                  <div style={{fontSize: '14px', fontWeight: '500', color: '#111827'}}>{result.industry_context}</div>
                </div>
                <div style={{backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px'}}>
                  <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px'}}>Analysis Time</div>
                  <div style={{fontSize: '14px', fontWeight: '500', color: '#111827'}}>{result.latency_ms}ms</div>
                </div>
              </div>

              <button
                onClick={() => setShowPrompt(!showPrompt)}
                style={{marginTop: '16px', padding: '8px 0', background: 'none', border: 'none', color: '#2563eb', fontSize: '14px', fontWeight: '500', cursor: 'pointer'}}
              >
                {showPrompt ? '▼' : '▶'} View Bedrock Prompt
              </button>
              
              {showPrompt && (
                <div style={{marginTop: '12px', backgroundColor: '#1f2937', color: '#f3f4f6', borderRadius: '8px', padding: '16px', fontSize: '12px', fontFamily: 'monospace', overflow: 'auto'}}>
                  <pre style={{margin: 0, whiteSpace: 'pre-wrap'}}>
{`You are an AI agent governance classifier. Evaluate the following action proposal across four dimensions.

Industry Context: ${result.industry_context}
Action Proposal: ${result.action_proposal}

Evaluate each dimension on a scale of 1-5:
1. TRACEABILITY: Can we track who initiated this action?
2. ACCOUNTABILITY: Is there a clear owner responsible?
3. CONSEQUENCE: What is the potential impact if this goes wrong?
4. TRUST BOUNDARY: Does this action cross organizational boundaries?`}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* TACT Dimensions */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.title}>TACT Dimension Scores</h3>
              <p style={styles.subtitle}>Each dimension scored on a 1-5 scale by Bedrock</p>
            </div>
            <div style={styles.cardBody}>
              {Object.entries(result.dimensions).map(([key, score]) => (
                <div key={key} style={styles.dimensionCard}>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px'}}>
                    <span style={{fontSize: '16px', fontWeight: '600', color: '#111827'}}>{getDimensionName(key)}</span>
                    <span style={{fontSize: '24px', fontWeight: '700', color: getDimensionColor(score)}}>
                      {score}/5
                    </span>
                  </div>
                  <div style={styles.progressBar}>
                    <div style={{
                      width: `${(score / 5) * 100}%`,
                      height: '100%',
                      backgroundColor: getDimensionColor(score),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '8px',
                      transition: 'width 0.5s',
                    }}>
                      <span style={{fontSize: '12px', fontWeight: '600', color: '#ffffff'}}>
                        {Math.round((score / 5) * 100)}%
                      </span>
                    </div>
                  </div>
                  <p style={{fontSize: '14px', color: '#4b5563', margin: 0, lineHeight: '1.5'}}>
                    {getDimensionExplanation(key, score)}
                  </p>
                </div>
              ))}

              {result.reasoning && (
                <div style={{marginTop: '16px'}}>
                  <button
                    onClick={() => setShowReasoning(!showReasoning)}
                    style={{padding: '8px 0', background: 'none', border: 'none', color: '#2563eb', fontSize: '14px', fontWeight: '500', cursor: 'pointer'}}
                  >
                    {showReasoning ? '▼' : '▶'} Bedrock's Reasoning
                  </button>
                  {showReasoning && (
                    <div style={{marginTop: '12px', backgroundColor: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '8px', padding: '16px'}}>
                      <p style={{fontSize: '14px', color: '#1e3a8a', margin: 0, lineHeight: '1.6'}}>{result.reasoning}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Trust Spectrum */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.title}>Trust Spectrum Mapping</h3>
              <p style={styles.subtitle}>Autonomy level determined by average TACT score</p>
            </div>
            <div style={styles.cardBody}>
              <div style={{backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '16px', marginBottom: '20px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                  <span style={{fontSize: '14px', color: '#0369a1'}}>Average Score:</span>
                  <span style={{fontSize: '32px', fontWeight: '700', color: '#0c4a6e'}}>{result.average_score.toFixed(2)}</span>
                  <span style={{fontSize: '14px', color: '#0369a1'}}>/ 5.0</span>
                </div>
                <p style={{fontSize: '14px', color: '#075985', margin: 0}}>
                  The average of all four TACT dimensions determines the Trust Spectrum level and agent autonomy.
                </p>
              </div>

              <div style={styles.spectrumBar}>
                {['BLOCKED', 'RESTRICTED', 'SUPERVISED', 'VERIFIED', 'TRUSTED'].map((level) => (
                  <div
                    key={level}
                    style={{
                      ...styles.spectrumItem,
                      backgroundColor: getTrustSpectrumColor(level),
                      opacity: result.trust_spectrum === level ? 1 : 0.5,
                      transform: result.trust_spectrum === level ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {level}
                  </div>
                ))}
              </div>

              <div style={{
                background: 'linear-gradient(to right, #f9fafb, #eff6ff)',
                borderLeft: `4px solid ${getTrustSpectrumColor(result.trust_spectrum)}`,
                borderRadius: '8px',
                padding: '20px',
              }}>
                <div style={{fontSize: '18px', fontWeight: '700', color: '#111827', marginBottom: '8px'}}>
                  Trust Level: {result.trust_spectrum}
                </div>
                <p style={{fontSize: '14px', color: '#374151', margin: 0, lineHeight: '1.6'}}>
                  {getTrustSpectrumDescription(result.trust_spectrum)}
                </p>
              </div>

              <div style={{...styles.grid3, marginTop: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'}}>
                {[
                  {level: 'BLOCKED', color: '#dc2626', bg: '#fee2e2', text: 'No autonomy'},
                  {level: 'RESTRICTED', color: '#ea580c', bg: '#fed7aa', text: 'Limited'},
                  {level: 'SUPERVISED', color: '#eab308', bg: '#fef3c7', text: 'Monitored'},
                  {level: 'VERIFIED', color: '#16a34a', bg: '#dcfce7', text: 'Standard'},
                  {level: 'TRUSTED', color: '#059669', bg: '#d1fae5', text: 'Full autonomy'},
                ].map(({level, color, bg, text}) => (
                  <div key={level} style={{textAlign: 'center', padding: '12px', backgroundColor: bg, borderRadius: '8px'}}>
                    <div style={{fontWeight: '700', color, marginBottom: '4px', fontSize: '12px'}}>{level}</div>
                    <div style={{fontSize: '11px', color}}>{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AWS Services */}
          <div style={{...styles.card, background: 'linear-gradient(to right, #fef3c7, #fde68a)', borderColor: '#fde68a'}}>
            <div style={styles.cardBody}>
              <h3 style={{...styles.title, marginBottom: '12px'}}>⚡ Powered by Amazon Bedrock</h3>
              <p style={{fontSize: '14px', color: '#78350f', marginBottom: '16px', lineHeight: '1.6'}}>
                Amazon Bedrock provides the foundation model (Claude Sonnet 4.5) that analyzes action proposals with industry-specific regulatory knowledge.
              </p>
              <div style={styles.grid3}>
                <div style={{backgroundColor: '#ffffff', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px'}}>
                  <div style={{fontSize: '12px', color: '#92400e', marginBottom: '4px'}}>Model</div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: '#78350f'}}>claude-sonnet-4.5</div>
                </div>
                <div style={{backgroundColor: '#ffffff', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px'}}>
                  <div style={{fontSize: '12px', color: '#92400e', marginBottom: '4px'}}>Latency</div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: '#78350f'}}>{result.latency_ms}ms</div>
                </div>
                <div style={{backgroundColor: '#ffffff', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px'}}>
                  <div style={{fontSize: '12px', color: '#92400e', marginBottom: '4px'}}>Documentation</div>
                  <a href="https://docs.aws.amazon.com/bedrock/" target="_blank" rel="noopener noreferrer" style={{fontSize: '14px', fontWeight: '600', color: '#2563eb', textDecoration: 'none'}}>
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
              <p style={styles.subtitle}>Compliance logging for governance reporting</p>
            </div>
            <div style={styles.cardBody}>
              <div style={{backgroundColor: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '20px'}}>
                <div style={{fontSize: '16px', fontWeight: '600', color: '#065f46', marginBottom: '16px'}}>
                  ✓ Evaluation Logged to DynamoDB
                </div>
                <div style={styles.grid3}>
                  <div style={{backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px'}}>
                    <div style={{fontSize: '12px', color: '#047857', marginBottom: '4px'}}>Event ID</div>
                    <div style={{fontSize: '11px', fontFamily: 'monospace', color: '#065f46', wordBreak: 'break-all'}}>{result.evaluation_id}</div>
                  </div>
                  <div style={{backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px'}}>
                    <div style={{fontSize: '12px', color: '#047857', marginBottom: '4px'}}>Timestamp</div>
                    <div style={{fontSize: '12px', fontWeight: '500', color: '#065f46'}}>{new Date(result.timestamp * 1000).toLocaleString()}</div>
                  </div>
                  <div style={{backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px'}}>
                    <div style={{fontSize: '12px', color: '#047857', marginBottom: '4px'}}>Event Type</div>
                    <div style={{fontSize: '12px', fontWeight: '600', color: '#065f46'}}>TACT_EVALUATION</div>
                  </div>
                </div>
                <p style={{fontSize: '13px', color: '#047857', margin: '12px 0 0 0', lineHeight: '1.5'}}>
                  All TACT evaluations are logged to DynamoDB for compliance auditing and governance reporting.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useIndustry } from '../contexts/IndustryContext';
import { GuardrailsQueryResult } from '../types';
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
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '12px',
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
  codeBlock: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '13px',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '400px',
    lineHeight: '1.6',
  },
};

export const Demo2Guardrails: React.FC = () => {
  const { current } = useIndustry();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GuardrailsQueryResult | null>(null);
  const [showRawData, setShowRawData] = useState(false);

  const getRecordIdPrefix = (industry: string): string => {
    const prefixMap: Record<string, string> = {
      'Banking': 'BANK',
      'Healthcare': 'HEALTH',
      'Retail': 'RETAIL',
      'HROperations': 'HR'
    };
    return prefixMap[industry] || industry.toUpperCase();
  };

  const queryRecord = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const recordId = `${getRecordIdPrefix(current)}-001`;
      const data = await apiClient.queryGuardrails(recordId, current);
      setResult(data);
    } catch (error) {
      console.error('Guardrails query failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSensitiveDataTypes = (industry: string) => {
    const types: Record<string, string[]> = {
      'Banking': ['SSN', 'Account Numbers', 'Date of Birth'],
      'Healthcare': ['MRN', 'ICD-10 Codes', 'Prescription History'],
      'Retail': ['Credit Card Numbers', 'CVV'],
      'HROperations': ['Government ID', 'Salary Information']
    };
    return types[industry] || [];
  };

  const getRegulation = (industry: string) => {
    const regulations: Record<string, string> = {
      'Banking': 'GLBA, PCI-DSS',
      'Healthcare': 'HIPAA',
      'Retail': 'PCI-DSS',
      'HROperations': 'GDPR, EEOC'
    };
    return regulations[industry] || 'Data Protection Laws';
  };

  const renderRecord = (record: Record<string, any>) => {
    const jsonString = JSON.stringify(record, null, 2);
    const lines = jsonString.split('\n');
    
    return (
      <div style={styles.codeBlock}>
        {lines.map((line, idx) => {
          const isFieldRedacted = result?.fields_redacted.some(field => line.includes(`"${field}"`));
          return (
            <div key={idx} style={{ 
              color: isFieldRedacted ? '#ef4444' : '#f9fafb',
              fontWeight: isFieldRedacted ? '600' : 'normal'
            }}>
              {line}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Introduction */}
      <div style={styles.card}>
        <div style={{...styles.cardHeader, background: 'linear-gradient(to right, #7c3aed, #a855f7)'}}>
          <h2 style={{...styles.title, color: '#ffffff', marginBottom: '4px'}}>Data Protection with Guardrails</h2>
          <p style={{...styles.subtitle, color: '#e9d5ff'}}>Automatic PII/PHI/PCI Redaction for AI Agents</p>
        </div>
        
        <div style={styles.cardBody}>
          <p style={{fontSize: '15px', lineHeight: '1.6', color: '#374151', marginBottom: '20px'}}>
            AI agents need access to data to make decisions, but sensitive information must be protected. 
            Bedrock Guardrails automatically detects and redacts sensitive data before agents can access it.
          </p>
          
          <div style={{backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px', marginBottom: '20px'}}>
            <div style={{fontWeight: '600', color: '#92400e', marginBottom: '8px'}}>
              🔒 {current} Industry Protection
            </div>
            <div style={{fontSize: '14px', color: '#78350f', marginBottom: '8px'}}>
              <span style={{fontWeight: '600'}}>Sensitive Data Types:</span> {getSensitiveDataTypes(current).join(', ')}
            </div>
            <div style={{fontSize: '14px', color: '#78350f'}}>
              <span style={{fontWeight: '600'}}>Regulations:</span> {getRegulation(current)}
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px'}}>
            <div style={{backgroundColor: '#eff6ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '32px', marginBottom: '8px'}}>🗄️</div>
              <div style={{fontSize: '14px', fontWeight: '600', color: '#0c4a6e'}}>DynamoDB</div>
              <div style={{fontSize: '12px', color: '#075985'}}>Stores raw data</div>
            </div>
            <div style={{backgroundColor: '#f3e8ff', border: '1px solid #d8b4fe', borderRadius: '8px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '32px', marginBottom: '8px'}}>🛡️</div>
              <div style={{fontSize: '14px', fontWeight: '600', color: '#5b21b6'}}>Guardrails</div>
              <div style={{fontSize: '12px', color: '#6b21a8'}}>Redacts sensitive data</div>
            </div>
            <div style={{backgroundColor: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '32px', marginBottom: '8px'}}>🤖</div>
              <div style={{fontSize: '14px', fontWeight: '600', color: '#065f46'}}>AI Agent</div>
              <div style={{fontSize: '12px', color: '#047857'}}>Receives safe data</div>
            </div>
          </div>
        </div>
      </div>

      {/* Query Action */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.title}>Query Sensitive Record</h3>
          <p style={styles.subtitle}>Simulate an AI agent requesting data from DynamoDB</p>
        </div>
        <div style={styles.cardBody}>
          <button
            onClick={queryRecord}
            disabled={isLoading}
            style={{
              ...styles.button,
              ...(isLoading ? {backgroundColor: '#9ca3af', cursor: 'not-allowed'} : {}),
            }}
          >
            {isLoading ? 'Querying & Applying Guardrails...' : `Query ${current} Record`}
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{...styles.card, backgroundColor: '#f0f9ff', borderColor: '#bae6fd'}}>
          <div style={{padding: '32px', textAlign: 'center'}}>
            <div style={{fontSize: '18px', fontWeight: '600', color: '#0c4a6e', marginBottom: '8px'}}>
              Processing Data Protection Pipeline
            </div>
            <div style={{fontSize: '14px', color: '#075985', marginBottom: '16px'}}>
              1. Querying DynamoDB → 2. Applying Guardrails → 3. Redacting Sensitive Fields
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <>
          {/* Data Flow Visualization */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.title}>Data Protection Flow</h3>
              <p style={styles.subtitle}>How Bedrock Guardrails protects sensitive information</p>
            </div>
            <div style={styles.cardBody}>
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                <div style={styles.flowStep}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#3b82f6',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}>1</div>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: '600', color: '#111827', marginBottom: '4px'}}>Agent Requests Data</div>
                    <div style={{fontSize: '14px', color: '#6b7280'}}>AI agent queries DynamoDB for record: {result.record_id}</div>
                  </div>
                  <div style={{fontSize: '12px', color: '#059669', fontWeight: '600'}}>
                    {result.latency.dynamodb_ms}ms
                  </div>
                </div>

                <div style={{textAlign: 'center', color: '#9ca3af', fontSize: '20px'}}>↓</div>

                <div style={styles.flowStep}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#8b5cf6',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}>2</div>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: '600', color: '#111827', marginBottom: '4px'}}>Guardrails Intercepts</div>
                    <div style={{fontSize: '14px', color: '#6b7280'}}>Bedrock Guardrails applies {current} policy: {result.guardrails_policy_id}</div>
                  </div>
                  <div style={{fontSize: '12px', color: '#059669', fontWeight: '600'}}>
                    {result.latency.guardrails_ms}ms
                  </div>
                </div>

                <div style={{textAlign: 'center', color: '#9ca3af', fontSize: '20px'}}>↓</div>

                <div style={styles.flowStep}>
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
                  }}>3</div>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: '600', color: '#111827', marginBottom: '4px'}}>Sanitized Data Returned</div>
                    <div style={{fontSize: '14px', color: '#6b7280'}}>
                      {result.fields_redacted.length} sensitive field{result.fields_redacted.length !== 1 ? 's' : ''} redacted
                    </div>
                  </div>
                  <div style={{fontSize: '12px', color: '#059669', fontWeight: '600'}}>
                    Total: {result.latency.total_ms}ms
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Before/After Comparison */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.title}>Before & After Comparison</h3>
              <p style={styles.subtitle}>See how Guardrails protects sensitive information</p>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.grid2}>
                {/* Raw Data */}
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}>
                    <div>
                      <div style={{fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px'}}>
                        🗄️ Raw Data (DynamoDB)
                      </div>
                      <div style={{fontSize: '13px', color: '#6b7280'}}>
                        Contains sensitive information
                      </div>
                    </div>
                    <button
                      onClick={() => setShowRawData(!showRawData)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: showRawData ? '#dc2626' : '#6b7280',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {showRawData ? '🔒 Hide' : '👁️ Reveal'}
                    </button>
                  </div>
                  {showRawData ? (
                    renderRecord(result.raw_record)
                  ) : (
                    <div style={{
                      ...styles.codeBlock,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '200px',
                      backgroundColor: '#1f2937',
                      filter: 'blur(8px)',
                      userSelect: 'none',
                    }}>
                      <div style={{fontSize: '14px', color: '#9ca3af'}}>
                        Raw data hidden for security
                      </div>
                    </div>
                  )}
                </div>

                {/* Sanitized Data */}
                <div>
                  <div style={{marginBottom: '12px'}}>
                    <div style={{fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px'}}>
                      ✅ Sanitized Data (Agent View)
                    </div>
                    <div style={{fontSize: '13px', color: '#6b7280'}}>
                      Safe for AI agent consumption
                    </div>
                  </div>
                  {renderRecord(result.sanitized_record)}
                </div>
              </div>

              {/* Redacted Fields Summary */}
              {result.fields_redacted.length > 0 && (
                <div style={{
                  marginTop: '20px',
                  backgroundColor: '#fef2f2',
                  border: '2px solid #fecaca',
                  borderRadius: '8px',
                  padding: '16px',
                }}>
                  <div style={{display: 'flex', alignItems: 'start', gap: '12px'}}>
                    <div style={{fontSize: '24px'}}>🛡️</div>
                    <div style={{flex: 1}}>
                      <div style={{fontWeight: '600', color: '#991b1b', marginBottom: '8px'}}>
                        Protected Fields ({result.fields_redacted.length})
                      </div>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                        {result.fields_redacted.map((field) => (
                          <span
                            key={field}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#dc2626',
                              color: '#ffffff',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: '600',
                            }}
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Guardrails Policy Details */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.title}>Guardrails Policy Details</h3>
              <p style={styles.subtitle}>Industry-specific data protection configuration</p>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.grid3}>
                <div style={{backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px'}}>
                  <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px'}}>Policy ID</div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: '#111827', fontFamily: 'monospace'}}>
                    {result.guardrails_policy_id}
                  </div>
                </div>
                <div style={{backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px'}}>
                  <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px'}}>Industry Context</div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: '#111827'}}>
                    {result.industry_context}
                  </div>
                </div>
                <div style={{backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px'}}>
                  <div style={{fontSize: '12px', color: '#6b7280', marginBottom: '4px'}}>Fields Protected</div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: '#111827'}}>
                    {result.fields_redacted.length} / {Object.keys(result.raw_record).length}
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: '16px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '16px',
              }}>
                <div style={{fontSize: '14px', fontWeight: '600', color: '#0c4a6e', marginBottom: '8px'}}>
                  Redaction Strategy
                </div>
                <div style={{fontSize: '14px', color: '#075985', lineHeight: '1.6'}}>
                  Bedrock Guardrails uses content filtering to detect and redact {getSensitiveDataTypes(current).join(', ')} 
                  {' '}based on {getRegulation(current)} compliance requirements. All redacted fields are replaced with [REDACTED] 
                  to prevent sensitive data exposure while maintaining data structure.
                </div>
              </div>
            </div>
          </div>

          {/* AWS Services Highlight */}
          <div style={{...styles.card, background: 'linear-gradient(to right, #f3e8ff, #e9d5ff)', borderColor: '#d8b4fe'}}>
            <div style={styles.cardBody}>
              <h3 style={{...styles.title, marginBottom: '12px'}}>🛡️ Powered by Bedrock Guardrails + DynamoDB</h3>
              <p style={{fontSize: '14px', color: '#5b21b6', marginBottom: '16px', lineHeight: '1.6'}}>
                Amazon Bedrock Guardrails provides content filtering and PII detection, while DynamoDB stores the raw data. 
                This combination ensures AI agents can access necessary information while protecting sensitive data.
              </p>
              <div style={styles.grid3}>
                <div style={{backgroundColor: '#ffffff', border: '1px solid #d8b4fe', borderRadius: '8px', padding: '12px'}}>
                  <div style={{fontSize: '12px', color: '#7c3aed', marginBottom: '4px'}}>DynamoDB Query</div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: '#5b21b6'}}>{result.latency.dynamodb_ms}ms</div>
                </div>
                <div style={{backgroundColor: '#ffffff', border: '1px solid #d8b4fe', borderRadius: '8px', padding: '12px'}}>
                  <div style={{fontSize: '12px', color: '#7c3aed', marginBottom: '4px'}}>Guardrails Processing</div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: '#5b21b6'}}>{result.latency.guardrails_ms}ms</div>
                </div>
                <div style={{backgroundColor: '#ffffff', border: '1px solid #d8b4fe', borderRadius: '8px', padding: '12px'}}>
                  <div style={{fontSize: '12px', color: '#7c3aed', marginBottom: '4px'}}>Documentation</div>
                  <a 
                    href="https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html" 
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

          {/* Compliance Note */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.title}>Compliance & Audit Trail</h3>
              <p style={styles.subtitle}>Regulatory compliance and governance logging</p>
            </div>
            <div style={styles.cardBody}>
              <div style={{backgroundColor: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '20px'}}>
                <div style={{fontSize: '16px', fontWeight: '600', color: '#065f46', marginBottom: '16px'}}>
                  ✓ Query Logged to DynamoDB
                </div>
                <div style={styles.grid3}>
                  <div style={{backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px'}}>
                    <div style={{fontSize: '12px', color: '#047857', marginBottom: '4px'}}>Query ID</div>
                    <div style={{fontSize: '11px', fontFamily: 'monospace', color: '#065f46', wordBreak: 'break-all'}}>
                      {result.query_id}
                    </div>
                  </div>
                  <div style={{backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px'}}>
                    <div style={{fontSize: '12px', color: '#047857', marginBottom: '4px'}}>Timestamp</div>
                    <div style={{fontSize: '12px', fontWeight: '500', color: '#065f46'}}>
                      {new Date(result.timestamp * 1000).toLocaleString()}
                    </div>
                  </div>
                  <div style={{backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px'}}>
                    <div style={{fontSize: '12px', color: '#047857', marginBottom: '4px'}}>Compliance</div>
                    <div style={{fontSize: '12px', fontWeight: '600', color: '#065f46'}}>{getRegulation(current)}</div>
                  </div>
                </div>
                <p style={{fontSize: '13px', color: '#047857', margin: '12px 0 0 0', lineHeight: '1.5'}}>
                  All data access requests and redaction operations are logged for {getRegulation(current)} compliance auditing. 
                  This creates an immutable audit trail for regulatory review and demonstrates due diligence in protecting sensitive information.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

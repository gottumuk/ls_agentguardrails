import React, { useState } from 'react';
import { IndustryProvider, useIndustry } from './contexts/IndustryContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { Demo1TACTEngine } from './components/Demo1TACTEngine';
import { Demo2Guardrails } from './components/Demo2Guardrails';
import { Demo3NeptuneGraph } from './components/Demo3NeptuneGraph';
import { Demo4ApprovalWorkflow } from './components/Demo4ApprovalWorkflow';
import { ObservabilitySidebar } from './components/ObservabilitySidebar';
import {
  Demo1ErrorBoundary,
  Demo2ErrorBoundary,
  Demo3ErrorBoundary,
  Demo4ErrorBoundary
} from './components/DemoErrorBoundary';
import { IndustryType } from './types';
import { config } from './config';

type DemoTab = 'overview' | 'tact' | 'guardrails' | 'neptune' | 'approval';

const AppContent: React.FC = () => {
  const { current, setCurrent } = useIndustry();
  const [activeTab, setActiveTab] = useState<DemoTab>('overview');

  const industries: IndustryType[] = ['Banking', 'Healthcare', 'Retail', 'HROperations'];

  const getIndustryLabel = (industry: IndustryType) => {
    if (industry === 'HROperations') return 'HR/Operations';
    return industry;
  };

  const tabs = [
    { id: 'overview' as DemoTab, label: 'Overview', icon: '📊' },
    { id: 'tact' as DemoTab, label: 'TACT Framework', icon: '🎯' },
    { id: 'guardrails' as DemoTab, label: 'Data Protection', icon: '🛡️' },
    { id: 'neptune' as DemoTab, label: 'Trust Reasoning', icon: '🔗' },
    { id: 'approval' as DemoTab, label: 'Human Oversight', icon: '✋' }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar - Industry Switcher */}
      <div style={{ 
        backgroundColor: '#1f2937', 
        color: 'white', 
        padding: '16px 24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', marginBottom: '4px' }}>
              AWS Agent Governance Demos
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
              Demonstrating AI Agent Governance using AWS Services
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {industries.map((industry) => (
              <button
                key={industry}
                onClick={() => setCurrent(industry)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: current === industry ? '#2563eb' : '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: current === industry ? 'bold' : 'normal',
                  transition: 'all 0.2s'
                }}
              >
                {getIndustryLabel(industry)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto',
          display: 'flex',
          gap: '0'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '16px 24px',
                backgroundColor: activeTab === tab.id ? '#f3f4f6' : 'transparent',
                color: activeTab === tab.id ? '#1f2937' : '#6b7280',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #2563eb' : '3px solid transparent',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: activeTab === tab.id ? '600' : 'normal',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '18px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1,
        maxWidth: '1400px', 
        margin: '0 auto', 
        padding: '32px 24px',
        width: '100%'
      }}>
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ fontSize: '28px', marginTop: 0, marginBottom: '16px' }}>
              Agent Governance Framework
            </h2>
            <p style={{ fontSize: '16px', color: '#4b5563', marginBottom: '32px', lineHeight: '1.6' }}>
              This demo showcases how AWS services enable comprehensive governance for AI agents across four critical dimensions.
              Select a tab above to explore each capability in detail.
            </p>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '24px',
              marginBottom: '32px'
            }}>
              {/* TACT Card */}
              <div style={{ 
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '2px solid transparent'
              }}
              onClick={() => setActiveTab('tact')}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
              >
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
                <h3 style={{ fontSize: '20px', marginTop: 0, marginBottom: '12px' }}>
                  TACT Framework
                </h3>
                <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
                  Evaluate agent actions across Traceability, Accountability, Consequence, and Trust Boundary dimensions using Amazon Bedrock.
                </p>
                <div style={{ 
                  display: 'inline-block',
                  padding: '6px 12px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  Amazon Bedrock
                </div>
              </div>

              {/* Guardrails Card */}
              <div style={{ 
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '2px solid transparent'
              }}
              onClick={() => setActiveTab('guardrails')}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
              >
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🛡️</div>
                <h3 style={{ fontSize: '20px', marginTop: 0, marginBottom: '12px' }}>
                  Data Protection
                </h3>
                <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
                  Automatically detect and redact sensitive data (PII/PHI/PCI) using Amazon Bedrock Guardrails before agents can access it.
                </p>
                <div style={{ 
                  display: 'inline-block',
                  padding: '6px 12px',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginRight: '8px'
                }}>
                  Bedrock Guardrails
                </div>
                <div style={{ 
                  display: 'inline-block',
                  padding: '6px 12px',
                  backgroundColor: '#f0fdf4',
                  color: '#16a34a',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  DynamoDB
                </div>
              </div>

              {/* Neptune Card */}
              <div style={{ 
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '2px solid transparent'
              }}
              onClick={() => setActiveTab('neptune')}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
              >
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔗</div>
                <h3 style={{ fontSize: '20px', marginTop: 0, marginBottom: '12px' }}>
                  Trust Reasoning
                </h3>
                <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
                  Use graph-based reasoning with Amazon Neptune to calculate trust scores based on relationship proximity to known risk clusters.
                </p>
                <div style={{ 
                  display: 'inline-block',
                  padding: '6px 12px',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  Amazon Neptune
                </div>
              </div>

              {/* Approval Card */}
              <div style={{ 
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '2px solid transparent'
              }}
              onClick={() => setActiveTab('approval')}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
              >
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>✋</div>
                <h3 style={{ fontSize: '20px', marginTop: 0, marginBottom: '12px' }}>
                  Human Oversight
                </h3>
                <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
                  Implement human-in-the-loop approval workflows using AWS Step Functions for high-risk agent actions requiring human judgment.
                </p>
                <div style={{ 
                  display: 'inline-block',
                  padding: '6px 12px',
                  backgroundColor: '#fce7f3',
                  color: '#be123c',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  Step Functions
                </div>
              </div>
            </div>

            {/* Architecture Diagram */}
            <div style={{ 
              backgroundColor: 'white',
              padding: '32px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '20px', marginTop: 0, marginBottom: '16px', textAlign: 'center' }}>
                Architecture Overview
              </h3>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '32px', textAlign: 'center' }}>
                All demos use industry-specific contexts ({getIndustryLabel(current)}) to demonstrate governance patterns across different regulatory environments.
              </p>
              
              {/* Architecture Diagram - Integrated Flow */}
              <div style={{ position: 'relative', marginBottom: '32px' }}>
                {/* Top Row: Frontend & CloudFront */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      backgroundColor: '#eff6ff',
                      border: '2px solid #3b82f6',
                      borderRadius: '8px',
                      padding: '16px 24px',
                      textAlign: 'center',
                      minWidth: '140px'
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>🌐</div>
                      <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '4px' }}>Frontend</div>
                      <div style={{ fontSize: '12px', color: '#3b82f6' }}>React App</div>
                    </div>
                    <div style={{ fontSize: '20px', color: '#9ca3af' }}>→</div>
                    <div style={{ 
                      backgroundColor: '#f0fdf4',
                      border: '2px solid #22c55e',
                      borderRadius: '8px',
                      padding: '16px 24px',
                      textAlign: 'center',
                      minWidth: '140px'
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>☁️</div>
                      <div style={{ fontWeight: '600', color: '#15803d', marginBottom: '4px' }}>CloudFront</div>
                      <div style={{ fontSize: '12px', color: '#22c55e' }}>CDN</div>
                    </div>
                  </div>
                </div>

                {/* Arrow Down */}
                <div style={{ textAlign: 'center', fontSize: '24px', color: '#9ca3af', marginBottom: '24px' }}>↓</div>

                {/* Middle Row: API Gateway & Lambda */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      backgroundColor: '#fef3c7',
                      border: '2px solid #f59e0b',
                      borderRadius: '8px',
                      padding: '16px 24px',
                      textAlign: 'center',
                      minWidth: '140px'
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔌</div>
                      <div style={{ fontWeight: '600', color: '#b45309', marginBottom: '4px' }}>API Gateway</div>
                      <div style={{ fontSize: '12px', color: '#f59e0b' }}>REST API</div>
                    </div>
                    <div style={{ fontSize: '20px', color: '#9ca3af' }}>→</div>
                    <div style={{ 
                      backgroundColor: '#fce7f3',
                      border: '2px solid #ec4899',
                      borderRadius: '8px',
                      padding: '16px 24px',
                      textAlign: 'center',
                      minWidth: '140px'
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>λ</div>
                      <div style={{ fontWeight: '600', color: '#be123c', marginBottom: '4px' }}>Lambda</div>
                      <div style={{ fontSize: '11px', color: '#ec4899', lineHeight: '1.4' }}>
                        4 Functions
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow Down with Split */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '24px', color: '#9ca3af', marginBottom: '8px' }}>↓</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Connects to AWS Services</div>
                </div>

                {/* Bottom Row: AWS Services Grid */}
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '16px',
                  maxWidth: '900px',
                  margin: '0 auto'
                }}>
                  <div style={{ 
                    backgroundColor: '#ede9fe',
                    border: '2px solid #8b5cf6',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      position: 'absolute',
                      top: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '16px',
                      color: '#8b5cf6'
                    }}>↓</div>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤖</div>
                    <div style={{ fontWeight: '600', color: '#6b21a8', fontSize: '14px', marginBottom: '4px' }}>Bedrock</div>
                    <div style={{ fontSize: '11px', color: '#8b5cf6', lineHeight: '1.3' }}>Claude 3.5<br/>Guardrails</div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: '#fef3c7',
                    border: '2px solid #eab308',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      position: 'absolute',
                      top: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '16px',
                      color: '#eab308'
                    }}>↓</div>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔗</div>
                    <div style={{ fontWeight: '600', color: '#854d0e', fontSize: '14px', marginBottom: '4px' }}>Neptune</div>
                    <div style={{ fontSize: '11px', color: '#eab308', lineHeight: '1.3' }}>Graph DB<br/>Gremlin</div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: '#dbeafe',
                    border: '2px solid #3b82f6',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      position: 'absolute',
                      top: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '16px',
                      color: '#3b82f6'
                    }}>↓</div>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚙️</div>
                    <div style={{ fontWeight: '600', color: '#1e40af', fontSize: '14px', marginBottom: '4px' }}>Step Functions</div>
                    <div style={{ fontSize: '11px', color: '#3b82f6', lineHeight: '1.3' }}>Workflow<br/>Callback</div>
                  </div>
                  
                  <div style={{ 
                    backgroundColor: '#dcfce7',
                    border: '2px solid #22c55e',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      position: 'absolute',
                      top: '-20px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '16px',
                      color: '#22c55e'
                    }}>↓</div>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🗄️</div>
                    <div style={{ fontWeight: '600', color: '#15803d', fontSize: '14px', marginBottom: '4px' }}>DynamoDB</div>
                    <div style={{ fontSize: '11px', color: '#22c55e', lineHeight: '1.3' }}>Audit Trail<br/>Storage</div>
                  </div>
                </div>

                {/* Connection Labels */}
                <div style={{ 
                  marginTop: '32px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#8b5cf6', borderRadius: '50%' }}></div>
                    <span><strong>Demo 1:</strong> Lambda → Bedrock → DynamoDB</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#7c3aed', borderRadius: '50%' }}></div>
                    <span><strong>Demo 2:</strong> Lambda → DynamoDB → Guardrails</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#eab308', borderRadius: '50%' }}></div>
                    <span><strong>Demo 3:</strong> Lambda → Neptune → DynamoDB</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '50%' }}></div>
                    <span><strong>Demo 4:</strong> Lambda → Step Functions ↔ Human</span>
                  </div>
                </div>
              </div>

              {/* Data Flow Description */}
              <div style={{ 
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '20px'
              }}>
                <div style={{ fontWeight: '600', color: '#111827', marginBottom: '12px', fontSize: '16px' }}>
                  Data Flow
                </div>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '16px',
                  fontSize: '14px',
                  color: '#4b5563',
                  lineHeight: '1.6'
                }}>
                  <div>
                    <strong style={{ color: '#2563eb' }}>1. TACT Evaluation:</strong> Frontend → API Gateway → Lambda → Bedrock (Claude Sonnet 4.5) → DynamoDB (audit)
                  </div>
                  <div>
                    <strong style={{ color: '#7c3aed' }}>2. Data Protection:</strong> Frontend → API Gateway → Lambda → DynamoDB → Guardrails (redaction) → Response
                  </div>
                  <div>
                    <strong style={{ color: '#d97706' }}>3. Trust Reasoning:</strong> Frontend → API Gateway → Lambda → Neptune (Gremlin query) → DynamoDB (audit)
                  </div>
                  <div>
                    <strong style={{ color: '#be123c' }}>4. Human Oversight:</strong> Frontend → API Gateway → Lambda → Step Functions (callback) → Human Decision → Resume
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tact' && (
          <Demo1ErrorBoundary industryContext={current}>
            <Demo1TACTEngine />
          </Demo1ErrorBoundary>
        )}

        {activeTab === 'guardrails' && (
          <Demo2ErrorBoundary industryContext={current}>
            <Demo2Guardrails />
          </Demo2ErrorBoundary>
        )}

        {activeTab === 'neptune' && (
          <Demo3ErrorBoundary industryContext={current}>
            <Demo3NeptuneGraph />
          </Demo3ErrorBoundary>
        )}

        {activeTab === 'approval' && (
          <Demo4ErrorBoundary industryContext={current}>
            <Demo4ApprovalWorkflow />
          </Demo4ErrorBoundary>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <WebSocketProvider url={config.api.websocketEndpoint}>
      <IndustryProvider>
        <AppContent />
        <ObservabilitySidebar />
      </IndustryProvider>
    </WebSocketProvider>
  );
};

export default App;

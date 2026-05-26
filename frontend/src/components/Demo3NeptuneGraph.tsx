import React, { useState, useEffect, useRef } from 'react';
import { useIndustry } from '../contexts/IndustryContext';
import { TrustScoreResult } from '../types';
import { apiClient } from '../api/client';
import * as d3 from 'd3';

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
    padding: '12px 24px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
};

export const Demo3NeptuneGraph: React.FC = () => {
  const { current } = useIndustry();
  const [targetNode, setTargetNode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TrustScoreResult | null>(null);
  const [showQuery, setShowQuery] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const presetNodes = [
    { id: 'ACCT-001', label: 'Account 001' },
    { id: 'ACCT-002', label: 'Account 002' },
    { id: 'ACCT-003', label: 'Account 003' }
  ];

  useEffect(() => {
    if (presetNodes.length > 0) {
      setTargetNode(presetNodes[0].id);
    }
  }, []);

  const calculateTrustScore = async () => {
    if (!targetNode) return;
    
    setIsLoading(true);
    setResult(null);
    try {
      const data = await apiClient.calculateTrustScore(targetNode, current);
      setResult(data);
    } catch (error) {
      console.error('Trust score calculation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (result && svgRef.current) {
      renderGraph();
    }
  }, [result]);

  const getRiskScenario = (industry: string) => {
    const scenarios: Record<string, { title: string; description: string }> = {
      'Banking': {
        title: 'Fraud Ring Detection',
        description: 'Detect accounts connected to known fraud clusters through shared entities or suspicious transaction patterns.'
      },
      'Healthcare': {
        title: 'Prescription Mill Detection',
        description: 'Identify doctors or pharmacies connected to prescription mills through suspicious prescription patterns.'
      },
      'Retail': {
        title: 'Refund Ring Detection',
        description: 'Find accounts connected to refund fraud rings through shared addresses or payment methods.'
      },
      'HROperations': {
        title: 'Legal Case Clustering',
        description: 'Identify employees connected to legal cases through department or management relationships.'
      }
    };
    return scenarios[industry] || scenarios['Banking'];
  };

  const renderGraph = () => {
    try {
      if (!result || !svgRef.current) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const width = 700;
      const height = 500;
      
      svg.attr('width', width).attr('height', height);

      const nodes: any[] = [];
      const edges: any[] = [];
      const nodeMap = new Map();

      const paths = (result as any).traversal_path || (result as any).traversal_paths;
      
      if (!paths || !Array.isArray(paths) || paths.length === 0) {
        nodes.push({
          id: result.target_node_id,
          label: 'Target',
          isTarget: true,
          isRisk: false,
          hops: 0
        });
      } else {
        paths.forEach((path: any) => {
          if (!path || !path.nodes || !Array.isArray(path.nodes)) {
            console.warn('Invalid path structure:', path);
            return;
          }
          
          for (let i = 0; i < path.nodes.length; i++) {
            const node = path.nodes[i];
            if (!node || !node.id) {
              console.warn('Invalid node at index', i, ':', node);
              continue;
            }
            
            if (!nodeMap.has(node.id)) {
              nodeMap.set(node.id, {
                id: node.id,
                label: node.label || 'Unknown',
                isTarget: node.id === result.target_node_id,
                isRisk: node.label === 'RiskCluster',
                hops: i
              });
              nodes.push(nodeMap.get(node.id));
            }
            
            if (i < path.nodes.length - 1) {
              const nextNode = path.nodes[i + 1];
              
              if (nextNode && nextNode.id && !edges.find(e => 
                (e.source === node.id && e.target === nextNode.id) ||
                (e.source === nextNode.id && e.target === node.id)
              )) {
                edges.push({
                  source: node.id,
                  target: nextNode.id,
                  label: 'connected'
                });
              }
            }
          }
        });
      }

      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(edges).id((d: any) => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(40));

      const link = svg.append('g')
        .selectAll('line')
        .data(edges)
        .enter()
        .append('line')
        .attr('stroke', '#9ca3af')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '5,5');

      const node = svg.append('g')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g');

      node.append('circle')
        .attr('r', (d: any) => d.isTarget ? 20 : d.isRisk ? 18 : 14)
        .attr('fill', (d: any) => {
          if (d.isTarget) return '#2563eb';
          if (d.isRisk) return '#dc2626';
          if (d.hops === 1) return '#f59e0b';
          return '#6b7280';
        })
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 3);

      node.append('text')
        .text((d: any) => d.id)
        .attr('font-size', 11)
        .attr('font-weight', '600')
        .attr('text-anchor', 'middle')
        .attr('dy', 35)
        .attr('fill', '#374151');

      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });
    } catch (error) {
      console.error('Error in renderGraph:', error);
      console.error('Result data:', result);
      throw error; // Re-throw to be caught by ErrorBoundary
    }
  };

  const scenario = getRiskScenario(current);

  return (
    <div style={styles.container}>
      {/* Introduction */}
      <div style={styles.card}>
        <div style={{...styles.cardHeader, background: 'linear-gradient(to right, #059669, #10b981)'}}>
          <h2 style={{...styles.title, color: '#ffffff', marginBottom: '4px'}}>Graph-Based Trust Reasoning</h2>
          <p style={{...styles.subtitle, color: '#d1fae5'}}>Relationship Analysis with Amazon Neptune</p>
        </div>
        
        <div style={styles.cardBody}>
          <p style={{fontSize: '15px', lineHeight: '1.6', color: '#374151', marginBottom: '20px'}}>
            Traditional trust scoring looks at individual attributes. Graph-based reasoning analyzes relationships and connections 
            to detect risk patterns that only emerge through network analysis.
          </p>
          
          <div style={{backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px', marginBottom: '20px'}}>
            <div style={{fontWeight: '600', color: '#92400e', marginBottom: '8px', fontSize: '16px'}}>
              📊 {scenario.title}
            </div>
            <div style={{fontSize: '14px', color: '#78350f', lineHeight: '1.6'}}>
              {scenario.description}
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px'}}>
            <div style={{backgroundColor: '#eff6ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '32px', marginBottom: '8px'}}>🔵</div>
              <div style={{fontSize: '14px', fontWeight: '600', color: '#0c4a6e'}}>Target Node</div>
              <div style={{fontSize: '12px', color: '#075985'}}>Account to evaluate</div>
            </div>
            <div style={{backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '32px', marginBottom: '8px'}}>🟠</div>
              <div style={{fontSize: '14px', fontWeight: '600', color: '#92400e'}}>1-Hop Connection</div>
              <div style={{fontSize: '12px', color: '#78350f'}}>Direct relationship</div>
            </div>
            <div style={{backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', textAlign: 'center'}}>
              <div style={{fontSize: '32px', marginBottom: '8px'}}>🔴</div>
              <div style={{fontSize: '14px', fontWeight: '600', color: '#991b1b'}}>Risk Cluster</div>
              <div style={{fontSize: '12px', color: '#7f1d1d'}}>Known risk pattern</div>
            </div>
          </div>
        </div>
      </div>

      {/* Node Selection */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.title}>Select Target Node</h3>
          <p style={styles.subtitle}>Choose an account to analyze for risk connections</p>
        </div>
        <div style={styles.cardBody}>
          <div style={{display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap'}}>
            <select
              value={targetNode}
              onChange={(e) => setTargetNode(e.target.value)}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {presetNodes.map(node => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
            </select>
            <button
              onClick={calculateTrustScore}
              disabled={isLoading || !targetNode}
              style={{
                ...styles.button,
                ...(isLoading || !targetNode ? {backgroundColor: '#9ca3af', cursor: 'not-allowed'} : {}),
              }}
            >
              {isLoading ? 'Analyzing Graph...' : 'Calculate Trust Score'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{...styles.card, backgroundColor: '#ecfdf5', borderColor: '#a7f3d0'}}>
          <div style={{padding: '32px', textAlign: 'center'}}>
            <div style={{fontSize: '18px', fontWeight: '600', color: '#065f46', marginBottom: '8px'}}>
              Traversing Neptune Graph Database
            </div>
            <div style={{fontSize: '14px', color: '#047857'}}>
              Executing Gremlin query to find risk cluster connections...
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <>
          {/* Trust Score & Verdict */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.title}>Trust Score & Verdict</h3>
              <p style={styles.subtitle}>Calculated based on proximity to risk clusters</p>
            </div>
            <div style={styles.cardBody}>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px'}}>
                <div style={{
                  backgroundColor: result.trust_score >= 60 ? '#d1fae5' : '#fee2e2',
                  border: `2px solid ${result.trust_score >= 60 ? '#a7f3d0' : '#fecaca'}`,
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                }}>
                  <div style={{fontSize: '14px', color: result.trust_score >= 60 ? '#047857' : '#991b1b', marginBottom: '8px', fontWeight: '600'}}>
                    Trust Score
                  </div>
                  <div style={{
                    fontSize: '56px',
                    fontWeight: '700',
                    color: result.trust_score >= 60 ? '#065f46' : '#7f1d1d',
                    lineHeight: 1,
                  }}>
                    {result.trust_score}
                  </div>
                  <div style={{fontSize: '14px', color: result.trust_score >= 60 ? '#047857' : '#991b1b', marginTop: '8px'}}>
                    out of 100
                  </div>
                </div>

                <div style={{
                  backgroundColor: result.verdict === 'PROCEED' ? '#d1fae5' : '#fee2e2',
                  border: `2px solid ${result.verdict === 'PROCEED' ? '#a7f3d0' : '#fecaca'}`,
                  borderRadius: '12px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <div style={{fontSize: '14px', color: result.verdict === 'PROCEED' ? '#047857' : '#991b1b', marginBottom: '12px', fontWeight: '600'}}>
                    Verdict
                  </div>
                  <div style={{
                    padding: '12px 32px',
                    backgroundColor: result.verdict === 'PROCEED' ? '#10b981' : '#dc2626',
                    color: '#ffffff',
                    borderRadius: '8px',
                    fontSize: '24px',
                    fontWeight: '700',
                  }}>
                    {result.verdict}
                  </div>
                  <div style={{fontSize: '13px', color: result.verdict === 'PROCEED' ? '#047857' : '#991b1b', marginTop: '12px', textAlign: 'center'}}>
                    {result.verdict === 'PROCEED' 
                      ? 'Action allowed with standard monitoring' 
                      : 'Requires human approval before execution'}
                  </div>
                </div>
              </div>

              <div style={{backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '16px'}}>
                <div style={{fontSize: '14px', fontWeight: '600', color: '#0c4a6e', marginBottom: '8px'}}>
                  Trust Score Algorithm
                </div>
                <div style={{fontSize: '14px', color: '#075985', lineHeight: '1.6'}}>
                  • Base Score: 100 points<br/>
                  • Direct Connection (1-hop): -30 × risk_level points<br/>
                  • 2-Hop Connection: -15 × risk_level points<br/>
                  • Threshold: Score ≥ 60 = PROCEED, &lt; 60 = ESCALATE
                </div>
              </div>
            </div>
          </div>

          {/* Risk Factors */}
          {result.risk_factors && Array.isArray(result.risk_factors) && result.risk_factors.length > 0 && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.title}>Risk Factors Detected</h3>
                <p style={styles.subtitle}>{result.risk_factors.length} connection{result.risk_factors.length !== 1 ? 's' : ''} to risk clusters found</p>
              </div>
              <div style={styles.cardBody}>
                {result.risk_factors.map((factor, idx) => (
                  <div key={idx} style={{
                    backgroundColor: '#fef2f2',
                    border: '2px solid #fecaca',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '12px',
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px'}}>
                      <div style={{fontWeight: '600', color: '#991b1b', fontSize: '16px'}}>
                        {factor.type}
                      </div>
                      <div style={{
                        padding: '4px 12px',
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                      }}>
                        {factor.score_impact} points
                      </div>
                    </div>
                    <div style={{fontSize: '14px', color: '#7f1d1d', marginBottom: '8px'}}>
                      {factor.description}
                    </div>
                    <div style={{display: 'flex', gap: '16px', fontSize: '12px', color: '#991b1b'}}>
                      <span><strong>Hops:</strong> {factor.hops}</span>
                      <span><strong>Risk Level:</strong> {factor.risk_level}/3</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Graph Visualization */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.title}>Graph Traversal Visualization</h3>
              <p style={styles.subtitle}>Visual representation of connections to risk clusters</p>
            </div>
            <div style={styles.cardBody}>
              <div style={{
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#f9fafb',
                overflow: 'hidden',
              }}>
                <svg ref={svgRef}></svg>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
                marginTop: '16px',
                fontSize: '13px',
                color: '#6b7280',
              }}>
                <span><span style={{color: '#2563eb', fontSize: '20px'}}>●</span> Target Node</span>
                <span><span style={{color: '#f59e0b', fontSize: '20px'}}>●</span> 1-Hop</span>
                <span><span style={{color: '#6b7280', fontSize: '20px'}}>●</span> 2-Hop</span>
                <span><span style={{color: '#dc2626', fontSize: '20px'}}>●</span> Risk Cluster</span>
              </div>
            </div>
          </div>

          {/* Gremlin Query */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.title}>Neptune Gremlin Query</h3>
              <p style={styles.subtitle}>Graph traversal query executed on Neptune</p>
            </div>
            <div style={styles.cardBody}>
              <button
                onClick={() => setShowQuery(!showQuery)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '12px',
                }}
              >
                {showQuery ? '▼ Hide Query' : '▶ Show Query'}
              </button>
              
              {showQuery && (
                <div style={{
                  backgroundColor: '#1f2937',
                  color: '#10b981',
                  borderRadius: '8px',
                  padding: '16px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  overflow: 'auto',
                  lineHeight: '1.6',
                }}>
                  <pre style={{margin: 0, whiteSpace: 'pre-wrap'}}>
                    {result.gremlin_query}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* AWS Services Highlight */}
          <div style={{...styles.card, background: 'linear-gradient(to right, #d1fae5, #a7f3d0)', borderColor: '#a7f3d0'}}>
            <div style={styles.cardBody}>
              <h3 style={{...styles.title, marginBottom: '12px'}}>🗄️ Powered by Amazon Neptune</h3>
              <p style={{fontSize: '14px', color: '#065f46', marginBottom: '16px', lineHeight: '1.6'}}>
                Amazon Neptune is a fully managed graph database that makes it easy to build and run applications that work with highly connected datasets. 
                Neptune supports Gremlin for graph traversal queries to analyze complex relationships.
              </p>
              <div style={styles.grid3}>
                <div style={{backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px'}}>
                  <div style={{fontSize: '12px', color: '#047857', marginBottom: '4px'}}>Query Engine</div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: '#065f46'}}>Gremlin</div>
                </div>
                <div style={{backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px'}}>
                  <div style={{fontSize: '12px', color: '#047857', marginBottom: '4px'}}>Query Latency</div>
                  <div style={{fontSize: '14px', fontWeight: '600', color: '#065f46'}}>{result.latency_ms}ms</div>
                </div>
                <div style={{backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px'}}>
                  <div style={{fontSize: '12px', color: '#047857', marginBottom: '4px'}}>Documentation</div>
                  <a 
                    href="https://docs.aws.amazon.com/neptune/" 
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
              <p style={styles.subtitle}>Trust score calculation logged for compliance</p>
            </div>
            <div style={styles.cardBody}>
              <div style={{backgroundColor: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '20px'}}>
                <div style={{fontSize: '16px', fontWeight: '600', color: '#065f46', marginBottom: '16px'}}>
                  ✓ Trust Score Logged to DynamoDB
                </div>
                <div style={styles.grid3}>
                  <div style={{backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px'}}>
                    <div style={{fontSize: '12px', color: '#047857', marginBottom: '4px'}}>Score ID</div>
                    <div style={{fontSize: '11px', fontFamily: 'monospace', color: '#065f46', wordBreak: 'break-all'}}>
                      {result.score_id}
                    </div>
                  </div>
                  <div style={{backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px'}}>
                    <div style={{fontSize: '12px', color: '#047857', marginBottom: '4px'}}>Timestamp</div>
                    <div style={{fontSize: '12px', fontWeight: '500', color: '#065f46'}}>
                      {new Date(result.timestamp * 1000).toLocaleString()}
                    </div>
                  </div>
                  <div style={{backgroundColor: '#ffffff', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '12px'}}>
                    <div style={{fontSize: '12px', color: '#047857', marginBottom: '4px'}}>Event Type</div>
                    <div style={{fontSize: '12px', fontWeight: '600', color: '#065f46'}}>TRUST_SCORE_CALCULATED</div>
                  </div>
                </div>
                <p style={{fontSize: '13px', color: '#047857', margin: '12px 0 0 0', lineHeight: '1.5'}}>
                  All trust score calculations are logged with complete graph traversal details for audit and compliance review.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

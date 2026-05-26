import React, { useState } from 'react';

interface RequestDetails {
  method: string;
  endpoint: string;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

interface ResponseDetails {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  latency: number;
}

interface RequestResponsePair {
  id: string;
  request: RequestDetails;
  response?: ResponseDetails;
  service: string;
}

interface RequestResponseInspectorProps {
  requests: RequestResponsePair[];
}

export const RequestResponseInspector: React.FC<RequestResponseInspectorProps> = ({
  requests
}) => {
  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    requests[requests.length - 1]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request');

  const selectedRequest = requests.find(r => r.id === selectedRequestId);

  const formatJSON = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const getStatusColor = (status?: number): string => {
    if (!status) return '#6b7280';
    if (status >= 200 && status < 300) return '#059669'; // Green
    if (status >= 300 && status < 400) return '#2563eb'; // Blue
    if (status >= 400 && status < 500) return '#ea580c'; // Orange
    return '#dc2626'; // Red
  };

  const getLatencyColor = (latency: number): string => {
    if (latency < 100) return '#059669'; // Green
    if (latency < 500) return '#ea580c'; // Orange
    return '#dc2626'; // Red
  };

  if (requests.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#9ca3af',
        backgroundColor: '#1f2937'
      }}>
        No requests captured yet
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#1f2937'
    }}>
      {/* Request List */}
      <div style={{
        padding: '8px',
        borderBottom: '1px solid #374151',
        maxHeight: '150px',
        overflowY: 'auto',
        backgroundColor: '#111827'
      }}>
        {requests.map(req => (
          <div
            key={req.id}
            onClick={() => setSelectedRequestId(req.id)}
            style={{
              padding: '8px',
              marginBottom: '4px',
              backgroundColor: selectedRequestId === req.id ? '#374151' : '#1f2937',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px'
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  fontWeight: 'bold',
                  color: '#2563eb'
                }}>
                  {req.request.method}
                </span>
                <span style={{ color: '#9ca3af' }}>{req.service}</span>
              </div>
              {req.response && (
                <span style={{
                  fontSize: '11px',
                  color: getStatusColor(req.response.status)
                }}>
                  {req.response.status}
                </span>
              )}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#6b7280',
              marginTop: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {req.request.endpoint}
            </div>
          </div>
        ))}
      </div>

      {/* Request/Response Tabs */}
      {selectedRequest && (
        <>
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '8px',
            borderBottom: '1px solid #374151',
            backgroundColor: '#111827'
          }}>
            <button
              onClick={() => setActiveTab('request')}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: activeTab === 'request' ? '#374151' : 'transparent',
                color: activeTab === 'request' ? '#f9fafb' : '#9ca3af',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === 'request' ? '600' : '400'
              }}
            >
              Request
            </button>
            <button
              onClick={() => setActiveTab('response')}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: activeTab === 'response' ? '#374151' : 'transparent',
                color: activeTab === 'response' ? '#f9fafb' : '#9ca3af',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === 'response' ? '600' : '400'
              }}
            >
              Response
              {selectedRequest.response && (
                <span style={{
                  marginLeft: '6px',
                  fontSize: '11px',
                  color: getLatencyColor(selectedRequest.response.latency)
                }}>
                  ({selectedRequest.response.latency}ms)
                </span>
              )}
            </button>
          </div>

          {/* Content Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            fontFamily: 'monospace',
            fontSize: '12px',
            backgroundColor: '#111827'
          }}>
            {activeTab === 'request' ? (
              <div>
                {/* Request Method and Endpoint */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
                    METHOD & ENDPOINT
                  </div>
                  <div style={{ color: '#f9fafb' }}>
                    <span style={{ color: '#2563eb', fontWeight: 'bold' }}>
                      {selectedRequest.request.method}
                    </span>
                    {' '}
                    {selectedRequest.request.endpoint}
                  </div>
                </div>

                {/* Request Headers */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
                    HEADERS
                  </div>
                  <div style={{
                    backgroundColor: '#1f2937',
                    padding: '8px',
                    borderRadius: '4px',
                    color: '#f9fafb'
                  }}>
                    {Object.entries(selectedRequest.request.headers).map(([key, value]) => (
                      <div key={key} style={{ marginBottom: '4px' }}>
                        <span style={{ color: '#9ca3af' }}>{key}:</span>{' '}
                        <span>{value === '[REDACTED]' ? 
                          <span style={{ color: '#dc2626' }}>[REDACTED]</span> : 
                          value
                        }</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Request Body */}
                <div>
                  <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
                    BODY
                  </div>
                  <pre style={{
                    backgroundColor: '#1f2937',
                    padding: '8px',
                    borderRadius: '4px',
                    color: '#f9fafb',
                    overflow: 'auto',
                    margin: 0
                  }}>
                    {formatJSON(selectedRequest.request.body)}
                  </pre>
                </div>

                {/* Timestamp */}
                <div style={{ marginTop: '16px', fontSize: '11px', color: '#6b7280' }}>
                  Sent at: {new Date(selectedRequest.request.timestamp).toLocaleString()}
                </div>
              </div>
            ) : (
              <div>
                {selectedRequest.response ? (
                  <>
                    {/* Response Status */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
                        STATUS
                      </div>
                      <div style={{
                        color: getStatusColor(selectedRequest.response.status),
                        fontWeight: 'bold'
                      }}>
                        {selectedRequest.response.status} {selectedRequest.response.statusText}
                      </div>
                    </div>

                    {/* Response Headers */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
                        HEADERS
                      </div>
                      <div style={{
                        backgroundColor: '#1f2937',
                        padding: '8px',
                        borderRadius: '4px',
                        color: '#f9fafb'
                      }}>
                        {Object.entries(selectedRequest.response.headers).map(([key, value]) => (
                          <div key={key} style={{ marginBottom: '4px' }}>
                            <span style={{ color: '#9ca3af' }}>{key}:</span> {value}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Response Body */}
                    <div>
                      <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
                        BODY
                      </div>
                      <pre style={{
                        backgroundColor: '#1f2937',
                        padding: '8px',
                        borderRadius: '4px',
                        color: '#f9fafb',
                        overflow: 'auto',
                        margin: 0
                      }}>
                        {formatJSON(selectedRequest.response.body)}
                      </pre>
                    </div>

                    {/* Latency */}
                    <div style={{
                      marginTop: '16px',
                      fontSize: '11px',
                      color: getLatencyColor(selectedRequest.response.latency)
                    }}>
                      Latency: {selectedRequest.response.latency}ms
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#9ca3af', textAlign: 'center', marginTop: '20px' }}>
                    Waiting for response...
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

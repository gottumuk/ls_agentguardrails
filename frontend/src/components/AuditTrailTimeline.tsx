import React from 'react';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { AuditTrailEntry } from '../types';

export const AuditTrailTimeline: React.FC = () => {
  const { auditTrail } = useWebSocketContext();

  const getEventIcon = (eventType: string): string => {
    switch (eventType.toUpperCase()) {
      case 'TACT_EVALUATION':
      case 'EVALUATED':
        return '🎯';
      case 'GUARDRAILS_QUERY':
      case 'QUERIED':
        return '🛡️';
      case 'TRUST_SCORE':
      case 'SCORED':
        return '📊';
      case 'APPROVAL_REQUESTED':
        return '⏸️';
      case 'APPROVED':
        return '✅';
      case 'DENIED':
        return '❌';
      case 'TIMEOUT':
        return '⏱️';
      case 'ERROR':
        return '⚠️';
      default:
        return '📝';
    }
  };

  const getEventColor = (eventType: string): string => {
    switch (eventType.toUpperCase()) {
      case 'APPROVED':
        return '#16a34a';
      case 'DENIED':
      case 'ERROR':
        return '#dc2626';
      case 'TIMEOUT':
        return '#ea580c';
      case 'APPROVAL_REQUESTED':
        return '#eab308';
      default:
        return '#2563eb';
    }
  };

  const formatEventData = (entry: AuditTrailEntry): string => {
    if (typeof entry.event_data === 'string') {
      return entry.event_data;
    }
    
    // Format based on event type
    switch (entry.event_type.toUpperCase()) {
      case 'TACT_EVALUATION':
      case 'EVALUATED':
        return entry.event_data?.trust_spectrum || 'Evaluation completed';
      case 'GUARDRAILS_QUERY':
      case 'QUERIED':
        return `${entry.event_data?.fields_redacted?.length || 0} fields redacted`;
      case 'TRUST_SCORE':
      case 'SCORED':
        return `Score: ${entry.event_data?.trust_score || 'N/A'} - ${entry.event_data?.verdict || 'N/A'}`;
      case 'APPROVED':
      case 'DENIED':
        return entry.event_data?.reviewer_identity || 'Decision recorded';
      default:
        return JSON.stringify(entry.event_data).slice(0, 50);
    }
  };

  if (auditTrail.length === 0) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#6b7280',
        backgroundColor: '#f9fafb',
        borderRadius: '6px'
      }}>
        No audit trail entries yet
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>
        Audit Trail Timeline
      </h3>
      
      <div style={{
        maxHeight: '400px',
        overflowY: 'auto',
        position: 'relative'
      }}>
        {/* Timeline line */}
        <div style={{
          position: 'absolute',
          left: '20px',
          top: '0',
          bottom: '0',
          width: '2px',
          backgroundColor: '#e5e7eb'
        }} />

        {/* Timeline entries */}
        {auditTrail.map((entry) => (
          <div
            key={entry.event_id}
            style={{
              position: 'relative',
              paddingLeft: '48px',
              paddingBottom: '24px'
            }}
          >
            {/* Timeline dot */}
            <div style={{
              position: 'absolute',
              left: '12px',
              top: '4px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: getEventColor(entry.event_type),
              border: '3px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              zIndex: 1
            }}>
              {getEventIcon(entry.event_type)}
            </div>

            {/* Entry content */}
            <div style={{
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px'
              }}>
                <span style={{
                  fontWeight: '600',
                  color: getEventColor(entry.event_type),
                  fontSize: '14px'
                }}>
                  {entry.event_type}
                </span>
                <span style={{
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
              
              <div style={{
                fontSize: '13px',
                color: '#374151',
                marginBottom: '4px'
              }}>
                Demo {entry.demo_id} - {entry.industry_context}
              </div>
              
              <div style={{
                fontSize: '12px',
                color: '#6b7280'
              }}>
                {formatEventData(entry)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

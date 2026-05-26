import React from 'react';
import { useWebSocketContext } from '../contexts/WebSocketContext';

export const VoteDisplay: React.FC = () => {
  const { voteCount } = useWebSocketContext();
  
  const total = voteCount.approve + voteCount.deny;
  const approvePercent = total > 0 ? (voteCount.approve / total) * 100 : 0;
  const denyPercent = total > 0 ? (voteCount.deny / total) * 100 : 0;

  if (total === 0) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: '#f9fafb',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        Waiting for audience votes...
      </div>
    );
  }

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f9fafb',
      border: '1px solid #d1d5db',
      borderRadius: '6px'
    }}>
      <h4 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>
        Audience Votes
      </h4>
      
      {/* Approve */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '6px',
          fontSize: '14px'
        }}>
          <span style={{ fontWeight: '500', color: '#15803d' }}>Approve</span>
          <span style={{ fontWeight: 'bold' }}>
            {voteCount.approve} votes ({approvePercent.toFixed(0)}%)
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '24px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${approvePercent}%`,
            height: '100%',
            backgroundColor: '#16a34a',
            transition: 'width 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {approvePercent > 10 && '✓'}
          </div>
        </div>
      </div>

      {/* Deny */}
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '6px',
          fontSize: '14px'
        }}>
          <span style={{ fontWeight: '500', color: '#991b1b' }}>Deny</span>
          <span style={{ fontWeight: 'bold' }}>
            {voteCount.deny} votes ({denyPercent.toFixed(0)}%)
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '24px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${denyPercent}%`,
            height: '100%',
            backgroundColor: '#dc2626',
            transition: 'width 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {denyPercent > 10 && '✗'}
          </div>
        </div>
      </div>

      {/* Total */}
      <div style={{
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #d1d5db',
        textAlign: 'center',
        fontSize: '13px',
        color: '#6b7280'
      }}>
        Total votes: {total}
      </div>
    </div>
  );
};

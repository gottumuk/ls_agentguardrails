import React from 'react';
import { useWebSocketContext } from '../contexts/WebSocketContext';

export const WebSocketStatus: React.FC = () => {
  const { isConnected, connectionError, reconnect, reconnectAttempts } = useWebSocketContext();

  if (isConnected) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        backgroundColor: '#dcfce7',
        border: '1px solid #16a34a',
        borderRadius: '6px',
        fontSize: '13px',
        color: '#15803d'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#16a34a',
          animation: 'pulse 2s infinite'
        }} />
        <span>Connected</span>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        backgroundColor: '#fef2f2',
        border: '1px solid #dc2626',
        borderRadius: '6px',
        fontSize: '13px',
        color: '#991b1b'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#dc2626'
        }} />
        <span>{connectionError}</span>
        <button
          onClick={reconnect}
          style={{
            marginLeft: '8px',
            padding: '4px 8px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      backgroundColor: '#fef3c7',
      border: '1px solid #eab308',
      borderRadius: '6px',
      fontSize: '13px',
      color: '#854d0e'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#eab308',
        animation: 'pulse 1s infinite'
      }} />
      <span>Connecting... (attempt {reconnectAttempts + 1}/5)</span>
    </div>
  );
};

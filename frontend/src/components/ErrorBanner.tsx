import React from 'react';
import { useWebSocketContext } from '../contexts/WebSocketContext';

export const ErrorBanner: React.FC = () => {
  const { errorMessage, clearError } = useWebSocketContext();

  if (!errorMessage) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      maxWidth: '600px',
      width: '90%',
      padding: '16px 20px',
      backgroundColor: '#fef2f2',
      border: '2px solid #dc2626',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: 'slideDown 0.3s ease-out'
    }}>
      <div style={{
        fontSize: '24px',
        color: '#dc2626'
      }}>
        ⚠️
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontWeight: 'bold',
          color: '#991b1b',
          marginBottom: '4px'
        }}>
          Error
        </div>
        <div style={{
          color: '#7f1d1d',
          fontSize: '14px'
        }}>
          {errorMessage}
        </div>
      </div>
      <button
        onClick={clearError}
        style={{
          padding: '6px 12px',
          backgroundColor: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500'
        }}
      >
        Dismiss
      </button>
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';

interface LogEvent {
  timestamp: number;
  message: string;
  log_stream: string;
  level?: string;
  execution_id?: string;
  lambda_name?: string;
}

interface LogViewerProps {
  logs: LogEvent[];
  onClear: () => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, onClear }) => {
  const [filterLambda, setFilterLambda] = useState<string>('');
  const [filterExecutionId, setFilterExecutionId] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest log entry
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getLevelColor = (level?: string): string => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
        return '#dc2626'; // Red
      case 'WARN':
      case 'WARNING':
        return '#ea580c'; // Orange
      case 'INFO':
        return '#2563eb'; // Blue
      case 'DEBUG':
        return '#059669'; // Green
      default:
        return '#6b7280'; // Gray
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterLambda && !log.lambda_name?.toLowerCase().includes(filterLambda.toLowerCase())) {
      return false;
    }
    if (filterExecutionId && !log.execution_id?.toLowerCase().includes(filterExecutionId.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Extract unique Lambda names for filter dropdown
  const uniqueLambdaNames = Array.from(new Set(logs.map(log => log.lambda_name).filter(Boolean)));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#1f2937'
    }}>
      {/* Filter Controls */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #374151',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={filterLambda}
            onChange={(e) => setFilterLambda(e.target.value)}
            style={{
              flex: 1,
              padding: '6px 8px',
              backgroundColor: '#374151',
              color: '#f9fafb',
              border: '1px solid #4b5563',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="">All Functions</option>
            {uniqueLambdaNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#9ca3af',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
        </div>
        <input
          type="text"
          placeholder="Filter by Execution ID..."
          value={filterExecutionId}
          onChange={(e) => setFilterExecutionId(e.target.value)}
          style={{
            padding: '6px 8px',
            backgroundColor: '#374151',
            color: '#f9fafb',
            border: '1px solid #4b5563',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        />
      </div>

      {/* Logs Display */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        fontFamily: 'monospace',
        fontSize: '12px',
        backgroundColor: '#111827'
      }}>
        {filteredLogs.length === 0 ? (
          <div style={{ color: '#9ca3af', textAlign: 'center', marginTop: '20px' }}>
            {logs.length === 0 ? 'No logs yet' : 'No logs match the current filters'}
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '1px solid #1f2937'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <div style={{ color: '#9ca3af', fontSize: '10px' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                  {log.lambda_name && (
                    <span style={{ marginLeft: '8px', color: '#6b7280' }}>
                      [{log.lambda_name}]
                    </span>
                  )}
                </div>
                {log.level && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: getLevelColor(log.level),
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: 'rgba(0,0,0,0.3)'
                    }}
                  >
                    {log.level.toUpperCase()}
                  </span>
                )}
              </div>
              <div style={{
                color: getLevelColor(log.level),
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {log.message}
              </div>
              {log.execution_id && (
                <div style={{
                  fontSize: '10px',
                  color: '#6b7280',
                  marginTop: '4px'
                }}>
                  Execution: {log.execution_id}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Action Buttons */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid #374151',
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={onClear}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500'
          }}
        >
          Clear Logs
        </button>
        <button
          onClick={() => {
            setFilterLambda('');
            setFilterExecutionId('');
          }}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500'
          }}
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
};

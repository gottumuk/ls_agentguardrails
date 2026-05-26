import React, { useCallback } from 'react';
import { LogViewer } from './LogViewer';
import { useWebSocketContext } from '../../contexts/WebSocketContext';

/**
 * Container component that connects LogViewer to WebSocket context
 * Receives real-time log events via WebSocket and displays them
 */
export const LogViewerContainer: React.FC = () => {
  const { logs } = useWebSocketContext();

  // Convert WebSocket log format to LogViewer format
  const formattedLogs = logs.map(log => ({
    timestamp: log.timestamp,
    message: log.message,
    log_stream: log.source,
    level: log.level,
    lambda_name: log.source,
    execution_id: undefined // Can be extracted from message if needed
  }));

  const handleClear = useCallback(() => {
    // In a real implementation, this would clear logs from the context
    // For now, we'll just log the action
    console.log('Clear logs requested');
  }, []);

  return <LogViewer logs={formattedLogs} onClear={handleClear} />;
};

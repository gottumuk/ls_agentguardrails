import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { config } from '../config';
import { LogViewer } from './observability/LogViewer';
import { CodeDisplay } from './observability/CodeDisplay';
import { RequestResponseInspector } from './observability/RequestResponseInspector';
import { AWSConsoleLinks } from './observability/AWSConsoleLinks';
import { LayoutManager, ResizablePanel, LayoutMode } from './observability/LayoutManager';

interface LogEvent {
  timestamp: number;
  message: string;
  log_stream: string;
  level?: string;
  execution_id?: string;
  lambda_name?: string;
}

interface CodeFile {
  path: string;
  content: string;
  language: string;
  highlightLine?: number;
}

interface RequestResponsePair {
  id: string;
  request: {
    method: string;
    endpoint: string;
    headers: Record<string, string>;
    body: any;
    timestamp: number;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
    latency: number;
  };
  service: string;
}

type TabType = 'logs' | 'code' | 'requests' | 'console';

export const ObservabilitySidebar: React.FC = () => {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [codeFiles, setCodeFiles] = useState<CodeFile[]>([]);
  const [requests, setRequests] = useState<RequestResponsePair[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('logs');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('demo-only');
  const [panelWidth, setPanelWidth] = useState(400);
  
  // AWS context for console links
  const [awsContext, setAwsContext] = useState({
    region: config.aws.region,
    executionArn: undefined as string | undefined,
    logGroup: undefined as string | undefined,
    tableName: undefined as string | undefined,
    neptuneClusterId: undefined as string | undefined,
    guardrailId: undefined as string | undefined
  });

  const { lastMessage, isConnected } = useWebSocket(config.api.websocketEndpoint);

  // Load layout preference from localStorage
  useEffect(() => {
    const savedLayout = localStorage.getItem('observability-layout') as LayoutMode;
    if (savedLayout) {
      setLayoutMode(savedLayout);
    }
    const savedWidth = localStorage.getItem('observability-width');
    if (savedWidth) {
      setPanelWidth(parseInt(savedWidth, 10));
    }
  }, []);

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.message_type) {
      case 'LOG_EVENT':
        const logEvent = lastMessage.payload as LogEvent;
        setLogs(prev => [...prev.slice(-99), logEvent]); // Keep last 100 logs
        break;

      default:
        // Handle other message types
        if ((lastMessage as any).type === 'CODE_UPDATE') {
          const codeUpdate = (lastMessage as any).payload as { files: CodeFile[] };
          setCodeFiles(codeUpdate.files);
        } else if ((lastMessage as any).type === 'REQUEST_SENT') {
          const newRequest = (lastMessage as any).payload as RequestResponsePair;
          setRequests(prev => [...prev, newRequest]);
        } else if ((lastMessage as any).type === 'RESPONSE_RECEIVED') {
          const responseUpdate = (lastMessage as any).payload as { id: string; response: any };
          setRequests(prev =>
            prev.map(req =>
              req.id === responseUpdate.id
                ? { ...req, response: responseUpdate.response }
                : req
            )
          );
        } else if ((lastMessage as any).type === 'AWS_CONTEXT_UPDATE') {
          const contextUpdate = (lastMessage as any).payload;
          setAwsContext(prev => ({ ...prev, ...contextUpdate }));
        }
        break;
    }
  }, [lastMessage]);

  const handleLayoutChange = (layout: LayoutMode) => {
    setLayoutMode(layout);
    localStorage.setItem('observability-layout', layout);
    
    // Auto-show sidebar for layouts that include observability
    if (layout !== 'demo-only') {
      setIsVisible(true);
    }
  };

  const handlePanelResize = (width: number) => {
    setPanelWidth(width);
    localStorage.setItem('observability-width', width.toString());
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          padding: '12px 8px',
          backgroundColor: '#1f2937',
          color: 'white',
          border: 'none',
          borderRadius: '6px 0 0 6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          zIndex: 1000
        }}
      >
        Observability
      </button>
    );
  }

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: 'logs', label: 'Logs', icon: '📝' },
    { id: 'code', label: 'Code', icon: '💻' },
    { id: 'requests', label: 'Requests', icon: '🔄' },
    { id: 'console', label: 'Console', icon: '🔗' }
  ];

  return (
    <ResizablePanel
      defaultWidth={panelWidth}
      minWidth={300}
      maxWidth={800}
      onResize={handlePanelResize}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1f2937',
        color: '#f9fafb'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #374151',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#111827'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Observability</h3>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Layout Manager */}
        <LayoutManager
          currentLayout={layoutMode}
          onLayoutChange={handleLayoutChange}
        />

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '8px',
          borderBottom: '1px solid #374151',
          backgroundColor: '#111827'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: activeTab === tab.id ? '#374151' : 'transparent',
                color: activeTab === tab.id ? '#f9fafb' : '#9ca3af',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeTab === tab.id ? '600' : '400',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, minHeight: 0 }}>
          {activeTab === 'logs' && (
            <LogViewer logs={logs} onClear={() => setLogs([])} />
          )}
          {activeTab === 'code' && (
            <CodeDisplay files={codeFiles} />
          )}
          {activeTab === 'requests' && (
            <RequestResponseInspector requests={requests} />
          )}
          {activeTab === 'console' && (
            <AWSConsoleLinks {...awsContext} />
          )}
        </div>
      </div>
    </ResizablePanel>
  );
};

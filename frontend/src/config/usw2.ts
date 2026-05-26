export const usw2Config = {
  environment: 'usw2' as const,
  
  api: {
    restEndpoint: 'https://iocyexud6a.execute-api.us-east-2.amazonaws.com/staging',
    websocketEndpoint: 'wss://3yl76r4fjf.execute-api.us-east-2.amazonaws.com/staging',
    apiKey: '',
  },
  
  aws: {
    region: 'us-east-2',
    identityPoolId: 'us-west-2:ee2e1325-20f7-4df6-b666-cc9610676514',
    
    cloudwatch: {
      logGroupPrefix: '/aws/lambda/',
      pollingIntervalMs: 1000,
      maxLogEvents: 50,
    },
    
    dynamodb: {
      auditTrailTable: 'aws-agent-governance-demos-usw2-AuditTrail',
      sensitiveRecordsTable: 'aws-agent-governance-demos-usw2-SensitiveRecords',
      workflowStateTable: 'aws-agent-governance-demos-usw2-WorkflowState',
    },
  },
  
  rateLimit: {
    requestsPerMinute: 100,
    burstLimit: 200,
  },
  
  logging: {
    level: 'INFO' as const,
    enableConsole: true,
    enableCloudWatch: false,
  },
  
  features: {
    enableTwitchIntegration: false,
    enableAudienceVoting: true,
    enableCustomInput: true,
    enableObservabilitySidebar: true,
    enableMultiScreenLayout: true,
  },
  
  demo: {
    tact: {
      timeoutMs: 10000,
      bedrockModel: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      temperature: 0.0,
      maxTokens: 1000,
    },
    
    guardrails: {
      timeoutMs: 10000,
      latencyWarningThresholdMs: 100,
      latencyErrorThresholdMs: 500,
    },
    
    neptune: {
      timeoutMs: 10000,
      trustScoreThreshold: 60,
      maxTraversalHops: 2,
    },
    
    approval: {
      timeoutMs: 900000,
      votingDurationMs: 60000,
      countdownWarningThresholds: [300000, 60000],
    },
  },
  
  websocket: {
    reconnectAttempts: 5,
    reconnectDelayMs: 1000,
    reconnectBackoffMultiplier: 2,
    pingIntervalMs: 30000,
    connectionTimeoutMs: 10000,
  },
  
  ui: {
    contextSwitchDelayMs: 500,
    visualizationUpdateDelayMs: 200,
    autoScrollLogs: true,
    syntaxHighlighting: true,
  },
};

export type EnvironmentConfig = typeof usw2Config;

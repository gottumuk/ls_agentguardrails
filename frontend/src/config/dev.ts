/**
 * Development Environment Configuration
 * 
 * This configuration is used for local development and testing.
 * Features higher rate limits, verbose logging, and relaxed security settings.
 */

export const devConfig = {
  // Environment identifier
  environment: 'dev' as const,
  
  // API Gateway endpoints
  api: {
    restEndpoint: process.env.VITE_API_ENDPOINT || 'https://api-dev.aws-governance-demos.example.com',
    websocketEndpoint: process.env.VITE_WS_ENDPOINT || 'wss://ws-dev.aws-governance-demos.example.com',
    apiKey: process.env.VITE_API_KEY || '',
  },
  
  // AWS Service Configuration
  aws: {
    region: process.env.VITE_AWS_REGION || 'us-east-1',
    
    // Cognito Identity Pool for unauthenticated access
    identityPoolId: process.env.VITE_IDENTITY_POOL_ID || '',
    
    // CloudWatch Logs
    cloudwatch: {
      logGroupPrefix: '/aws/lambda/',
      pollingIntervalMs: 500,
      maxLogEvents: 100,
    },
    
    // DynamoDB
    dynamodb: {
      auditTrailTable: 'AuditTrailTable-dev',
      sensitiveRecordsTable: 'SensitiveRecordsTable-dev',
      workflowStateTable: 'WorkflowStateTable-dev',
    },
    
    // Neptune
    neptune: {
      endpoint: process.env.VITE_NEPTUNE_ENDPOINT || '',
      port: 8182,
    },
    
    // Step Functions
    stepFunctions: {
      approvalStateMachineArn: process.env.VITE_APPROVAL_STATE_MACHINE_ARN || '',
    },
  },
  
  // Rate limiting
  rateLimit: {
    requestsPerMinute: 1000,
    burstLimit: 2000,
  },
  
  // Logging configuration
  logging: {
    level: 'DEBUG' as const,
    enableConsole: true,
    enableCloudWatch: true,
  },
  
  // Feature flags
  features: {
    enableTwitchIntegration: false,
    enableAudienceVoting: true,
    enableCustomInput: true,
    enableObservabilitySidebar: true,
    enableMultiScreenLayout: true,
  },
  
  // Demo configuration
  demo: {
    // TACT Engine (Demo 1)
    tact: {
      timeoutMs: 10000,
      bedrockModel: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      temperature: 0.0,
      maxTokens: 1000,
    },
    
    // Guardrails (Demo 2)
    guardrails: {
      timeoutMs: 10000,
      latencyWarningThresholdMs: 100,
      latencyErrorThresholdMs: 500,
    },
    
    // Neptune Trust Graph (Demo 3)
    neptune: {
      timeoutMs: 10000,
      trustScoreThreshold: 60,
      maxTraversalHops: 2,
    },
    
    // Approval Workflow (Demo 4)
    approval: {
      timeoutMs: 900000, // 15 minutes
      votingDurationMs: 60000, // 1 minute
      countdownWarningThresholds: [300000, 60000], // 5 min, 1 min
    },
  },
  
  // WebSocket configuration
  websocket: {
    reconnectAttempts: 5,
    reconnectDelayMs: 1000,
    reconnectBackoffMultiplier: 2,
    pingIntervalMs: 30000,
    connectionTimeoutMs: 10000,
  },
  
  // UI configuration
  ui: {
    contextSwitchDelayMs: 500,
    visualizationUpdateDelayMs: 200,
    autoScrollLogs: true,
    syntaxHighlighting: true,
  },
  
  // CloudFront distribution (if using CDN)
  cdn: {
    enabled: false,
    distributionDomain: '',
  },
};

export type EnvironmentConfig = typeof devConfig;

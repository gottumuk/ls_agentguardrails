/**
 * Staging Environment Configuration
 * 
 * This configuration is used for pre-production testing and validation.
 * Features production-like settings with moderate logging and security.
 */

export const stagingConfig = {
  // Environment identifier
  environment: 'staging' as const,
  
  // API Gateway endpoints
  api: {
    restEndpoint: 'https://3p8midjge2.execute-api.us-west-2.amazonaws.com/staging',
    websocketEndpoint: 'wss://9vxbth7hj2.execute-api.us-west-2.amazonaws.com/staging',
    apiKey: '',
  },
  
  // AWS Service Configuration
  aws: {
    region: 'us-west-2',
    
    // Cognito Identity Pool for unauthenticated access
    identityPoolId: '',
    
    // CloudWatch Logs
    cloudwatch: {
      logGroupPrefix: '/aws/lambda/',
      pollingIntervalMs: 1000,
      maxLogEvents: 50,
    },
    
    // DynamoDB
    dynamodb: {
      auditTrailTable: 'AuditTrailTable-staging',
      sensitiveRecordsTable: 'SensitiveRecordsTable-staging',
      workflowStateTable: 'WorkflowStateTable-staging',
    },
    
    // Neptune
    neptune: {
      endpoint: '',
      port: 8182,
    },
    
    // Step Functions
    stepFunctions: {
      approvalStateMachineArn: '',
    },
  },
  
  // Rate limiting
  rateLimit: {
    requestsPerMinute: 100,
    burstLimit: 200,
  },
  
  // Logging configuration
  logging: {
    level: 'INFO' as const,
    enableConsole: true,
    enableCloudWatch: true,
  },
  
  // Feature flags
  features: {
    enableTwitchIntegration: true,
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
    enabled: true,
    distributionDomain: 'staging.aws-governance-demos.example.com',
  },
};

export type EnvironmentConfig = typeof stagingConfig;

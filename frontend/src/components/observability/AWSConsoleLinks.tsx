import React from 'react';
import { config } from '../../config';

interface AWSConsoleLinksProps {
  region?: string;
  executionArn?: string;
  logGroup?: string;
  tableName?: string;
  neptuneClusterId?: string;
  guardrailId?: string;
}

export const AWSConsoleLinks: React.FC<AWSConsoleLinksProps> = ({
  region = config.aws.region,
  executionArn,
  logGroup,
  tableName,
  neptuneClusterId,
  guardrailId
}) => {
  const generateBedrockLink = (): string => {
    return `https://${region}.console.aws.amazon.com/bedrock/home?region=${region}#/overview`;
  };

  const generateBedrockGuardrailsLink = (guardrailId?: string): string => {
    if (guardrailId) {
      return `https://${region}.console.aws.amazon.com/bedrock/home?region=${region}#/guardrails/${guardrailId}`;
    }
    return `https://${region}.console.aws.amazon.com/bedrock/home?region=${region}#/guardrails`;
  };

  const generateNeptuneLink = (clusterId?: string): string => {
    if (clusterId) {
      return `https://${region}.console.aws.amazon.com/neptune/home?region=${region}#database-details/${clusterId}`;
    }
    return `https://${region}.console.aws.amazon.com/neptune/home?region=${region}#databases`;
  };

  const generateStepFunctionsLink = (arn?: string): string => {
    if (arn) {
      return `https://${region}.console.aws.amazon.com/states/home?region=${region}#/v2/executions/details/${encodeURIComponent(arn)}`;
    }
    return `https://${region}.console.aws.amazon.com/states/home?region=${region}#/statemachines`;
  };

  const generateDynamoDBLink = (table?: string): string => {
    if (table) {
      return `https://${region}.console.aws.amazon.com/dynamodbv2/home?region=${region}#table?name=${table}`;
    }
    return `https://${region}.console.aws.amazon.com/dynamodbv2/home?region=${region}#tables`;
  };

  const generateCloudWatchLink = (group?: string): string => {
    if (group) {
      return `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${encodeURIComponent(group)}`;
    }
    return `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups`;
  };

  const generateCloudTrailLink = (): string => {
    return `https://${region}.console.aws.amazon.com/cloudtrail/home?region=${region}#/events`;
  };

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const linkButtonStyle = (hasContext: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    backgroundColor: hasContext ? '#374151' : '#1f2937',
    color: hasContext ? '#f9fafb' : '#9ca3af',
    border: '1px solid #4b5563',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s',
    textAlign: 'left',
    width: '100%'
  });

  const iconStyle: React.CSSProperties = {
    fontSize: '16px',
    marginRight: '8px'
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '12px',
      backgroundColor: '#1f2937',
      height: '100%',
      overflowY: 'auto'
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#f9fafb',
        marginBottom: '8px'
      }}>
        AWS Console Links
      </div>

      {/* Bedrock */}
      <button
        onClick={() => openLink(generateBedrockLink())}
        style={linkButtonStyle(false)}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={iconStyle}>🤖</span>
          <span>Amazon Bedrock</span>
        </div>
        <span style={{ fontSize: '18px' }}>→</span>
      </button>

      {/* Bedrock Guardrails */}
      <button
        onClick={() => openLink(generateBedrockGuardrailsLink(guardrailId))}
        style={linkButtonStyle(!!guardrailId)}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={iconStyle}>🛡️</span>
          <div>
            <div>Bedrock Guardrails</div>
            {guardrailId && (
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                {guardrailId}
              </div>
            )}
          </div>
        </div>
        <span style={{ fontSize: '18px' }}>→</span>
      </button>

      {/* Neptune */}
      <button
        onClick={() => openLink(generateNeptuneLink(neptuneClusterId))}
        style={linkButtonStyle(!!neptuneClusterId)}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={iconStyle}>🔵</span>
          <div>
            <div>Amazon Neptune</div>
            {neptuneClusterId && (
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                {neptuneClusterId}
              </div>
            )}
          </div>
        </div>
        <span style={{ fontSize: '18px' }}>→</span>
      </button>

      {/* Step Functions */}
      <button
        onClick={() => openLink(generateStepFunctionsLink(executionArn))}
        style={linkButtonStyle(!!executionArn)}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={iconStyle}>⚙️</span>
          <div>
            <div>AWS Step Functions</div>
            {executionArn && (
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                {executionArn.split(':').pop()}
              </div>
            )}
          </div>
        </div>
        <span style={{ fontSize: '18px' }}>→</span>
      </button>

      {/* DynamoDB */}
      <button
        onClick={() => openLink(generateDynamoDBLink(tableName))}
        style={linkButtonStyle(!!tableName)}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={iconStyle}>📊</span>
          <div>
            <div>Amazon DynamoDB</div>
            {tableName && (
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                {tableName}
              </div>
            )}
          </div>
        </div>
        <span style={{ fontSize: '18px' }}>→</span>
      </button>

      {/* CloudWatch Logs */}
      <button
        onClick={() => openLink(generateCloudWatchLink(logGroup))}
        style={linkButtonStyle(!!logGroup)}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={iconStyle}>📝</span>
          <div>
            <div>CloudWatch Logs</div>
            {logGroup && (
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                {logGroup}
              </div>
            )}
          </div>
        </div>
        <span style={{ fontSize: '18px' }}>→</span>
      </button>

      {/* CloudTrail */}
      <button
        onClick={() => openLink(generateCloudTrailLink())}
        style={linkButtonStyle(false)}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={iconStyle}>🔍</span>
          <span>AWS CloudTrail</span>
        </div>
        <span style={{ fontSize: '18px' }}>→</span>
      </button>

      <div style={{
        marginTop: '12px',
        padding: '8px',
        backgroundColor: '#111827',
        borderRadius: '4px',
        fontSize: '11px',
        color: '#6b7280'
      }}>
        <div style={{ marginBottom: '4px' }}>
          <strong style={{ color: '#9ca3af' }}>Region:</strong> {region}
        </div>
        <div style={{ fontSize: '10px', marginTop: '8px' }}>
          Links open in new tab to preserve demo state
        </div>
      </div>
    </div>
  );
};

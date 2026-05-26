/**
 * Demo-Specific Error Boundary Wrapper
 * 
 * Provides error boundaries for each demo component with custom reset handlers.
 * 
 * Requirements: 12.7
 */

import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { apiClient } from '../api/client';

interface DemoErrorBoundaryProps {
  children: ReactNode;
  demoId: number;
  demoName: string;
  industryContext: string;
}

export const DemoErrorBoundary: React.FC<DemoErrorBoundaryProps> = ({
  children,
  demoId,
  demoName,
  industryContext
}) => {
  const handleReset = async () => {
    try {
      // Call reset API for this specific demo
      await apiClient.resetDemo(`demo${demoId}`, industryContext as any);
      console.log(`Demo ${demoId} reset successfully`);
    } catch (error) {
      console.error(`Failed to reset demo ${demoId}:`, error);
      // Don't throw - let the error boundary handle display
    }
  };

  return (
    <ErrorBoundary demoName={demoName} onReset={handleReset}>
      {children}
    </ErrorBoundary>
  );
};

// Convenience wrappers for each demo

export const Demo1ErrorBoundary: React.FC<{ children: ReactNode; industryContext: string }> = ({
  children,
  industryContext
}) => (
  <DemoErrorBoundary
    demoId={1}
    demoName="Demo 1: TACT Decision Engine"
    industryContext={industryContext}
  >
    {children}
  </DemoErrorBoundary>
);

export const Demo2ErrorBoundary: React.FC<{ children: ReactNode; industryContext: string }> = ({
  children,
  industryContext
}) => (
  <DemoErrorBoundary
    demoId={2}
    demoName="Demo 2: Guardrails & Data Protection"
    industryContext={industryContext}
  >
    {children}
  </DemoErrorBoundary>
);

export const Demo3ErrorBoundary: React.FC<{ children: ReactNode; industryContext: string }> = ({
  children,
  industryContext
}) => (
  <DemoErrorBoundary
    demoId={3}
    demoName="Demo 3: Neptune Trust Graph"
    industryContext={industryContext}
  >
    {children}
  </DemoErrorBoundary>
);

export const Demo4ErrorBoundary: React.FC<{ children: ReactNode; industryContext: string }> = ({
  children,
  industryContext
}) => (
  <DemoErrorBoundary
    demoId={4}
    demoName="Demo 4: Human-in-the-Loop Approval"
    industryContext={industryContext}
  >
    {children}
  </DemoErrorBoundary>
);

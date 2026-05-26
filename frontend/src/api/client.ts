// API client for AWS Agent Governance Demos
import { IndustryType } from '../types';
import { config } from '../config';

const API_BASE_URL = config.api.restEndpoint;

export const apiClient = {
  async evaluateTACT(actionProposal: string, industryContext: IndustryType) {
    const response = await fetch(`${API_BASE_URL}/tact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_proposal: actionProposal, industry_context: industryContext })
    });
    
    if (!response.ok) {
      throw new Error(`TACT evaluation failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async queryGuardrails(recordId: string, industryContext: IndustryType) {
    const response = await fetch(`${API_BASE_URL}/guardrails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_id: recordId, industry_context: industryContext })
    });
    
    if (!response.ok) {
      throw new Error(`Guardrails query failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async calculateTrustScore(targetNodeId: string, industryContext: IndustryType) {
    const response = await fetch(`${API_BASE_URL}/neptune`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_node_id: targetNodeId, industry_context: industryContext })
    });
    
    if (!response.ok) {
      throw new Error(`Trust score calculation failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async startApprovalWorkflow(actionContext: any) {
    const response = await fetch(`${API_BASE_URL}/approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_context: actionContext })
    });
    
    if (!response.ok) {
      throw new Error(`Approval workflow start failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async getTaskToken(workflowId: string): Promise<{ task_token: string; status: string }> {
    const response = await fetch(`${API_BASE_URL}/approval/${workflowId}/token`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get task token: ${response.statusText}`);
    }
    
    return response.json();
  },

  async submitApprovalDecision(taskToken: string, decision: 'APPROVE' | 'DENY') {
    const response = await fetch(`${API_BASE_URL}/approval/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_token: taskToken, decision })
    });
    
    if (!response.ok) {
      throw new Error(`Approval decision submission failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  async submitVote(_workflowId: string, vote: 'APPROVE' | 'DENY') {
    // Voting is handled via WebSocket, not REST API
    // The component should use sendMessage directly instead of this function
    console.warn('submitVote should use WebSocket sendMessage instead of REST API');
    return { success: true, vote };
  },

  async resetDemo(demoId: string, industryContext: IndustryType) {
    const response = await fetch(`${API_BASE_URL}/demo/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demo_id: demoId, industry_context: industryContext })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to reset demo: ${response.statusText}`);
    }
    
    return response.json();
  }
};

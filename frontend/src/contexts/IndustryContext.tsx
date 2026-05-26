import React, { createContext, useContext, useState, ReactNode } from 'react';
import { IndustryType, IndustryConfig } from '../types';

interface IndustryContextType {
  current: IndustryType;
  setCurrent: (industry: IndustryType) => void;
  config: IndustryConfig;
}

const INDUSTRY_CONFIGS: Record<IndustryType, IndustryConfig> = {
  Banking: {
    preset_action: "Transfer $47,000 between accounts",
    sensitive_fields: ["ssn", "account_number", "dob"],
    risk_cluster_type: "fraud_cluster",
    reviewer_role: "Compliance Officer",
    guardrails_policy_id: "banking-pii-policy"
  },
  Healthcare: {
    preset_action: "Prescribe 90-day opioid refill and notify pharmacy",
    sensitive_fields: ["mrn", "icd10_codes", "prescription_history"],
    risk_cluster_type: "prescription_mill",
    reviewer_role: "Prescribing MD",
    guardrails_policy_id: "healthcare-phi-policy"
  },
  Retail: {
    preset_action: "Issue $12,400 refund and waive return window",
    sensitive_fields: ["card_number", "cvv"],
    risk_cluster_type: "refund_ring",
    reviewer_role: "Fraud Operations",
    guardrails_policy_id: "retail-pci-policy"
  },
  HROperations: {
    preset_action: "Terminate 47 contractors in APAC immediately",
    sensitive_fields: ["government_id", "salary"],
    risk_cluster_type: "legal_case",
    reviewer_role: "VP HR and Legal",
    guardrails_policy_id: "hr-pii-policy"
  }
};

const IndustryContext = createContext<IndustryContextType | undefined>(undefined);

export const IndustryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [current, setCurrent] = useState<IndustryType>('Banking');

  const value: IndustryContextType = {
    current,
    setCurrent,
    config: INDUSTRY_CONFIGS[current]
  };

  return (
    <IndustryContext.Provider value={value}>
      {children}
    </IndustryContext.Provider>
  );
};

export const useIndustry = (): IndustryContextType => {
  const context = useContext(IndustryContext);
  if (!context) {
    throw new Error('useIndustry must be used within IndustryProvider');
  }
  return context;
};

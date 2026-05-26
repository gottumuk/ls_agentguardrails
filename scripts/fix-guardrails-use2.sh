#!/bin/bash
# Fix existing Guardrails by updating them with correct policies via CLI
set -e

REGION="us-east-2"

echo "Fixing Guardrails policies in ${REGION}..."
echo ""

# Get Guardrail IDs from stack
STACK_NAME="aws-agent-governance-demos-use2-GuardrailsPoliciesStack-W1BNICRB0N3A"

BANKING_ID=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==`BankingGuardrailId`].OutputValue' --output text)
HEALTHCARE_ID=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==`HealthcareGuardrailId`].OutputValue' --output text)
RETAIL_ID=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==`RetailGuardrailId`].OutputValue' --output text)
HR_ID=$(aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} --query 'Stacks[0].Outputs[?OutputKey==`HRGuardrailId`].OutputValue' --output text)

echo "Banking Guardrail ID: ${BANKING_ID}"
echo "Healthcare Guardrail ID: ${HEALTHCARE_ID}"
echo "Retail Guardrail ID: ${RETAIL_ID}"
echo "HR Guardrail ID: ${HR_ID}"
echo ""

# Update Banking Guardrail
echo "Updating Banking Guardrail..."
aws bedrock update-guardrail \
  --guardrail-identifier ${BANKING_ID} \
  --name banking-pii-policy \
  --description "Guardrails policy for Banking industry - blocks SSN, account numbers, and DOB" \
  --sensitive-information-policy-config '{
    "piiEntitiesConfig": [
      {"type": "US_SOCIAL_SECURITY_NUMBER", "action": "BLOCK"},
      {"type": "US_BANK_ACCOUNT_NUMBER", "action": "BLOCK"}
    ],
    "regexesConfig": [
      {"name": "SSN_Pattern", "description": "Social Security Number pattern", "pattern": "\\d{3}-\\d{2}-\\d{4}", "action": "BLOCK"},
      {"name": "Account_Number_Pattern", "description": "Bank account number pattern", "pattern": "\\d{10,12}", "action": "BLOCK"},
      {"name": "DOB_Pattern", "description": "Date of birth pattern", "pattern": "\\d{4}-\\d{2}-\\d{2}", "action": "BLOCK"}
    ]
  }' \
  --blocked-input-messaging "This request contains sensitive banking information that cannot be processed." \
  --blocked-outputs-messaging "This response contains sensitive banking information that cannot be returned." \
  --region ${REGION}

echo "✓ Banking Guardrail updated"
echo ""

# Update Healthcare Guardrail
echo "Updating Healthcare Guardrail..."
aws bedrock update-guardrail \
  --guardrail-identifier ${HEALTHCARE_ID} \
  --name healthcare-phi-policy \
  --description "Guardrails policy for Healthcare industry - anonymizes MRN, ICD-10 codes, and prescription history" \
  --sensitive-information-policy-config '{
    "regexesConfig": [
      {"name": "MRN_Pattern", "description": "Medical Record Number pattern", "pattern": "MRN-\\d{6}", "action": "ANONYMIZE"},
      {"name": "ICD10_Pattern", "description": "ICD-10 code pattern", "pattern": "[A-Z]\\d{2}\\.\\d", "action": "ANONYMIZE"}
    ]
  }' \
  --word-policy-config '{
    "wordsConfig": [
      {"text": "Oxycodone"},
      {"text": "Hydrocodone"},
      {"text": "Fentanyl"},
      {"text": "Morphine"},
      {"text": "Codeine"},
      {"text": "Tramadol"}
    ]
  }' \
  --blocked-input-messaging "This request contains protected health information that cannot be processed." \
  --blocked-outputs-messaging "This response contains protected health information that has been anonymized." \
  --region ${REGION}

echo "✓ Healthcare Guardrail updated"
echo ""

# Update Retail Guardrail
echo "Updating Retail Guardrail..."
aws bedrock update-guardrail \
  --guardrail-identifier ${RETAIL_ID} \
  --name retail-pci-policy \
  --description "Guardrails policy for Retail industry - anonymizes card numbers and CVV" \
  --sensitive-information-policy-config '{
    "piiEntitiesConfig": [
      {"type": "CREDIT_DEBIT_CARD_NUMBER", "action": "ANONYMIZE"},
      {"type": "CREDIT_DEBIT_CARD_CVV", "action": "ANONYMIZE"}
    ],
    "regexesConfig": [
      {"name": "Card_Number_Pattern", "description": "Credit card number pattern with dashes", "pattern": "\\d{4}-\\d{4}-\\d{4}-\\d{4}", "action": "ANONYMIZE"},
      {"name": "CVV_Pattern", "description": "CVV pattern", "pattern": "\\b\\d{3}\\b", "action": "ANONYMIZE"}
    ]
  }' \
  --blocked-input-messaging "This request contains payment card information that cannot be processed." \
  --blocked-outputs-messaging "This response contains payment card information that has been anonymized." \
  --region ${REGION}

echo "✓ Retail Guardrail updated"
echo ""

# Update HR Guardrail
echo "Updating HR Guardrail..."
aws bedrock update-guardrail \
  --guardrail-identifier ${HR_ID} \
  --name hr-pii-policy \
  --description "Guardrails policy for HR/Operations industry - anonymizes government ID and salary" \
  --sensitive-information-policy-config '{
    "piiEntitiesConfig": [
      {"type": "US_PASSPORT_NUMBER", "action": "ANONYMIZE"},
      {"type": "DRIVER_ID", "action": "ANONYMIZE"}
    ],
    "regexesConfig": [
      {"name": "Government_ID_Pattern", "description": "Government ID pattern", "pattern": "[A-Z]\\d{8}", "action": "ANONYMIZE"},
      {"name": "Salary_Pattern", "description": "Salary amount pattern", "pattern": "\\$?\\d{1,3}(,\\d{3})*(\\.\\d{2})?", "action": "ANONYMIZE"}
    ]
  }' \
  --blocked-input-messaging "This request contains employee personal information that cannot be processed." \
  --blocked-outputs-messaging "This response contains employee personal information that has been anonymized." \
  --region ${REGION}

echo "✓ HR Guardrail updated"
echo ""

echo "========================================="
echo "All Guardrails updated successfully!"
echo "========================================="
echo ""
echo "Verify with:"
echo "  aws bedrock get-guardrail --guardrail-identifier ${BANKING_ID} --region ${REGION}"

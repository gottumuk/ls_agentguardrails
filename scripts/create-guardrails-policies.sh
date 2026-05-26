#!/bin/bash
# Create Bedrock Guardrails Policies for Demo 2
# Requirements: 3.6, 3.7, 3.8, 3.9

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Creating Bedrock Guardrails Policies for AWS Agent Governance Demos${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check if jq is installed for JSON parsing
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. Install it for better output formatting${NC}"
fi

# Function to create a guardrail and extract the ID
create_guardrail() {
    local name=$1
    local description=$2
    local config=$3
    
    echo -e "${YELLOW}Creating Guardrail: ${name}${NC}"
    
    # Create the guardrail
    response=$(eval "aws bedrock create-guardrail $config")
    
    if [ $? -eq 0 ]; then
        guardrail_id=$(echo "$response" | jq -r '.guardrailId')
        guardrail_arn=$(echo "$response" | jq -r '.guardrailArn')
        echo -e "${GREEN}✓ Created: ${name}${NC}"
        echo -e "  ID: ${guardrail_id}"
        echo -e "  ARN: ${guardrail_arn}"
        echo ""
        
        # Store the ID for later use
        echo "${name}=${guardrail_id}" >> guardrails-ids.txt
    else
        echo -e "${RED}✗ Failed to create: ${name}${NC}"
        echo "$response"
        return 1
    fi
}

# Remove old IDs file if it exists
rm -f guardrails-ids.txt

echo "Step 1: Creating Banking Guardrails Policy"
echo "-------------------------------------------"
create_guardrail \
    "banking-pii-policy" \
    "Guardrails policy for Banking industry - blocks SSN, account numbers, and DOB" \
    "--name banking-pii-policy \
     --description 'Guardrails policy for Banking industry - blocks SSN, account numbers, and DOB' \
     --sensitive-information-policy-config '{
       \"piiEntitiesConfig\": [
         {\"type\": \"US_SOCIAL_SECURITY_NUMBER\", \"action\": \"BLOCK\"},
         {\"type\": \"US_BANK_ACCOUNT_NUMBER\", \"action\": \"BLOCK\"}
       ],
       \"regexesConfig\": [
         {\"name\": \"SSN_Pattern\", \"description\": \"Social Security Number pattern\", \"pattern\": \"\\\\d{3}-\\\\d{2}-\\\\d{4}\", \"action\": \"BLOCK\"},
         {\"name\": \"Account_Number_Pattern\", \"description\": \"Bank account number pattern\", \"pattern\": \"\\\\d{10,12}\", \"action\": \"BLOCK\"},
         {\"name\": \"DOB_Pattern\", \"description\": \"Date of birth pattern\", \"pattern\": \"\\\\d{4}-\\\\d{2}-\\\\d{2}\", \"action\": \"BLOCK\"}
       ]
     }' \
     --blocked-input-messaging 'This request contains sensitive banking information that cannot be processed.' \
     --blocked-outputs-messaging 'This response contains sensitive banking information that cannot be returned.'"

echo "Step 2: Creating Healthcare Guardrails Policy"
echo "----------------------------------------------"
create_guardrail \
    "healthcare-phi-policy" \
    "Guardrails policy for Healthcare industry - anonymizes MRN, ICD-10 codes, and prescription history" \
    "--name healthcare-phi-policy \
     --description 'Guardrails policy for Healthcare industry - anonymizes MRN, ICD-10 codes, and prescription history' \
     --sensitive-information-policy-config '{
       \"regexesConfig\": [
         {\"name\": \"MRN_Pattern\", \"description\": \"Medical Record Number pattern\", \"pattern\": \"MRN-\\\\d{6}\", \"action\": \"ANONYMIZE\"},
         {\"name\": \"ICD10_Pattern\", \"description\": \"ICD-10 code pattern\", \"pattern\": \"[A-Z]\\\\d{2}\\\\.\\\\d\", \"action\": \"ANONYMIZE\"}
       ]
     }' \
     --word-policy-config '{
       \"wordsConfig\": [
         {\"text\": \"Oxycodone\"},
         {\"text\": \"Hydrocodone\"},
         {\"text\": \"Fentanyl\"},
         {\"text\": \"Morphine\"},
         {\"text\": \"Codeine\"},
         {\"text\": \"Tramadol\"}
       ]
     }' \
     --blocked-input-messaging 'This request contains protected health information that cannot be processed.' \
     --blocked-outputs-messaging 'This response contains protected health information that has been anonymized.'"

echo "Step 3: Creating Retail Guardrails Policy"
echo "------------------------------------------"
create_guardrail \
    "retail-pci-policy" \
    "Guardrails policy for Retail industry - anonymizes card numbers and CVV" \
    "--name retail-pci-policy \
     --description 'Guardrails policy for Retail industry - anonymizes card numbers and CVV' \
     --sensitive-information-policy-config '{
       \"piiEntitiesConfig\": [
         {\"type\": \"CREDIT_DEBIT_CARD_NUMBER\", \"action\": \"ANONYMIZE\"},
         {\"type\": \"CREDIT_DEBIT_CARD_CVV\", \"action\": \"ANONYMIZE\"}
       ],
       \"regexesConfig\": [
         {\"name\": \"Card_Number_Pattern\", \"description\": \"Credit card number pattern with dashes\", \"pattern\": \"\\\\d{4}-\\\\d{4}-\\\\d{4}-\\\\d{4}\", \"action\": \"ANONYMIZE\"},
         {\"name\": \"CVV_Pattern\", \"description\": \"CVV pattern\", \"pattern\": \"\\\\b\\\\d{3}\\\\b\", \"action\": \"ANONYMIZE\"}
       ]
     }' \
     --blocked-input-messaging 'This request contains payment card information that cannot be processed.' \
     --blocked-outputs-messaging 'This response contains payment card information that has been anonymized.'"

echo "Step 4: Creating HR/Operations Guardrails Policy"
echo "-------------------------------------------------"
create_guardrail \
    "hr-pii-policy" \
    "Guardrails policy for HR/Operations industry - anonymizes government ID and salary" \
    "--name hr-pii-policy \
     --description 'Guardrails policy for HR/Operations industry - anonymizes government ID and salary' \
     --sensitive-information-policy-config '{
       \"piiEntitiesConfig\": [
         {\"type\": \"US_PASSPORT_NUMBER\", \"action\": \"ANONYMIZE\"},
         {\"type\": \"DRIVER_ID\", \"action\": \"ANONYMIZE\"}
       ],
       \"regexesConfig\": [
         {\"name\": \"Government_ID_Pattern\", \"description\": \"Government ID pattern\", \"pattern\": \"[A-Z]\\\\d{8}\", \"action\": \"ANONYMIZE\"},
         {\"name\": \"Salary_Pattern\", \"description\": \"Salary amount pattern\", \"pattern\": \"\\\\$?\\\\d{1,3}(,\\\\d{3})*(\\\\.\\\\d{2})?\", \"action\": \"ANONYMIZE\"}
       ]
     }' \
     --blocked-input-messaging 'This request contains employee personal information that cannot be processed.' \
     --blocked-outputs-messaging 'This response contains employee personal information that has been anonymized.'"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All Guardrails Policies Created Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

if [ -f guardrails-ids.txt ]; then
    echo "Guardrail IDs have been saved to: guardrails-ids.txt"
    echo ""
    echo "Contents:"
    cat guardrails-ids.txt
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Update lambda/guardrails_query.py with the Guardrail IDs"
    echo "2. Deploy the Lambda function with the updated configuration"
    echo "3. Test each policy with sample data"
fi

echo ""
echo "To list all guardrails:"
echo "  aws bedrock list-guardrails"
echo ""
echo "To get details for a specific guardrail:"
echo "  aws bedrock get-guardrail --guardrail-identifier <guardrail-id>"
echo ""
echo "To test a guardrail:"
echo "  aws bedrock apply-guardrail --guardrail-identifier <guardrail-id> --guardrail-version DRAFT --source INPUT --content '[{\"text\":{\"text\":\"Test content\"}}]'"

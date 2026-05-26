#!/bin/bash
set -e

# AWS Agent Governance Demos - Template Validation Script
# Usage: ./validate.sh

REGION=${AWS_REGION:-us-east-1}

echo "Validating CloudFormation templates..."

# Validate main stack
echo "Validating main-stack.yaml..."
aws cloudformation validate-template \
    --template-body file://cloudformation/main-stack.yaml \
    --region ${REGION}

# Validate nested stacks
for template in cloudformation/nested-stacks/*.yaml; do
    echo "Validating $(basename $template)..."
    aws cloudformation validate-template \
        --template-body file://${template} \
        --region ${REGION}
done

echo "All templates are valid!"

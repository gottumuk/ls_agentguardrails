#!/bin/bash
set -e

# AWS Agent Governance Demos - Data Seeding Script
# Usage: ./seed-data.sh <environment>
# Example: ./seed-data.sh dev

ENVIRONMENT=${1:-dev}
STACK_NAME="aws-governance-demos-${ENVIRONMENT}"
REGION=${AWS_REGION:-us-east-1}

echo "Seeding data for AWS Agent Governance Demos (${ENVIRONMENT} environment)..."
echo "Stack Name: ${STACK_NAME}"
echo "Region: ${REGION}"

# Get stack outputs
echo "Retrieving stack outputs..."
OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs' \
    --output json)

# Extract resource names from outputs
SENSITIVE_RECORDS_TABLE=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="SensitiveRecordsTable") | .OutputValue')
AUDIT_TRAIL_TABLE=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="AuditTrailTable") | .OutputValue')
NEPTUNE_ENDPOINT=$(echo $OUTPUTS | jq -r '.[] | select(.OutputKey=="NeptuneEndpoint") | .OutputValue')

if [ -z "$SENSITIVE_RECORDS_TABLE" ] || [ -z "$AUDIT_TRAIL_TABLE" ]; then
    echo "Error: Could not retrieve required stack outputs"
    exit 1
fi

echo "Sensitive Records Table: ${SENSITIVE_RECORDS_TABLE}"
echo "Audit Trail Table: ${AUDIT_TRAIL_TABLE}"
echo "Neptune Endpoint: ${NEPTUNE_ENDPOINT}"

# Seed DynamoDB tables
echo ""
echo "Seeding DynamoDB tables..."

# Banking records
echo "Seeding Banking records..."
for file in lambda/seed_data/dynamodb_banking.json; do
    if [ -f "$file" ]; then
        jq -c '.[]' $file | while read item; do
            aws dynamodb put-item \
                --table-name ${SENSITIVE_RECORDS_TABLE} \
                --item "$item" \
                --region ${REGION}
        done
        echo "  ✓ Banking records seeded"
    else
        echo "  ⚠ Banking seed file not found: $file"
    fi
done

# Healthcare records
echo "Seeding Healthcare records..."
for file in lambda/seed_data/dynamodb_healthcare.json; do
    if [ -f "$file" ]; then
        jq -c '.[]' $file | while read item; do
            aws dynamodb put-item \
                --table-name ${SENSITIVE_RECORDS_TABLE} \
                --item "$item" \
                --region ${REGION}
        done
        echo "  ✓ Healthcare records seeded"
    else
        echo "  ⚠ Healthcare seed file not found: $file"
    fi
done

# Retail records
echo "Seeding Retail records..."
for file in lambda/seed_data/dynamodb_retail.json; do
    if [ -f "$file" ]; then
        jq -c '.[]' $file | while read item; do
            aws dynamodb put-item \
                --table-name ${SENSITIVE_RECORDS_TABLE} \
                --item "$item" \
                --region ${REGION}
        done
        echo "  ✓ Retail records seeded"
    else
        echo "  ⚠ Retail seed file not found: $file"
    fi
done

# HR/Operations records
echo "Seeding HR/Operations records..."
for file in lambda/seed_data/dynamodb_hr.json; do
    if [ -f "$file" ]; then
        jq -c '.[]' $file | while read item; do
            aws dynamodb put-item \
                --table-name ${SENSITIVE_RECORDS_TABLE} \
                --item "$item" \
                --region ${REGION}
        done
        echo "  ✓ HR/Operations records seeded"
    else
        echo "  ⚠ HR/Operations seed file not found: $file"
    fi
done

# Seed Neptune graph data
echo ""
echo "Seeding Neptune graph data..."

if [ -n "$NEPTUNE_ENDPOINT" ] && [ "$NEPTUNE_ENDPOINT" != "null" ]; then
    # Check if Neptune is accessible
    echo "Checking Neptune connectivity..."
    
    # Seed Banking graph
    echo "Seeding Banking graph..."
    if [ -f "lambda/seed_data/neptune_banking.json" ]; then
        python3 lambda/seed_data.py \
            --endpoint ${NEPTUNE_ENDPOINT} \
            --industry banking \
            --file lambda/seed_data/neptune_banking.json \
            --region ${REGION}
        echo "  ✓ Banking graph seeded"
    else
        echo "  ⚠ Banking graph seed file not found"
    fi
    
    # Seed Healthcare graph
    echo "Seeding Healthcare graph..."
    if [ -f "lambda/seed_data/neptune_healthcare.json" ]; then
        python3 lambda/seed_data.py \
            --endpoint ${NEPTUNE_ENDPOINT} \
            --industry healthcare \
            --file lambda/seed_data/neptune_healthcare.json \
            --region ${REGION}
        echo "  ✓ Healthcare graph seeded"
    else
        echo "  ⚠ Healthcare graph seed file not found"
    fi
    
    # Seed Retail graph
    echo "Seeding Retail graph..."
    if [ -f "lambda/seed_data/neptune_retail.json" ]; then
        python3 lambda/seed_data.py \
            --endpoint ${NEPTUNE_ENDPOINT} \
            --industry retail \
            --file lambda/seed_data/neptune_retail.json \
            --region ${REGION}
        echo "  ✓ Retail graph seeded"
    else
        echo "  ⚠ Retail graph seed file not found"
    fi
    
    # Seed HR/Operations graph
    echo "Seeding HR/Operations graph..."
    if [ -f "lambda/seed_data/neptune_hr.json" ]; then
        python3 lambda/seed_data.py \
            --endpoint ${NEPTUNE_ENDPOINT} \
            --industry hr \
            --file lambda/seed_data/neptune_hr.json \
            --region ${REGION}
        echo "  ✓ HR/Operations graph seeded"
    else
        echo "  ⚠ HR/Operations graph seed file not found"
    fi
else
    echo "  ⚠ Neptune endpoint not available, skipping graph seeding"
fi

# Verify seeding
echo ""
echo "Verifying data seeding..."

# Count DynamoDB records
RECORD_COUNT=$(aws dynamodb scan \
    --table-name ${SENSITIVE_RECORDS_TABLE} \
    --select COUNT \
    --region ${REGION} \
    --query 'Count' \
    --output text)

echo "  ✓ DynamoDB records: ${RECORD_COUNT}"

echo ""
echo "Data seeding complete!"
echo ""
echo "Summary:"
echo "  - DynamoDB records seeded: ${RECORD_COUNT}"
echo "  - Neptune graphs seeded: 4 industries (if Neptune available)"
echo ""
echo "Next steps:"
echo "  1. Verify data in AWS Console"
echo "  2. Test demo functionality"
echo "  3. Run post-deployment verification"

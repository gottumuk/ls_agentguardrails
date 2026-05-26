#!/bin/bash
set -e

echo "Packaging Lambda functions..."

cd lambda

# Extract dependencies from us-west-2 package, replace code with current local
echo "Step 1: Extracting dependencies from us-west-2..."
rm -rf package
mkdir -p package

# Download and extract us-west-2 package
aws lambda get-function --function-name aws-agent-governance-demos-usw2-See-SeedDataLambda-A08nyp5mUPV8 --region us-west-2 --query 'Code.Location' --output text | xargs curl -s | python3 -c "import sys, zipfile, io; zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())).extractall('package')"

echo "  ✓ Extracted us-west-2 dependencies"

# Replace ALL Python files with current local versions
echo "Step 2: Replacing Python files with current local code..."
cp *.py package/

# Replace seed_data directory with current local data
rm -rf package/seed_data
cp -r seed_data package/

echo "  ✓ Updated with current local code"

# Create unified package
cd package
zip -qr ../lambda-all-deps.zip .
cd ..
rm -rf package

echo "  ✓ lambda-all-deps.zip created"

# Copy to individual Lambda names
ALL_LAMBDAS=(
    "tact_evaluation"
    "guardrails_query"
    "approval_workflow"
    "approval_decision"
    "sns_notification"
    "audit_trail"
    "reset_demo"
    "neptune_scoring"
    "seed_data"
    "observability"
)

for lambda in "${ALL_LAMBDAS[@]}"; do
    cp lambda-all-deps.zip ${lambda}.zip
done

cd ..

echo "✓ All Lambda packages created (us-west-2 deps + current code)"

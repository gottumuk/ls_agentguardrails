#!/bin/bash

# Package seed data Lambda function with seed data files
# This script creates a deployment package for the SeedDataLambda function

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LAMBDA_DIR="$PROJECT_ROOT/lambda"
BUILD_DIR="$PROJECT_ROOT/build/seed_data"
OUTPUT_FILE="$PROJECT_ROOT/build/seed_data.zip"

echo "Packaging Seed Data Lambda function..."

# Create build directory
mkdir -p "$BUILD_DIR"
rm -rf "$BUILD_DIR"/*

# Copy Lambda function
echo "Copying Lambda function..."
cp "$LAMBDA_DIR/seed_data.py" "$BUILD_DIR/"
cp "$LAMBDA_DIR/error_handler.py" "$BUILD_DIR/"

# Copy seed data files
echo "Copying seed data files..."
mkdir -p "$BUILD_DIR/seed_data"
cp "$LAMBDA_DIR/seed_data"/*.json "$BUILD_DIR/seed_data/"

# Install dependencies
echo "Installing dependencies..."
cd "$BUILD_DIR"

# Install gremlinpython for Neptune
pip install gremlinpython -t .

# Install urllib3 (required for CloudFormation response)
pip install urllib3 -t .

# Create deployment package
echo "Creating deployment package..."
cd "$BUILD_DIR"
zip -r "$OUTPUT_FILE" . -x "*.pyc" -x "__pycache__/*" -x "*.dist-info/*"

echo "Deployment package created: $OUTPUT_FILE"
echo "Package size: $(du -h "$OUTPUT_FILE" | cut -f1)"

# Upload to S3 if bucket specified
if [ -n "$LAMBDA_CODE_BUCKET" ]; then
    echo "Uploading to S3 bucket: $LAMBDA_CODE_BUCKET"
    aws s3 cp "$OUTPUT_FILE" "s3://$LAMBDA_CODE_BUCKET/seed_data.zip"
    echo "Upload complete!"
else
    echo "LAMBDA_CODE_BUCKET not set, skipping S3 upload"
    echo "To upload manually:"
    echo "  aws s3 cp $OUTPUT_FILE s3://YOUR-BUCKET/seed_data.zip"
fi

echo "Done!"

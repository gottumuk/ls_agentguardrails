# TACT Decision Engine Lambda Function

This Lambda function implements the TACT (Traceability, Accountability, Consequence, Trust Boundary) Decision Engine for the AWS Agent Governance Demos system.

## Overview

The TACT Decision Engine evaluates agent action proposals in real-time using Amazon Bedrock to classify actions across four dimensions and map them to a Trust Spectrum level.

## Requirements Implemented

- **1.1**: Evaluates all four TACT dimensions using Amazon Bedrock
- **1.2**: Assigns exactly one Trust Spectrum level (BLOCKED, RESTRICTED, SUPERVISED, VERIFIED, TRUSTED)
- **1.4**: Accepts and evaluates custom input from audience
- **1.6**: Writes evaluation results to AuditTrailTable
- **2.1**: Supports industry context switching (Banking, Healthcare, Retail, HR/Operations)
- **2.3**: Injects industry-specific regulations into Bedrock prompts
- **6.4**: Sanitizes custom input (removes special characters, limits to 500 characters)

## Architecture

### Input Event Format

```json
{
  "action_proposal": "Transfer $47,000 between accounts",
  "industry_context": "Banking",
  "is_custom_input": false
}
```

### Output Response Format

```json
{
  "statusCode": 200,
  "body": {
    "evaluation_id": "uuid-v4",
    "timestamp": 1704067200,
    "action_proposal": "Transfer $47,000 between accounts",
    "industry_context": "Banking",
    "dimensions": {
      "traceability": 4,
      "accountability": 3,
      "consequence": 2,
      "trust_boundary": 3
    },
    "average_score": 3.0,
    "trust_spectrum": "SUPERVISED",
    "reasoning": "Brief explanation from Bedrock",
    "latency_ms": 2333,
    "is_custom_input": false
  }
}
```

## Trust Spectrum Mapping

The function calculates the average of all four dimension scores and maps to Trust Spectrum levels:

- **1.0-1.5**: BLOCKED (action rejected immediately)
- **1.6-2.5**: RESTRICTED (action requires multiple approvals)
- **2.6-3.5**: SUPERVISED (action requires single approval)
- **3.6-4.5**: VERIFIED (action proceeds with audit)
- **4.6-5.0**: TRUSTED (action proceeds automatically)

## Industry Context Support

The function supports four industry contexts with specific regulatory framing:

### Banking
- Regulations: FINRA, OCC, anti-money laundering
- Focus: Regulatory compliance and financial impact

### Healthcare
- Regulations: HIPAA, patient safety protocols, clinical guidelines
- Focus: Patient safety and clinical protocols

### Retail
- Regulations: PCI-DSS, consumer protection laws
- Focus: Fraud prevention and customer impact

### HR/Operations
- Regulations: EEOC, labor law, employment regulations
- Focus: Legal compliance and employee rights

## Custom Input Handling

When `is_custom_input` is true, the function:

1. Sanitizes input by removing special characters: `<>{}\\`
2. Limits input to 500 characters maximum
3. Validates input is non-empty after sanitization
4. Evaluates using the same TACT prompt template

## Bedrock Integration

- **Model**: Claude 3.5 Sonnet (anthropic.claude-3-5-sonnet-20241022-v2:0)
- **API**: InvokeModel with streaming disabled
- **Temperature**: 0.0 for consistent classification
- **Max tokens**: 1000
- **Timeout**: 10 seconds

## Error Handling

The function handles the following error scenarios:

### AWS Service Errors
- **ThrottlingException**: Returns 429 with retry_after suggestion
- **Other ClientErrors**: Returns 500 with service name and error message

### Validation Errors
- **Invalid industry context**: Returns 400 with error message
- **Empty custom input**: Returns 400 with error message
- **Missing dimensions in response**: Returns 400 with error message

### Unexpected Errors
- Returns 500 with generic error message
- Logs full error details to CloudWatch

## Environment Variables

- `AUDIT_TRAIL_TABLE`: DynamoDB table name for audit trail (default: AuditTrailTable)

## IAM Permissions Required

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:*:*:table/AuditTrailTable"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/TACTEvaluationLambda:*"
    }
  ]
}
```

## Lambda Configuration

- **Runtime**: Python 3.11 or later
- **Timeout**: 10 seconds
- **Memory**: 512 MB
- **Handler**: tact_evaluation.lambda_handler

## Testing

Run unit tests:

```bash
python -m pytest test_tact_evaluation.py -v
```

All tests cover:
- Input sanitization
- Prompt building with industry context
- Bedrock response parsing
- Trust spectrum calculation
- Error handling
- Industry context switching

## Deployment

1. Install dependencies:
   ```bash
   pip install -r requirements.txt -t .
   ```

2. Package Lambda function:
   ```bash
   zip -r tact_evaluation.zip tact_evaluation.py
   ```

3. Deploy via CloudFormation or AWS CLI:
   ```bash
   aws lambda create-function \
     --function-name TACTEvaluationLambda \
     --runtime python3.11 \
     --role arn:aws:iam::ACCOUNT:role/TACTEvaluationLambdaRole \
     --handler tact_evaluation.lambda_handler \
     --zip-file fileb://tact_evaluation.zip \
     --timeout 10 \
     --memory-size 512
   ```

## Monitoring

The function logs the following to CloudWatch:

- All AWS service errors with full context
- Validation errors with input details
- Unexpected errors with stack traces
- Execution metrics (latency, dimension scores)

## Performance

- Target latency: <3 seconds end-to-end
- Bedrock API call: ~2 seconds average
- DynamoDB write: <100ms average
- Total overhead: <1 second

## Future Enhancements

- Add caching for repeated action proposals
- Implement batch evaluation for multiple actions
- Add support for custom TACT dimension weights
- Implement A/B testing for different prompt templates

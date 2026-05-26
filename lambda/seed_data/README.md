# Seed Data for AWS Agent Governance Demos

This directory contains seed data files for populating DynamoDB and Neptune with demo data across four industries: Banking, Healthcare, Retail, and HR/Operations.

## Directory Structure

```
seed_data/
├── README.md                    # This file
├── dynamodb_banking.json        # Banking sensitive records
├── dynamodb_healthcare.json     # Healthcare sensitive records
├── dynamodb_retail.json         # Retail sensitive records
├── dynamodb_hr.json             # HR/Operations sensitive records
├── neptune_banking.json         # Banking trust graph
├── neptune_healthcare.json      # Healthcare trust graph
├── neptune_retail.json          # Retail trust graph
└── neptune_hr.json              # HR/Operations trust graph
```

## DynamoDB Seed Data Format

Each DynamoDB seed file contains sensitive records for the respective industry:

### Banking (`dynamodb_banking.json`)
- SSN (Social Security Number)
- Account numbers
- Date of birth
- Account balances

### Healthcare (`dynamodb_healthcare.json`)
- MRN (Medical Record Number)
- ICD-10 diagnosis codes
- Prescription history
- Prescribing physician

### Retail (`dynamodb_retail.json`)
- Credit card numbers
- CVV codes
- Refund amounts
- Order details

### HR/Operations (`dynamodb_hr.json`)
- Government ID numbers
- Salary information
- Department and location
- Employment type

## Neptune Seed Data Format

Each Neptune seed file contains graph nodes and edges:

### Node Types
- `Account`: Represents accounts, patients, customers, or employees
- `RiskCluster`: Represents known risk patterns
- `Entity`: Represents external parties (merchants, providers, departments)

### Edge Types
- `TRANSACTS_WITH`: Financial or business transactions
- `ASSOCIATED_WITH`: Proximity to risk clusters
- `INTERACTS_WITH`: Business relationships

### Industry-Specific Risk Clusters
- Banking: `fraud_cluster` - Suspicious transaction patterns
- Healthcare: `prescription_mill` - Abnormal prescribing patterns
- Retail: `refund_ring` - Coordinated refund abuse
- HR/Operations: `legal_case` - Active litigation

## Usage

### Automatic Seeding (CloudFormation)

The seed data is automatically loaded when the CloudFormation stack is created:

```bash
aws cloudformation create-stack \
  --stack-name agent-governance-demos \
  --template-body file://cloudformation/main-stack.yaml \
  --parameters file://cloudformation/parameters/dev.json
```

The `SeedDataCustomResource` triggers the `SeedDataLambda` function, which loads all industry data.

### Manual Seeding (Direct Lambda Invocation)

You can manually seed data for a specific industry:

```bash
aws lambda invoke \
  --function-name agent-governance-demos-SeedData \
  --payload '{"industry": "Banking"}' \
  response.json
```

Supported industries:
- `Banking`
- `Healthcare`
- `Retail`
- `HROperations`

### Programmatic Seeding (Python)

```python
import boto3
import json

lambda_client = boto3.client('lambda')

# Seed Banking data
response = lambda_client.invoke(
    FunctionName='agent-governance-demos-SeedData',
    InvocationType='RequestResponse',
    Payload=json.dumps({'industry': 'Banking'})
)

result = json.loads(response['Payload'].read())
print(f"Seeded {result['dynamodb_records']} DynamoDB records")
print(f"Seeded {result['neptune_nodes']} Neptune nodes")
print(f"Seeded {result['neptune_edges']} Neptune edges")
```

## Data Characteristics

### DynamoDB Records
- Each industry has 3 sample records
- Records contain realistic but fictional data
- All sensitive fields are present for Guardrails testing

### Neptune Graph
- Each industry has 5 nodes (3 accounts + 1 risk cluster + 1 entity)
- Each industry has 4 edges connecting nodes
- All graphs include at least one 2-hop path to a risk cluster

## Customization

To add custom seed data:

1. Create or modify JSON files in this directory
2. Follow the existing schema structure
3. Redeploy the Lambda function with updated seed files
4. Invoke the Lambda to reload data

### Adding New Records

Edit the appropriate JSON file and add records following the existing format:

```json
{
  "sensitive_records": [
    {
      "record_id": "BANK-004",
      "account_holder": "New Customer",
      "ssn": "111-22-3333",
      "account_number": "1111222233",
      "dob": "1995-01-01",
      "balance": 50000.00,
      "last_transaction": "2024-01-20",
      "account_type": "savings"
    }
  ]
}
```

### Adding New Graph Nodes

Edit the appropriate Neptune JSON file:

```json
{
  "nodes": [
    {
      "id": "ACCT-004",
      "label": "Account",
      "properties": {
        "name": "New Account",
        "type": "checking",
        "industry_context": "Banking",
        "created_date": "2024-01-20"
      }
    }
  ],
  "edges": [
    {
      "from": "ACCT-004",
      "to": "ACCT-001",
      "label": "TRANSACTS_WITH",
      "properties": {
        "amount": 1000.00,
        "timestamp": "2024-01-20T10:00:00Z",
        "frequency": 1
      }
    }
  ]
}
```

## Testing

The seed data is used in the following demos:

1. **Demo 1 (TACT Engine)**: Preset actions reference these scenarios
2. **Demo 2 (Guardrails)**: Queries these DynamoDB records
3. **Demo 3 (Neptune)**: Traverses these graph structures
4. **Demo 4 (Approval)**: Uses trust scores from these graphs

## Data Retention

- DynamoDB records persist until manually deleted
- Neptune graph data persists until cluster is deleted
- CloudFormation Delete does NOT remove seed data (for demo preservation)
- Use the reset demo functionality to clear in-progress state without deleting seed data

## Security Considerations

- All data is fictional and for demonstration purposes only
- Do not use real PII/PHI/PCI data in seed files
- Seed data is stored in Lambda deployment package (not encrypted at rest)
- Consider using AWS Secrets Manager for production scenarios

## Troubleshooting

### Seeding Fails with DynamoDB Error
- Check IAM permissions for `dynamodb:PutItem`
- Verify table name matches environment variable
- Check CloudWatch Logs for detailed error messages

### Seeding Fails with Neptune Error
- Verify Lambda is in VPC with Neptune access
- Check security group allows port 8182
- Verify Neptune endpoint is correct
- Check Gremlin query syntax in logs

### Custom Resource Timeout
- Increase Lambda timeout (default 300 seconds)
- Reduce number of records in seed files
- Check VPC NAT gateway for connectivity issues

## References

- [DynamoDB PutItem API](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html)
- [Neptune Gremlin](https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-gremlin.html)
- [CloudFormation Custom Resources](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources.html)

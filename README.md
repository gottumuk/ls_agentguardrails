# AWS Agent Governance Demos

> **⚠️ DISCLAIMER:** This project is provided "as is" without warranty of any kind, express or implied. This code is **not officially supported by Amazon Web Services (AWS)** and does not represent an official AWS product or service. Use at your own risk. Intended for educational and demonstration purposes only.

## Overview

A demonstration platform exploring AI agent governance patterns on AWS. Built for a livestream covering trust, verification, and blocking strategies across Banking, Healthcare, Retail, and HR/Ops industries.

## Demos

1. **TACT Engine** — Trust, Accountability, Consequence, and Traceability scoring using Amazon Bedrock
2. **Bedrock Guardrails** — Content filtering and policy enforcement with Bedrock Guardrails
3. **Neptune Trust Graph** — Graph-based trust relationship scoring with Amazon Neptune
4. **Approval Workflow** — Human-in-the-loop approval via Step Functions and SNS

## Architecture

- **Frontend:** React/TypeScript SPA served via CloudFront + S3
- **API:** API Gateway (REST + WebSocket)
- **Compute:** 10 Lambda functions (Python)
- **AI/ML:** Amazon Bedrock + Guardrails
- **Data:** DynamoDB + Neptune Serverless
- **Orchestration:** Step Functions + SNS
- **Observability:** CloudWatch + CloudTrail

## Project Structure

```
├── cloudformation/       # Infrastructure as Code (nested stacks)
├── lambda/               # Lambda function source code
├── frontend/             # React/TypeScript frontend
├── scripts/              # Build and deployment scripts
├── diagrams/             # Mermaid architecture diagrams
├── deploy-complete.sh    # All-in-one deployment script
└── DEPLOYMENT_GUIDE.md   # Detailed deployment instructions
```

## Quick Start

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for full instructions.

## License

See [DISCLAIMER](DISCLAIMER) for terms of use.

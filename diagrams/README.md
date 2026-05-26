# Architecture Diagrams - PNG Images

This directory contains PNG images generated from the Mermaid diagrams in `ARCHITECTURE_DIAGRAMS.md`.

## Generated Diagrams

### 1. Overall System Architecture
**File:** `01-overall-system-architecture.png`  
**Description:** Complete system architecture showing all AWS services, data flow, and component interactions across all four demos.

### 2. Demo 1: TACT Framework - Sequence Diagram
**File:** `02-demo1-tact-sequence.png`  
**Description:** Sequence diagram showing the flow of a TACT risk assessment evaluation from user request through Bedrock to response.

### 3. Demo 2: Data Protection - Sequence Diagram
**File:** `03-demo2-guardrails-sequence.png`  
**Description:** Sequence diagram showing how Bedrock Guardrails redacts sensitive data from DynamoDB before returning to the agent.

### 4. Demo 3: Trust Reasoning - Sequence Diagram
**File:** `04-demo3-neptune-sequence.png`  
**Description:** Sequence diagram showing Neptune graph traversal for trust score calculation and fraud detection.

### 5. Demo 3: Neptune Graph Data Model
**File:** `05-demo3-neptune-datamodel.png`  
**Description:** Graph structure showing account nodes, entity nodes (shared attributes), and risk cluster nodes with their relationships.

### 6. Demo 4: Human Oversight - Sequence Diagram
**File:** `06-demo4-stepfunctions-sequence.png`  
**Description:** Sequence diagram showing Step Functions approval workflow with callback pattern and human decision loop.

### 7. Data Flow Summary
**File:** `07-data-flow-summary.png`  
**Description:** High-level summary of data flow patterns across all four demos.

### 8. Deployment Architecture
**File:** `08-deployment-architecture.png`  
**Description:** Infrastructure deployment flow from source control through CloudFormation to runtime resources.

## Usage

These PNG images can be used in:
- Presentations and slide decks
- Documentation and wikis
- Training materials
- Architecture review documents
- Blog posts and articles

## Regenerating Diagrams

To regenerate all diagrams from the source Mermaid files:

```bash
./scripts/create-all-diagrams.sh
```

This script:
1. Creates `.mmd` files for each diagram
2. Uses `@mermaid-js/mermaid-cli` to convert to PNG
3. Outputs high-resolution images (1920px width) with transparent backgrounds

## Requirements

- Node.js and npx installed
- Internet connection (to download mermaid-cli on first run)

## Image Specifications

- **Format:** PNG
- **Width:** 1920px (height auto-calculated)
- **Background:** Transparent
- **Resolution:** High-DPI suitable for presentations

## Color Coding

The diagrams use consistent color coding:
- **Blue (#e1f5ff):** Client/Frontend components
- **Purple (#e8d5f2):** AI/ML Services (Bedrock, Guardrails)
- **Yellow (#fff4cc):** Graph/Orchestration (Neptune, Step Functions)
- **Green (#d4f1d4):** Data Storage (DynamoDB, S3)
- **Red (#ffcccc):** Risk/Alert states

## Source Files

All diagrams are defined in Mermaid syntax in:
- `ARCHITECTURE_DIAGRAMS.md` - Original source with all diagrams
- `diagrams/*.mmd` - Individual Mermaid files for each diagram

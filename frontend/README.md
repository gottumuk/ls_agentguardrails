# AWS Agent Governance Demos - Frontend

React-based frontend application for the AWS Agent Governance Demos system.

## Features

- **Industry Context Switching**: Switch between Banking, Healthcare, Retail, and HR/Operations with <500ms update propagation
- **Demo 1 - TACT Engine**: Evaluate agent actions across four dimensions (Traceability, Accountability, Consequence, Trust Boundary)
- **Demo 2 - Guardrails**: Side-by-side viewer showing raw vs sanitized records with latency metrics
- **Demo 3 - Neptune Trust Graph**: D3.js visualization of graph traversal with trust scoring
- **Demo 4 - Approval Workflow**: Human-in-the-loop approval with countdown timer and audit trail

## Technology Stack

- React 18 with TypeScript
- Vite for build tooling
- D3.js for graph visualization
- AWS SDK for JavaScript (CloudWatch Logs, DynamoDB)
- WebSocket for real-time updates

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The application will be available at http://localhost:3000

### Build

```bash
npm run build
```

The production build will be in the `dist` directory.

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Demo UI components
│   │   ├── Demo1TACTEngine.tsx
│   │   ├── Demo2Guardrails.tsx
│   │   ├── Demo3NeptuneGraph.tsx
│   │   └── Demo4ApprovalWorkflow.tsx
│   ├── contexts/            # React contexts
│   │   └── IndustryContext.tsx
│   ├── hooks/               # Custom React hooks
│   │   └── useWebSocket.ts
│   ├── types.ts             # TypeScript type definitions
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## API Integration

The frontend expects the following API endpoints:

- `POST /api/tact/evaluate` - TACT evaluation
- `POST /api/guardrails/query` - Guardrails query
- `POST /api/neptune/score` - Trust score calculation
- `POST /api/approval/start` - Start approval workflow
- `POST /api/approval/decide` - Submit approval decision

Configure the API Gateway URL in `vite.config.ts` proxy settings.

## Industry Context Configuration

Each industry has preset configurations:

- **Banking**: Wire transfers, SSN/account number protection, fraud cluster detection
- **Healthcare**: Opioid prescriptions, MRN/ICD-10 protection, prescription mill detection
- **Retail**: Bulk refunds, card number protection, refund ring detection
- **HR/Operations**: Mass terminations, salary/ID protection, legal case detection

## Performance Targets

- Industry context switch: <500ms
- TACT evaluation: <3 seconds
- Neptune trust scoring: <2 seconds
- UI updates: <200ms

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

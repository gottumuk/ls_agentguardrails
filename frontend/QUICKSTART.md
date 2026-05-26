# Quick Start Guide

Get the AWS Agent Governance Demos frontend running in 5 minutes.

## Prerequisites

- Node.js 18+ and npm
- No AWS account needed for mock mode

## Installation

```bash
cd frontend
npm install
```

## Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Try the Demos

### 1. Switch Industry Context

Click the industry buttons in the top bar:
- Banking
- Healthcare  
- Retail
- HR/Operations

Notice how all demos update instantly with industry-specific content.

### 2. Demo 1 - TACT Engine

1. Click "Evaluate: [preset action]" button
2. Wait ~2 seconds for evaluation
3. See four dimension scores and Trust Spectrum badge
4. Click "▶ Evaluation Reasoning" to expand details
5. Try custom input: type an action and click "Evaluate Custom"

### 3. Demo 2 - Guardrails

1. Click "Query Record" button
2. Wait ~1 second for query
3. Compare raw record (left) vs sanitized (right)
4. Notice redacted fields in red
5. Check latency metrics at top

### 4. Demo 3 - Neptune Trust Graph

1. Select a target node from dropdown
2. Click "Calculate Trust Score"
3. Wait ~1 second for calculation
4. See trust score, verdict, and risk factors
5. View graph visualization with target (blue) and risk clusters (red)
6. Read Gremlin query that was executed

### 5. Demo 4 - Approval Workflow

1. Click "Start Approval Workflow"
2. See action context and reviewer identity
3. Watch countdown timer (15:00 → 0:00)
4. Click "APPROVE" or "DENY" button
5. See decision recorded in audit trail

## Mock Mode

By default, the app runs in mock mode with simulated backend responses. This means:

- ✓ No AWS account needed
- ✓ No backend deployment needed
- ✓ Instant setup
- ✓ Predictable data for testing
- ✓ Simulated latencies for realism

## Connect to Real Backend

To use real AWS services:

1. Deploy backend infrastructure (see `/cloudformation` and `/lambda`)
2. Create `.env` file:
   ```
   VITE_USE_MOCK=false
   VITE_API_BASE_URL=https://your-api-gateway-url
   VITE_WS_URL=wss://your-websocket-url
   ```
3. Restart dev server: `npm run dev`

## Build for Production

```bash
npm run build
```

Output will be in `dist/` directory. Deploy to any static hosting (S3, Netlify, Vercel, etc.).

## Troubleshooting

**Port 3000 already in use?**
```bash
# Edit vite.config.ts and change port
server: {
  port: 3001  // or any available port
}
```

**Dependencies not installing?**
```bash
# Clear npm cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors?**
```bash
# Check TypeScript version
npx tsc --version  # Should be 5.2.2+

# Rebuild
npm run build
```

## Next Steps

- Read [README.md](./README.md) for full documentation
- Read [IMPLEMENTATION.md](./IMPLEMENTATION.md) for technical details
- Explore source code in `src/` directory
- Customize industry configurations in `src/contexts/IndustryContext.tsx`
- Add your own demo scenarios in `src/api/mockServer.ts`

## Support

For issues or questions:
1. Check existing documentation
2. Review CloudFormation templates in `/cloudformation`
3. Review Lambda functions in `/lambda`
4. Check design document in `.kiro/specs/aws-agent-governance-demos/design.md`

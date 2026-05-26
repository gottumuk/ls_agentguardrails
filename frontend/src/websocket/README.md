# WebSocket Integration for Real-Time Updates

This directory contains the WebSocket integration implementation for real-time updates in the AWS Agent Governance Demos application.

## Overview

The WebSocket system provides real-time bidirectional communication between the frontend and backend, enabling:

- **Real-time demo state updates** (< 200ms latency per Requirement 7.7)
- **Live log streaming** from CloudWatch
- **Audit trail updates** as decisions are made
- **Vote count updates** for audience interaction
- **Error notifications** displayed as banners
- **Context switch notifications** when industry changes

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  WebSocketProvider                       │
│  - Manages WebSocket connection                         │
│  - Handles reconnection with exponential backoff        │
│  - Distributes messages to handlers                     │
│  - Maintains connection health (ping every 30s)         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  useWebSocket Hook                       │
│  - WebSocket connection management                      │
│  - Automatic reconnection (up to 5 attempts)            │
│  - Exponential backoff (1s, 2s, 4s, 8s, 16s)          │
│  - Health check ping (every 30 seconds)                 │
│  - Message type routing                                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Message Type Handlers                       │
│  - DEMO_STATE_UPDATE → Update demo UI                   │
│  - LOG_EVENT → Append to log viewer                     │
│  - AUDIT_TRAIL_ENTRY → Append to audit timeline         │
│  - VOTE_UPDATE → Update vote counts                     │
│  - ERROR → Display error banner                         │
│  - CONTEXT_SWITCH → Update all demos                    │
└─────────────────────────────────────────────────────────┘
```

## Components

### Core Components

#### `useWebSocket` Hook
Location: `frontend/src/hooks/useWebSocket.ts`

Enhanced WebSocket hook with:
- Connection state management
- Automatic reconnection with exponential backoff (up to 5 attempts)
- Health check ping mechanism (every 30 seconds)
- Message type routing to handlers
- Manual reconnect capability

**Usage:**
```typescript
const { isConnected, sendMessage, reconnect } = useWebSocket({
  url: 'ws://localhost:8080',
  pingInterval: 30000,
  maxReconnectAttempts: 5,
  handlers: {
    onDemoStateUpdate: (payload) => { /* ... */ },
    onLogEvent: (payload) => { /* ... */ },
    // ... other handlers
  }
});
```

#### `WebSocketProvider` Context
Location: `frontend/src/contexts/WebSocketContext.tsx`

React context provider that:
- Manages global WebSocket connection
- Maintains demo states (Demo 1-4)
- Collects logs and audit trail entries
- Tracks vote counts
- Handles error messages

**Usage:**
```typescript
<WebSocketProvider url="ws://localhost:8080">
  <App />
</WebSocketProvider>
```

### UI Components

#### `WebSocketStatus`
Location: `frontend/src/components/WebSocketStatus.tsx`

Displays connection status with visual indicators:
- 🟢 Connected (green with pulse animation)
- 🟡 Connecting (yellow with pulse, shows attempt count)
- 🔴 Error (red with retry button)

#### `ErrorBanner`
Location: `frontend/src/components/ErrorBanner.tsx`

Fixed-position banner that displays WebSocket errors:
- Auto-dismisses after 10 seconds
- Manual dismiss button
- Slide-down animation

#### `VoteDisplay`
Location: `frontend/src/components/VoteDisplay.tsx`

Shows real-time audience vote counts:
- Approve/Deny vote bars with percentages
- Animated bar transitions
- Total vote count

#### `AuditTrailTimeline`
Location: `frontend/src/components/AuditTrailTimeline.tsx`

Timeline visualization of audit events:
- Event icons and color coding
- Timestamp display
- Event details with formatted data
- Scrollable with latest at bottom

#### `LogViewerContainer`
Location: `frontend/src/components/observability/LogViewerContainer.tsx`

Connects LogViewer to WebSocket context for real-time log streaming.

## Message Types

### 1. DEMO_STATE_UPDATE
Updates the state of a specific demo.

**Payload:**
```json
{
  "message_type": "DEMO_STATE_UPDATE",
  "timestamp": 1704067200000,
  "payload": {
    "demo_id": 1,
    "state": {
      "evaluation_id": "eval-123",
      "trust_spectrum": "SUPERVISED",
      "dimensions": { ... }
    }
  }
}
```

### 2. LOG_EVENT
Appends a log entry to the log viewer.

**Payload:**
```json
{
  "message_type": "LOG_EVENT",
  "timestamp": 1704067200000,
  "payload": {
    "level": "INFO",
    "message": "TACT evaluation completed",
    "source": "TACTEvaluationLambda"
  }
}
```

### 3. AUDIT_TRAIL_ENTRY
Appends an entry to the audit trail timeline.

**Payload:**
```json
{
  "message_type": "AUDIT_TRAIL_ENTRY",
  "timestamp": 1704067200000,
  "payload": {
    "event_id": "audit-123",
    "timestamp": 1704067200000,
    "event_type": "APPROVED",
    "demo_id": 4,
    "industry_context": "Banking",
    "event_data": { ... }
  }
}
```

### 4. VOTE_UPDATE
Updates vote counts for Demo 4.

**Payload:**
```json
{
  "message_type": "VOTE_UPDATE",
  "timestamp": 1704067200000,
  "payload": {
    "approve": 45,
    "deny": 30
  }
}
```

### 5. ERROR
Displays an error banner.

**Payload:**
```json
{
  "message_type": "ERROR",
  "timestamp": 1704067200000,
  "payload": {
    "message": "Failed to connect to Neptune database"
  }
}
```

### 6. CONTEXT_SWITCH
Notifies all demos of industry context change.

**Payload:**
```json
{
  "message_type": "CONTEXT_SWITCH",
  "timestamp": 1704067200000,
  "payload": {
    "industry_context": "Healthcare",
    "clear_states": true
  }
}
```

### 7. PONG
Response to PING health check (internal use).

**Payload:**
```json
{
  "message_type": "PONG",
  "timestamp": 1704067200000,
  "payload": {}
}
```

## Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```bash
# Development
VITE_WEBSOCKET_URL=ws://localhost:8080

# Production
VITE_WEBSOCKET_URL=wss://your-api-gateway-url.execute-api.region.amazonaws.com/prod
```

### Connection Parameters

Default configuration:
- **Ping interval:** 30 seconds (health check)
- **Max reconnect attempts:** 5
- **Reconnect backoff:** Exponential (1s, 2s, 4s, 8s, 16s, max 30s)
- **Log retention:** Last 1000 entries
- **Audit trail retention:** Last 500 entries

## Health Check Mechanism

The WebSocket connection sends a PING message every 30 seconds to verify the connection is alive:

```typescript
// Client sends
{ "type": "PING", "timestamp": 1704067200000 }

// Server responds
{ "message_type": "PONG", "timestamp": 1704067200000, "payload": {} }
```

If no PONG is received, the connection is considered stale and will be closed, triggering reconnection.

## Reconnection Strategy

Exponential backoff with maximum attempts:

1. **Attempt 1:** Wait 1 second (2^0 * 1000ms)
2. **Attempt 2:** Wait 2 seconds (2^1 * 1000ms)
3. **Attempt 3:** Wait 4 seconds (2^2 * 1000ms)
4. **Attempt 4:** Wait 8 seconds (2^3 * 1000ms)
5. **Attempt 5:** Wait 16 seconds (2^4 * 1000ms)

After 5 failed attempts, reconnection stops and displays an error. User can manually retry using the "Retry" button.

## Performance Requirements

Per Requirement 7.7:
- **Update latency:** < 200ms from state change to UI update
- **Message processing:** Synchronous, no queuing
- **UI updates:** Optimistic with rollback on error

## Testing

Unit tests are provided in `frontend/src/hooks/useWebSocket.test.ts`:

```bash
npm test useWebSocket.test.ts
```

Tests cover:
- Connection establishment
- Message type routing
- Ping interval
- Reconnection with exponential backoff
- Max reconnect attempts
- Manual reconnect
- Send message when connected/disconnected

## Integration Example

See `frontend/src/examples/WebSocketIntegrationExample.tsx` for a complete integration example.

## Backend Integration

The backend WebSocket API Gateway should:

1. Accept WebSocket connections at the configured URL
2. Send messages in the format specified above
3. Respond to PING messages with PONG
4. Handle connection/disconnection gracefully
5. Broadcast updates to all connected clients

Example Lambda handler for WebSocket:

```python
import json
import boto3

def lambda_handler(event, context):
    route_key = event.get('requestContext', {}).get('routeKey')
    connection_id = event.get('requestContext', {}).get('connectionId')
    
    if route_key == '$connect':
        # Handle new connection
        return {'statusCode': 200}
    
    elif route_key == '$disconnect':
        # Handle disconnection
        return {'statusCode': 200}
    
    elif route_key == 'PING':
        # Respond to health check
        return send_message(connection_id, {
            'message_type': 'PONG',
            'timestamp': int(time.time() * 1000),
            'payload': {}
        })
    
    return {'statusCode': 200}

def send_message(connection_id, message):
    client = boto3.client('apigatewaymanagementapi')
    client.post_to_connection(
        ConnectionId=connection_id,
        Data=json.dumps(message)
    )
    return {'statusCode': 200}
```

## Troubleshooting

### Connection fails immediately
- Check VITE_WEBSOCKET_URL is correct
- Verify WebSocket server is running
- Check CORS configuration on API Gateway

### Reconnection not working
- Check browser console for errors
- Verify exponential backoff timing
- Check if max attempts (5) was reached

### Messages not appearing
- Verify message format matches expected structure
- Check message_type is one of the supported types
- Look for parsing errors in browser console

### High latency (> 200ms)
- Check network conditions
- Verify WebSocket server performance
- Consider reducing message payload size

## Future Enhancements

Potential improvements:
- Message queuing for offline support
- Compression for large payloads
- Binary message support for graph data
- Connection pooling for multiple demos
- Message acknowledgment system

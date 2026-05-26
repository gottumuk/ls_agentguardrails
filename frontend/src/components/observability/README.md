# Observability Sidebar Components

This directory contains the implementation of the observability sidebar for the AWS Agent Governance Demos, providing real-time visibility into code execution, AWS service calls, and data flows.

## Components

### 1. LogViewer (`LogViewer.tsx`)

**Purpose**: Display scrolling terminal-style log view with filtering and color-coding.

**Features**:
- Color-coded logs by severity (INFO, WARN, ERROR, DEBUG)
- Filter logs by Lambda function name (dropdown)
- Filter logs by execution ID (text input)
- Auto-scroll to latest log entry (toggleable)
- Displays timestamp, Lambda name, execution ID, and log level
- Keeps last 100 log entries in memory
- Clear logs and clear filters buttons

**Props**:
- `logs: LogEvent[]` - Array of log events to display
- `onClear: () => void` - Callback to clear all logs

**Log Event Interface**:
```typescript
interface LogEvent {
  timestamp: number;
  message: string;
  log_stream: string;
  level?: string;
  execution_id?: string;
  lambda_name?: string;
}
```

### 2. CodeDisplay (`CodeDisplay.tsx`)

**Purpose**: Display source code with Monaco Editor and syntax highlighting.

**Features**:
- Monaco Editor integration with VS Code dark theme
- Syntax highlighting for Python, JSON, Groovy, JavaScript, TypeScript, YAML
- Multi-file support with tab navigation
- Highlight current line during execution
- Read-only mode with line numbers
- File path display
- Status bar showing language and current line

**Props**:
- `files: CodeFile[]` - Array of code files to display
- `currentFile?: string` - Path of currently selected file
- `onFileChange?: (path: string) => void` - Callback when file selection changes

**Code File Interface**:
```typescript
interface CodeFile {
  path: string;
  content: string;
  language: string;
  highlightLine?: number;
}
```

### 3. RequestResponseInspector (`RequestResponseInspector.tsx`)

**Purpose**: Display request/response details for AWS API calls.

**Features**:
- List of all captured requests with service name and status
- Request details: HTTP method, endpoint, headers, body, timestamp
- Response details: status code, headers, body, latency
- JSON formatting with syntax highlighting
- Color-coded status codes (2xx green, 3xx blue, 4xx orange, 5xx red)
- Color-coded latency (<100ms green, 100-500ms orange, >500ms red)
- Redacted authentication tokens in headers
- Tab switching between request and response views

**Props**:
- `requests: RequestResponsePair[]` - Array of request/response pairs

**Request/Response Interface**:
```typescript
interface RequestResponsePair {
  id: string;
  request: {
    method: string;
    endpoint: string;
    headers: Record<string, string>;
    body: any;
    timestamp: number;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
    latency: number;
  };
  service: string;
}
```

### 4. AWSConsoleLinks (`AWSConsoleLinks.tsx`)

**Purpose**: Generate deep links to AWS Console for each service.

**Features**:
- Deep links to Bedrock, Guardrails, Neptune, Step Functions, DynamoDB, CloudWatch, CloudTrail
- Context-aware links (includes execution ARN, log group, table name when available)
- Visual indicators for links with context (highlighted)
- Opens links in new tab to preserve demo UI state
- Displays current AWS region
- Service icons for visual identification

**Props**:
- `region?: string` - AWS region (default: 'us-east-1')
- `executionArn?: string` - Step Functions execution ARN
- `logGroup?: string` - CloudWatch log group name
- `tableName?: string` - DynamoDB table name
- `neptuneClusterId?: string` - Neptune cluster ID
- `guardrailId?: string` - Bedrock Guardrails policy ID

### 5. LayoutManager (`LayoutManager.tsx`)

**Purpose**: Manage multi-screen layout configurations and resizable panels.

**Features**:
- Three layout modes:
  - Demo Only (Ctrl+1)
  - Demo + Code (Ctrl+2)
  - Demo + Code + Logs (Ctrl+3)
- Keyboard shortcuts for quick layout switching
- Visual indicators for active layout
- Layout state persisted to localStorage

**ResizablePanel Features**:
- Drag handle for resizing sidebar width
- Min/max width constraints (300px - 800px)
- Visual feedback during resize
- Width persisted to localStorage

**Props**:
- `currentLayout: LayoutMode` - Current layout mode
- `onLayoutChange: (layout: LayoutMode) => void` - Callback when layout changes

**Layout Modes**:
```typescript
type LayoutMode = 'demo-only' | 'demo-code' | 'demo-code-logs';
```

## Main ObservabilitySidebar Component

The main `ObservabilitySidebar.tsx` component integrates all sub-components and manages:

- WebSocket connection for real-time updates
- Tab navigation between Logs, Code, Requests, and Console views
- Layout mode management
- Panel resizing
- State persistence to localStorage
- Message handling for different event types:
  - `LOG_EVENT` - New log entry
  - `CODE_UPDATE` - Code file updates
  - `REQUEST_SENT` - New API request
  - `RESPONSE_RECEIVED` - API response received
  - `AWS_CONTEXT_UPDATE` - AWS context information update

## WebSocket Message Types

The observability sidebar expects the following WebSocket message types:

```typescript
// Log event
{
  message_type: 'LOG_EVENT',
  timestamp: number,
  payload: {
    timestamp: number,
    message: string,
    log_stream: string,
    level?: string,
    execution_id?: string,
    lambda_name?: string
  }
}

// Code update
{
  message_type: 'CODE_UPDATE',
  timestamp: number,
  payload: {
    files: Array<{
      path: string,
      content: string,
      language: string,
      highlightLine?: number
    }>
  }
}

// Request sent
{
  message_type: 'REQUEST_SENT',
  timestamp: number,
  payload: {
    id: string,
    request: { ... },
    service: string
  }
}

// Response received
{
  message_type: 'RESPONSE_RECEIVED',
  timestamp: number,
  payload: {
    id: string,
    response: { ... }
  }
}

// AWS context update
{
  message_type: 'AWS_CONTEXT_UPDATE',
  timestamp: number,
  payload: {
    region?: string,
    executionArn?: string,
    logGroup?: string,
    tableName?: string,
    neptuneClusterId?: string,
    guardrailId?: string
  }
}
```

## Usage Example

```typescript
import { ObservabilitySidebar } from './components/ObservabilitySidebar';

function App() {
  return (
    <div>
      {/* Your demo components */}
      <ObservabilitySidebar />
    </div>
  );
}
```

The sidebar will automatically:
- Connect to WebSocket at `ws://localhost:8080/ws`
- Display a toggle button when hidden
- Show real-time logs, code, requests, and console links
- Persist layout preferences and panel width
- Support keyboard shortcuts for layout switching

## Styling

All components use inline styles with a dark theme:
- Background: `#1f2937` (gray-800)
- Secondary background: `#111827` (gray-900)
- Borders: `#374151` (gray-700)
- Text: `#f9fafb` (gray-50)
- Muted text: `#9ca3af` (gray-400)
- Accent: `#2563eb` (blue-600)

## Dependencies

- `react` - UI framework
- `@monaco-editor/react` - Code editor component
- `monaco-editor` - Monaco Editor core

## Requirements Validation

This implementation satisfies the following requirements from the design document:

**Requirement 13.1**: Source code display with syntax highlighting ✓
**Requirement 13.2**: CloudWatch Logs streaming in real-time ✓
**Requirement 13.3**: Lambda function name and execution ID filtering ✓
**Requirement 13.4**: Step Functions state transitions visible ✓
**Requirement 13.10**: AWS Console deep linking with context ✓
**Requirement 13.11**: Monaco Editor with Python, JSON, Gremlin support ✓
**Requirement 13.12**: Request inspector showing prompts and queries ✓
**Requirement 13.13**: Response time metrics in milliseconds ✓
**Requirement 13.14**: Multi-screen layout management with keyboard shortcuts ✓

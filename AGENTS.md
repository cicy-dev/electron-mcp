# AGENTS.md

This file provides guidelines for AI agents working on this codebase.

## Build, Lint, and Test Commands

### Core Commands
```bash
# Start the MCP server (runs Electron app with MCP endpoint)
npm start

# Run tests (Jest with forceExit to handle hanging processes)
npm test

# Run a single test
npm test -- --testNamePattern="test name"

# Install additional dependencies
npm run install-deps
```

### Test Configuration
- Tests are located in `tests/api.test.js`
- Jest runs with default configuration (no config file found)
- Tests use supertest for HTTP API testing
- Tests start an actual Electron MCP server on port 8102
- SSE connections are established for real-time communication

## Code Style Guidelines

### Language
- This is a **CommonJS** project using `require()` syntax
- No TypeScript - write plain JavaScript
- Use ES6+ features (async/await, arrow functions, template literals)

### File Organization
- Main entry: `main.js` (Electron + MCP server)
- Launcher: `start-mcp.js` (port management + Electron spawner)
- Utilities: `snapshot-utils.js`, `call-snapshot.js`
- Tests: `tests/api.test.js`

### Imports
```javascript
// Standard order:
const { app, BrowserWindow } = require('electron');
const http = require('http');
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { z } = require("zod");
const { captureSnapshot } = require('./snapshot-utils');
```

### Naming Conventions
- **Classes**: PascalCase (`ElectronMcpServer`)
- **Functions/variables**: camelCase (`getWindows`, `httpServer`)
- **Constants**: SCREAMING_SNAKE_CASE for true constants
- **Tool names**: snake_case (`open_window`, `get_windows`)
- **Descriptive variable names** (avoid single letters except loop counters)

### Error Handling
All tool handlers must return structured errors:
```javascript
try {
  // ... operation
  return {
    content: [{ type: "text", text: "success message" }],
  };
} catch (error) {
  return {
    content: [{ type: "text", text: `Error: ${error.message}` }],
    isError: true,
  };
}
```

### MCP Tool Schema
Use Zod for input validation:
```javascript
this.registerTool(
  "tool_name",
  "Description of what the tool does",
  {
    param1: z.string().describe("Parameter description"),
    param2: z.number().optional().default(1).describe("Optional with default"),
  },
  async ({ param1, param2 }) => {
    return { content: [{ type: "text", text: "result" }] };
  }
);
```

### Response Format
MCP responses use a consistent structure:
```javascript
// Text response
return { content: [{ type: "text", text: "message" }] };

// Image response (NativeImage from Electron)
return {
  content: [
    { type: "text", text: `Captured Image: ${width}x${height}` },
    { type: "image", data: base64String, mimeType: "image/png" }
  ]
};

// Error response
return { content: [{ type: "text", text: "error" }], isError: true };
```

### Async/Await
- Use `async/await` over callbacks or `.then()`
- Always handle promise rejections with try/catch
- Add reasonable delays when waiting for Electron events

### Code Patterns

#### Window Lookup Pattern
```javascript
const win = BrowserWindow.fromId(win_id);
if (!win) throw new Error(`Window ${win_id} not found`);
```

#### Object Serialization
Handle circular references when stringify:
```javascript
outputText = JSON.stringify(result, (key, value) =>
  typeof value === 'bigint' ? value.toString() : value, 2
);
```

#### NativeImage Handling
Convert Electron NativeImage to MCP image format:
```javascript
if (result.constructor.name === 'NativeImage') {
  const size = result.getSize();
  const base64 = result.toPNG().toString('base64');
  return {
    content: [
      { type: "text", text: `Captured Image: ${size.width}x${size.height}` },
      { type: "image", data: base64, mimeType: "image/png" }
    ]
  };
}
```

### Console Logging
Use consistent format for MCP operations:
```javascript
console.log(`[MCP] SSE connection established, sessionId: ${transport.sessionId}`);
console.error("[MCP] SSE connection error:", error);
```

### Testing Patterns
- Use Jest `describe` and `test` blocks
- Tests are integration tests that spin up real servers
- Clean up processes in `afterAll` hooks
- Use `requestId` counter for correlating requests/responses

### Electron Best Practices
- `nodeIntegration: false` and `contextIsolation: true` in webPreferences
- Use `app.whenReady()` for initialization
- Handle `window-all-closed` event properly
- Attach debugger with version string: `debugger.attach('1.3')`

### Security
- Never log secrets or API keys
- Validate all inputs with Zod schemas
- Return structured errors without exposing internal details

# LLM Automation Skill

A powerful MCP skill that allows you to control various LLM web interfaces (Gemini, Claude, ChatGPT) using the Electron MCP server.

## Features

- **Multi-Provider Support**:
  - Google AI Studio (Gemini)
  - Claude.ai
  - ChatGPT (OpenAI)
- **Dual Modes**:
  - **CLI**: Run directly from the command line for testing or scripting.
  - **MCP Server**: Exposes tools (`ask_gemini`, `ask_claude`, `ask_openai`) to be used by other agents.
- **Robust Automation**:
  - Automatically finds existing windows or opens new ones.
  - Handles focus, typing, and clicking "Send".
  - Polls for completion to return the full response.

## Prerequisites

1. **Electron MCP Server** must be running on port 8101 (default).
   ```bash
   # In the root of electron-mcp
   npm start
   ```
2. **Auth Token**: `~/electron-mcp-token.txt` must exist (created automatically by Electron MCP).

## Installation

```bash
cd skills/llm-automation
npm install
```

## Usage

### 1. Command Line Interface (CLI)

You can send a prompt to any provider and get the response in your terminal.

```bash
# Gemini (Default)
node cli.js "What is the capital of France?"

# Explicit Provider
node cli.js --provider gemini "Hello Gemini"
node cli.js --provider claude "Hello Claude"
node cli.js --provider openai "Hello ChatGPT"
```

### 2. MCP Server

This directory is itself an MCP server. You can add it to your valid MCP client configuration (like Claude Desktop or Kiro).

**Tools Exposed:**
- `ask_gemini`: Sends a prompt to Google AI Studio.
- `ask_claude`: Sends a prompt to Claude.ai.
- `ask_openai`: Sends a prompt to ChatGPT.

**Run via Stdio:**
```bash
node index.js
```

## Architecture

- `rpc-client.js`: Low-level JSON-RPC client for Electron MCP.
- `driver.js`: Abstract base class for LLM providers.
- `providers/`: Implementation specific logic for each LLM.
- `cli.js`: CLI entry point.
- `index.js`: MCP Server entry point.

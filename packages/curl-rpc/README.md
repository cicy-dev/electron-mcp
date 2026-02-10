# curl-rpc

Lightweight MCP RPC CLI tool with YAML/JSON support for electron-mcp.

## Installation

```bash
npm install -g curl-rpc
```

## Usage

### Simple syntax
```bash
curl-rpc ping
curl-rpc open_window url=https://google.com
curl-rpc get_window_info win_id=1
```

### YAML format
```bash
curl-rpc "
name: open_window
arguments:
  url: https://google.com
  reuseWindow: false
"
```

### JSON format
```bash
curl-rpc --json '{"name":"ping","arguments":{}}'
```

## Configuration

Set the MCP server URL (default: http://localhost:8101):
```bash
export ELECTRON_MCP_URL=http://your-server:8101
```

Create token file:
```bash
echo "your-token" > ~/electron-mcp-token.txt
```

## Requirements

- Node.js >= 14
- `yq` for YAML support: `pip install yq`

## Documentation

Full documentation: https://github.com/cicy-dev/electron-mcp

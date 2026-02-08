const axios = require('axios');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * RPC MCP Client
 * Communicates directly with Electron MCP via HTTP RPC endpoint.
 */
class RPCMCPClient {
    constructor(port = 8101, host = 'localhost') {
        this.baseUrl = `http://${host}:${port}`;
        this.requestId = 1;

        // Read auth token if available
        const tokenPath = path.join(os.homedir(), 'electron-mcp-token.txt');
        if (fs.existsSync(tokenPath)) {
            this.authToken = fs.readFileSync(tokenPath, 'utf8').trim();
        }
    }

    /**
     * Call an MCP tool
     */
    async callTool(toolName, args = {}) {
        const requestId = this.requestId++;
        const payload = {
            jsonrpc: '2.0',
            id: requestId,
            method: 'tools/call',
            params: {
                name: toolName,
                arguments: args,
            },
        };

        try {
            const response = await axios.post(`${this.baseUrl}/rpc`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {})
                },
            });

            if (response.data.error) {
                throw new Error(response.data.error.message || 'MCP error');
            }

            return response.data.result;
        } catch (error) {
            if (error.response) {
                throw new Error(`RPC Call Failed: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }

    /**
     * Helper: Open a window
     */
    async openWindow(url, accountIdx = 0) {
        const result = await this.callTool('open_window', { url, accountIdx });
        // Result format: content: [{ text: "ID: 1 | ..." }]
        // We need to parse ID.
        const text = result.content[0].text;
        const match = text.match(/ID:\s*(\d+)/);
        if (!match) {
            // Fallback: maybe just return number if API changes? 
            // For now, assume consistent format from electron-mcp
            // Use a simpler regex just in case
            const matchSimple = text.match(/Created window (\d+)/) || text.match(/window (\d+)/);
            if (matchSimple) return parseInt(matchSimple[1], 10);

            // If open_window returns "Opened window with ID: X..."
            const matchOpen = text.match(/ID:\s*(\d+)/);
            if (matchOpen) return parseInt(matchOpen[1], 10);

            throw new Error(`Failed to extract window ID from: ${text}`);
        }
        return parseInt(match[1], 10);
    }

    /**
     * Helper: Get all windows
     */
    async getWindows() {
        return await this.callTool('get_windows');
    }

    /**
     * Helper: Close window
     */
    async closeWindow(winId) {
        return await this.callTool('close_window', { win_id: winId });
    }
}

module.exports = RPCMCPClient;

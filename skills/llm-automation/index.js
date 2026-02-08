const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const RPCMCPClient = require('./rpc-client');
const GeminiProvider = require('./providers/gemini');
const ClaudeProvider = require('./providers/claude');
const OpenAIProvider = require('./providers/openai');

// Initialize MCP Server
const server = new McpServer({
    name: "llm-automation-skill",
    version: "1.0.0"
});

async function runProvider(ProviderClass, prompt) {
    const client = new RPCMCPClient();
    const provider = new ProviderClass(client);
    await provider.open();
    await provider.sendPrompt(prompt);
    return await provider.getReply();
}

// Register Tool: ask_gemini
server.registerTool(
    "ask_gemini",
    { prompt: z.string().describe("The prompt to send to Gemini") },
    async ({ prompt }) => {
        try {
            const reply = await runProvider(GeminiProvider, prompt);
            return { content: [{ type: "text", text: reply }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
    }
);

// Register Tool: ask_claude
server.registerTool(
    "ask_claude",
    { prompt: z.string().describe("The prompt to send to Claude") },
    async ({ prompt }) => {
        try {
            const reply = await runProvider(ClaudeProvider, prompt);
            return { content: [{ type: "text", text: reply }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
    }
);

// Register Tool: ask_openai
server.registerTool(
    "ask_openai",
    { prompt: z.string().describe("The prompt to send to ChatGPT") },
    async ({ prompt }) => {
        try {
            const reply = await runProvider(OpenAIProvider, prompt);
            return { content: [{ type: "text", text: reply }] };
        } catch (error) {
            return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
        }
    }
);

// Start Server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("LLM Automation MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});

#!/usr/bin/env node
const RPCMCPClient = require('./rpc-client');
const GeminiProvider = require('./providers/gemini');
const ClaudeProvider = require('./providers/claude');
const OpenAIProvider = require('./providers/openai');

async function main() {
    const args = process.argv.slice(2);
    const providerName = args.find((arg, i) => args[i - 1] === '--provider') || 'gemini';
    const prompt = args.find((arg, i) => !arg.startsWith('--') && args[i - 1] !== '--provider') || args[args.length - 1];

    if (!prompt || prompt.startsWith('--')) {
        console.error('Usage: node cli.js --provider <gemini|claude|openai> "<prompt>"');
        process.exit(1);
    }

    console.log(`🚀 Starting ${providerName} automation...`);
    console.log(`📝 Prompt: ${prompt}`);

    const client = new RPCMCPClient();
    let provider;

    switch (providerName.toLowerCase()) {
        case 'gemini':
            provider = new GeminiProvider(client);
            break;
        case 'claude':
            provider = new ClaudeProvider(client);
            break;
        case 'openai':
        case 'chatgpt':
            provider = new OpenAIProvider(client);
            break;
        default:
            console.error(`Unknown provider: ${providerName}`);
            console.error('Available: gemini, claude, openai');
            process.exit(1);
    }

    try {
        await provider.open();
        await provider.sendPrompt(prompt);
        const reply = await provider.getReply();

        console.log('\n💬 Reply:');
        console.log('----------------------------------------');
        console.log(reply);
        console.log('----------------------------------------');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

if (require.main === module) {
    main();
}

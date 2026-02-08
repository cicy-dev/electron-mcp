const LLMProvider = require('../driver');

/**
 * Claude Provider (claude.ai)
 */
class ClaudeProvider extends LLMProvider {
    constructor(rpcClient) {
        super(rpcClient);
        this.url = 'https://claude.ai';
    }

    async open(accountIdx = 0) {
        console.log('🔌 Connecting to Claude.ai...');

        const windowsParams = await this.client.getWindows();
        let winId = null;

        if (windowsParams && windowsParams.content) {
            for (const item of windowsParams.content) {
                if (item.text.includes('claude.ai') || item.text.includes('Claude')) {
                    const match = item.text.match(/^\d+-(\d+)\s+\|/);
                    if (match) {
                        winId = parseInt(match[1]);
                        console.log(`🔍 Found existing Claude window: ${item.text} (ID: ${winId})`);
                        break;
                    }
                }
            }
        }

        if (!winId) {
            console.log('✨ Opening new Claude window...');
            winId = await this.client.openWindow(this.url, accountIdx);
            console.log(`✅ Window opened with ID: ${winId}`);
            console.log('⏳ Waiting 10s for page load...');
            await new Promise(resolve => setTimeout(resolve, 10000));
        }

        this.winId = winId;
        return winId;
    }

    async sendPrompt(text) {
        if (!this.winId) throw new Error('Window not initialized');

        console.log('🤖 Sending prompt to Claude...');

        // Focus Input - Claude usually has a contenteditable div
        const script = `
        return (function() {
          const el = document.querySelector('[contenteditable="true"], textarea');
          if (el) {
             el.focus();
             // Simulate typing is better for Claude as it might rely on events
             el.innerText = ''; // Clear?
             return 'true';
          }
          return 'false';
        })()
        `;

        // Improve: use cdp_type_text after focusing
        const focusResult = await this.client.callTool('exec_js', { win_id: this.winId, code: script });
        if (focusResult?.content?.[0]?.text !== 'true') {
            throw new Error('Could not find Claude input');
        }

        await this.client.callTool('cdp_type_text', { win_id: this.winId, text });

        // Click Send
        // Claude send button is often an arrow icon or has specific class
        // We'll try Enter first as it's standard for chat interfaces
        console.log('🚀 Pressing Enter...');
        await this.client.callTool('cdp_press_enter', { win_id: this.winId });
    }

    async getReply() {
        if (!this.winId) throw new Error('Window not initialized');
        console.log('⏳ Waiting for Claude reply...');

        // Claude's replies stream. We wait for stability.
        await new Promise(resolve => setTimeout(resolve, 3000));

        let lastText = '';
        let stableCount = 0;

        for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const result = await this.client.callTool('exec_js', {
                win_id: this.winId,
                code: `
                    // Get the last message from the assistant
                    const msgs = document.querySelectorAll('.font-claude-message, [data-test-id="completion-content"]');
                    if (msgs.length > 0) {
                        return msgs[msgs.length - 1].innerText;
                    }
                    return document.body.innerText.slice(-2000);
                 `
            });

            const currentText = result.content[0].text;
            if (currentText === lastText && currentText.length > 20) {
                stableCount++;
                if (stableCount >= 2) return currentText;
            } else {
                stableCount = 0;
            }
            lastText = currentText;
        }
        return lastText;
    }
}

module.exports = ClaudeProvider;

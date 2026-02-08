const LLMProvider = require('../driver');

/**
 * OpenAI Provider (ChatGPT)
 */
class OpenAIProvider extends LLMProvider {
    constructor(rpcClient) {
        super(rpcClient);
        this.url = 'https://chatgpt.com';
    }

    async open(accountIdx = 0) {
        console.log('🔌 Connecting to ChatGPT...');

        const windowsParams = await this.client.getWindows();
        let winId = null;

        if (windowsParams && windowsParams.content) {
            for (const item of windowsParams.content) {
                if (item.text.includes('chatgpt.com') || item.text.includes('ChatGPT')) {
                    const match = item.text.match(/^\d+-(\d+)\s+\|/);
                    if (match) {
                        winId = parseInt(match[1]);
                        console.log(`🔍 Found existing ChatGPT window: ${item.text} (ID: ${winId})`);
                        break;
                    }
                }
            }
        }

        if (!winId) {
            console.log('✨ Opening new ChatGPT window...');
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

        console.log('🤖 Sending prompt to ChatGPT...');

        // Focus Input - #prompt-textarea is common
        const script = `
        return (function() {
          const el = document.querySelector('#prompt-textarea') || document.querySelector('textarea');
          if (el) {
             el.focus();
             el.click();
             return 'true';
          }
          return 'false';
        })()
        `;

        const focusResult = await this.client.callTool('exec_js', { win_id: this.winId, code: script });
        if (focusResult?.content?.[0]?.text !== 'true') {
            throw new Error('Could not find ChatGPT input');
        }

        await this.client.callTool('cdp_type_text', { win_id: this.winId, text });

        console.log('🚀 Pressing Enter...');
        await this.client.callTool('cdp_press_enter', { win_id: this.winId });
    }

    async getReply() {
        if (!this.winId) throw new Error('Window not initialized');
        console.log('⏳ Waiting for ChatGPT reply...');

        await new Promise(resolve => setTimeout(resolve, 3000));

        let lastText = '';
        let stableCount = 0;

        for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const result = await this.client.callTool('exec_js', {
                win_id: this.winId,
                code: `
                    // Get the last assistant message
                    const msgs = document.querySelectorAll('[data-message-author-role="assistant"]');
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

module.exports = OpenAIProvider;

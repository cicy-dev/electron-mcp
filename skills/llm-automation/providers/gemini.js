const LLMProvider = require('../driver');

/**
 * Gemini Provider (AI Studio)
 */
class GeminiProvider extends LLMProvider {
    constructor(rpcClient) {
        super(rpcClient);
        this.url = 'https://aistudio.google.com/app/prompts/new_chat';
    }

    async open(accountIdx = 0) {
        console.log('🔌 Connecting to AI Studio...');

        // 1. Check for existing windows
        const windowsParams = await this.client.getWindows();
        let winId = null;

        if (windowsParams && windowsParams.content) {
            for (const item of windowsParams.content) {
                if (item.text.includes('aistudio.google.com') || item.text.includes('AI Studio')) {
                    const match = item.text.match(/^\d+-(\d+)\s+\|/);
                    if (match) {
                        winId = parseInt(match[1]);
                        console.log(`🔍 Found existing AI Studio window: ${item.text} (ID: ${winId})`);
                        break;
                    }
                }
            }
        }

        // 2. Open new window if not found
        if (!winId) {
            console.log('✨ Opening new AI Studio window...');
            winId = await this.client.openWindow(this.url, accountIdx);
            console.log(`✅ Window opened with ID: ${winId}`);
        } else {
            console.log(`🔃 Navigating window ${winId} to ${this.url}...`);
            await this.client.callTool('load_url', { win_id: winId, url: this.url });
        }

        // Wait for potential redirect or load
        console.log('⏳ Waiting for page load...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Check if redirected to restricted
        const checkResult = await this.client.callTool('exec_js', { win_id: winId, code: 'window.location.href' });
        if (checkResult?.content?.[0]?.text?.includes('prompt-access-restricted')) {
            console.log('⚠️ Access restricted URL detected. Trying fallback to home page...');
            await this.client.callTool('load_url', { win_id: winId, url: 'https://aistudio.google.com/app/home' });
            await new Promise(resolve => setTimeout(resolve, 8000));
        }

        this.winId = winId;
        return winId;
    }

    async sendPrompt(text) {
        if (!this.winId) throw new Error('Window not initialized. Call open() first.');

        console.log('🤖 Sending prompt...');

        // Focus Input
        const focusScript = `
        return (function() {
          function querySelectorDeep(selector, root = document) {
            let el = root.querySelector(selector);
            if (el) return el;
            
            const walkers = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
            while (walkers.nextNode()) {
              const node = walkers.currentNode;
              if (node.shadowRoot) {
                el = querySelectorDeep(selector, node.shadowRoot);
                if (el) return el;
              }
            }
            return null;
          }

          const selectors = [
            'textarea[aria-label="Enter a prompt"]',
            'textarea.textarea',
            'textarea', 
            '[contenteditable="true"]'
          ];
          for (const selector of selectors) {
             const el = querySelectorDeep(selector);
             if (el) {
                el.focus();
                el.click();
                return 'true';
             }
          }
          return 'false';
        })()
        `;

        const focusResult = await this.client.callTool('exec_js', { win_id: this.winId, code: focusScript });
        if (!focusResult || !focusResult.content || focusResult.content[0].text !== 'true') {
            throw new Error('Could not find input element');
        }

        // Type text
        await this.client.callTool('cdp_type_text', { win_id: this.winId, text });

        // Wait for button to be enabled (it might be disabled until text is typed)
        console.log('⏳ Waiting for run button to be ready...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Click Run
        const clickScript = `
        return (function() {
             function findButton() {
                // Try specific selectors first
                const specific = document.querySelector('button.ctrl-enter-submits') || 
                               document.querySelector('button[type="submit"]');
                if (specific) return specific;

                function querySelectorAllDeep(selector, root = document) {
                  let results = Array.from(root.querySelectorAll(selector));
                  const walkers = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
                  while (walkers.nextNode()) {
                    const node = walkers.currentNode;
                    if (node.shadowRoot) {
                      results = results.concat(querySelectorAllDeep(selector, node.shadowRoot));
                    }
                  }
                  return results;
                }
                
                const buttons = querySelectorAllDeep('button');
                for (const btn of buttons) {
                   const txt = (btn.textContent || '').trim().toLowerCase();
                   const label = (btn.getAttribute('aria-label') || '').toLowerCase();
                   if (txt === 'run' || label === 'run' || label === 'send message' || label === 'send') {
                      return btn;
                   }
                }
                return null;
             }
             
             const btn = findButton();
             if (btn && !btn.disabled) {
                btn.click();
                return 'CLICKED_BUTTON';
             }
             return btn ? 'BUTTON_DISABLED' : 'BUTTON_NOT_FOUND';
        })()
        `;

        const clickResult = await this.client.callTool('exec_js', { win_id: this.winId, code: clickScript });
        const clickStatus = clickResult?.content?.[0]?.text;

        if (clickStatus === 'CLICKED_BUTTON') {
            console.log('✅ Clicked Run button');
        } else {
            console.log(`⚠️ Run button state: ${clickStatus}. Using Enter fallback`);
            await this.client.callTool('cdp_press_enter', { win_id: this.winId });
        }
    }

    async getReply() {
        if (!this.winId) throw new Error('Window not initialized');

        console.log('⏳ Waiting for reply...');

        // Polling loop
        // We will snapshot the text length and wait for it to stabilize or change?
        // Simple approach: Wait for specific time, or poll for "Thinking" to disappear if possible.
        // For now, let's use the simple wait-then-read approach from auto-run, but maybe smarter?

        // Initial wait for network
        await new Promise(resolve => setTimeout(resolve, 2000));

        let lastText = '';
        let stableCount = 0;

        // Poll for 30 seconds max
        for (let i = 0; i < 15; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            const result = await this.client.callTool('exec_js', {
                win_id: this.winId,
                code: `return document.body.innerText.slice(-3000)`
            });

            const currentText = result.content[0].text;

            // Detect "Thinking..." ?? 
            // AI Studio doesn't always show "Thinking".

            if (currentText === lastText && currentText.trim().length > 0) {
                stableCount++;
                if (stableCount >= 3) {
                    console.log(`✅ Text stabilized after ${stableCount * 2}s`);
                    return currentText.trim();
                }
            } else {
                stableCount = 0;
            }
            lastText = currentText;
        }

        console.warn('⚠️ Polling timed out. Returning last captured text.');
        return lastText.trim();
    }
}

module.exports = GeminiProvider;

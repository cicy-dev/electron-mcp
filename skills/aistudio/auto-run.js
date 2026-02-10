const RPCMCPClient = require('./rpc-client');
const config = require('./config');

/**
 * AI Studio UI Automation Script
 * 
 * This script demonstrates how to use the Electron MCP RPC interface to:
 * 1. Connect to the MCP server
 * 2. Open or reuse an AI Studio window
 * 3. Perform automated UI interactions (focus input, type text, etc.)
 * 
 * Note: The Electron remote debugger is also available at port 9221 if raw CDP access is needed,
 * but this script uses the MCP RPC wrapper for convenience and authentication management.
 */
async function main() {
    const client = new RPCMCPClient(config.mcpPort, config.mcpHost);

    try {
        console.log('🔌 Connecting to MCP server...');

        // 1. Check for existing windows
        const windowsParams = await client.getWindows();
        let winId = null;

        // Parse window list
        // Expected format from server: content: [{ text: "0-1 | Title" }, ...] or similar
        if (windowsParams && windowsParams.content) {
            for (const item of windowsParams.content) {
                if (item.text.includes('aistudio.google.com') || item.text.includes('AI Studio')) {
                    // Try to extract ID. Format usually "{accountIdx}-{winId} | {Title}"
                    // Example: "0-1 | Google AI Studio"
                    // Or just parse simple integer if only number
                    // Let's assume standard format "{account}-{id} | {title}".
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
            // open_window returns just ID directly as number in rpc-client wrapper? No, let's check wrapper.
            // rpc-client.js: `openWindow` returns `parseInt(match[1], 10)` -> Number. Yes.
            winId = await client.openWindow(config.aistudioUrl, config.defaultAccountIdx);
            console.log(`✅ Window opened with ID: ${winId}`);

            // Give it some time to load
            console.log('⏳ Waiting 10 seconds for page load...');
            await new Promise(resolve => setTimeout(resolve, 10000));
        } else {
            console.log('👉 Using existing window.');
        }

        // 3. UI Interaction
        console.log('🤖 Starting UI Automation...');

        // Focus the window (bring to front)
        // We can use exec_js to focus window if needed, but usually CDP handles background tabs fine.

        // A. Check Page Title
        const titleResult = await client.callTool('exec_js', {
            win_id: winId,
            code: 'document.title'
        });
        // exec_js returns content array
        if (titleResult && titleResult.content && titleResult.content.length > 0) {
            console.log('📄 Current Page Title:', titleResult.content[0].text);
        }

        // B. Attempt to find and focus the prompt textarea
        // AI Studio typically has a textarea or contenteditable div.
        // We will try a few common selectors.
        const selectors = [
            'textarea',
            '[contenteditable="true"]',
            'input[type="text"]'
        ];

        let focused = false;
        // Iterate and try to focus
        for (const selector of selectors) {
            console.log(`Trying to focus selector: "${selector}"...`);
            // Use exec_js to find and focus
            const script = `
        return (function() {
          const el = document.querySelector('${selector}');
          if (el) {
            el.focus();
            el.click();
            return 'true';
          }
          return 'false';
        })()
      `;

            const focusResult = await client.callTool('exec_js', {
                win_id: winId,
                code: script
            });

            if (focusResult && focusResult.content && focusResult.content[0].text === 'true') {
                console.log(`✅ Successfully focused "${selector}"`);
                focused = true;
                break;
            }
        }

        if (focused) {
            // C. Type text
            // Get prompt from CLI args or use default
            const defaultPrompt = "Hello, this is an automated message from Electron MCP Skill! 🚀";
            const prompt = process.argv[2] || defaultPrompt;

            console.log(`⌨️ Typing message: "${prompt}"`);

            await client.callTool('cdp_type_text', {
                win_id: winId,
                text: prompt
            });

            console.log('✅ Text typed successfully.');

            // D. Send the message
            // Try finding the Run button first (more reliable than Enter in some UIs)
            console.log('🚀 Attempting to send message...');

            // 1. Try finding a button with "Run" or "Send" in aria-label or text
            const clickResult = await client.callTool('exec_js', {
                win_id: winId,
                code: `
          return (function() {
             function findButton() {
                // Helper to search deep
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
                // Filter for likely run buttons
                for (const btn of buttons) {
                   const txt = (btn.textContent || '').trim().toLowerCase();
                   const label = (btn.getAttribute('aria-label') || '').toLowerCase();
                   if (txt === 'run' || label === 'run' || label === 'send message' || label === 'send') {
                      return btn; // Found it
                   }
                }
                return null;
             }
             
             const btn = findButton();
             if (btn) {
                btn.click();
                return 'CLICKED_BUTTON';
             }
             
             // Debug: Dump HTML around the input to find the button
             // Assuming input is focused or we can find it again
             const active = document.activeElement;
             if (active) {
                let parent = active.parentElement;
                while (parent && parent.innerText.length < 200) {
                   parent = parent.parentElement;
                }
                if (parent) return 'DUMP:' + parent.outerHTML;
             }
             
             return 'BUTTON_NOT_FOUND';
          })()
        `
            });

            if (clickResult && clickResult.content && clickResult.content[0].text === 'CLICKED_BUTTON') {
                console.log('✅ Clicked "Run/Send" button.');
            } else if (clickResult && clickResult.content && clickResult.content[0].text.startsWith('DUMP:')) {
                console.log('⚠️ Run button not found. Dumping context HTML for debugging:');
                console.log(clickResult.content[0].text.substring(5)); // Remove DUMP:

                console.log('⚠️ Falling back to Ctrl+Enter...');
                // Try Ctrl+Enter using cdp_press_key with modifiers if available, or just sequence
                // cdp_press_enter is simple. Let's try cdp_press_key properly if possible.
                await client.callTool('cdp_press_key', { win_id: winId, key: 'Enter', modifiers: 2 }); // 2 = Ctrl? Need to check CDP docs or use synthetic event
            } else {
                console.log('⚠️ Run button not found, falling back to Ctrl+Enter / Enter...');
                // Fallback: Try Ctrl+Enter (using raw CDP if needed, or just Enter)
                // Let's just use cdp_press_enter
                await client.callTool('cdp_press_enter', { win_id: winId });
            }

            // Wait for response
            console.log('⏳ Waiting 15 seconds for AI response...');
            await new Promise(resolve => setTimeout(resolve, 15000));

            // E. Capture Response
            const responseResult = await client.callTool('exec_js', {
                win_id: winId,
                code: `return document.body.innerText.slice(-2000)`
            });

            if (responseResult && responseResult.content) {
                console.log('📝 Page Text (Last 2000 chars):');
                console.log('---------------------------------------------------');
                console.log(responseResult.content[0].text);
                console.log('---------------------------------------------------');
            }

        } else {
            console.error('❌ Could not find an input element to focus.');
        }

        console.log('🎉 Automation sequence completed.');

    } catch (error) {
        console.error('💥 Error running auto-ui:', error);
        if (error.response) {
            console.error('Error Details:', JSON.stringify(error.response.data));
        } else {
            console.error(error.message);
        }
    }
}

if (require.main === module) {
    main();
}

module.exports = main;

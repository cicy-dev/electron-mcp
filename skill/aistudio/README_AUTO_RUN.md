# Auto UI Run for AI Studio Skill

This guide explains the "Auto UI Run" feature, which uses the Electron MCP RPC interface to automate interactions with Google AI Studio.

## 🚀 Quick Start

1.  **Start the MCP Server**:
    ```bash
    bash ./service.sh start
    ```

2.  **Run the Automation**:
    ```bash
    cd skill/aistudio
    npm run auto
    ```

## 🛠️ How it Works

The script `auto-run.js` performs the following steps:

1.  **Connect**: Establishes a connection to the local MCP server (port 8101).
2.  **Window Management**:
    - Checks if AI Studio is already open.
    - If not, opens a new window (`open_window` tool).
3.  **UI Interaction**:
    - **Finds Input**: Scans the DOM (including Shadow DOM) for a valid text input area (`textarea`, `contenteditable`, etc.).
    - **Focus & Type**: Focuses the element and types a predefined message using `cdp_type_text`.
    - **Submit**: Presses `Enter` using `cdp_press_enter` to submit the prompt.

## 🧩 Customization

### Changing the Target Selector
If the script fails to find the input (e.g., due to AI Studio UI updates), you can modify the selector in `auto-run.js`:

```javascript
// In auto-run.js
const inputs = querySelectorAllDeep('your-new-selector', ...);
```

### Clicking Buttons instead of Enter
If pressing Enter creates a new line instead of sending, switch to clicking the "Run" button:

1.  Find the button's selector.
2.  Use `get_element_client_bound` to get its coordinates.
3.  Use `cdp_click` to click it.

```javascript
// Example helper
await client.callTool('cdp_click', { 
  win_id: winId, 
  x: 500, // Replace with button X
  y: 600  // Replace with button Y
});
```

## 🔍 Troubleshooting

-   **"Could not find an input element"**: The script will print a list of all found inputs to the console. Use this to identify the correct tag/class.
-   **No Response**: Ensure you are logged in. The script does not handle 2FA or login flows automatically.

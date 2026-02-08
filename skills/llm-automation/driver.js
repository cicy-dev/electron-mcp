/**
 * Abstract Base Class for LLM Providers
 */
class LLMProvider {
    constructor(rpcClient) {
        this.client = rpcClient;
        this.winId = null;
    }

    /**
     * Initialize connection to the provider (e.g. open URL)
     * @param {number} accountIdx - The account index to use
     * @returns {Promise<void>}
     */
    async open(accountIdx = 0) {
        throw new Error('Not implemented');
    }

    /**
     * Send a prompt to the LLM
     * @param {string} text - The prompt text
     * @returns {Promise<void>}
     */
    async sendPrompt(text) {
        throw new Error('Not implemented');
    }

    /**
     * Wait for and return the reply
     * @returns {Promise<string>}
     */
    async getReply() {
        throw new Error('Not implemented');
    }
}

module.exports = LLMProvider;

const { z } = require("zod");

module.exports = (registerTool) => {
  registerTool("ping", "测试 MCP 服务器连接", z.object({}), async () => {
    const now = new Date();
    const utc8Time = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
    return {
      content: [{ type: "text", text: `Pong v:2 ${utc8Time}` }],
    };
  }, { tag: "System" });
};

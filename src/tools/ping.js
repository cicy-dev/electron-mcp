const { z } = require("zod");

module.exports = (registerTool) => {
  registerTool("ping", "测试 MCP 服务器连接", z.object({}), async () => {
    return {
      content: [{ type: "text", text: "Pong" }],
    };
  }, { tag: "System" });
};

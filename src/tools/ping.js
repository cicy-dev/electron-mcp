
function registerTools(server) {
  server.registerTool(
    "ping",
    "Ping",
    {},
    async () => {
      return {
        content: [{ type: "text", text: "Pone" }],
      };
    }
  );
}

module.exports = registerTools;

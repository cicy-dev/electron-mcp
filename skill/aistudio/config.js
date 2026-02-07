// AI Studio 技能配置
module.exports = {
  // Electron MCP 服务端口
  mcpPort: process.env.ELECTRON_MCP_PORT || 8101,
  
  // Electron MCP 服务地址
  mcpHost: process.env.ELECTRON_MCP_HOST || 'localhost',
  
  // AI Studio URL
  aistudioUrl: process.env.AISTUDIO_URL || 'https://aistudio.google.com',
  
  // 默认账户索引
  defaultAccountIdx: 0,
};

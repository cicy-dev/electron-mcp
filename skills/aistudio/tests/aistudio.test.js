const AIStudioTools = require('../tools/aistudio-tools');
const RPCMCPClient = require('../rpc-client');

describe('AI Studio Skill', () => {
  let tools;
  let client;
  const RPC_PORT = process.env.RPC_PORT || 8101;

  beforeAll(() => {
    // 创建 RPC 客户端（直接调用，无需连接）
    client = new RPCMCPClient(RPC_PORT);
    
    // 创建 tools 实例
    tools = new AIStudioTools();
    tools.client = client;
  });

  afterEach(async () => {
    // 清理：关闭可能打开的窗口
    if (tools && tools.getWindowId && tools.getWindowId()) {
      try {
        await tools.closeAIStudio();
      } catch (error) {
        console.log('Window already closed or not found');
      }
    }
  });

  test('should open AI Studio window', async () => {
    const windowId = await tools.openAIStudio();
    
    expect(windowId).toBeDefined();
    expect(typeof windowId).toBe('number');
    expect(windowId).toBeGreaterThan(0);
    
    console.log(`✅ AI Studio window opened: ${windowId}`);
  });

  test('should open AI Studio with custom account', async () => {
    const windowId = await tools.openAIStudio(1);
    
    expect(windowId).toBeDefined();
    expect(typeof windowId).toBe('number');
    
    console.log(`✅ AI Studio window opened with account 1: ${windowId}`);
  });

  test('should close AI Studio window', async () => {
    // 先打开窗口
    const windowId = await tools.openAIStudio();
    expect(windowId).toBeDefined();
    
    // 关闭窗口
    await tools.closeAIStudio();
    
    // 验证窗口 ID 已清空
    expect(tools.getWindowId()).toBeNull();
    
    console.log('✅ AI Studio window closed');
  });

  test('should get window ID', async () => {
    // 未打开窗口时应返回 null
    expect(tools.getWindowId()).toBeNull();
    
    // 打开窗口后应返回窗口 ID
    const windowId = await tools.openAIStudio();
    expect(tools.getWindowId()).toBe(windowId);
    
    console.log('✅ Window ID retrieved correctly');
  });

  test('should throw error when closing non-existent window', async () => {
    await expect(tools.closeAIStudio()).rejects.toThrow('No AI Studio window is open');
    
    console.log('✅ Error handling works correctly');
  });

  test('should initialize with correct config', () => {
    expect(tools).toBeDefined();
    expect(tools.getWindowId()).toBeNull();
    
    console.log('✅ Tools initialized correctly');
  });

  test('should get all windows', async () => {
    // 打开两个窗口
    const win1 = await tools.openAIStudio(0);
    const win2 = await tools.openAIStudio(1);
    
    // 获取所有窗口
    const windows = await tools.getWindows();
    
    // 验证
    expect(Array.isArray(windows)).toBe(true);
    expect(windows.length).toBeGreaterThan(0);
    
    console.log(`✅ Get windows: ${windows.length} windows found`);
    
    // 清理
    await cleanupWindows(tools.client, [win1, win2]);
  });
});

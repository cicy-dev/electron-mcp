const TemplateTools = require('../tools/template-tools');

describe('Template Skill', () => {
  let tools;

  beforeAll(() => {
    tools = new TemplateTools();
  });

  test('should ping', async () => {
    const result = await tools.ping();
    expect(result.content[0].text).toBe('Pong');
  });

  test('should get windows', async () => {
    const windows = await tools.getWindows();
    expect(Array.isArray(windows)).toBe(true);
  });
});

'use strict';
const calendarService = require('../services/calendar');

const schema = {
  type: 'function',
  // ▼▼▼ 核心修正：所有描述都应在 "function" 对象内部 ▼▼▼
  function: {
    name: 'addReminder',
    description: '为用户设置一个未来的日历提醒。必须根据当前时间计算出未来的精确时间点。例如，如果用户说“明天下午3点提醒我开会”，你需要生成明天下午3点对应的完整ISO 8601格式字符串作为datetime参数。',
    parameters: {
      type: 'object',
      properties: {
        datetime: { 
          type: 'string', 
          description: '必须是完整的 ISO 8601 格式的提醒时间，包含时区信息。' 
        },
        content: { 
          type: 'string', 
          description: '提醒的具体内容' 
        },
      },
      required: ['datetime', 'content'],
    },
  }
};

const execute = async (args, context) => {
  const { datetime, content } = args;
  const { userId } = context;
  await calendarService.addReminder(userId, new Date(datetime).getTime(), content);
  return { success: true, message: `已为你设置提醒：“${content}”` };
};

module.exports = { schema, execute };

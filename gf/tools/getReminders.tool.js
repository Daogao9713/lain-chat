'use strict';
const calendarService = require('../services/calendar');
const { parseDateFromText } = require('../utils/text-formatters');

const schema = {
  type: 'function',
  // ▼▼▼ 核心修正：所有描述都应在 "function" 对象内部 ▼▼▼
  function: {
    name: 'getRemindersForDate',
    description: '查询用户在特定日期的日程安排。例如“我明天有什么安排？”',
    parameters: {
      type: 'object',
      properties: {
        date: { 
          type: 'string', 
          description: '要查询的日期，可以是“今天”、“明天”等相对描述，或 YYYY-MM-DD 格式。' 
        },
      },
      required: ['date'],
    },
  }
};

const execute = async (args, context) => {
  const { date } = args;
  const { userId } = context;
  const targetDate = parseDateFromText(date) || date;
  return await calendarService.getRemindersForDate({ userId, date: targetDate });
};

module.exports = { schema, execute };

'use strict';
// 从 services 目录引入实际的逻辑
const weatherService = require('../services/weather');

// 1. 定义工具的 Schema (给 AI 看的说明书)
const schema = {
  type: 'function',
  function: {
    name: 'getCurrentWeather',
    description: '获取指定城市的实时天气信息。',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: '城市名称，例如：Tokyo, Osaka' },
      },
      required: ['city'],
    },
  },
};

// 2. 定义工具的执行函数
const execute = async ({ city }) => {
  return await weatherService.getCurrentWeather({ city });
};

module.exports = { schema, execute };

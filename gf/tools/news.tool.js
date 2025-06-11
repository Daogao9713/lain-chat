'use strict';
const newsService = require('../services/news');

const schema = {
  type: 'function',
  function: {
    name: 'getNews',
    description: '获取关于特定主题的最新新闻，主题可以是中文或英文。',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '新闻主题, e.g., "人工智能", "科技"' },
      },
      required: ['topic'],
    },
  },
};

const execute = async (args) => {
  return await newsService.getNews(args);
};

module.exports = { schema, execute };

// /tools/getTime.tool.js
'use strict';

const schema = {
  type: 'function',
  function: {
    name: 'getCurrentTime',
    description: '获取当前的时间。',
    parameters: {
      type: 'object',
      properties: {}, // 此函数不需要参数
    },
  },
};

const execute = async () => {
  const timeString = new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo' });
  return { time: timeString };
};

module.exports = { schema, execute };

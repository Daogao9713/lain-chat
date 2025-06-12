// /tools/index.js (工具自动注册器)
'use strict';
const fs = require('fs');
const path = require('path');
const tools = [];
const availableTools = {};
const files = fs.readdirSync(__dirname).filter(file => file.endsWith('.tool.js'));
for (const file of files) {
  try {
    const tool = require(path.join(__dirname, file));
    if (tool.schema && tool.execute) {
      const functionName = tool.schema.function.name;
      tools.push(tool.schema);
      availableTools[functionName] = tool.execute;
      console.log(`[Tool] 工具已注册: ${functionName}`);
    }
  } catch (error) { console.error(`加载工具 ${file} 失败:`, error); }
}
module.exports = { tools, availableTools };

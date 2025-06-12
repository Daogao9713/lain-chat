// knowledge.js (休眠模式)
'use strict';

/**
 * 初始化知识库 (空操作)
 */
async function initializeKnowledgeBase() {
  console.log('[Knowledge] Knowledge base is in sleep mode. Skipping connection.');
  // 不执行任何数据库操作
}

/**
 * 向知识库中添加一条记忆/文档 (空操作)
 */
async function addDocument({ id, text, metadata }) {
  console.log(`[Knowledge] In sleep mode. Document add skipped: ${id}`);
  // 不执行任何数据库操作
}

/**
 * 从知识库中查询相关信息 (返回空)
 * @returns {Promise<string>} - 总是返回一个空字符串
 */
async function queryKnowledgeBase(queryText) {
  // 不执行任何数据库操作，直接返回空字符串
  return ""; 
}

module.exports = {
  initializeKnowledgeBase,
  addDocument,
  queryKnowledgeBase,
};

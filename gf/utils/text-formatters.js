'use strict';

// 用于匹配网址的正则表达式
const URL_REGEX = /(https?:\/\/[^\s"'<>`]+)/g;

/**
 * 智能文本分割函数 v3.0 (URL安全版)
 * @param {string} text - 原始文本
 * @param {number} [maxLength=100] - 每段的理想最大长度
 * @returns {Array<string>} - 分割后的字符串数组
 */
function splitMessageInFragments(text, maxLength = 100) {
  if (!text || typeof text !== 'string') return [];
  if (text.length <= maxLength) {
    return [text];
  }

  // --- 1. 保护URL ---
  const urlMap = new Map();
  let urlIndex = 0;
  const textWithPlaceholders = text.replace(URL_REGEX, (url) => {
    const placeholder = `__URL_PLACEHOLDER_${urlIndex}__`;
    urlMap.set(placeholder, url);
    urlIndex++;
    return placeholder;
  });

  // --- 2. 安全分割 ---
  const chunks = [];
  // 优先按段落（两个换行）分割
  const paragraphs = textWithPlaceholders.split(/\n\s*\n/);

  for (const paragraph of paragraphs) {
    if (!paragraph) continue;
    
    // 如果段落本身不长，直接作为一个片段
    if (paragraph.length <= maxLength) {
      chunks.push(paragraph);
      continue;
    }

    // 如果段落过长，则按句子分割
    // 使用正则表达式的“回顾后发断言”来保留分隔符
    const sentences = paragraph.split(/(?<=[。！？?…\n])/g);
    let tempChunk = '';
    for (const sentence of sentences) {
      if ((tempChunk + sentence).length > maxLength && tempChunk.length > 0) {
        chunks.push(tempChunk);
        tempChunk = sentence;
      } else {
        tempChunk += sentence;
      }
    }
    if (tempChunk) {
      chunks.push(tempChunk);
    }
  }

  // --- 3. 恢复URL ---
  const finalChunks = chunks.map(chunk => {
    let result = chunk;
    // 遍历所有占位符并替换回来
    for (const [placeholder, url] of urlMap.entries()) {
        result = result.replace(placeholder, url);
    }
    return result.trim();
  }).filter(chunk => chunk.length > 0); // 过滤掉空的片段

  return finalChunks.slice(0, 5); // 限制最多 5 条
}

/**
 * 检测文本是否具有哲学或内省倾向
 */
function isPhilosophical(text) {
  if (!text || typeof text !== 'string') return false;
  const keywords = ['真实', '存在', '意义', '虚无', '模拟', '意识', '幻觉', '本我', '信号', '连接', '记忆', '我思', '神'];
  const keywordsJP = ['現実', '存在', '意味', '無', '意識', '記憶', '神', 'シグナル', '接続'];
  const allKeywords = [...keywords, ...keywordsJP];
  return allKeywords.some(kw => text.includes(kw));
}

module.exports = { 
  splitMessageInFragments,
  isPhilosophical,
};

// /services/emotion.js
'use strict';

const { dockStart } = require('@nlpjs/basic');

let nlp;
let isInitializing = true;

(async () => {
  try {
    // 使用 dockStart 来创建一个为 Node.js 优化的 NLP 应用实例
    const dock = await dockStart({
      settings: {
        nlp: {
          languages: ['zh'], // 明确指定使用中文
          forceNER: true,
          trainByDomain: false,
        }
      },
      use: ['Nlp', 'LangZh'], // 明确声明使用 NLP 核心和中文语言包
    });

    nlp = dock.get('nlp');
    console.log('✅ 中文情感分析模块已就绪 (Node.js Mode)。');
  } catch (err) {
    console.error("❌ 初始化情感分析模块失败:", err);
    // 即使失败，也要将 nlp 设为一个非 undefined 的值，防止其他地方出错
    nlp = null; 
  } finally {
    isInitializing = false;
  }
})();

/**
 * 分析文本的情绪
 * @param {string} text 
 * @returns {Promise<{emotion: string, score: number}>}
 */
async function analyzeEmotion(text) {
  // 如果模块未就绪或文本为空，返回安全默认值
  if (!nlp || !text) {
    return { emotion: 'neutral', score: 0 };
  }
  
  try {
    const result = await nlp.process('zh', text);
    const score = result.sentiment.score || 0;
    let emotion = 'neutral';

    // 定义更清晰的情感判断阈值
    if (score > 0.35) {
      emotion = 'happy';
    } else if (score < -0.35) {
      emotion = 'sad';
    }

    return {
      emotion: emotion,
      score: Math.abs(score)
    };
  } catch (error) {
    console.error('❌ Emotion analysis failed for text:', text, error);
    return { emotion: 'neutral', score: 0 };
  }
}

/**
 * 检查模块是否已成功初始化
 * @returns {boolean}
 */
function isReady() {
  return !isInitializing && !!nlp;
}

module.exports = {
  analyzeEmotion,
  isReady,
};

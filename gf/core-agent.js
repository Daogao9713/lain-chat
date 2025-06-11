'use strict';

const OpenAI = require('openai');
const { tools, availableTools } = require('./tools');
const { getLainSystemPromptForAgent } = require('./utils/prompt-templates');
const memory = require('./memory');
const profile = require('./profile');
const botState = require('./bot-state');
const emotion = require('./services/emotion');
const tts = require('./services/tts');
const knowledge = require('./knowledge');
const spotify = require('./services/spotify');
const { splitMessageInFragments } = require('./utils/text-formatters');

// 延迟初始化 OpenAI，避免旧 key 被缓存
let openai = null;
function getOpenAIInstance() {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY?.trim() });
  }
  return openai;
}

const humanDelay = () => new Promise(res => setTimeout(res, Math.random() * 1000 + 500));
const processingUsers = new Set();
const IMAGE_ANALYSIS_PROMPT = "你是岩仓玲音(Lain)。请用你一贯的、碎片化的、富有哲思的风格描述这张图片，并可以对它的真实性提出质疑。";

function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("⏱️ OpenAI API Timeout")), ms)
    )
  ]);
}

function sanitizeForPrompt(data) {
  if (typeof data !== 'object' || data === null) return '{}';
  try {
    const jsonString = JSON.stringify(data);
    return jsonString.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  } catch (e) {
    return '{}';
  }
}

// 辅助函数：创建 Spotify Flex Message
function createSpotifyFlexMessage(track) {
  if (!track) return null;
  return {
    type: 'flex',
    altText: `为你找到了歌曲: ${track.name}`,
    contents: {
      type: 'bubble',
      hero: { type: 'image', url: track.albumArt || 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_movie.png', size: 'full', aspectRatio: '1:1', aspectMode: 'cover' },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md',
        contents: [
          { type: 'text', text: track.name, weight: 'bold', size: 'xl', wrap: true },
          {
            type: 'box', layout: 'vertical',
            contents: [
              { type: 'text', text: track.artist, size: 'sm', color: '#666666', wrap: true },
              { type: 'text', text: track.album, size: 'sm', color: '#aaaaaa', wrap: true },
            ],
          },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical',
        contents: [
          { type: 'button', action: { type: 'uri', label: '在 Spotify 上播放', uri: track.url }, style: 'primary', color: '#1DB954', height: 'sm' },
        ],
      },
    },
  };
}


async function processMessage(userId, userInput) {
  if (processingUsers.has(userId)) {
    console.log(`[Concurrency Lock] User ${userId} is already being processed. Ignoring new request.`);
    return [];
  }

  try {
    processingUsers.add(userId);

    // --- 输入验证 ---
    if (!userInput || !userInput.type || !userInput.content) {
      throw new Error('Invalid userInput object: type or content is missing.');
    }
    if (userInput.type === 'text' && userInput.content.length > 1000) {
      return [{ type: 'text', text: '...你的话语太长，玲音失去了信号...' }];
    }
    if (userInput.type === 'location' && (!userInput.content.latitude || !userInput.content.longitude)) {
      throw new Error('Invalid location format: latitude or longitude is missing.');
    }
    
    // --- “快速通道”处理 Spotify 指令 ---
    if (userInput.type === 'text') {
        const spotifyMatch = userInput.content.match(/^(?:播放|搜索歌曲|聴かせて|曲を探して)\s*(.+)$/i);
        if (spotifyMatch) {
            const trackName = spotifyMatch[1].trim();
            const track = await spotify.searchTrack({ trackName });
            if (track) {
                const flexMessage = createSpotifyFlexMessage(track);
                const introText = '...为你找到了一个匹配的音轨。';
                await memory.appendHistory(userId, { role: 'user', content: userInput.content });
                await memory.appendHistory(userId, { role: 'assistant', content: `(分享了歌曲: ${track.name}) ${introText}` });
                return [{ type: 'text', text: introText }, flexMessage];
            } else {
                return [{ type: 'text', text: `...在连线中没有找到名为 "${trackName}" 的音轨...` }];
            }
        }
    }

    // --- 智能通道 ---
    let retrievedKnowledge = '';
    if (userInput.type === 'text') {
      retrievedKnowledge = await knowledge.queryKnowledgeBase(userInput.content);
    }
    
    let toneResult;
    try {
      toneResult = userInput.type === 'text' ? await emotion.analyzeEmotion(userInput.content) : { emotion: 'neutral', score: 0 };
      if (!toneResult || typeof toneResult.emotion !== 'string' || typeof toneResult.score !== 'number') {
        toneResult = { emotion: 'neutral', score: 0 };
      }
    } catch (emotionError) {
      console.error('❌ Emotion analysis failed, falling back to neutral.', emotionError);
      toneResult = { emotion: 'neutral', score: 0 };
    }

    const history = memory.getHistory(userId);
    const userProfile = profile.getProfile(userId);
    const botCurrentState = botState.getBotState();
    
    const sanitizedProfileJSON = sanitizeForPrompt(userProfile);
    const systemPrompt = getLainSystemPromptForAgent({ userProfile: sanitizedProfileJSON, botState: botCurrentState, toneResult });
    
    let userMessageForAI;
    if (userInput.type === 'image') {
      userMessageForAI = { role: 'user', content: [{ type: 'text', text: IMAGE_ANALYSIS_PROMPT }, { type: 'image_url', image_url: { url: userInput.content } }] };
    } else if (userInput.type === 'location') {
      userMessageForAI = { role: 'user', content: `用户当前位于 纬度: ${userInput.content.latitude}, 经度: ${userInput.content.longitude}。请查找此地附近的餐厅和便利店。` };
    } else {
      userMessageForAI = { role: 'user', content: userInput.content };
    }
    
    const messages = [{ role: 'system', content: systemPrompt }, ...history, userMessageForAI];

    const response = await withTimeout(
      getOpenAIInstance().chat.completions.create({ model: 'gpt-4o', messages, tools, tool_choice: 'auto' })
    );
    let responseMessage = response?.choices?.[0]?.message;

    if (!responseMessage || (!responseMessage.content && !responseMessage.tool_calls)) {
      console.warn('AI 返回了空消息或无效结构。用户输入为:', JSON.stringify(userInput));
      return [{ type: 'text', text: '... silence ...' }];
    }

    if (responseMessage.tool_calls) {
      messages.push(responseMessage);
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionToCall = availableTools[functionName];
        if (!functionToCall) continue;
        try {
          const functionArgs = JSON.parse(toolCall.function.arguments);
          const toolContext = { userId };
          const functionResponse = await functionToCall(functionArgs, toolContext);
          messages.push({ tool_call_id: toolCall.id, role: 'tool', name: functionName, content: JSON.stringify(functionResponse) });
        } catch (toolError) {
          console.error(`❌ Tool ${functionName} execution failed:`, toolError);
          messages.push({ tool_call_id: toolCall.id, role: 'tool', name: functionName, content: JSON.stringify({ error: toolError.message }) });
        }
      }
      const finalResponse = await withTimeout(
        getOpenAIInstance().chat.completions.create({ model: 'gpt-4o', messages, max_tokens: 400 })
      );
      responseMessage = finalResponse?.choices?.[0]?.message || { content: '... echo lost ...' };
    }
    
    const replyText = responseMessage.content?.trim() || '... static ...';

    await Promise.allSettled([
      memory.appendHistory(userId, userMessageForAI),
      memory.appendHistory(userId, { role: 'assistant', content: replyText })
    ]);
    
    if (Math.random() < 0.2 && replyText && replyText.trim() !== '...') {
      try {
        const audioBuffer = await tts.synthesizeSpeech(replyText);
        const fileName = `audio-${userId}-${Date.now()}.mp3`;
        const publicUrl = await tts.uploadToStorage(audioBuffer, fileName);
        const estimatedDuration = Math.max(1000, Math.min(replyText.length * 150, 60000));
        return [{ type: 'audio', originalContentUrl: publicUrl, duration: estimatedDuration }];
      } catch (ttsError) {
        console.error('❌ TTS or GCS upload failed, falling back to text reply.', ttsError);
      }
    }
    
    return splitMessageInFragments(replyText).map(r => ({ type: 'text', text: r }));

  } catch (error) {
    console.error('❌ Agent Core Error:', error);
    return [{
      type: 'text',
      text: error.message.includes("Timeout")
        ? '... a lag in the Wired ...'
        : '... a bug in the system ...'
    }];
  } finally {
    setTimeout(() => {
      if (processingUsers.has(userId)) {
        processingUsers.delete(userId);
        console.log(`[Concurrency Lock] Lock released for user ${userId} after grace period.`);
      }
    }, 8000);
  }
}

module.exports = { processMessage };

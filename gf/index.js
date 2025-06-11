'use strict';

const express = require('express');
const line = require('@line/bot-sdk');
const dotenv = require('dotenv');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const coreAgent = require('./core-agent'); 
const memory = require('./memory');
const profile = require('./profile');
const calendar = require('./services/calendar');
const botState = require('./bot-state');
const { createSpotifyFlexMessage } = require('./utils/flex-messages');

dotenv.config();

const lineConfig = { channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN, channelSecret: process.env.LINE_CHANNEL_SECRET };
const lineClient = new line.Client(lineConfig);
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.get('/', (req, res) => { res.send('CONNCECTINGGG～'); });

// ▼▼▼ 优化六：新增健康检查路由 ▼▼▼
app.get('/health', (req, res) => {
  // 一个简单的健康检查端点，如果服务正常则返回 200 OK
  // 未来可以扩展为检查数据库连接等
  res.status(200).send('OK');
});

// ▼▼▼ 优化三：将 LINE 消息适配逻辑拆分为独立函数 ▼▼▼
async function adaptLineMessage(message) {
  if (message.type === 'sticker') {
    // 对于表情包，直接回复一个固定文本，不进入核心逻辑
    const stickerReplies = ['...', '(贴图)', 'interesting.'];
    return { 
      isDirectReply: true, 
      replies: [{ type: 'text', text: stickerReplies[Math.floor(Math.random() * stickerReplies.length)] }] 
    };
  }
  if (message.type === 'text') {
    return { userInput: { type: 'text', content: message.text } };
  }
  if (message.type === 'image') {
    if (!message.id) 
      throw new Error('Invalid image message: ID is missing.');
    const imageResponse = await axios.get(
      `https://api-data.line.me/v2/bot/message/${message.id}/content`, 
      { 
        headers: { 'Authorization': `Bearer ${lineConfig.channelAccessToken}` },
        responseType: 'arraybuffer'
      }
    );
    return { 
      userInput: { 
        type: 'image', 
        content: `data:image/jpeg;base64,${Buffer.from(imageResponse.data, 'binary').toString('base64')}` 
      } 
    };
  }
  if (message.type === 'location') {
    if (!message.latitude || !message.longitude)
      throw new Error('Invalid location message: coordinates are missing.');
    return { userInput: { type: 'location', content: { latitude: message.latitude, longitude: message.longitude } } };
  }
  return null; // 忽略所有其他未处理的类型
}

// --- 主 Webhook 路由 ---
app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  res.sendStatus(200);
  const events = req.body.events;
  if (!events || !Array.isArray(events)) return;

  for (const event of events) {
    const userId = event.source?.userId;
    const replyToken = event.replyToken;
    try {
      if (event.type !== 'message' || !userId) continue;
      
      const { message } = event;
      let userInput;

      if (message.type === 'sticker') {
        const stickerReplies = ['...', '(a sticker)', 'interesting.'];
        const replyText = stickerReplies[Math.floor(Math.random() * stickerReplies.length)];
        await lineClient.replyMessage(replyToken, { type: 'text', text: replyText });
        continue;
      }
      
      if (message.type === 'text') {
        userInput = { type: 'text', content: message.text };
      } else if (message.type === 'image') {
        if (!message.id) 
          throw new Error('Invalid image message: ID is missing.');
        const imageResponse = await axios.get(
          `https://api-data.line.me/v2/bot/message/${message.id}/content`, 
          { 
            headers: { 'Authorization': `Bearer ${lineConfig.channelAccessToken}` }, 
            responseType: 'arraybuffer'
          }
        );
        userInput = { 
          type: 'image', 
          content: `data:image/jpeg;base64,${Buffer.from(imageResponse.data, 'binary').toString('base64')}` 
        };
      } else if (message.type === 'location') {
        if (!message.latitude || !message.longitude) 
          throw new Error('Invalid location message: coordinates are missing.');
        userInput = { type: 'location', content: { latitude: message.latitude, longitude: message.longitude } };
      } else {
        continue;
      }
      
      const replies = await coreAgent.processMessage(userId, userInput);

      // ▼▼▼ 新增：判断核心逻辑是否返回了特殊的 Spotify 工具调用结果 ▼▼▼
      const spotifyReply = replies.find(r => r.type === 'spotify_track');
      if (spotifyReply) {
        const flexMessage = createSpotifyFlexMessage(spotifyReply.data);
        if (flexMessage) {
            // 将 AI 生成的介绍语和歌曲卡片一起发送
            await lineClient.replyMessage(replyToken, [
                { type: 'text', text: spotifyReply.introText },
                flexMessage
            ]);
        } else {
            await lineClient.replyMessage(replyToken, { type: 'text', text: '...音轨数据格式错误...' });
        }
      } else if (replies && replies.length > 0) {
        // 对于其他所有普通回复
        await lineClient.replyMessage(replyToken, replies);
      }

    } catch (err) {
      console.error('❌ Webhook Handler Error:', err);
      if (replyToken) {
        try { 
          await lineClient.replyMessage(replyToken, { type: 'text', text: '...error...' }); 
        } catch (replyError) { 
          console.error('❌ Failsafe reply failed:', replyError); 
        }
      }
    }
  }
});

// --- Web/小程序路由 ---
app.post(['/wx-chat', '/chat'], async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: 'Missing userId or message' });
    }
    const userInput = { type: 'text', content: message };
    
    // 1. 调用核心逻辑，获取一个包含多种消息类型的标准回复数组
    const replies = await coreAgent.processMessage(userId, userInput);

    // 2. 将标准回复数组适配为前端Web客户端需要的格式
    const formattedReplies = replies.map(reply => {
      // 文本消息
      if (reply.type === 'text') {
        return { type: 'text', content: reply.text };
      }
      // 语音消息
      if (reply.type === 'audio') {
        return { type: 'audio', content: { url: reply.originalContentUrl, duration: reply.duration } };
      }
      // Spotify 特殊对象（由 core-agent 返回）
      if (reply.type === 'spotify_track') {
        // 直接将数据包装成前端需要的格式
        return { type: 'spotify', content: reply.data };
      }
      // 对于 LINE Flex Message (由 createSpotifyFlexMessage 生成) 的兼容处理
      if (reply.type === 'flex' && reply.altText.includes('为你找到了歌曲')) {
        const track = reply.contents?.body?.contents?.[0];
        const artist = reply.contents?.body?.contents?.[1]?.contents?.[0];
        return {
          type: 'spotify',
          content: {
            name: track?.text || 'Unknown Track',
            artist: artist?.text || 'Unknown Artist',
            albumArt: reply.contents?.hero?.url,
            url: reply.contents?.footer?.contents?.[0]?.action?.uri,
          }
        };
      }
      return null; // 过滤掉其他不兼容的类型
    }).filter(Boolean);
    
    // 3. 返回一个包含格式化后消息数组的JSON
    res.json({ replies: formattedReplies });

  } catch (err) {
    console.error('❌ API Chat Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


async function startServer() {
  await memory.initialize();
  await profile.initialize();
  await calendar.initialize();
  await botState.initialize();
  app.listen(process.env.PORT || 3000, () => {
    console.log(`CONNECTING WORLD ${process.env.PORT || 3000}`);
  });
}
startServer();

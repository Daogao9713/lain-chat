'use strict';
const textToSpeech = require('@google-cloud/text-to-speech');
const { Storage } = require('@google-cloud/storage');

const ttsClient = new textToSpeech.TextToSpeechClient();
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

/**
 * 将文本合成为语音
 * @param {string} text 要转换的文本
 * @returns {Promise<Buffer>} 音频数据的 Buffer
 */
async function synthesizeSpeech(text) {
  const request = {
    input: { text: text },
    voice: { 
      languageCode: 'ja-JP', 
      name: 'ja-JP-Wavenet-B',
      ssmlGender: 'FEMALE' 
    },
    audioConfig: { audioEncoding: 'MP3' },
  };
  try {
    const [response] = await ttsClient.synthesizeSpeech(request);
    return response.audioContent;
  } catch(err) {
    console.error('❌ Google TTS API Error:', err);
    throw err;
  }
}

/**
 * 将音频 Buffer 上传到 GCS 并返回公开 URL
 * @param {Buffer} audioBuffer 音频数据
 * @param {string} fileName 文件名
 * @returns {Promise<string>} 公开可访问的 URL
 */
async function uploadToStorage(audioBuffer, fileName) {
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME is not configured in .env file.');
  }
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);
  
  try {
    // ▼▼▼ 核心修正：移除 public: true 选项 ▼▼▼
    await file.save(audioBuffer, {
      metadata: { contentType: 'audio/mp3' },
      // public: true, // <--- 移除此行
    });
    
    // 手动将文件设置为公开可读，这是兼容“统一访问权限”的另一种方式
    // 但最佳实践是在GCS控制台将整个桶设为公开
    await file.makePublic();

    console.log(`[GCS] Audio file ${fileName} uploaded and made public.`);
    return `https://storage.googleapis.com/${bucketName}/${fileName}`;
  } catch(err) {
    console.error('❌ GCS Upload Error:', err);
    throw err;
  }
}

module.exports = {
  synthesizeSpeech,
  uploadToStorage,
};

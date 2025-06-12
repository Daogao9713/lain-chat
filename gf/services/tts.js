// /services/tts.js
'use strict';
const textToSpeech = require('@google-cloud/text-to-speech');
const { Storage } = require('@google-cloud/storage');

const ttsClient = new textToSpeech.TextToSpeechClient();
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

/**
 * 将文本合成为语音
 */
async function synthesizeSpeech(text) {
  const request = {
    input: { text: text },
    voice: { languageCode: 'ja-JP', name: 'ja-JP-Wavenet-B', ssmlGender: 'FEMALE' },
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
 */
async function uploadToStorage(audioBuffer, fileName) {
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME is not configured in .env file.');
  }
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);
  
  try {
    // ▼▼▼ 核心修正：只进行保存操作，不附加任何权限设置 ▼▼▼
    await file.save(audioBuffer, {
      metadata: { contentType: 'audio/mp3' },
    });
    
    console.log(`[GCS] Audio file ${fileName} uploaded to bucket.`);
    // 直接返回文件的公开URL地址
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

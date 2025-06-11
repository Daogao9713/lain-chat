// tts.js
'use strict';
const textToSpeech = require('@google-cloud/text-to-speech');
const { Storage } = require('@google-cloud/storage');
const util = require('util');
const fs = require('fs');

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
      name: 'ja-JP-Wavenet-B', // 一个冷静的日语女声作为替代
      ssmlGender: 'FEMALE' 
    },
    audioConfig: { audioEncoding: 'MP3' },
  };
  const [response] = await ttsClient.synthesizeSpeech(request);
  return response.audioContent;
}

/**
 * 将音频 Buffer 上传到 GCS 并返回公开 URL
 * @param {Buffer} audioBuffer 音频数据
 * @param {string} fileName 文件名
 * @returns {Promise<string>} 公开可访问的 URL
 */
async function uploadToStorage(audioBuffer, fileName) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);
  
  await file.save(audioBuffer, {
    metadata: { contentType: 'audio/mp3' },
    public: true,
  });

  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}

module.exports = {
  synthesizeSpeech,
  uploadToStorage,
};

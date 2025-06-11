// /utils/flex-messages.js
'use strict';

/**
 * 创建一个用于展示 Spotify 歌曲的 LINE Flex Message
 * @param {object} track - 从 spotify.js 返回的歌曲信息对象
 * @returns {object|null} - 一个 LINE Flex Message 对象
 */
function createSpotifyFlexMessage(track) {
  if (!track) return null;
  
  return {
    type: 'flex',
    altText: `为你找到了歌曲: ${track.name} by ${track.artist}`,
    contents: {
      type: 'bubble',
      size: 'giga', // 使用较大的气泡以获得更好的视觉效果
      hero: {
        type: 'image',
        url: track.albumArt || 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_1_movie.png',
        size: 'full',
        aspectRatio: '1:1',
        aspectMode: 'cover',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: track.name,
            weight: 'bold',
            size: 'xl',
            wrap: true,
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            contents: [
              {
                type: 'text',
                text: track.artist,
                size: 'sm',
                color: '#666666',
                wrap: true,
              },
              {
                type: 'text',
                text: track.album,
                size: 'sm',
                color: '#aaaaaa',
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '在 Spotify 上播放',
              uri: track.url,
            },
            style: 'primary',
            color: '#1DB954',
            height: 'sm',
          },
        ],
      },
    },
  };
}

module.exports = {
  createSpotifyFlexMessage,
};

'use strict';
const spotifyService = require('../services/spotify');

const schema = {
  type: 'function',
  function: {
    name: 'searchTrack',
    description: '根据歌名或艺术家搜索一首歌曲。',
    parameters: {
      type: 'object',
      properties: {
        trackName: { type: 'string', description: '歌曲的名称或演唱者' },
      },
      required: ['trackName'],
    },
  },
};

const execute = async (args) => {
  return await spotifyService.searchTrack(args);
};

module.exports = { schema, execute };

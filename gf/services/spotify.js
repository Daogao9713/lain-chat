'use strict';

const axios = require('axios');

let accessToken = null;
let tokenExpiryTime = 0;

// 🔐 获取 Spotify Access Token（使用 Client Credentials Flow）
async function getAccessToken() {
  if (Date.now() < tokenExpiryTime && accessToken) {
    return accessToken; // 仍有效
  }

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    accessToken = res.data.access_token;
    tokenExpiryTime = Date.now() + res.data.expires_in * 1000 - 10000; // 提前10秒过期缓冲
    return accessToken;
  } catch (err) {
    console.error('❌ Failed to get Spotify access token:', err.response?.data || err.message);
    return null;
  }
}

// 🎵 搜索歌曲（传入 { trackName }）
async function searchTrack({ trackName }) {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: {
        q: trackName,
        type: 'track',
        limit: 1,
        market: 'HK',
      },
    });

    const track = response.data.tracks.items[0];
    if (track) {
      return {
        id: track.id,
        name: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        album: track.album.name,
        albumArt: track.album.images?.[0]?.url || null,
        url: track.external_urls.spotify,
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Error searching Spotify track:', error.response?.data || error.message);
    return null;
  }
}

module.exports = { searchTrack };

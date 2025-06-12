'use strict';
const { Client, Status } = require('@googlemaps/google-maps-services-js');

const mapsClient = new Client({});
// ▼▼▼ 修正：使用标准化的、全大写的环境变量名 ▼▼▼
const API_KEY = process.env.Maps_API_KEY;

/**
 * 内部函数，用于搜索附近的地点
 */
async function findNearbyPlaces(latitude, longitude, type) {
  if (!API_KEY) {
    // 错误提示也同步更新
    console.error('❌ Maps Service Error: Maps_API_KEY is not configured in .env file.');
    return [];
  }

  try {
    const response = await mapsClient.placesNearby({
      params: {
        location: { lat: latitude, lng: longitude },
        rankby: 'distance', // 按距离排序
        type: type,
        key: API_KEY,
        language: 'ja',
      },
    });

    if (response.data.status === Status.OK) {
      return response.data.results.slice(0, 5).map(place => ({
        name: place.name,
        rating: place.rating ? `${place.rating} ★` : '评价未知',
      }));
    } else {
      console.error('Google Maps API Error:', response.data.status, response.data.error_message);
      return [];
    }
  } catch (err) {
    console.error(`❌ Error fetching nearby ${type}:`, err.response?.data?.error_message || err.message);
    return [];
  }
}

async function findNearbyRestaurants(latitude, longitude) {
  return findNearbyPlaces(latitude, longitude, 'restaurant');
}

async function findNearbyConvenienceStores(latitude, longitude) {
  return findNearbyPlaces(latitude, longitude, 'convenience_store');
}

module.exports = {
  findNearbyRestaurants,
  findNearbyConvenienceStores,
};

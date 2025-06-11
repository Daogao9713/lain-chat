'use strict';
const mapsService = require('../services/maps');

const schema = {
  type: 'function',
  function: {
    name: 'findNearbyPlaces',
    description: '当用户提供地理位置时，查找附近的餐厅和便利店。',
    parameters: {
      type: 'object',
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
      },
      required: ['latitude', 'longitude'],
    },
  },
};

const execute = async ({ latitude, longitude }) => {
  const [restaurants, stores] = await Promise.all([
    mapsService.findNearbyRestaurants(latitude, longitude),
    mapsService.findNearbyConvenienceStores(latitude, longitude)
  ]);
  return { restaurants, stores }; // 返回一个包含两类结果的对象
};

module.exports = { schema, execute };

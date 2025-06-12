'use strict';
const axios = require('axios');

async function getCurrentWeather({ city }) {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    console.error('❌ Weather Service Error: WEATHER_API_KEY is not configured in .env file.');
    return { error: "Weather service is not configured." };
  }

  const apiUrl = `https://api.openweathermap.org/data/2.5/weather`;

  try {
    const response = await axios.get(apiUrl, {
      params: {
        q: city,
        appid: apiKey,
        units: 'metric',
        lang: 'zh_cn',
      }
    });

    if (response.status === 200) {
      const data = response.data;
      return {
        description: data.weather[0].description,
        temperature: `${data.main.temp}°C`,
      };
    } else {
      // 此处基本不会执行，因为 axios 非 2xx 状态会直接抛出错误进入 catch
      return { error: `API returned status ${response.status}` };
    }
  } catch (error) {
    console.error(`❌ Error fetching weather for city "${city}":`, error.response?.data?.message || error.message);
    return { error: `Failed to fetch weather data for ${city}.` };
  }
}

module.exports = { getCurrentWeather };

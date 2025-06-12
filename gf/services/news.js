'use strict';
const NewsAPI = require('newsapi');

async function getNews({ topic }) {
  if (!process.env.NEWS_API_KEY) {
    console.error('❌ News Service Error: NEWS_API_KEY is not configured in .env file.');
    return [{ title: '新闻服务未配置', link: '#', description: '管理员尚未提供 NEWS_API_KEY。' }];
  }
  const newsapi = new NewsAPI(process.env.NEWS_API_KEY);
  try {
    const response = await newsapi.v2.everything({
      q: topic,
      language: 'jp',
      sortBy: 'publishedAt',
      pageSize: 5,
    });
    if (response.status === 'ok') {
      return response.articles.map(article => ({
        title: article.title,
        link: article.url,
        description: article.description,
      }));
    }
    return [];
  } catch (error) {
    console.error('❌ Error fetching from NewsAPI:', error.message);
    return [];
  }
}

module.exports = { getNews };

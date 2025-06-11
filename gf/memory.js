'use strict';
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node'); // <-- 必须存在这一行

const db = new Low(new JSONFile('db-memory.json'), {});
const HISTORY_LIMIT = 20;

async function initialize() {
  await db.read();
  db.data ||= { histories: {} };
  await db.write();
  console.log('Memory database initialized.');
}

function getHistory(userId) {
  return db.data.histories?.[userId] || [];
}

async function appendHistory(userId, message) {
  try {
    if (!db.data.histories) db.data.histories = {};
    const history = getHistory(userId);
    history.push(message);
    if (history.length > HISTORY_LIMIT) {
      history.splice(0, history.length - HISTORY_LIMIT);
    }
    db.data.histories[userId] = history;
    await db.write();
  } catch(err) {
    console.error(`❌ Error in appendHistory for user ${userId}:`, err);
  }
}

module.exports = {
  initialize,
  getHistory,
  appendHistory,
};

'use strict';
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node'); // <-- 必须存在这一行


const db = new Low(new JSONFile('db-bot-state.json'), {});

async function initialize() {
  await db.read();
  db.data ||= { emotionValue: 50, lastRandomized: new Date().toISOString() };
  await db.write();
  console.log('Bot State database initialized.');
}

function getBotState() {
  return db.data;
}

async function setBotState(newState) {
  try {
    db.data = { ...db.data, ...newState };
    await db.write();
  } catch(err) {
    console.error('❌ Error in setBotState:', err);
  }
}

module.exports = {
  initialize,
  getBotState,
  setBotState,
};

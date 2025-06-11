'use strict';
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node'); // <-- 必须存在这一行

const db = new Low(new JSONFile('db-profiles.json'), {});

async function initialize() {
  await db.read();
  db.data ||= { profiles: {} };
  await db.write();
  console.log('Profile database initialized.');
}

async function updateProfile(userId, key, value) {
  try {
    if (!db.data.profiles) db.data.profiles = {};
    if (!db.data.profiles[userId]) {
      db.data.profiles[userId] = {};
    }
    const userProfile = db.data.profiles[userId];
    if (['likes', 'dislikes', 'topics', 'tags'].includes(key)) {
      if (!Array.isArray(userProfile[key])) userProfile[key] = [];
      if (!userProfile[key].includes(value)) userProfile[key].push(value);
    } else {
      userProfile[key] = value;
    }
    await db.write();
  } catch(err) {
    console.error(`❌ Error in updateProfile for user ${userId}:`, err);
  }
}

function getProfile(userId) {
  return db.data.profiles?.[userId] || {};
}

function getAllProfiles() {
  return db.data.profiles || {};
}

module.exports = {
  initialize,
  updateProfile,
  getProfile,
  getAllProfiles,
};

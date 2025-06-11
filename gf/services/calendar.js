'use strict';
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node'); // <-- 必须存在这一行

const db = new Low(new JSONFile('db-reminders.json'), {});

async function initialize() {
  await db.read();
  db.data ||= { reminders: {} };
  await db.write();
  console.log('Calendar service database initialized.');
}

async function addReminder(userId, timestamp, content) {
  try {
    if (!db.data.reminders) db.data.reminders = {};
    if (!db.data.reminders[userId]) {
      db.data.reminders[userId] = [];
    }
    db.data.reminders[userId].push({ timestamp, content });
    db.data.reminders[userId].sort((a, b) => a.timestamp - b.timestamp);
    await db.write();
    return { success: true, message: `已记录提醒: ${content}`};
  } catch (err) {
    console.error('Error in addReminder:', err);
    return { success: false, error: err.message };
  }
}

async function getRemindersForDate({ userId, date }) {
  try {
    const userReminders = db.data.reminders?.[userId] || [];
    if (userReminders.length === 0) return [];
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0).getTime();
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999).getTime();
    return userReminders.filter(r => r.timestamp >= startOfDay && r.timestamp <= endOfDay);
  } catch (err) {
    console.error('Error in getRemindersForDate:', err);
    return [];
  }
}

module.exports = {
  initialize,
  addReminder,
  getRemindersForDate,
};

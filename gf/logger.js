const fs = require('fs');
const chalk = require('chalk');

function error(title, err) {
  const msg = `[❌ 错误] ${title}: ${err.message}`;
  console.error(chalk.red(msg));
  fs.appendFileSync('error.log', `${new Date().toISOString()} - ${msg}\n`);
}

module.exports = { error };

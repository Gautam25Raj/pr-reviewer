const fs = require('fs');

const BUFFER_PATH = process.env.GITHUB_OUTPUT;

const writeToOutput = (context) => {
  const output = Object.entries(context)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.appendFileSync(BUFFER_PATH, output + '\n');
};

module.exports = { writeToOutput };

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { writeToOutput } = require('./io');

const openaiApiKey = process.env.OPENAI_API_KEY;
const changedFiles = process.env.CHANGED_FILES.split('\n');

const reviewFiles = async () => {
  const results = [];

  for (const file of changedFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const review = await reviewFile(content, file);

      results.push(review);
    } catch (error) {
      console.error(`Error processing file ${file}:`, error);
    }
  }

  results.forEach(result => writeToOutput(result));
};

const reviewFile = async (content, fileName) => {
  const response = await fetch('https://api.openai.com/v1/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      prompt: `You are a code reviewer. Review the following code file named ${fileName} based on best practices, code efficiency, and clarity. Provide a score from 1 to 10 and a brief feedback message.\n\n${content}\n\nRespond with no formatting, in the following structure:\n{\n"points": int,\n"message": str\n}`,
      max_tokens: 150,
    }),
  });

  const data = await response.json();
  const result = JSON.parse(data.choices[0].text.trim());
  result.file = fileName;
  return result;
};

reviewFiles().catch(error => {
  console.error(error);
  process.exit(1);
});

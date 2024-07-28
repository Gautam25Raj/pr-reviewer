const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { writeToOutput } = require('./io');

const openaiApiKey = process.env.API_KEY;
const changedFiles = process.env.CHANGED_FILES.split('\n');

const reviewPullRequest = async () => {
  const { owner, repo } = context.repo;
  const pull_number = context.payload.number;

  const results = [];

  for (const file of changedFiles) {
    console.log(`Processing file: ${file}`);
    try {
      const { data: fileContent } = await octokit.repos.getContent({
        owner,
        repo,
        path: file,
        ref: context.sha
      });

      const content = Buffer.from(fileContent.content, 'base64').toString('utf-8');
      const review = await reviewFile(content, file);

      results.push({
        filename: file,
        message: review.message,
        points: review.points,
      });
    } catch (error) {
      console.error(`Error processing file ${file}:`, error);
    }
  }

  return results;
};


const reviewFile = async (content, fileName) => {
  console.log(`Reviewing file: ${fileName}`);
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 150,
    temperature: 0,
    system: `You are a code reviewer. Review the following code file named ${fileName} based on best practices, code efficiency, and clarity. Provide a score from 1 to 10 and a brief feedback message.\n\n${content}\n\nRespond with no formatting, in the following structure:\n{\n"points": int,\n"message": str\n}`,
    messages: []
  });

  console.log(`API Response:`, response);
  const result = JSON.parse(response.message.trim());
  return result;
};

reviewPullRequest().then(results => {
  const result = results.map(r => ({
    filename: r.filename,
    message: r.message,
    points: r.points,
  }));

  console.log("Review Results:", result);
  process.stdout.write(JSON.stringify(result));
}).catch(error => {
  console.error(error);
  process.exit(1);
});

reviewPullRequest().catch(error => {
  console.error(error);
  process.exit(1);
});

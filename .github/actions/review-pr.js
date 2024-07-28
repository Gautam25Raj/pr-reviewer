const { Octokit } = require("@octokit/rest");
const fetch = require("node-fetch");
const Anthropic = require("@anthropic-ai/sdk");

const githubToken = process.env.GITHUB_TOKEN;
const apiKey = process.env.API_KEY;
const changedFiles = process.env.CHANGED_FILES.split('\n').filter(file => file.trim() !== '');
const octokit = new Octokit({ auth: githubToken });

const anthropic = new Anthropic({
  apiKey: apiKey, 
});

const reviewPullRequest = async () => {
  const { context } = require('@actions/github');
  const { owner, repo, number: pull_number } = context.issue;

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

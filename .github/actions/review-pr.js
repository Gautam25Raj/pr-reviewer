const { Octokit } = require("@octokit/rest");
const fetch = require("node-fetch");

const githubToken = process.env.GITHUB_TOKEN;
const apiKey = process.env.API_KEY;
const changedFiles = process.env.CHANGED_FILES.split('\n');
const octokit = new Octokit({ auth: githubToken });

const reviewPullRequest = async () => {
  const { context } = require('@actions/github');
  const { owner, repo, number: pull_number } = context.issue;

  const results = [];

  for (const file of changedFiles) {
    if (file.endsWith('.py')) {
      const { data: fileContent } = await octokit.repos.getContent({
        owner,
        repo,
        path: file,
        ref: context.sha
      });

      const content = Buffer.from(fileContent.content, 'base64').toString('utf-8');
      const review = await reviewFile(content);

      results.push({
        file,
        message: review.message,
        score: review.score,
      });
    }
  }

  return results;
};

const reviewFile = async (content) => {
  const response = await fetch('https://api.openai.com/v1/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      prompt: `Review the following Python code based on clean-code principles and PEP rules. Rate it from 1 to 10 and provide feedback in one sentence.\n\n${content}\n\nRespond with no formatting, in the following structure:\n{\n"score": int,\n"message": str\n}`,
      max_tokens: 100,
    }),
  });

  const data = await response.json();
  const result = JSON.parse(data.choices[0].text.trim());
  return result;
};

reviewPullRequest().then(results => {
  const result = results.map(r => ({
    file: r.file,
    message: r.message,
    score: r.score,
  }));

  process.stdout.write(JSON.stringify(result));
}).catch(error => {
  console.error(error);
  process.exit(1);
});

# GitHub OAuth Worker

Cloudflare Worker that handles the GitHub OAuth token exchange for `docusaurus-plugin-github-editor`.

## Setup

### 1. Create a GitHub OAuth App

1. Go to **GitHub Settings > Developer settings > OAuth Apps > New OAuth App**
2. Set the **Authorization callback URL** to your docs site edit route (e.g. `https://docs.example.com/edit`)
3. Note the **Client ID** and generate a **Client Secret**

### 2. Deploy the Worker

```bash
cd worker-template
npm install
```

Set the secrets:

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put ALLOWED_ORIGINS
```

For `ALLOWED_ORIGINS`, enter a comma-separated list of origins:
```
https://docs.example.com,http://localhost:3000
```

Deploy:

```bash
npm run deploy
```

### 3. Configure the Plugin

Use the deployed worker URL as `oauthWorkerUrl` in your plugin config:

```ts
plugins: [
  [
    'docusaurus-plugin-github-editor',
    {
      githubClientId: 'your-client-id',
      oauthWorkerUrl: 'https://github-oauth-worker.your-account.workers.dev',
      // ...
    },
  ],
],
```

## Local Development

```bash
npm run dev
```

This starts the worker locally on `http://localhost:8787`.

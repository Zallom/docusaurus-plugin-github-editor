import type {FileContent} from '../../src/types';

const API_BASE = 'https://api.github.com';

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<FileContent> {
  const res = await fetch(
    `${API_BASE}/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
    {headers: headers(token)},
  );

  if (res.status === 404) {
    throw new Error('FILE_NOT_FOUND');
  }

  if (!res.ok) {
    const err = (await res.json()) as {message?: string};
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  const data = (await res.json()) as {content: string; sha: string; path: string};
  const content = atob(data.content.replace(/\n/g, ''));

  const bytes = Uint8Array.from(content, (c) => c.charCodeAt(0));
  const decoded = new TextDecoder().decode(bytes);

  return {content: decoded, sha: data.sha, path: data.path};
}

export async function proposeChanges(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  newContent: string,
  fileSha: string,
  baseBranch: string,
  commitMessage: string,
  username: string,
  prTitlePrefix: string = 'docs: ',
  prBodyTemplate: string = '## Documentation change\n\n**Modified file:** `{{filePath}}`\n\n{{commitMessage}}\n\n---\n*Proposed via the built-in documentation editor.*',
): Promise<{prUrl: string; prNumber: number}> {
  // 1. Get the SHA of the base branch HEAD
  const refRes = await fetch(
    `${API_BASE}/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
    {headers: headers(token)},
  );

  if (!refRes.ok) {
    throw new Error('NO_PERMISSION');
  }

  const refData = (await refRes.json()) as {object: {sha: string}};
  const baseSha = refData.object.sha;

  // 2. Create a new branch
  const slug = filePath.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
  const timestamp = Date.now();
  const branchName = `docs-edit/${username}/${slug}-${timestamp}`;

  const branchRes = await fetch(
    `${API_BASE}/repos/${owner}/${repo}/git/refs`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
    },
  );

  if (!branchRes.ok) {
    const err = (await branchRes.json()) as {message?: string};
    if (err.message?.includes('Reference already exists')) {
      throw new Error('CONFLICT');
    }
    throw new Error('NO_PERMISSION');
  }

  // 3. Commit the file change
  const contentBytes = new TextEncoder().encode(newContent);
  const binaryString = Array.from(contentBytes, (b) => String.fromCharCode(b)).join('');
  const encodedContent = btoa(binaryString);

  const commitRes = await fetch(
    `${API_BASE}/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: headers(token),
      body: JSON.stringify({
        message: commitMessage,
        content: encodedContent,
        sha: fileSha,
        branch: branchName,
      }),
    },
  );

  if (!commitRes.ok) {
    const err = (await commitRes.json()) as {message?: string};
    if (err.message?.includes('does not match')) {
      throw new Error('CONFLICT');
    }
    throw new Error(err.message ?? 'Failed to commit');
  }

  // 4. Create a Pull Request
  const prTitle = `${prTitlePrefix}${commitMessage}`;
  const prBody = prBodyTemplate
    .replace(/\{\{filePath\}\}/g, filePath)
    .replace(/\{\{commitMessage\}\}/g, commitMessage);

  const prRes = await fetch(
    `${API_BASE}/repos/${owner}/${repo}/pulls`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({
        title: prTitle,
        body: prBody,
        head: branchName,
        base: baseBranch,
      }),
    },
  );

  if (!prRes.ok) {
    const err = (await prRes.json()) as {message?: string};
    throw new Error(err.message ?? 'Failed to create PR');
  }

  const prData = (await prRes.json()) as {html_url: string; number: number};
  return {prUrl: prData.html_url, prNumber: prData.number};
}

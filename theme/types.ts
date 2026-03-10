// Re-export shared types for theme components.
// Theme files cannot import from ../../src/ because src/ is not distributed.

export interface EditorGlobalData {
  githubClientId: string;
  oauthWorkerUrl: string;
  repoOwner: string;
  repoName: string;
  baseBranch: string;
  sourceMaps: Record<string, Record<string, string>>;

  docsPath: string;
  repoDocsPath: string;
  docsRouteBasePath: string;
  defaultLocale: string;
  editRoute: string;
  editPageTitle: string;
  editPageSidebar: string;
  logoSrc: string;
  versionLabels: Record<string, string>;
  enableEditThisPage: boolean;
  versionPathPrefix: Record<string, string>;
  editUrlBranch: string;
  prTitlePrefix: string;
  prBodyTemplate: string;
  storageKeyPrefix: string;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

export interface FileContent {
  content: string;
  sha: string;
  path: string;
}

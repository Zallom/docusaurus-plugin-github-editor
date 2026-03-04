export interface PluginOptions {
  // Required
  githubClientId: string;
  oauthWorkerUrl: string;
  repoOwner: string;
  repoName: string;
  baseBranch: string;

  // Optional
  defaultLocale?: string;
  editRoute?: string;
  editPageTitle?: string;
  editPageSidebar?: string;
  logoSrc?: string;
  versionLabels?: Record<string, string>;
  enableEditThisPage?: boolean;
  versionPathPrefix?: Record<string, string>;
  editUrlBranch?: string;
  prTitlePrefix?: string;
  prBodyTemplate?: string;
  storageKeyPrefix?: string;
}

export interface EditorGlobalData {
  githubClientId: string;
  oauthWorkerUrl: string;
  repoOwner: string;
  repoName: string;
  baseBranch: string;
  sourceMaps: Record<string, Record<string, string>>;

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

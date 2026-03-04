import type {LoadContext, Plugin} from '@docusaurus/types';
import type {PluginOptions, EditorGlobalData} from './types';
import {validateOptions} from './options';
import path from 'path';
import fs from 'fs';

const PLUGIN_NAME = 'docusaurus-plugin-github-editor';

function buildSourceMap(dir: string, prefix: string = ''): Record<string, string> {
  const map: Record<string, string> = {};
  if (!fs.existsSync(dir)) return map;

  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = buildSourceMap(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name);
      Object.assign(map, sub);
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      const ext = entry.name.endsWith('.mdx') ? 'mdx' : 'md';
      const baseName = entry.name.replace(/\.mdx?$/, '');
      const docId = prefix ? `${prefix}/${baseName}` : baseName;
      map[docId] = ext;
    }
  }
  return map;
}

function buildEditMdxContent(title: string, sidebar: string): string {
  return `---
title: ${title}
displayed_sidebar: ${sidebar}
hide_table_of_contents: true
pagination_next: null
pagination_prev: null
custom_edit_url: null
unlisted: true
---

import EditorPage from '@theme/EditorPage';

<EditorPage />
`;
}

function ensureEditPages(siteDir: string, editMdxContent: string): void {
  const docsDir = path.resolve(siteDir, 'docs');
  if (fs.existsSync(docsDir)) {
    fs.writeFileSync(path.join(docsDir, 'edit.mdx'), editMdxContent);
  }

  const versionedDocsDir = path.resolve(siteDir, 'versioned_docs');
  if (fs.existsSync(versionedDocsDir)) {
    for (const entry of fs.readdirSync(versionedDocsDir, {withFileTypes: true})) {
      if (entry.isDirectory() && entry.name.startsWith('version-')) {
        fs.writeFileSync(
          path.join(versionedDocsDir, entry.name, 'edit.mdx'),
          editMdxContent,
        );
      }
    }
  }
}

export default function pluginGithubEditor(
  context: LoadContext,
  options: PluginOptions,
): Plugin<undefined> {
  const editMdxContent = buildEditMdxContent(
    options.editPageTitle ?? 'Edit documentation',
    options.editPageSidebar ?? 'sidebar',
  );

  ensureEditPages(context.siteDir, editMdxContent);

  return {
    name: PLUGIN_NAME,

    getThemePath() {
      return path.resolve(__dirname, '..', 'theme');
    },

    async contentLoaded({actions}) {
      const {setGlobalData} = actions;

      const sourceMaps: Record<string, Record<string, string>> = {};

      const docsDir = path.resolve(context.siteDir, 'docs');
      sourceMaps['current'] = buildSourceMap(docsDir);

      const versionedDocsDir = path.resolve(context.siteDir, 'versioned_docs');
      if (fs.existsSync(versionedDocsDir)) {
        for (const entry of fs.readdirSync(versionedDocsDir, {withFileTypes: true})) {
          if (entry.isDirectory() && entry.name.startsWith('version-')) {
            const version = entry.name.replace('version-', '');
            sourceMaps[version] = buildSourceMap(path.join(versionedDocsDir, entry.name));
          }
        }
      }

      const globalData: EditorGlobalData = {
        githubClientId: options.githubClientId,
        oauthWorkerUrl: options.oauthWorkerUrl,
        repoOwner: options.repoOwner,
        repoName: options.repoName,
        baseBranch: options.baseBranch,
        sourceMaps,
        defaultLocale: options.defaultLocale ?? 'en',
        editRoute: options.editRoute ?? '/edit',
        editPageTitle: options.editPageTitle ?? 'Edit documentation',
        editPageSidebar: options.editPageSidebar ?? 'sidebar',
        logoSrc: options.logoSrc ?? '',
        versionLabels: options.versionLabels ?? {},
        enableEditThisPage: options.enableEditThisPage ?? false,
        versionPathPrefix: options.versionPathPrefix ?? {},
        editUrlBranch: options.editUrlBranch ?? 'main',
        prTitlePrefix: options.prTitlePrefix ?? 'docs: ',
        prBodyTemplate: options.prBodyTemplate ??
          '## Documentation change\n\n**Modified file:** `{{filePath}}`\n\n{{commitMessage}}\n\n---\n*Proposed via the built-in documentation editor.*',
        storageKeyPrefix: options.storageKeyPrefix ?? 'gh-editor',
      };

      setGlobalData(globalData);
    },

    getDefaultCodeTranslationMessages() {
      return {
        'editor.signIn.title': 'Edit documentation',
        'editor.signIn.description':
          'Sign in with GitHub to suggest changes to the documentation.',
        'editor.signIn.button': 'Sign in with GitHub',
        'editor.toolbar.propose': 'Propose changes',
        'editor.toolbar.cancel': 'Cancel',
        'editor.toolbar.commitPlaceholder': 'Describe your changes...',
        'editor.success.title': 'Changes proposed!',
        'editor.success.description':
          'Your Pull Request has been successfully created. The team will review it shortly.',
        'editor.success.viewPr': 'View Pull Request',
        'editor.success.backToDocs': 'Back to documentation',
        'editor.error.noSource': 'No file specified.',
        'editor.error.noSource.description': 'Use the "Edit this page" link from a documentation page.',
        'editor.error.notFound': 'This file was not found in the repository.',
        'editor.error.sessionExpired': 'Your session has expired. Please sign in again.',
        'editor.error.noPermission': 'You do not have permission to propose changes.',
        'editor.error.conflict': 'The file has been modified in the meantime. Reload the page to get the latest version.',
        'editor.error.generic': 'An error occurred. Please try again.',
        'editor.loading': 'Loading...',
        'editor.authenticating': 'Authenticating...',
        'editor.exitBar.backToDocs': 'Back to documentation',
        'editor.header.logout': 'Log out',
        'editor.preview.title': 'Preview',
      };
    },
  };
}

export {validateOptions};
export type {PluginOptions, EditorGlobalData, GitHubUser, FileContent} from './types';

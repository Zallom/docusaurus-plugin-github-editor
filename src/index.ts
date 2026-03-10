import type {LoadContext, Plugin} from '@docusaurus/types';
import type {PluginOptions, EditorGlobalData} from './types';
import {validateOptions} from './options';
import translations from './translations';
import path from 'path';
import fs from 'fs';

const PLUGIN_NAME = 'docusaurus-plugin-github-editor';

const DEFAULT_PR_BODY_TEMPLATE =
  '## Documentation change\n\n**Modified file:** `{{filePath}}`\n\n{{commitMessage}}\n\n---\n*Proposed via the built-in documentation editor.*';

/**
 * Extract docs plugin options from the Docusaurus site config (presets + plugins).
 * Returns the first docs plugin config found (the "default" instance).
 */
function extractDocsPluginOptions(siteConfig: any): Record<string, any> {
  const candidates: any[] = [];

  for (const preset of siteConfig.presets ?? []) {
    if (Array.isArray(preset) && preset[1]?.docs) {
      candidates.push(preset[1].docs);
    }
  }

  for (const plugin of siteConfig.plugins ?? []) {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    const opts = Array.isArray(plugin) ? plugin[1] : {};
    if (typeof name === 'string' && name.includes('plugin-content-docs')) {
      candidates.push(opts ?? {});
    }
  }

  return candidates[0] ?? {};
}

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

function ensureEditPages(siteDir: string, docsPath: string, editMdxContent: string): void {
  const docsDir = path.resolve(siteDir, docsPath);
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
  const docsPluginOpts = extractDocsPluginOptions(context.siteConfig);
  const docsPath = options.docsPath ?? (docsPluginOpts.path?.replace(/^\.\//, '') ?? 'docs');
  const docsRouteBasePath = (options.docsRouteBasePath ?? docsPluginOpts.routeBasePath ?? '').replace(/^\/|\/$/g, '');
  const editUrlBranch = options.editUrlBranch ?? 'main';

  const editMdxContent = buildEditMdxContent(
    options.editPageTitle ?? 'Edit documentation',
    options.editPageSidebar ?? 'sidebar',
  );

  ensureEditPages(context.siteDir, docsPath, editMdxContent);

  return {
    name: PLUGIN_NAME,

    getThemePath() {
      return path.resolve(__dirname, '..', 'theme');
    },

    getTypeScriptThemePath() {
      return path.resolve(__dirname, '..', 'theme');
    },

    async contentLoaded({actions}) {
      const {setGlobalData} = actions;

      const sourceMaps: Record<string, Record<string, string>> = {};

      const docsDir = path.resolve(context.siteDir, docsPath);
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
        docsPath,
        repoDocsPath: options.repoDocsPath ?? docsPath,
        docsRouteBasePath,
        defaultLocale: options.defaultLocale ?? 'en',
        editRoute: options.editRoute ?? '/edit',
        editPageTitle: options.editPageTitle ?? 'Edit documentation',
        editPageSidebar: options.editPageSidebar ?? 'sidebar',
        logoSrc: options.logoSrc ?? '',
        versionLabels: options.versionLabels ?? {},
        enableEditThisPage: options.enableEditThisPage ?? false,
        versionPathPrefix: options.versionPathPrefix ?? {},
        editUrlBranch,
        prTitlePrefix: options.prTitlePrefix ?? 'docs: ',
        prBodyTemplate: options.prBodyTemplate ?? DEFAULT_PR_BODY_TEMPLATE,
        storageKeyPrefix: options.storageKeyPrefix ?? 'gh-editor',
      };

      setGlobalData(globalData);
    },

    async allContentLoaded({allContent, actions}: any) {
      const autoVersionLabels: Record<string, string> = {};
      const autoVersionPathPrefix: Record<string, string> = {};
      try {
        const docsContent = allContent?.['docusaurus-plugin-content-docs']?.['default'];
        const loadedVersions: Array<{versionName: string; label: string; path: string}> =
          docsContent?.loadedVersions ?? [];
        const docsBase = docsRouteBasePath.replace(/^\/+/, '').replace(/\/+$/, '');
        for (const v of loadedVersions) {
          autoVersionLabels[v.versionName] = v.label;
          let segment = v.path.replace(/^\/+/, '').replace(/\/+$/, '');
          if (docsBase && segment.startsWith(docsBase)) {
            segment = segment.slice(docsBase.length).replace(/^\/+/, '');
          }
          autoVersionPathPrefix[v.versionName] = segment;
        }
      } catch {
        // Docs plugin not available — skip
      }

      if (Object.keys(autoVersionLabels).length > 0) {
        const userLabels = options.versionLabels ?? {};
        const userPrefixes = options.versionPathPrefix ?? {};
        actions.setGlobalData({
          versionLabels: {...autoVersionLabels, ...userLabels},
          versionPathPrefix: {...autoVersionPathPrefix, ...userPrefixes},
        });
      }
    },

    getDefaultCodeTranslationMessages() {
      const locale = context.i18n.currentLocale;
      return translations[locale] ?? translations.en;
    },
  };
}

export {validateOptions};
export type {PluginOptions, EditorGlobalData, GitHubUser, FileContent} from './types';

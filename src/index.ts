import type {LoadContext, Plugin} from '@docusaurus/types';
import type {PluginOptions, EditorGlobalData} from './types';
import {validateOptions} from './options';
import path from 'path';
import fs from 'fs';

const PLUGIN_NAME = 'docusaurus-plugin-github-editor';

const translations: Record<string, Record<string, string>> = {
  en: {
    'editor.signIn.title': 'Edit documentation',
    'editor.signIn.description': 'Sign in with GitHub to suggest changes to the documentation.',
    'editor.signIn.button': 'Sign in with GitHub',
    'editor.toolbar.propose': 'Propose changes',
    'editor.toolbar.cancel': 'Cancel',
    'editor.toolbar.commitPlaceholder': 'Describe your changes...',
    'editor.success.title': 'Changes proposed!',
    'editor.success.description': 'Your Pull Request has been successfully created. The team will review it shortly.',
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
    'editor.contribute.title': 'Contribute to the wiki',
    'editor.contribute.description': 'Help improve the documentation by editing existing pages. Choose a page below or search for one.',
    'editor.contribute.searchPlaceholder': 'Search for a page...',
    'editor.contribute.featured': 'Suggested pages',
    'editor.contribute.noResults': 'No pages found.',
  },
  fr: {
    'editor.signIn.title': 'Modifier la documentation',
    'editor.signIn.description': 'Connectez-vous avec GitHub pour proposer des modifications à la documentation.',
    'editor.signIn.button': 'Se connecter avec GitHub',
    'editor.toolbar.propose': 'Proposer les modifications',
    'editor.toolbar.cancel': 'Annuler',
    'editor.toolbar.commitPlaceholder': 'Décrivez vos modifications...',
    'editor.success.title': 'Modifications proposées !',
    'editor.success.description': 'Votre Pull Request a été créée avec succès. L\'équipe la examinera sous peu.',
    'editor.success.viewPr': 'Voir la Pull Request',
    'editor.success.backToDocs': 'Retour à la documentation',
    'editor.error.noSource': 'Aucun fichier spécifié.',
    'editor.error.noSource.description': 'Utilisez le lien « Modifier cette page » depuis une page de documentation.',
    'editor.error.notFound': 'Ce fichier n\'a pas été trouvé dans le dépôt.',
    'editor.error.sessionExpired': 'Votre session a expiré. Veuillez vous reconnecter.',
    'editor.error.noPermission': 'Vous n\'avez pas la permission de proposer des modifications.',
    'editor.error.conflict': 'Le fichier a été modifié entre-temps. Rechargez la page pour obtenir la dernière version.',
    'editor.error.generic': 'Une erreur est survenue. Veuillez réessayer.',
    'editor.loading': 'Chargement...',
    'editor.authenticating': 'Authentification...',
    'editor.exitBar.backToDocs': 'Retour à la documentation',
    'editor.header.logout': 'Déconnexion',
    'editor.preview.title': 'Aperçu',
    'editor.contribute.title': 'Contribuer au wiki',
    'editor.contribute.description': 'Aidez à améliorer la documentation en modifiant les pages existantes. Choisissez une page ci-dessous ou recherchez-en une.',
    'editor.contribute.searchPlaceholder': 'Rechercher une page...',
    'editor.contribute.featured': 'Pages suggérées',
    'editor.contribute.noResults': 'Aucune page trouvée.',
  },
};

/**
 * Extract docs plugin options from the Docusaurus site config (presets + plugins).
 * Returns the first docs plugin config found (the "default" instance).
 */
function extractDocsPluginOptions(siteConfig: any): Record<string, any> {
  const candidates: any[] = [];

  // Look in presets (e.g. ['classic', { docs: { ... } }])
  for (const preset of siteConfig.presets ?? []) {
    if (Array.isArray(preset) && preset[1]?.docs) {
      candidates.push(preset[1].docs);
    }
  }

  // Look in standalone plugins
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
  // Auto-derive options from the docs plugin config when not explicitly set
  const docsPluginOpts = extractDocsPluginOptions(context.siteConfig);
  const docsPath = options.docsPath ?? (docsPluginOpts.path?.replace(/^\.\//, '') ?? 'docs');
  const docsRouteBasePath = options.docsRouteBasePath ?? docsPluginOpts.routeBasePath ?? '';
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
        prBodyTemplate: options.prBodyTemplate ??
          '## Documentation change\n\n**Modified file:** `{{filePath}}`\n\n{{commitMessage}}\n\n---\n*Proposed via the built-in documentation editor.*',
        storageKeyPrefix: options.storageKeyPrefix ?? 'gh-editor',
      };

      setGlobalData(globalData);
    },

    async allContentLoaded({allContent, actions}: any) {
      // Auto-derive versionLabels and versionPathPrefix from docusaurus-plugin-content-docs
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
          // Strip the docsRouteBasePath prefix to avoid duplication (e.g. /wiki/wiki)
          if (docsBase && segment.startsWith(docsBase)) {
            segment = segment.slice(docsBase.length).replace(/^\/+/, '');
          }
          autoVersionPathPrefix[v.versionName] = segment;
        }
      } catch {
        // Docs plugin not available — skip
      }

      // Only update if we actually found version data
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

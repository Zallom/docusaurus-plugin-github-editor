# docusaurus-plugin-github-editor

A Docusaurus v3 plugin that adds a full-featured documentation editor with GitHub OAuth, CodeMirror, live MDX preview, and automatic PR creation.

## Features

- GitHub OAuth authentication
- CodeMirror 6 markdown editor with syntax highlighting
- Live MDX preview with Docusaurus components (Admonitions, Tabs, CodeBlock, etc.)
- Automatic PR creation on GitHub
- Sidebar navigation interception (edit files by clicking sidebar links)
- Synchronized scroll between editor and preview
- Versioned docs support
- i18n support
- Fully themeable via CSS custom properties
- Swizzlable components (MDX preview components, CodeMirror theme, EditThisPage)

## Installation

```bash
npm install docusaurus-plugin-github-editor
```

## Quick Start

### 1. Configure the plugin

```ts
// docusaurus.config.ts
export default {
  plugins: [
    [
      'docusaurus-plugin-github-editor',
      {
        githubClientId: 'your-github-oauth-client-id',
        oauthWorkerUrl: 'https://your-oauth-worker.workers.dev',
        repoOwner: 'your-org',
        repoName: 'your-docs-repo',
        baseBranch: 'main',
      },
    ],
  ],
};
```

#### Docs served at a custom route (e.g. `/wiki`)

```ts
{
  docsPath: 'wiki',               // local directory
  docsRouteBasePath: 'wiki',      // route prefix
  repoDocsPath: '',               // files are at the repo root (separate repo)
}
```

The plugin automatically generates an `edit.mdx` page in your docs directory (and versioned docs if applicable). You should add `edit.mdx` to your `.gitignore` since it is regenerated on every build.

### 2. Deploy the OAuth Worker

See [`worker-template/README.md`](./worker-template/README.md) for deployment instructions.

### 3. (Optional) Enable "Edit this page" override

To route the "Edit this page" link to the built-in editor instead of GitHub:

```ts
{
  enableEditThisPage: true,
  versionPathPrefix: {
    current: 'next',
    '1.0.0': '',       // stable version at root
    '0.9.0': '0.9.0',
  },
  editUrlBranch: 'main',
}
```

## Configuration Reference

### Auto-detected options

The following options are **automatically derived** from your `plugin-content-docs` config (preset or standalone plugin). You only need to set them if you want to override the detected values:

- **`docsPath`** — from the docs plugin `path` option (default: `'docs'`)
- **`docsRouteBasePath`** — from the docs plugin `routeBasePath` option (default: `''`)
- **`versionLabels`** — derived from loaded versions at build time
- **`versionPathPrefix`** — derived from loaded versions at build time

### All options

| Option | Type | Default | Description |
|---|---|---|---|
| `githubClientId` | `string` | **required** | GitHub OAuth App client ID |
| `oauthWorkerUrl` | `string` | **required** | URL of the OAuth token exchange worker |
| `repoOwner` | `string` | **required** | GitHub repository owner |
| `repoName` | `string` | **required** | GitHub repository name |
| `baseBranch` | `string` | **required** | Base branch for PRs |
| `docsPath` | `string` | *auto-detected* | Local path to the docs directory |
| `repoDocsPath` | `string` | same as `docsPath` | Path prefix for docs files in the GitHub repo. Set to `''` if files are at the repo root (e.g. when docs live in a separate repo) |
| `docsRouteBasePath` | `string` | *auto-detected* | Route base path for the docs plugin (e.g. `'wiki'` if docs are served at `/wiki`) |
| `defaultLocale` | `string` | `'en'` | Default locale of the docs site |
| `editRoute` | `string` | `'/edit'` | Route path for the editor page (appended to `docsRouteBasePath`) |
| `editPageTitle` | `string` | `'Edit documentation'` | Title of the generated edit.mdx page |
| `editPageSidebar` | `string` | `'sidebar'` | Sidebar ID for the edit page |
| `logoSrc` | `string` | `''` | Logo image URL displayed on the sign-in card |
| `versionLabels` | `Record<string, string>` | *auto-detected* | Human-readable labels for version badges |
| `enableEditThisPage` | `boolean` | `false` | Override the default "Edit this page" link |
| `versionPathPrefix` | `Record<string, string>` | *auto-detected* | URL path prefix per version for the edit route |
| `editUrlBranch` | `string` | `'main'` | Branch name used in the editUrl pattern |
| `prTitlePrefix` | `string` | `'docs: '` | Prefix for PR titles |
| `prBodyTemplate` | `string` | *(see below)* | PR body template with `{{filePath}}` and `{{commitMessage}}` placeholders |
| `storageKeyPrefix` | `string` | `'gh-editor'` | Prefix for localStorage keys |

### PR Body Template

Default template:
```
## Documentation change

**Modified file:** `{{filePath}}`

{{commitMessage}}

---
*Proposed via the built-in documentation editor.*
```

## Swizzling

### EditorMdxComponents

Add custom components available in the MDX preview:

```bash
npx docusaurus swizzle docusaurus-plugin-github-editor EditorMdxComponents
```

Then edit the swizzled file to add your components:

```tsx
// src/theme/EditorMdxComponents/index.tsx
import Admonition from '@theme/Admonition';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import Details from '@theme/Details';
import CodeBlock from '@theme/CodeBlock';
import MyCustomComponent from '@site/src/components/MyCustomComponent';

export function useEditorMdxComponents(extra: Record<string, any> = {}): Record<string, any> {
  return {
    // Default components
    Admonition,
    admonition: Admonition,
    Tabs,
    TabItem,
    Details,
    CodeBlock,
    // Your custom components
    MyCustomComponent,
    ...extra,
  };
}
```

### EditorCodeMirrorTheme

Customize the CodeMirror editor theme:

```bash
npx docusaurus swizzle docusaurus-plugin-github-editor EditorCodeMirrorTheme
```

### EditThisPage

The EditThisPage component is automatically provided. Enable it with `enableEditThisPage: true`.

## CSS Theming

The editor uses CSS custom properties that automatically map to Docusaurus Infima variables. The editor adapts to any Docusaurus theme out of the box.

```css
:root {
  --ghe-bg-primary: var(--ifm-background-color);
  --ghe-bg-secondary: var(--ifm-background-surface-color);
  --ghe-bg-tertiary: var(--ifm-color-emphasis-100);
  --ghe-border-color: var(--ifm-toc-border-color);
  --ghe-text-primary: var(--ifm-color-content);
  --ghe-text-secondary: var(--ifm-color-content-secondary);
  --ghe-text-muted: var(--ifm-color-emphasis-500);
  --ghe-accent-color: var(--ifm-color-primary);
  --ghe-hover-bg: var(--ifm-hover-overlay);
  --ghe-error-border: var(--ifm-color-danger-dark);
  --ghe-font-mono: var(--ifm-font-family-monospace);
}
```

Override these in your `custom.css` to customize the editor appearance.

## Internationalization

The plugin defaults to English. Override translations via `i18n/{locale}/code.json`:

### French example (`i18n/fr/code.json`)

```json
{
  "editor.signIn.title": {
    "message": "Modifier la documentation"
  },
  "editor.signIn.description": {
    "message": "Connectez-vous avec GitHub pour proposer des modifications \u00e0 la documentation."
  },
  "editor.signIn.button": {
    "message": "Se connecter avec GitHub"
  },
  "editor.toolbar.propose": {
    "message": "Proposer les modifications"
  },
  "editor.toolbar.cancel": {
    "message": "Annuler"
  },
  "editor.toolbar.commitPlaceholder": {
    "message": "D\u00e9crivez vos modifications..."
  },
  "editor.success.title": {
    "message": "Modifications propos\u00e9es !"
  },
  "editor.success.description": {
    "message": "Votre Pull Request a \u00e9t\u00e9 cr\u00e9\u00e9e avec succ\u00e8s. L'\u00e9quipe la relira prochainement."
  },
  "editor.success.viewPr": {
    "message": "Voir la Pull Request"
  },
  "editor.success.backToDocs": {
    "message": "Retour \u00e0 la documentation"
  },
  "editor.error.noSource": {
    "message": "Aucun fichier sp\u00e9cifi\u00e9."
  },
  "editor.error.noSource.description": {
    "message": "Utilisez le lien \"Modifier cette page\" depuis une page de documentation."
  },
  "editor.error.notFound": {
    "message": "Ce fichier n'a pas \u00e9t\u00e9 trouv\u00e9 dans le d\u00e9p\u00f4t."
  },
  "editor.error.sessionExpired": {
    "message": "Votre session a expir\u00e9. Veuillez vous reconnecter."
  },
  "editor.error.noPermission": {
    "message": "Vous n'avez pas la permission de proposer des modifications."
  },
  "editor.error.conflict": {
    "message": "Le fichier a \u00e9t\u00e9 modifi\u00e9 entre-temps. Rechargez la page pour obtenir la derni\u00e8re version."
  },
  "editor.error.generic": {
    "message": "Une erreur est survenue. Veuillez r\u00e9essayer."
  },
  "editor.loading": {
    "message": "Chargement..."
  },
  "editor.authenticating": {
    "message": "Authentification en cours..."
  },
  "editor.exitBar.backToDocs": {
    "message": "Retour \u00e0 la documentation"
  },
  "editor.header.logout": {
    "message": "D\u00e9connexion"
  },
  "editor.preview.title": {
    "message": "Aper\u00e7u"
  }
}
```

## License

MIT

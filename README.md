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

| Option | Type | Default | Description |
|---|---|---|---|
| `githubClientId` | `string` | **required** | GitHub OAuth App client ID |
| `oauthWorkerUrl` | `string` | **required** | URL of the OAuth token exchange worker |
| `repoOwner` | `string` | **required** | GitHub repository owner |
| `repoName` | `string` | **required** | GitHub repository name |
| `baseBranch` | `string` | **required** | Base branch for PRs |
| `defaultLocale` | `string` | `'en'` | Default locale of the docs site |
| `editRoute` | `string` | `'/edit'` | Route path for the editor page |
| `editPageTitle` | `string` | `'Edit documentation'` | Title of the generated edit.mdx page |
| `editPageSidebar` | `string` | `'sidebar'` | Sidebar ID for the edit page |
| `logoSrc` | `string` | `''` | Logo image URL displayed on the sign-in card |
| `versionLabels` | `Record<string, string>` | `{}` | Human-readable labels for version badges |
| `enableEditThisPage` | `boolean` | `false` | Override the default "Edit this page" link |
| `versionPathPrefix` | `Record<string, string>` | `{}` | URL path prefix per version for the edit route |
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
import {useEditorMdxComponents} from 'docusaurus-plugin-github-editor/theme/EditorMdxComponents';
import MyCustomComponent from '@site/src/components/MyCustomComponent';

export function useEditorMdxComponents(extra = {}) {
  return useEditorMdxComponents({
    MyCustomComponent,
    ...extra,
  });
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

The editor uses CSS custom properties that map to Docusaurus Infima variables:

```css
:root {
  --ghe-bg-primary: var(--ifm-background-color);
  --ghe-bg-secondary: var(--ifm-background-surface-color);
  --ghe-border-color: var(--ifm-toc-border-color);
  --ghe-text-primary: var(--ifm-color-content);
  --ghe-text-secondary: var(--ifm-color-content-secondary);
  --ghe-accent-color: var(--ifm-color-primary);
  --ghe-hover-bg: var(--ifm-hover-overlay);
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

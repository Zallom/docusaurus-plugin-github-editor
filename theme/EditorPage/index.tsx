import React, {useEffect, useState, useCallback} from 'react';
import Translate, {translate} from '@docusaurus/Translate';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useLocation, useHistory} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useDocsVersion} from '@docusaurus/plugin-content-docs/client';
import {usePluginData} from '@docusaurus/useGlobalData';
import AuthProvider, {useAuth} from '@theme/AuthProvider';
import type {EditorGlobalData} from '../../src/types';
import styles from './styles.module.css';

const PLUGIN_NAME = 'docusaurus-plugin-github-editor';

function buildFilePath(locale: string, defaultLocale: string, version: string, fileName: string, repoDocsPath: string): string {
  const isDefaultLocale = locale === defaultLocale;
  const versionDir = version === 'current' ? 'current' : `version-${version}`;

  if (!isDefaultLocale) {
    return `i18n/${locale}/docusaurus-plugin-content-docs/${versionDir}/${fileName}`;
  }
  if (version === 'current') {
    return repoDocsPath ? `${repoDocsPath}/${fileName}` : fileName;
  }
  return `versioned_docs/version-${version}/${fileName}`;
}

function GitHubIcon() {
  return (
    <svg className={styles.authButtonIcon} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function EditorExitBar() {
  const history = useHistory();
  const location = useLocation();
  const {i18n} = useDocusaurusContext();
  const docsVersion = useDocsVersion();
  const {defaultLocale} = usePluginData(PLUGIN_NAME) as EditorGlobalData;
  const currentLocale = i18n.currentLocale;

  const params = new URLSearchParams(location.search);
  const source = params.get('source');

  const localePrefix = currentLocale !== defaultLocale ? `/${i18n.localeConfigs[currentLocale]?.path ?? currentLocale}` : '';
  const base = docsVersion.path || '';

  let docUrl: string;
  if (source) {
    let slug = source.replace(/\.mdx?$/, '').replace(/\/index$/, '');
    // Normalize category index docs: "folder/folder" → "folder"
    const parts = slug.split('/');
    if (parts.length >= 2 && parts[parts.length - 1] === parts[parts.length - 2]) {
      slug = parts.slice(0, -1).join('/');
    }
    docUrl = slug === 'readme' ? `${localePrefix}${base}/` : `${localePrefix}${base}/${slug}`;
  } else {
    docUrl = `${localePrefix}${base}/`;
  }

  return (
    <div className={styles.exitBar}>
      <button
        className={styles.exitButton}
        onClick={() => history.push(docUrl)}
        type="button">
        <svg viewBox="0 0 20 20" fill="currentColor" className={styles.exitButtonIcon}>
          <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
        </svg>
        <Translate id="editor.exitBar.backToDocs">Back to documentation</Translate>
      </button>
    </div>
  );
}

function EditorInner() {
  const {token, user, isLoading, login, handleOAuthCallback} = useAuth();
  const location = useLocation();
  const history = useHistory();
  const {i18n} = useDocusaurusContext();
  const docsVersion = useDocsVersion();
  const globalData = usePluginData(PLUGIN_NAME) as EditorGlobalData;
  const {sourceMaps, defaultLocale, logoSrc, versionLabels, repoDocsPath} = globalData;
  const currentLocale = i18n.currentLocale;
  const version = docsVersion.version;
  const [oauthProcessing, setOAuthProcessing] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Intercept sidebar link clicks to navigate between files in the editor
  useEffect(() => {
    const sourceMap = sourceMaps?.[version] ?? {};

    function handleClick(e: MouseEvent) {
      const link = (e.target as HTMLElement).closest('a.menu__link') as HTMLAnchorElement | null;
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('http')) return;

      let slug = href;
      const localePrefix = currentLocale !== defaultLocale ? `/${i18n.localeConfigs[currentLocale]?.path ?? currentLocale}` : '';
      if (localePrefix && slug.startsWith(localePrefix)) {
        slug = slug.slice(localePrefix.length);
      }
      if (docsVersion.path && slug.startsWith(docsVersion.path)) {
        slug = slug.slice(docsVersion.path.length);
      }
      slug = slug.replace(/^\/+|\/+$/g, '');

      if (!slug) {
        slug = 'readme';
      }

      let sourceFile: string | null = null;
      if (sourceMap[slug]) {
        sourceFile = `${slug}.${sourceMap[slug]}`;
      } else if (sourceMap[`${slug}/index`]) {
        sourceFile = `${slug}/index.${sourceMap[`${slug}/index`]}`;
      } else {
        // Handle category index docs where slug is "folder" but file is "folder/folder"
        const lastSegment = slug.split('/').pop() || slug;
        const categoryDocId = `${slug}/${lastSegment}`;
        if (sourceMap[categoryDocId]) {
          sourceFile = `${categoryDocId}.${sourceMap[categoryDocId]}`;
        }
      }

      if (sourceFile) {
        e.preventDefault();
        e.stopPropagation();
        history.push(`${location.pathname}?source=${encodeURIComponent(sourceFile)}`);
      }
    }

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [version, sourceMaps, docsVersion.path, location.pathname, history, currentLocale, i18n.localeConfigs, defaultLocale]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    const sourceParam = params.get('source');

    if (code && state) {
      const savedState = sessionStorage.getItem('oauth-state');
      const savedSource = sessionStorage.getItem('oauth-source');
      if (savedSource) {
        setSource(savedSource);
        sessionStorage.removeItem('oauth-source');
      }

      if (state === savedState) {
        setOAuthProcessing(true);
        sessionStorage.removeItem('oauth-state');
        handleOAuthCallback(code)
          .catch((err) => {
            console.error('OAuth callback error:', err);
            setError(err instanceof Error ? err.message : translate({
              id: 'editor.error.generic',
              message: 'An error occurred. Please try again.',
            }));
          })
          .finally(() => {
            setOAuthProcessing(false);
            const qs = savedSource ? `?source=${encodeURIComponent(savedSource)}` : '';
            window.history.replaceState({}, '', `${location.pathname}${qs}`);
          });
      } else {
        setError(translate({
          id: 'editor.error.generic',
          message: 'An error occurred. Please try again.',
        }));
      }
    } else if (sourceParam) {
      setSource(sourceParam);
    }
  }, [handleOAuthCallback, location.search, location.pathname]);

  const handleLogin = useCallback(() => {
    if (source) {
      sessionStorage.setItem('oauth-source', source);
    }
    login();
  }, [login, source]);

  const filePath = source ? buildFilePath(currentLocale, defaultLocale, version, source, repoDocsPath) : null;

  if (isLoading || oauthProcessing) {
    return (
      <div className={styles.centeredMessage}>
        <Translate id="editor.authenticating" description="Authenticating message">
          Authenticating...
        </Translate>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centeredMessage}>
        <div className={styles.errorCard}>
          <div className={styles.errorTitle}>Error</div>
          <div className={styles.errorMessage}>{error}</div>
        </div>
      </div>
    );
  }

  if (!source || !filePath) {
    return (
      <div className={styles.centeredMessage}>
        <div className={styles.errorCard}>
          <div className={styles.errorTitle}>
            <Translate id="editor.error.noSource">
              No file specified
            </Translate>
          </div>
          <div className={styles.errorMessage}>
            <Translate
              id="editor.error.noSource.description"
              description="No source file specified">
              Use the &quot;Edit this page&quot; link from a documentation page.
            </Translate>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className={styles.centeredMessage}>
        <div className={styles.authCard}>
          {logoSrc && (
            <img
              src={logoSrc}
              alt="Logo"
              className={styles.authLogo}
            />
          )}
          <div className={styles.authTitle}>
            <Translate id="editor.signIn.title">
              Edit documentation
            </Translate>
          </div>
          <div className={styles.authDescription}>
            <Translate id="editor.signIn.description">
              Sign in with GitHub to suggest changes to the documentation.
            </Translate>
          </div>
          <button
            className={styles.authButton}
            onClick={handleLogin}
            type="button">
            <GitHubIcon />
            <Translate id="editor.signIn.button">
              Sign in with GitHub
            </Translate>
          </button>
        </div>
      </div>
    );
  }

  const EditorContent = React.lazy(
    () => import('./EditorContent'),
  );

  return (
    <React.Suspense
      fallback={
        <div className={styles.centeredMessage}>
          <Translate id="editor.loading">Loading...</Translate>
        </div>
      }>
      <EditorContent
        key={filePath}
        source={source}
        filePath={filePath}
        version={version}
        versionLabels={versionLabels}
      />
    </React.Suspense>
  );
}

export default function EditorPage(): JSX.Element {
  useEffect(() => {
    document.body.classList.add('editor-page');
    return () => document.body.classList.remove('editor-page');
  }, []);

  return (
    <div className={styles.editorRoot}>
      <BrowserOnly fallback={
        <div className={styles.centeredMessage}>
          <Translate id="editor.loading">Loading...</Translate>
        </div>
      }>
        {() => (
          <>
            <EditorExitBar />
            <AuthProvider>
              <EditorInner />
            </AuthProvider>
          </>
        )}
      </BrowserOnly>
    </div>
  );
}

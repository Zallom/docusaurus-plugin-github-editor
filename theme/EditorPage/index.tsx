import React, {useEffect, useState, useCallback, useMemo} from 'react';
import Translate, {translate} from '@docusaurus/Translate';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useLocation, useHistory} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useDocsVersion} from '@docusaurus/plugin-content-docs/client';
import {usePluginData} from '@docusaurus/useGlobalData';
import AuthProvider, {useAuth} from '@theme/AuthProvider';
import type {EditorGlobalData} from '../types';
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

function EditorExitBar({sidebarCollapsed, onToggleSidebar}: {sidebarCollapsed: boolean; onToggleSidebar: () => void}) {
  const history = useHistory();
  const location = useLocation();
  const {i18n} = useDocusaurusContext();
  const {defaultLocale, docsRouteBasePath} = usePluginData(PLUGIN_NAME) as EditorGlobalData;
  const currentLocale = i18n.currentLocale;

  const params = new URLSearchParams(location.search);
  const source = params.get('source');

  const localePrefix = currentLocale !== defaultLocale ? `/${i18n.localeConfigs[currentLocale]?.path ?? currentLocale}` : '';
  const base = docsRouteBasePath ? `/${docsRouteBasePath}` : '';

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
        className={styles.sidebarToggleBtn}
        onClick={onToggleSidebar}
        type="button"
        title={sidebarCollapsed ? 'Show files' : 'Hide files'}>
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z" clipRule="evenodd" />
        </svg>
      </button>
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

function formatSlugLabel(slug: string): string {
  const last = slug.split('/').pop() || slug;
  return last
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatSlugCategory(slug: string): string {
  const parts = slug.split('/');
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).map((p) =>
    p.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  ).join(' › ');
}

// Resolve a sidebar doc ID to a source file path
function resolveDocSource(docId: string, sourceMap: Record<string, string>): string | null {
  if (sourceMap[docId]) return `${docId}.${sourceMap[docId]}`;
  if (sourceMap[`${docId}/index`]) return `${docId}/index.${sourceMap[`${docId}/index`]}`;
  const last = docId.split('/').pop() || docId;
  const catId = `${docId}/${last}`;
  if (sourceMap[catId]) return `${catId}.${sourceMap[catId]}`;
  return null;
}

function SidebarDocItem({item, sourceMap, currentSource, onSelect, depth}: {
  item: {type: string; label: string; docId?: string; href?: string; items?: any[]};
  sourceMap: Record<string, string>;
  currentSource: string | null;
  onSelect: (source: string) => void;
  depth: number;
}) {
  if (item.type === 'html') return null;

  if (item.type === 'category') {
    return (
      <SidebarCategory
        item={item}
        sourceMap={sourceMap}
        currentSource={currentSource}
        onSelect={onSelect}
        depth={depth}
      />
    );
  }

  // type === 'link' or 'doc' — resolve to a source file
  const docId = item.docId ?? (item as any).id ?? '';
  // Try docId first, then extract slug from href (e.g. "/docs/guide" -> "guide")
  let source: string | null = null;
  if (docId) {
    source = resolveDocSource(docId, sourceMap);
  }
  if (!source && item.href) {
    const slug = item.href.replace(/^\/+|\/+$/g, '').replace(/^docs\//, '');
    source = resolveDocSource(slug, sourceMap);
  }
  if (!source) return null;
  const isActive = source === currentSource;

  return (
    <button
      className={`${styles.treeItem} ${styles.treeFile} ${isActive ? styles.treeFileActive : ''}`}
      style={{paddingLeft: `${0.5 + depth * 0.75}rem`}}
      onClick={() => onSelect(source)}
      type="button">
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style={{flexShrink: 0}}>
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
      </svg>
      <span className={styles.treeLabel}>{item.label}</span>
    </button>
  );
}

function SidebarCategory({item, sourceMap, currentSource, onSelect, depth}: {
  item: {label: string; items?: any[]; link?: any; docId?: string};
  sourceMap: Record<string, string>;
  currentSource: string | null;
  onSelect: (source: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 1);

  // Category may have a linked doc (index page)
  const linkDocId = item.link?.docId ?? item.link?.id;
  const linkHref = item.link?.href ?? item.link?.permalink;
  let categorySource: string | null = null;
  if (linkDocId) {
    categorySource = resolveDocSource(linkDocId, sourceMap);
  }
  if (!categorySource && linkHref) {
    const slug = linkHref.replace(/^\/+|\/+$/g, '').replace(/^docs\//, '');
    categorySource = resolveDocSource(slug, sourceMap);
  }
  // Fallback: try resolving the category label as a slug
  if (!categorySource) {
    const labelSlug = item.label.toLowerCase().replace(/\s+/g, '-');
    categorySource = resolveDocSource(labelSlug, sourceMap);
  }
  // Fallback: infer folder from first child's href and try folder/index
  if (!categorySource && item.items?.length) {
    const firstChild = item.items[0];
    const childHref = firstChild?.href ?? firstChild?.docId ?? firstChild?.id;
    if (childHref) {
      const parts = childHref.replace(/^\/+|\/+$/g, '').split('/');
      // Remove last segment (the doc itself) to get the folder
      if (parts.length >= 2) {
        const folder = parts.slice(0, -1).join('/');
        categorySource = resolveDocSource(`${folder}/index`, sourceMap);
        if (!categorySource) {
          // Try folder/folder pattern
          const last = parts[parts.length - 2];
          categorySource = resolveDocSource(`${folder}/${last}`, sourceMap);
        }
      }
    }
  }
  const isCategoryActive = categorySource === currentSource;

  const handleClick = () => {
    if (categorySource) {
      onSelect(categorySource);
      setOpen(true);
    } else {
      setOpen(!open);
    }
  };

  return (
    <div>
      <button
        className={`${styles.treeItem} ${styles.treeFolder} ${isCategoryActive ? styles.treeFileActive : ''}`}
        style={{paddingLeft: `${0.5 + depth * 0.75}rem`}}
        onClick={handleClick}
        type="button">
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"
          style={{transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0}}
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
        <span className={styles.treeLabel}>{item.label}</span>
      </button>
      {open && item.items?.map((child: any, i: number) => (
        <SidebarDocItem key={child.docId || child.id || child.label || i} item={child} sourceMap={sourceMap} currentSource={currentSource} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

function EditorSidebar({sidebarItems, sourceMap, currentSource, onSelectSource, collapsed}: {
  sidebarItems: any[];
  sourceMap: Record<string, string>;
  currentSource: string | null;
  onSelectSource: (source: string) => void;
  collapsed: boolean;
}) {
  if (collapsed) return null;

  return (
    <div className={styles.editorSidebar}>
      <div className={styles.sidebarHeader}>
        <span className={styles.sidebarTitle}>
          <Translate id="editor.sidebar.title">Files</Translate>
        </span>
      </div>
      <div className={styles.sidebarTree}>
        {sidebarItems.map((item: any, i: number) => (
          <SidebarDocItem key={item.docId || item.id || item.label || i} item={item} sourceMap={sourceMap} currentSource={currentSource} onSelect={onSelectSource} depth={0} />
        ))}
      </div>
    </div>
  );
}

function ContributeLanding({sourceMap, onSelectSource}: {
  sourceMap: Record<string, string>;
  onSelectSource: (source: string) => void;
}) {
  const [search, setSearch] = useState('');

  const allPages = Object.entries(sourceMap)
    .filter(([slug]) => {
      const lower = slug.toLowerCase();
      return lower !== 'readme'
        && lower !== 'edit'
        && !lower.startsWith('.')
        && !lower.startsWith('_')
        && !lower.includes('/.')
        && !lower.includes('/_')
        && !slug.endsWith('/index')
;
    })
    .map(([slug, ext]) => ({slug, ext, source: `${slug}.${ext}`}));

  // Pick a stable random set of featured pages (seeded by day)
  const featured = (() => {
    const day = Math.floor(Date.now() / 86400000);
    const shuffled = [...allPages].sort((a, b) => {
      const ha = ((day * 2654435761 + a.slug.length * 31) ^ a.slug.charCodeAt(0)) >>> 0;
      const hb = ((day * 2654435761 + b.slug.length * 31) ^ b.slug.charCodeAt(0)) >>> 0;
      return ha - hb;
    });
    return shuffled.slice(0, 6);
  })();

  const searchLower = search.toLowerCase();
  const filtered = search
    ? allPages.filter((p) => p.slug.toLowerCase().includes(searchLower))
    : [];

  return (
    <div className={styles.contributeLanding}>
      <div className={styles.contributeHeader}>
        <div className={styles.contributeIcon}>✏️</div>
        <h1 className={styles.contributeTitle}>
          <Translate id="editor.contribute.title">Contribute to the documentation</Translate>
        </h1>
        <p className={styles.contributeDescription}>
          <Translate id="editor.contribute.description">
            Help improve the documentation by editing existing pages. Choose a page below or search for one.
          </Translate>
        </p>
      </div>

      <div className={styles.contributeSearch}>
        <input
          type="text"
          className={styles.contributeSearchInput}
          placeholder={translate({id: 'editor.contribute.searchPlaceholder', message: 'Search for a page...'})}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {search ? (
        <div className={styles.contributeGrid}>
          {filtered.length === 0 && (
            <p className={styles.contributeNoResults}>
              <Translate id="editor.contribute.noResults">No pages found.</Translate>
            </p>
          )}
          {filtered.slice(0, 12).map((p) => (
            <button
              key={p.slug}
              className={styles.contributeCard}
              onClick={() => onSelectSource(p.source)}
              type="button">
              <span className={styles.contributeCardTitle}>{formatSlugLabel(p.slug)}</span>
              {formatSlugCategory(p.slug) && (
                <span className={styles.contributeCardCategory}>{formatSlugCategory(p.slug)}</span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <>
          <h2 className={styles.contributeSectionTitle}>
            <Translate id="editor.contribute.featured">Suggested pages</Translate>
          </h2>
          <div className={styles.contributeGrid}>
            {featured.map((p) => (
              <button
                key={p.slug}
                className={styles.contributeCard}
                onClick={() => onSelectSource(p.source)}
                type="button">
                <span className={styles.contributeCardTitle}>{formatSlugLabel(p.slug)}</span>
                {formatSlugCategory(p.slug) && (
                  <span className={styles.contributeCardCategory}>{formatSlugCategory(p.slug)}</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
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
  const {sourceMaps, defaultLocale, logoSrc, versionLabels, repoDocsPath, docsRouteBasePath, editPageSidebar} = globalData;
  const currentLocale = i18n.currentLocale;
  const version = docsVersion.version;
  const docsBasePath = docsRouteBasePath ? `/${docsRouteBasePath}` : '';
  const [oauthProcessing, setOAuthProcessing] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sourceMap = sourceMaps?.[version] ?? {};

  const handleSelectSource = useCallback((s: string) => {
    setSource(s);
    history.push(`${location.pathname}?source=${encodeURIComponent(s)}`);
  }, [history, location.pathname]);

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

  let content: React.ReactNode;

  if (isLoading || oauthProcessing) {
    content = (
      <div className={styles.centeredMessage}>
        <Translate id="editor.authenticating" description="Authenticating message">
          Authenticating...
        </Translate>
      </div>
    );
  } else if (error) {
    content = (
      <div className={styles.centeredMessage}>
        <div className={styles.errorCard}>
          <div className={styles.errorTitle}>Error</div>
          <div className={styles.errorMessage}>{error}</div>
        </div>
      </div>
    );
  } else if (!source || !filePath) {
    content = (
      <ContributeLanding
        sourceMap={sourceMap}
        onSelectSource={handleSelectSource}
      />
    );
  } else if (!token || !user) {
    content = (
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
  } else {
    const EditorContent = React.lazy(
      () => import('./EditorContent'),
    );

    content = (
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

  return (
    <>
      <EditorExitBar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className={styles.editorLayout}>
        <EditorSidebar
          sidebarItems={docsVersion.docsSidebars?.[editPageSidebar] ?? docsVersion.docsSidebars?.[Object.keys(docsVersion.docsSidebars)[0]] ?? []}
          sourceMap={sourceMap}
          currentSource={source}
          onSelectSource={handleSelectSource}
          collapsed={sidebarCollapsed}
        />
        <div className={styles.editorMain}>
          {content}
        </div>
      </div>
    </>
  );
}

function useHideDocusaurusSidebar() {
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    document.body.classList.add('editor-page');
    const modified: {el: HTMLElement; prop: string; old: string}[] = [];

    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      for (const sibling of Array.from(parent.children) as HTMLElement[]) {
        if (sibling.tagName === 'ASIDE' || /sidebar/i.test(sibling.className?.toString() ?? '')) {
          modified.push({el: sibling, prop: 'display', old: sibling.style.display});
          sibling.style.setProperty('display', 'none', 'important');
        }
      }
      modified.push({el: parent, prop: 'max-width', old: parent.style.maxWidth});
      modified.push({el: parent, prop: 'width', old: parent.style.width});
      parent.style.setProperty('max-width', '100%', 'important');
      parent.style.setProperty('width', '100%', 'important');
      parent = parent.parentElement;
    }

    return () => {
      document.body.classList.remove('editor-page');
      for (const m of modified) {
        if (m.old) {
          m.el.style.setProperty(m.prop, m.old);
        } else {
          m.el.style.removeProperty(m.prop);
        }
      }
    };
  });

  return ref;
}

export default function EditorPage(): JSX.Element {
  const rootRef = useHideDocusaurusSidebar();

  return (
    <div className={styles.editorRoot} ref={rootRef}>
      <BrowserOnly fallback={
        <div className={styles.centeredMessage}>
          <Translate id="editor.loading">Loading...</Translate>
        </div>
      }>
        {() => (
          <AuthProvider>
            <EditorInner />
          </AuthProvider>
        )}
      </BrowserOnly>
    </div>
  );
}

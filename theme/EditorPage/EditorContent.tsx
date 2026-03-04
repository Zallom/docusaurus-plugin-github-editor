import React, {useEffect, useRef, useState, useCallback} from 'react';
import Translate, {translate} from '@docusaurus/Translate';
import {usePluginData} from '@docusaurus/useGlobalData';
import {useHistory} from '@docusaurus/router';
import {evaluate} from '@mdx-js/mdx';
import * as jsxRuntime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import {visit} from 'unist-util-visit';
import {EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection} from '@codemirror/view';
import {EditorState} from '@codemirror/state';
import {markdown, markdownLanguage} from '@codemirror/lang-markdown';
import {languages} from '@codemirror/language-data';
import {defaultKeymap, history as cmHistory, historyKeymap} from '@codemirror/commands';
import {searchKeymap, highlightSelectionMatches} from '@codemirror/search';
import {syntaxHighlighting} from '@codemirror/language';
import {editorTheme, syntaxTheme} from '@theme/EditorCodeMirrorTheme';
import {useEditorMdxComponents} from '@theme/EditorMdxComponents';
import {useAuth} from '@theme/AuthProvider';
import {getFileContent, proposeChanges} from '@theme/GitHubService';
import type {EditorGlobalData} from '../../src/types';
import styles from './styles.module.css';

const PLUGIN_NAME = 'docusaurus-plugin-github-editor';

// Remark plugin: transform :::type container directives into admonition JSX
function remarkAdmonitions() {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (node.type === 'containerDirective') {
        const type = node.name;
        const data = node.data || (node.data = {});
        data.hName = 'admonition';
        data.hProperties = {type};
      }
    });
  };
}

// Extract title from frontmatter
function extractFrontmatterTitle(content: string): string | null {
  const normalized = normalizeContent(content);
  const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  const titleMatch = fmMatch[1].match(/^title:\s*['"]?(.+?)['"]?\s*$/m);
  return titleMatch ? titleMatch[1] : null;
}

// Normalize line endings and strip BOM
function normalizeContent(content: string): string {
  return content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

// Strip import/export lines and non-standard MDX syntax for runtime evaluation
function prepareMdxSource(raw: string): string {
  const content = normalizeContent(raw);
  const title = extractFrontmatterTitle(content);
  const titleHeading = title ? `# ${title}\n\n` : '';

  const body = content
    .replace(/^---\n[\s\S]*?\n---\n?/, '')
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export\s+.*$/gm, '')
    .replace(/\s*\{#[\w-]+\}/g, '');

  return titleHeading + body;
}

// MDX live preview component with debounced compilation
function MdxPreview({source, components}: {source: string; components: Record<string, any>}) {
  const [MdxContent, setMdxContent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const prepared = prepareMdxSource(source);
        const {default: Content} = await evaluate(prepared, {
          ...(jsxRuntime as any),
          remarkPlugins: [remarkGfm, remarkDirective, remarkAdmonitions],
          development: false,
        });
        setMdxContent(() => Content);
        setError(null);
      } catch (err: unknown) {
        console.warn('MDX preview compilation error:', err);
        if (!MdxContent) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
        }
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  if (error && !MdxContent) {
    return <div style={{color: 'var(--ghe-accent-color, #D35F5F)', padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem'}}>{error}</div>;
  }

  if (!MdxContent) {
    return <div style={{color: 'var(--ghe-text-muted, #555)'}}>Compiling...</div>;
  }

  try {
    return <MdxContent components={components} />;
  } catch {
    return <div style={{color: 'var(--ghe-accent-color, #D35F5F)', padding: '1rem'}}>Render error</div>;
  }
}

// Markdown formatting toolbar actions
interface FormatAction {
  label: string;
  icon: string;
  title: string;
  action: (view: EditorView) => void;
}

function wrapSelection(view: EditorView, before: string, after: string) {
  const {from, to} = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  if (selected.startsWith(before) && selected.endsWith(after) && selected.length >= before.length + after.length) {
    const inner = selected.slice(before.length, selected.length - after.length);
    view.dispatch({
      changes: {from, to, insert: inner},
      selection: {anchor: from, head: from + inner.length},
    });
    view.focus();
    return;
  }

  const outerFrom = from - before.length;
  const outerTo = to + after.length;
  if (outerFrom >= 0 && outerTo <= view.state.doc.length) {
    const textBefore = view.state.sliceDoc(outerFrom, from);
    const textAfter = view.state.sliceDoc(to, outerTo);
    if (textBefore === before && textAfter === after) {
      view.dispatch({
        changes: {from: outerFrom, to: outerTo, insert: selected},
        selection: {anchor: outerFrom, head: outerFrom + selected.length},
      });
      view.focus();
      return;
    }
  }

  const replacement = `${before}${selected || 'text'}${after}`;
  view.dispatch({
    changes: {from, to, insert: replacement},
    selection: {anchor: from + before.length, head: from + replacement.length - after.length},
  });
  view.focus();
}

function prefixLine(view: EditorView, prefix: string) {
  const {from} = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const lineText = line.text;

  if (lineText.startsWith(prefix)) {
    view.dispatch({
      changes: {from: line.from, to: line.from + prefix.length, insert: ''},
      selection: {anchor: Math.max(line.from, from - prefix.length)},
    });
    view.focus();
    return;
  }

  view.dispatch({
    changes: {from: line.from, to: line.from, insert: prefix},
    selection: {anchor: from + prefix.length},
  });
  view.focus();
}

function insertAtCursor(view: EditorView, text: string, cursorOffset?: number) {
  const {from} = view.state.selection.main;
  view.dispatch({
    changes: {from, insert: text},
    selection: {anchor: from + (cursorOffset ?? text.length)},
  });
  view.focus();
}

const FORMAT_ACTIONS: FormatAction[] = [
  {
    label: 'B',
    icon: 'B',
    title: 'Bold (Ctrl+B)',
    action: (view) => wrapSelection(view, '**', '**'),
  },
  {
    label: 'I',
    icon: 'I',
    title: 'Italic (Ctrl+I)',
    action: (view) => wrapSelection(view, '*', '*'),
  },
  {
    label: 'S',
    icon: 'S',
    title: 'Strikethrough',
    action: (view) => wrapSelection(view, '~~', '~~'),
  },
  {
    label: 'H1',
    icon: 'H1',
    title: 'Heading 1',
    action: (view) => prefixLine(view, '# '),
  },
  {
    label: 'H2',
    icon: 'H2',
    title: 'Heading 2',
    action: (view) => prefixLine(view, '## '),
  },
  {
    label: 'H3',
    icon: 'H3',
    title: 'Heading 3',
    action: (view) => prefixLine(view, '### '),
  },
  {
    label: 'link',
    icon: '\ud83d\udd17',
    title: 'Link',
    action: (view) => {
      const {from, to} = view.state.selection.main;
      const selected = view.state.sliceDoc(from, to);
      const text = selected || 'text';
      const replacement = `[${text}](url)`;
      view.dispatch({
        changes: {from, to, insert: replacement},
        selection: {anchor: from + text.length + 3, head: from + text.length + 6},
      });
      view.focus();
    },
  },
  {
    label: 'code',
    icon: '</>',
    title: 'Inline code',
    action: (view) => wrapSelection(view, '`', '`'),
  },
  {
    label: 'quote',
    icon: '\u201c',
    title: 'Blockquote',
    action: (view) => prefixLine(view, '> '),
  },
  {
    label: 'ul',
    icon: '\u2022',
    title: 'Bullet list',
    action: (view) => prefixLine(view, '- '),
  },
  {
    label: 'ol',
    icon: '1.',
    title: 'Numbered list',
    action: (view) => prefixLine(view, '1. '),
  },
  {
    label: 'img',
    icon: '\ud83d\uddbc',
    title: 'Image',
    action: (view) => insertAtCursor(view, '![alt](url)', 2),
  },
];

const ADMONITION_TYPES = [
  {type: 'note', label: 'Note', icon: '\u2139\ufe0f'},
  {type: 'tip', label: 'Tip', icon: '\ud83d\udca1'},
  {type: 'info', label: 'Info', icon: '\u2139\ufe0f'},
  {type: 'warning', label: 'Warning', icon: '\u26a0\ufe0f'},
  {type: 'danger', label: 'Danger', icon: '\ud83d\uded1'},
] as const;

function insertAdmonition(view: EditorView, type: string) {
  const {from, to} = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  const body = selected || 'Content';
  const text = `\n:::${type}\n${body}\n:::\n`;
  view.dispatch({
    changes: {from, to, insert: text},
    selection: {anchor: from + type.length + 5, head: from + type.length + 5 + body.length},
  });
  view.focus();
}

function AdmonitionDropdown({view}: {view: EditorView}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className={styles.dropdownWrapper} ref={ref}>
      <button
        className={styles.formatButton}
        onClick={() => setOpen(!open)}
        title="Admonition (:::type)"
        type="button">
        :::
      </button>
      {open && (
        <div className={styles.dropdown}>
          {ADMONITION_TYPES.map(({type, label, icon}) => (
            <button
              key={type}
              className={styles.dropdownItem}
              onClick={() => {
                insertAdmonition(view, type);
                setOpen(false);
              }}
              type="button">
              <span>{icon}</span>
              <span>{label}</span>
              <span className={styles.dropdownType}>:::{type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MarkdownToolbar({view}: {view: EditorView | null}) {
  if (!view) return null;
  return (
    <div className={styles.markdownToolbar}>
      {FORMAT_ACTIONS.map((action) => (
        <button
          key={action.label}
          className={`${styles.formatButton} ${
            action.label === 'B' ? styles.formatBold :
            action.label === 'I' ? styles.formatItalic : ''
          }`}
          onClick={() => action.action(view)}
          title={action.title}
          type="button">
          {action.icon}
        </button>
      ))}
      <div className={styles.formatSeparator} />
      <AdmonitionDropdown view={view} />
    </div>
  );
}

interface EditorContentProps {
  source: string;
  filePath: string;
  version: string;
  versionLabels: Record<string, string>;
}

export default function EditorContent({source, filePath, version, versionLabels}: EditorContentProps): JSX.Element {
  const {token, user, logout} = useAuth();
  const globalData = usePluginData(PLUGIN_NAME) as EditorGlobalData;
  const {repoOwner, repoName, baseBranch, prTitlePrefix, prBodyTemplate} = globalData;
  const mdxComponents = useEditorMdxComponents();
  const routerHistory = useHistory();

  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);

  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [fileSha, setFileSha] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prResult, setPrResult] = useState<{prUrl: string; prNumber: number} | null>(null);

  const hasChanges = content !== originalContent;

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (content !== originalContent) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [content, originalContent]);

  // Load file content
  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setIsLoadingFile(true);
    setError(null);

    getFileContent(token, repoOwner, repoName, filePath, baseBranch)
      .then((file) => {
        if (cancelled) return;
        setContent(file.content);
        setOriginalContent(file.content);
        setFileSha(file.sha);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        if (err.message === 'FILE_NOT_FOUND') {
          setError(translate({
            id: 'editor.error.notFound',
            message: 'This file was not found in the repository.',
          }));
        } else if (err.message.includes('401') || err.message.includes('Bad credentials')) {
          logout();
          setError(translate({
            id: 'editor.error.sessionExpired',
            message: 'Your session has expired. Please sign in again.',
          }));
        } else {
          setError(translate({
            id: 'editor.error.generic',
            message: 'An error occurred. Please try again.',
          }));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingFile(false);
      });

    return () => { cancelled = true; };
  }, [token, repoOwner, repoName, filePath, baseBranch, logout]);

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current || isLoadingFile || error) return;

    if (viewRef.current) {
      viewRef.current.destroy();
    }

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        cmHistory(),
        highlightSelectionMatches(),
        EditorView.lineWrapping,
        markdown({base: markdownLanguage, codeLanguages: languages}),
        editorTheme,
        syntaxHighlighting(syntaxTheme),
        keymap.of([
          {key: 'Mod-b', run: (v) => { wrapSelection(v, '**', '**'); return true; }},
          {key: 'Mod-i', run: (v) => { wrapSelection(v, '*', '*'); return true; }},
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setContent(update.state.doc.toString());
          }
        }),
        EditorView.domEventHandlers({
          scroll: () => {
            const preview = previewRef.current;
            const cmScroller = editorRef.current?.querySelector('.cm-scroller') as HTMLElement | null;
            const v = viewRef.current;
            if (!preview || !cmScroller || !v) return;

            const editorScrollTop = cmScroller.scrollTop;
            const editorScrollMax = cmScroller.scrollHeight - cmScroller.clientHeight;
            const previewScrollMax = preview.scrollHeight - preview.clientHeight;
            if (editorScrollMax <= 0 || previewScrollMax <= 0) return;

            const editorAnchors: number[] = [0];
            const doc = v.state.doc;
            for (let i = 1; i <= doc.lines; i++) {
              const line = doc.line(i);
              if (/^#{1,6}\s/.test(line.text)) {
                editorAnchors.push(v.lineBlockAt(line.from).top);
              }
            }
            editorAnchors.push(editorScrollMax);

            const previewAnchors: number[] = [0];
            const previewRect = preview.getBoundingClientRect();
            const headings = preview.querySelectorAll('h1, h2, h3, h4, h5, h6');
            const hasTitle = /^---\n[\s\S]*?\ntitle:\s*.+/m.test(doc.toString());
            const skip = hasTitle && headings.length > 0 && headings[0].tagName === 'H1' ? 1 : 0;
            for (let i = skip; i < headings.length; i++) {
              const el = headings[i] as HTMLElement;
              previewAnchors.push(el.getBoundingClientRect().top - previewRect.top + preview.scrollTop);
            }
            previewAnchors.push(previewScrollMax);

            const count = Math.min(editorAnchors.length, previewAnchors.length);
            const eA = editorAnchors.slice(0, count - 1).concat(editorScrollMax);
            const pA = previewAnchors.slice(0, count - 1).concat(previewScrollMax);

            let seg = 0;
            for (let i = 1; i < eA.length; i++) {
              if (editorScrollTop < eA[i]) break;
              seg = i;
            }
            if (seg >= eA.length - 1) seg = eA.length - 2;

            const range = eA[seg + 1] - eA[seg];
            const t = range > 0 ? Math.max(0, Math.min(1, (editorScrollTop - eA[seg]) / range)) : 0;
            preview.scrollTop = pA[seg] + t * (pA[seg + 1] - pA[seg]);
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });
    viewRef.current = view;
    setEditorView(view);

    return () => {
      view.destroy();
      viewRef.current = null;
      setEditorView(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingFile, error]);

  const handlePropose = useCallback(async () => {
    if (!token || !user || !hasChanges || !commitMessage.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await proposeChanges(
        token,
        repoOwner,
        repoName,
        filePath,
        content,
        fileSha,
        baseBranch,
        commitMessage.trim(),
        user.login,
        prTitlePrefix,
        prBodyTemplate,
      );
      setPrResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'CONFLICT') {
        setError(translate({
          id: 'editor.error.conflict',
          message: 'The file has been modified in the meantime. Reload the page to get the latest version.',
        }));
      } else if (message === 'NO_PERMISSION') {
        setError(translate({
          id: 'editor.error.noPermission',
          message: 'You do not have permission to propose changes.',
        }));
      } else {
        setError(translate({
          id: 'editor.error.generic',
          message: 'An error occurred. Please try again.',
        }));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [token, user, hasChanges, commitMessage, repoOwner, repoName, filePath, content, fileSha, baseBranch, prTitlePrefix, prBodyTemplate]);

  // Success screen
  if (prResult) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>&#10003;</div>
          <div className={styles.successTitle}>
            <Translate id="editor.success.title">
              Changes proposed!
            </Translate>
          </div>
          <div className={styles.successDescription}>
            <Translate id="editor.success.description">
              Your Pull Request has been successfully created. The team will review it shortly.
            </Translate>
          </div>
          <div className={styles.successActions}>
            <a
              href={prResult.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.prLink}>
              <Translate id="editor.success.viewPr">
                View Pull Request
              </Translate>
            </a>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                routerHistory.push('/');
              }}
              className={styles.backLink}>
              <Translate id="editor.success.backToDocs">
                Back to documentation
              </Translate>
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingFile) {
    return (
      <div className={styles.loadingContainer}>
        <Translate id="editor.loading">Loading...</Translate>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <div className={styles.errorTitle}>Error</div>
          <div className={styles.errorMessage}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editorWrapper}>
      {/* Header */}
      <div className={styles.editorHeader}>
        <div className={styles.headerLeft}>
          <img
            src={user!.avatar_url}
            alt={user!.login}
            className={styles.userAvatar}
          />
          <span className={styles.badge}>{versionLabels[version] ?? version}</span>
          <span className={styles.filePath}>{source}</span>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.logoutButton}
            onClick={logout}
            type="button">
            <Translate id="editor.header.logout">Log out</Translate>
          </button>
        </div>
      </div>

      {/* Formatting toolbar */}
      <MarkdownToolbar view={editorView} />

      {/* Editor + Preview */}
      <div className={styles.editorPanes}>
        <div className={styles.editorPane} ref={editorRef} />
        <div className={styles.previewPane} ref={previewRef}>
          <div className={styles.previewLabel}>
            <Translate id="editor.preview.title">Preview</Translate>
          </div>
          <MdxPreview source={content} components={mdxComponents} />
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button
          className={styles.cancelButton}
          onClick={() => routerHistory.goBack()}
          type="button">
          <Translate id="editor.toolbar.cancel">Cancel</Translate>
        </button>
        <input
          className={styles.commitInput}
          type="text"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder={translate({
            id: 'editor.toolbar.commitPlaceholder',
            message: 'Describe your changes...',
          })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handlePropose();
          }}
        />
        <button
          className={styles.proposeButton}
          onClick={handlePropose}
          disabled={!hasChanges || !commitMessage.trim() || isSubmitting}
          type="button">
          {isSubmitting
            ? translate({id: 'editor.loading', message: 'Loading...'})
            : translate({id: 'editor.toolbar.propose', message: 'Propose changes'})}
        </button>
      </div>
    </div>
  );
}

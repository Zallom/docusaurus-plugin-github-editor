import {EditorView} from '@codemirror/view';
import {syntaxHighlighting, HighlightStyle} from '@codemirror/language';
import {tags} from '@lezer/highlight';

/**
 * Default CodeMirror editor theme for the GitHub editor plugin.
 * Swizzle this component to customize the editor appearance.
 */
export const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--ghe-bg-primary, #0a0820)',
    color: 'var(--ghe-text-primary, #e0e0e8)',
    height: '100%',
    fontSize: '14px',
    fontFamily: 'var(--ghe-font-mono, "JetBrains Mono", "Consolas", monospace)',
  },
  '.cm-content': {
    caretColor: 'var(--ghe-accent-color, #D35F5F)',
    padding: '1rem 0',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--ghe-accent-color, #D35F5F)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#D35F5F33',
  },
  '.cm-activeLine': {
    backgroundColor: '#ffffff08',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--ghe-bg-tertiary, #060318)',
    color: 'var(--ghe-text-muted, #555)',
    border: 'none',
    paddingRight: '8px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#ffffff08',
    color: '#888',
  },
  '.cm-lineWrapping': {
    wordBreak: 'break-word',
  },
  '.cm-searchMatch': {
    backgroundColor: '#D35F5F44',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: '#D35F5F88',
  },
}, {dark: true});

/**
 * Default syntax highlighting theme.
 * Swizzle this component to customize syntax colors.
 */
export const syntaxTheme = HighlightStyle.define([
  {tag: tags.heading, color: '#D35F5F', fontWeight: 'bold'},
  {tag: tags.emphasis, fontStyle: 'italic', color: '#e98f8f'},
  {tag: tags.strong, fontWeight: 'bold', color: '#ec9090'},
  {tag: tags.link, color: '#6ea8fe', textDecoration: 'underline'},
  {tag: tags.url, color: '#6ea8fe'},
  {tag: tags.monospace, color: '#a0d0a0'},
  {tag: tags.quote, color: '#a0a0b0', fontStyle: 'italic'},
  {tag: tags.processingInstruction, color: '#888'},
  {tag: tags.meta, color: '#888'},
  {tag: tags.comment, color: '#666'},
]);

export {syntaxHighlighting};

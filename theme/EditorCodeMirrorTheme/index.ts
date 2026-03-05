import {EditorView} from '@codemirror/view';
import {syntaxHighlighting, HighlightStyle} from '@codemirror/language';
import {tags} from '@lezer/highlight';

/**
 * Default CodeMirror editor theme for the GitHub editor plugin.
 * Swizzle this component to customize the editor appearance.
 */
export const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--ghe-bg-primary)',
    color: 'var(--ghe-text-primary)',
    height: '100%',
    fontSize: '14px',
    fontFamily: 'var(--ghe-font-mono)',
  },
  '.cm-content': {
    caretColor: 'var(--ghe-accent-color)',
    padding: '1rem 0',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--ghe-accent-color)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--ghe-accent-color) 20%, transparent)',
  },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in srgb, var(--ghe-text-primary) 3%, transparent)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--ghe-bg-tertiary)',
    color: 'var(--ghe-text-muted)',
    border: 'none',
    paddingRight: '8px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'color-mix(in srgb, var(--ghe-text-primary) 3%, transparent)',
    color: 'var(--ghe-text-secondary)',
  },
  '.cm-lineWrapping': {
    wordBreak: 'break-word',
  },
  '.cm-searchMatch': {
    backgroundColor: 'color-mix(in srgb, var(--ghe-accent-color) 27%, transparent)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'color-mix(in srgb, var(--ghe-accent-color) 53%, transparent)',
  },
}, {dark: true});

/**
 * Default syntax highlighting theme.
 * Swizzle this component to customize syntax colors.
 */
export const syntaxTheme = HighlightStyle.define([
  {tag: tags.heading, color: 'var(--ghe-accent-color)', fontWeight: 'bold'},
  {tag: tags.emphasis, fontStyle: 'italic', color: 'var(--ghe-accent-color)'},
  {tag: tags.strong, fontWeight: 'bold', color: 'var(--ghe-accent-color)'},
  {tag: tags.link, color: 'var(--ifm-color-primary-lighter, #6ea8fe)', textDecoration: 'underline'},
  {tag: tags.url, color: 'var(--ifm-color-primary-lighter, #6ea8fe)'},
  {tag: tags.monospace, color: 'var(--ifm-color-success, #a0d0a0)'},
  {tag: tags.quote, color: 'var(--ghe-text-secondary)', fontStyle: 'italic'},
  {tag: tags.processingInstruction, color: 'var(--ghe-text-muted)'},
  {tag: tags.meta, color: 'var(--ghe-text-muted)'},
  {tag: tags.comment, color: 'var(--ifm-color-emphasis-400, #666)'},
]);

export {syntaxHighlighting};

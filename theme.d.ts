declare module '@theme/AuthProvider' {
  import type {ReactNode} from 'react';
  import type {GitHubUser} from './src/types';

  interface AuthContextValue {
    token: string | null;
    user: GitHubUser | null;
    isLoading: boolean;
    login: () => void;
    logout: () => void;
    handleOAuthCallback: (code: string) => Promise<void>;
  }

  export function useAuth(): AuthContextValue;

  export default function AuthProvider(props: {children: ReactNode}): JSX.Element;
}

declare module '@theme/GitHubService' {
  import type {FileContent} from './src/types';

  export function getFileContent(
    token: string,
    owner: string,
    repo: string,
    path: string,
    ref: string,
  ): Promise<FileContent>;

  export function proposeChanges(
    token: string,
    owner: string,
    repo: string,
    filePath: string,
    newContent: string,
    fileSha: string,
    baseBranch: string,
    commitMessage: string,
    username: string,
    prTitlePrefix?: string,
    prBodyTemplate?: string,
  ): Promise<{prUrl: string; prNumber: number}>;
}

declare module '@theme/EditorPage' {
  export default function EditorPage(): JSX.Element;
}

declare module '@theme/EditorMdxComponents' {
  export function useEditorMdxComponents(extra?: Record<string, any>): Record<string, any>;
}

declare module '@theme/EditorCodeMirrorTheme' {
  import type {Extension} from '@codemirror/state';
  import type {HighlightStyle} from '@codemirror/language';
  export const editorTheme: Extension;
  export const syntaxTheme: HighlightStyle;
  export {syntaxHighlighting} from '@codemirror/language';
}

declare module '@theme/Admonition' {
  import type {ReactNode} from 'react';
  export default function Admonition(props: {type: string; title?: string; children: ReactNode}): JSX.Element;
}

declare module '@theme/Tabs' {
  export default function Tabs(props: any): JSX.Element;
}

declare module '@theme/TabItem' {
  export default function TabItem(props: any): JSX.Element;
}

declare module '@theme/Details' {
  export default function Details(props: any): JSX.Element;
}

declare module '@theme/CodeBlock' {
  export default function CodeBlock(props: any): JSX.Element;
}

declare module '@mdx-js/mdx' {
  export function evaluate(source: string, options: any): Promise<{default: any}>;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

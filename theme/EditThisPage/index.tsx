import React from 'react';
import Translate from '@docusaurus/Translate';
import {useHistory} from '@docusaurus/router';
import {usePluginData} from '@docusaurus/useGlobalData';
import type {Props} from '@theme/EditThisPage';
import type {EditorGlobalData} from '../types';

const PLUGIN_NAME = 'docusaurus-plugin-github-editor';

/**
 * Parse the Docusaurus editUrl to extract the filename and version.
 *
 * Supports both /tree/{branch}/ and /blob/{branch}/ patterns:
 *   docs/features/captcha.md                                              -> current
 *   versioned_docs/version-3.3.1/features/captcha.md                     -> 3.3.1
 *   i18n/en/docusaurus-plugin-content-docs/current/features/captcha.md   -> current
 *   features/captcha.md  (when docsPath is different from 'docs')        -> current
 */
function parseEditUrl(editUrl: string, editUrlBranch: string, docsPath: string): {fileName: string; version: string} {
  // Match both /tree/{branch}/ and /blob/{branch}/ patterns
  const treeMatch = editUrl.match(new RegExp(`/(?:tree|blob)/${editUrlBranch}/(.+)$`));
  if (!treeMatch) {
    // Fallback: try to extract path after the last known segment
    // For function-based editUrl that may produce custom patterns
    const lastSlash = editUrl.lastIndexOf('/');
    if (lastSlash >= 0) {
      // The whole URL path after the repo — treat as a direct file path
    }
    return {fileName: '', version: ''};
  }
  const path = treeMatch[1];

  // i18n locale path
  const i18nMatch = path.match(
    /^i18n\/[^/]+\/docusaurus-plugin-content-docs\/([^/]+)\/(.+)$/,
  );
  if (i18nMatch) {
    const ver = i18nMatch[1] === 'current' ? 'current' : i18nMatch[1].replace('version-', '');
    return {fileName: i18nMatch[2], version: ver};
  }

  // versioned_docs
  const versionMatch = path.match(/^versioned_docs\/version-([^/]+)\/(.+)$/);
  if (versionMatch) {
    return {fileName: versionMatch[2], version: versionMatch[1]};
  }

  // docs path prefix (e.g. 'docs/' or 'wiki/')
  const docsPrefix = docsPath + '/';
  if (path.startsWith(docsPrefix)) {
    return {fileName: path.slice(docsPrefix.length), version: 'current'};
  }

  // Direct file path (no prefix — e.g. when editUrl points directly to the file)
  return {fileName: path, version: 'current'};
}

export default function EditThisPage({editUrl}: Props): JSX.Element {
  const history = useHistory();
  const globalData = usePluginData(PLUGIN_NAME) as EditorGlobalData;
  const {enableEditThisPage, versionPathPrefix, editUrlBranch, repoDocsPath, docsRouteBasePath} = globalData;

  // If the plugin's EditThisPage override is disabled, render a standard link
  if (!enableEditThisPage) {
    return (
      <a href={editUrl} target="_blank" rel="noreferrer noopener">
        <Translate
          id="theme.common.editThisPage"
          description="The link label to edit the current page">
          Edit this page
        </Translate>
      </a>
    );
  }

  const {fileName, version} = parseEditUrl(editUrl, editUrlBranch, repoDocsPath);

  // Build edit path: /{docsRouteBasePath}/{versionPrefix}/edit?source=...
  const versionPrefix = versionPathPrefix[version] ?? '';
  const routeBase = docsRouteBasePath ? `/${docsRouteBasePath}` : '';
  const versionSegment = versionPrefix ? `/${versionPrefix}` : '';
  const editPath = `${routeBase}${versionSegment}/edit?source=${encodeURIComponent(fileName)}`;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    history.push(editPath);
  };

  return (
    <a href={editPath} onClick={handleClick}>
      <Translate
        id="theme.common.editThisPage"
        description="The link label to edit the current page">
        Edit this page
      </Translate>
    </a>
  );
}

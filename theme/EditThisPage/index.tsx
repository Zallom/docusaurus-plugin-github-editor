import React from 'react';
import Translate from '@docusaurus/Translate';
import {useHistory} from '@docusaurus/router';
import {usePluginData} from '@docusaurus/useGlobalData';
import type {Props} from '@theme/EditThisPage';
import type {EditorGlobalData} from '../../src/types';

const PLUGIN_NAME = 'docusaurus-plugin-github-editor';

/**
 * Parse the Docusaurus editUrl to extract the filename and version.
 *
 * editUrl patterns (after /tree/{branch}/):
 *   docs/features/captcha.md                                              -> current
 *   versioned_docs/version-3.3.1/features/captcha.md                     -> 3.3.1
 *   i18n/en/docusaurus-plugin-content-docs/current/features/captcha.md   -> current
 *   i18n/en/docusaurus-plugin-content-docs/version-3.3.1/features/...    -> 3.3.1
 */
function parseEditUrl(editUrl: string, editUrlBranch: string): {fileName: string; version: string} {
  const treeMatch = editUrl.match(new RegExp(`/tree/${editUrlBranch}/(.+)$`));
  if (!treeMatch) return {fileName: '', version: ''};
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

  // docs/ (current version)
  if (path.startsWith('docs/')) {
    return {fileName: path.replace('docs/', ''), version: 'current'};
  }

  return {fileName: path, version: ''};
}

export default function EditThisPage({editUrl}: Props): JSX.Element {
  const history = useHistory();
  const globalData = usePluginData(PLUGIN_NAME) as EditorGlobalData;
  const {enableEditThisPage, versionPathPrefix, editUrlBranch} = globalData;

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

  const {fileName, version} = parseEditUrl(editUrl, editUrlBranch);

  const prefix = versionPathPrefix[version] ?? '';
  const editPath = prefix
    ? `/${prefix}/edit?source=${encodeURIComponent(fileName)}`
    : `/edit?source=${encodeURIComponent(fileName)}`;

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

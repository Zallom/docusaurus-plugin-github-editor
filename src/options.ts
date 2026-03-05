import {Joi} from '@docusaurus/utils-validation';
import type {OptionValidationContext} from '@docusaurus/types';
import type {PluginOptions} from './types';

const DEFAULT_PR_BODY_TEMPLATE =
  '## Documentation change\n\n**Modified file:** `{{filePath}}`\n\n{{commitMessage}}\n\n---\n*Proposed via the built-in documentation editor.*';

const pluginOptionsSchema = Joi.object<PluginOptions>({
  githubClientId: Joi.string().required(),
  oauthWorkerUrl: Joi.string().uri().required(),
  repoOwner: Joi.string().required(),
  repoName: Joi.string().required(),
  baseBranch: Joi.string().required(),

  docsPath: Joi.string().default('docs'),
  repoDocsPath: Joi.string().allow('').default(''),
  docsRouteBasePath: Joi.string().allow('').default(''),
  defaultLocale: Joi.string().default('en'),
  editRoute: Joi.string().default('/edit'),
  editPageTitle: Joi.string().default('Edit documentation'),
  editPageSidebar: Joi.string().default('sidebar'),
  logoSrc: Joi.string().default(''),
  versionLabels: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
  enableEditThisPage: Joi.boolean().default(false),
  versionPathPrefix: Joi.object().pattern(Joi.string(), Joi.string().allow('')).default({}),
  editUrlBranch: Joi.string().default('main'),
  prTitlePrefix: Joi.string().default('docs: '),
  prBodyTemplate: Joi.string().default(DEFAULT_PR_BODY_TEMPLATE),
  storageKeyPrefix: Joi.string().default('gh-editor'),
});

export function validateOptions({
  validate,
  options,
}: OptionValidationContext<PluginOptions, PluginOptions>): PluginOptions {
  return validate(pluginOptionsSchema, options);
}

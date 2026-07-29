export type {
  CssVarRewriteOptions,
  PrepareMermaidSvgOptions,
  ThemeVariables,
  WebCompatibilityOptions,
} from './types.js';

export {
  buildColorBindings,
  colorKey,
  isColorishValue,
  normalizeHex,
  rewriteMermaidSvgCssVars,
} from './rewrite.js';
export type { ColorBinding } from './rewrite.js';

export { normalizeMermaidSvgForWeb } from './normalize.js';
export { prepareMermaidSvgForWeb } from './prepare.js';

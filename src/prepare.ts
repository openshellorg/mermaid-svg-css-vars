import { normalizeMermaidSvgForWeb } from './normalize.js';
import { rewriteMermaidSvgCssVars } from './rewrite.js';
import type { PrepareMermaidSvgOptions, WebCompatibilityOptions } from './types.js';

/**
 * Combined post-processor for Mermaid SVG output (mmdc / mermaid.render / CLI).
 *
 * Typical build step:
 * 1. Render with concrete themeVariables (required for khroma derivation)
 * 2. Call prepareMermaidSvgForWeb so one SVG works under host light/dark CSS
 */
export function prepareMermaidSvgForWeb(
  svg: string,
  options: PrepareMermaidSvgOptions = {}
): string {
  const {
    themeVariables,
    cssVariables = themeVariables !== undefined,
    webCompatibility = true,
    prefix,
    varMap,
    includeKeys,
    excludeKeys,
  } = options;

  let out = svg;

  if (cssVariables) {
    if (!themeVariables) {
      throw new Error(
        'prepareMermaidSvgForWeb: cssVariables is enabled but themeVariables was not provided'
      );
    }
    out = rewriteMermaidSvgCssVars(out, themeVariables, {
      prefix,
      varMap,
      includeKeys,
      excludeKeys,
    });
  }

  if (webCompatibility) {
    const webOpts: WebCompatibilityOptions =
      webCompatibility === true ? {} : webCompatibility;
    out = normalizeMermaidSvgForWeb(out, webOpts);
  }

  return out;
}

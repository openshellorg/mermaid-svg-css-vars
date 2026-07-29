/**
 * Theme variable map as Mermaid resolves it after khroma derivation
 * (concrete color strings: hex, rgb/rgba, named colors, etc.).
 */
export type ThemeVariables = Record<string, string | number | boolean | undefined | null>;

export type CssVarRewriteOptions = {
  /**
   * CSS custom property prefix. Default: `--mermaid-`
   */
  prefix?: string;
  /**
   * Optional rename map: themeVariable key → CSS custom property name (without prefix).
   * Unmapped keys use the theme variable name as-is.
   */
  varMap?: Record<string, string>;
  /**
   * Only rewrite these theme variable keys. Default: all string color-like values.
   */
  includeKeys?: string[];
  /**
   * Skip these theme variable keys.
   */
  excludeKeys?: string[];
};

export type WebCompatibilityOptions = {
  /**
   * Force `width="100%"` on the root `<svg>`. Default: true.
   */
  responsiveWidth?: boolean;
  /**
   * Set `height="auto"` on the root `<svg>` (or remove fixed height). Default: true.
   */
  responsiveHeight?: boolean;
  /**
   * If `viewBox` is missing, derive it from width/height numeric attributes when possible.
   * Default: true.
   */
  ensureViewBox?: boolean;
  /**
   * Strip solid root / style backgrounds that fight host light/dark themes.
   * Default: true.
   */
  stripBackground?: boolean;
  /**
   * Preserve aspect ratio attribute when missing. Default: `xMidYMid meet`.
   * Set to `false` to leave unchanged.
   */
  preserveAspectRatio?: string | false;
};

export type PrepareMermaidSvgOptions = {
  themeVariables?: ThemeVariables;
  /**
   * Rewrite concrete theme colors to `var(--prefix-name, fallback)`.
   * Default: true when `themeVariables` is provided.
   */
  cssVariables?: boolean;
  /**
   * Normalize SVG for responsive web embedding.
   * Default: true.
   */
  webCompatibility?: boolean | WebCompatibilityOptions;
  prefix?: string;
  varMap?: Record<string, string>;
  includeKeys?: string[];
  excludeKeys?: string[];
};

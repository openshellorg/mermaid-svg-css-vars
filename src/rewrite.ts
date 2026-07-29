import type { CssVarRewriteOptions, ThemeVariables } from './types.js';

const DEFAULT_PREFIX = '--mermaid-';

/** Keys that are theme slots but not colors. */
const NON_COLOR_KEYS = new Set([
  'darkMode',
  'fontFamily',
  'fontSize',
  'THEME_COLOR_LIMIT',
  'theme',
  'look',
  'radius',
  'strokeWidth',
]);

const COLORISH =
  /^(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]+)$/i;

/** True when a theme value looks like a concrete CSS color. */
export function isColorishValue(value: string): boolean {
  const v = value.trim();
  if (!v || v === 'calculated' || v === 'none' || v === 'transparent') {
    return false;
  }
  if (v.startsWith('var(')) {
    return false;
  }
  return COLORISH.test(v);
}

/** Expand #abc → #aabbcc for matching. */
export function normalizeHex(value: string): string | null {
  const m = value.trim().match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!m) {
    return null;
  }
  const h = m[1]!.toLowerCase();
  if (h.length === 3 || h.length === 4) {
    return `#${[...h].map((c) => c + c).join('')}`;
  }
  return `#${h}`;
}

/** Canonical form used as a lookup key for color equality. */
export function colorKey(value: string): string {
  const trimmed = value.trim();
  const hex = normalizeHex(trimmed);
  if (hex) {
    return hex;
  }
  if (/^(rgba?|hsla?)\(/i.test(trimmed)) {
    return trimmed.replace(/\s+/g, '').toLowerCase();
  }
  return trimmed.toLowerCase();
}

export type ColorBinding = {
  /** Theme variable name, e.g. primaryColor */
  name: string;
  /** CSS custom property including prefix, e.g. --mermaid-primaryColor */
  cssVar: string;
  /** Original concrete fallback as it appeared in themeVariables */
  fallback: string;
  /** Canonical key for matching */
  key: string;
};

export function buildColorBindings(
  themeVariables: ThemeVariables,
  options: CssVarRewriteOptions = {}
): ColorBinding[] {
  const prefix = options.prefix ?? DEFAULT_PREFIX;
  const varMap = options.varMap ?? {};
  const include = options.includeKeys ? new Set(options.includeKeys) : null;
  const exclude = new Set([...(options.excludeKeys ?? []), ...NON_COLOR_KEYS]);

  const byKey = new Map<string, ColorBinding>();

  for (const [rawName, rawValue] of Object.entries(themeVariables)) {
    if (typeof rawValue !== 'string') {
      continue;
    }
    if (include && !include.has(rawName)) {
      continue;
    }
    if (exclude.has(rawName)) {
      continue;
    }
    if (!isColorishValue(rawValue)) {
      continue;
    }

    const mapped = varMap[rawName] ?? rawName;
    const cssVar = mapped.startsWith('--') ? mapped : `${prefix}${mapped}`;
    const key = colorKey(rawValue);
    // Prefer first binding when colors collide (primary slots tend to appear earlier)
    if (!byKey.has(key)) {
      byKey.set(key, {
        name: rawName,
        cssVar,
        fallback: rawValue.trim(),
        key,
      });
    }
  }

  return [...byKey.values()].sort((a, b) => b.fallback.length - a.fallback.length);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a regex that matches a color in SVG/CSS text.
 */
function colorOccurrenceRegex(fallback: string): RegExp {
  const hex = normalizeHex(fallback);
  if (hex) {
    if (hex.length === 7) {
      const long = hex.slice(1);
      const short = `${hex[1]}${hex[3]}${hex[5]}`;
      return new RegExp(`#(?:${long}|${short})`, 'gi');
    }
    if (hex.length === 9) {
      const long = hex.slice(1);
      const short = `${hex[1]}${hex[3]}${hex[5]}${hex[7]}`;
      return new RegExp(`#(?:${long}|${short})`, 'gi');
    }
    return new RegExp(escapeRegExp(hex), 'gi');
  }

  if (/^(rgba?|hsla?)\(/i.test(fallback.trim())) {
    const trimmed = fallback.trim();
    const fn = trimmed.match(/^(rgba?|hsla?)/i)![1]!;
    const inner = trimmed.replace(/^(rgba?|hsla?)\(/i, '').replace(/\)$/, '');
    const parts = inner.split(',').map((p) => escapeRegExp(p.trim()));
    return new RegExp(`${fn}\\(\\s*${parts.join('\\s*,\\s*')}\\s*\\)`, 'gi');
  }

  return new RegExp(`(?<![\\w-])${escapeRegExp(fallback.trim())}(?![\\w-])`, 'gi');
}

function wrapVar(cssVar: string, fallback: string): string {
  return `var(${cssVar}, ${fallback})`;
}

/**
 * Rewrite Mermaid-rendered SVG so theme colors become CSS custom properties
 * with the resolved concrete value as fallback:
 * `fill="#ECECFF"` → `fill="var(--mermaid-primaryColor, #ECECFF)"`
 *
 * Mermaid cannot accept `var(--x)` as *input* to themeVariables because khroma
 * derives lighten/adjust from concrete colors. This is the correct intermediate:
 * render with concrete colors, then emit vars with fallbacks for host theming.
 */
export function rewriteMermaidSvgCssVars(
  svg: string,
  themeVariables: ThemeVariables,
  options: CssVarRewriteOptions = {}
): string {
  const bindings = buildColorBindings(themeVariables, options);
  if (bindings.length === 0) {
    return svg;
  }

  let out = svg;

  for (const binding of bindings) {
    const re = colorOccurrenceRegex(binding.fallback);
    const source = out;
    out = source.replace(re, (match, offset: number) => {
      const before = source.slice(Math.max(0, offset - 80), offset);
      // Skip matches that are already inside a var(--..., ...) fallback or name
      if (/var\s*\(\s*--[\w-]*\s*(?:,\s*)?$/i.test(before)) {
        return match;
      }
      if (/var\s*\([^)]*$/i.test(before)) {
        return match;
      }
      return wrapVar(binding.cssVar, match);
    });
  }

  return out;
}

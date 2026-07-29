import type { WebCompatibilityOptions } from './types.js';

const DEFAULTS: Required<
  Omit<WebCompatibilityOptions, 'preserveAspectRatio'>
> & { preserveAspectRatio: string | false } = {
  responsiveWidth: true,
  responsiveHeight: true,
  ensureViewBox: true,
  stripBackground: true,
  preserveAspectRatio: 'xMidYMid meet',
};

function findRootSvgOpenTag(svg: string): { start: number; end: number; tag: string } | null {
  const m = svg.match(/<svg\b[^>]*>/i);
  if (!m || m.index === undefined) {
    return null;
  }
  return { start: m.index, end: m.index + m[0].length, tag: m[0] };
}

function getAttr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i');
  const m = tag.match(re);
  if (!m) {
    return null;
  }
  return m[2] ?? m[3] ?? null;
}

function setAttr(tag: string, name: string, value: string): string {
  const re = new RegExp(`\\s*${name}\\s*=\\s*("[^"]*"|'[^']*')`, 'i');
  if (re.test(tag)) {
    return tag.replace(re, ` ${name}="${value}"`);
  }
  return tag.replace(/>$/, ` ${name}="${value}">`);
}

function removeAttr(tag: string, name: string): string {
  return tag.replace(new RegExp(`\\s*${name}\\s*=\\s*("[^"]*"|'[^']*')`, 'i'), '');
}

function parseLength(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const m = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)/);
  if (!m) {
    return null;
  }
  return Number(m[1]);
}

/**
 * Normalize a Mermaid SVG for responsive web embedding:
 * - ensure viewBox when it can be derived from numeric width/height
 * - set width="100%" / height="auto" (keeps aspect ratio via viewBox)
 * - optionally strip hardcoded backgrounds that fight host themes
 * - set preserveAspectRatio when missing
 */
export function normalizeMermaidSvgForWeb(
  svg: string,
  options: WebCompatibilityOptions = {}
): string {
  const opts = { ...DEFAULTS, ...options };
  const root = findRootSvgOpenTag(svg);
  if (!root) {
    return svg;
  }

  let tag = root.tag;
  let body = svg.slice(0, root.start) + 'SVG_OPEN' + svg.slice(root.end);

  const widthAttr = getAttr(tag, 'width');
  const heightAttr = getAttr(tag, 'height');
  const viewBoxAttr = getAttr(tag, 'viewBox') ?? getAttr(tag, 'viewbox');

  if (opts.ensureViewBox && !viewBoxAttr) {
    const w = parseLength(widthAttr);
    const h = parseLength(heightAttr);
    if (w !== null && h !== null && w > 0 && h > 0) {
      tag = setAttr(tag, 'viewBox', `0 0 ${w} ${h}`);
    }
  }

  if (opts.responsiveWidth) {
    tag = setAttr(tag, 'width', '100%');
  }

  if (opts.responsiveHeight) {
    tag = setAttr(tag, 'height', 'auto');
  }

  if (opts.preserveAspectRatio !== false && !getAttr(tag, 'preserveAspectRatio')) {
    tag = setAttr(tag, 'preserveAspectRatio', opts.preserveAspectRatio);
  }

  let out = body.replace('SVG_OPEN', tag);

  if (opts.stripBackground) {
    // Remove style rules that paint an opaque diagram background on the root/svg
    out = out.replace(
      /(?:^|[^{};])\s*(?:svg|#mermaid(?:-\w+)?|\.mermaid)\s*\{[^}]*\bbackground(?:-color)?\s*:\s*[^;}"']+;?[^}]*\}/gi,
      (block) => {
        return block.replace(/\bbackground(?:-color)?\s*:\s*[^;}"']+;?/gi, '');
      }
    );
    // Presentation style on root svg
    const root2 = findRootSvgOpenTag(out);
    if (root2) {
      const style = getAttr(root2.tag, 'style');
      if (style && /background/i.test(style)) {
        const cleaned = style
          .replace(/(?:^|;)\s*background(?:-color)?\s*:\s*[^;]+/gi, '')
          .replace(/^;+|;+$/g, '')
          .trim();
        const t = cleaned
          ? setAttr(root2.tag, 'style', cleaned)
          : removeAttr(root2.tag, 'style');
        out = out.slice(0, root2.start) + t + out.slice(root2.end);
      }
    }
    // Common Mermaid rect backdrop with class or id patterns — leave geometry; only strip fill if
    // it is the full-canvas background rect with no stroke (best-effort, opt-in already).
    out = out.replace(
      /<rect\b([^>]*\bclass="[^"]*background[^"]*"[^>]*)>/gi,
      (_full, attrs: string) => {
        const next = String(attrs).replace(/\sfill\s*=\s*("[^"]*"|'[^']*')/i, ' fill="none"');
        return `<rect${next}>`;
      }
    );
  }

  return out;
}

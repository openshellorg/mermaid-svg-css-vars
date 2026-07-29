import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildColorBindings,
  prepareMermaidSvgForWeb,
  rewriteMermaidSvgCssVars,
} from '../src/index.js';

describe('rewriteMermaidSvgCssVars', () => {
  it('wraps presentation attributes and CSS with var + fallback', () => {
    const svg = `<svg><style>.node{fill:#ECECFF;stroke:#9370DB}</style><rect fill="#ECECFF" stroke="#333333"/></svg>`;
    const out = rewriteMermaidSvgCssVars(svg, {
      primaryColor: '#ECECFF',
      primaryBorderColor: '#9370DB',
      lineColor: '#333333',
    });
    assert.match(out, /fill="var\(--mermaid-primaryColor, #ECECFF\)"/i);
    assert.match(out, /fill:var\(--mermaid-primaryColor, #ECECFF\)/i);
    assert.match(out, /stroke:var\(--mermaid-primaryBorderColor, #9370DB\)/i);
    assert.match(out, /stroke="var\(--mermaid-lineColor, #333333\)"/i);
  });

  it('matches short and long hex case-insensitively', () => {
    const out = rewriteMermaidSvgCssVars(`<svg><rect fill="#ABC"/></svg>`, {
      primaryColor: '#AABBCC',
    });
    assert.match(out, /var\(--mermaid-primaryColor, #ABC\)/i);
  });

  it('does not double-wrap existing var() fallbacks', () => {
    const svg = `<svg><rect fill="var(--mermaid-primaryColor, #ECECFF)"/></svg>`;
    const out = rewriteMermaidSvgCssVars(svg, { primaryColor: '#ECECFF' });
    const count = out.split('var(--mermaid-primaryColor').length - 1;
    assert.equal(count, 1);
  });

  it('respects prefix and varMap', () => {
    const svg = `<svg><rect fill="#111111"/></svg>`;
    const out = rewriteMermaidSvgCssVars(
      svg,
      { primaryColor: '#111111' },
      { prefix: '--ftn-', varMap: { primaryColor: 'node-fill' } }
    );
    assert.match(out, /var\(--ftn-node-fill, #111111\)/);
  });

  it('skips non-color theme keys', () => {
    const bindings = buildColorBindings({
      primaryColor: '#fff',
      fontFamily: 'Arial',
      darkMode: false,
      fontSize: '16px',
    });
    assert.equal(bindings.length, 1);
    assert.equal(bindings[0]!.name, 'primaryColor');
  });
});

describe('prepareMermaidSvgForWeb', () => {
  it('rewrites colors and normalizes for web when both flags are on', () => {
    const svg = `<svg width="800" height="600" style="background:#ffffff"><rect fill="#ECECFF"/></svg>`;
    const out = prepareMermaidSvgForWeb(svg, {
      themeVariables: { primaryColor: '#ECECFF', background: '#ffffff' },
      cssVariables: true,
      webCompatibility: true,
    });
    assert.match(out, /width="100%"/);
    assert.match(out, /height="auto"/);
    assert.match(out, /viewBox="0 0 800 600"/);
    assert.match(out, /var\(--mermaid-primaryColor/);
    assert.doesNotMatch(out, /style="[^"]*background/i);
  });

  it('can run webCompatibility alone', () => {
    const svg = `<svg width="100" height="50"><rect/></svg>`;
    const out = prepareMermaidSvgForWeb(svg, {
      cssVariables: false,
      webCompatibility: true,
    });
    assert.match(out, /viewBox="0 0 100 50"/);
    assert.match(out, /preserveAspectRatio="xMidYMid meet"/);
  });

  it('throws when cssVariables enabled without themeVariables', () => {
    assert.throws(() =>
      prepareMermaidSvgForWeb('<svg/>', { cssVariables: true, webCompatibility: false })
    );
  });
});

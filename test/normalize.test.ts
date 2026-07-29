import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeMermaidSvgForWeb } from '../src/normalize.js';

describe('normalizeMermaidSvgForWeb', () => {
  it('adds viewBox from numeric width/height and makes dimensions responsive', () => {
    const svg = `<svg width="400px" height="200" xmlns="http://www.w3.org/2000/svg"><g/></svg>`;
    const out = normalizeMermaidSvgForWeb(svg);
    assert.match(out, /viewBox="0 0 400 200"/);
    assert.match(out, /width="100%"/);
    assert.match(out, /height="auto"/);
  });

  it('does not invent viewBox without numeric dimensions', () => {
    const svg = `<svg width="100%" height="auto"><g/></svg>`;
    const out = normalizeMermaidSvgForWeb(svg, { ensureViewBox: true });
    assert.doesNotMatch(out, /viewBox=/);
  });

  it('keeps existing viewBox', () => {
    const svg = `<svg width="800" height="600" viewBox="0 0 10 5"><g/></svg>`;
    const out = normalizeMermaidSvgForWeb(svg);
    assert.match(out, /viewBox="0 0 10 5"/);
  });

  it('can disable responsive height', () => {
    const svg = `<svg width="10" height="20" viewBox="0 0 10 20"/>`;
    const out = normalizeMermaidSvgForWeb(svg, { responsiveHeight: false });
    assert.match(out, /height="20"/);
    assert.match(out, /width="100%"/);
  });
});

import { readFileSync, writeFileSync } from 'node:fs';
import { prepareMermaidSvgForWeb } from './prepare.js';
import type { ThemeVariables } from './types.js';

function printHelp(): void {
  process.stdout.write(`Usage: mermaid-svg-css-vars [options] <input.svg>

Post-process Mermaid SVG: rewrite theme colors to CSS vars with fallbacks,
and/or normalize for responsive web embedding.

Options:
  -o, --output <file>       Write result to file (default: stdout)
  --theme-vars <file>       JSON file of Mermaid themeVariables (concrete colors)
  --prefix <prefix>         CSS var prefix (default: --mermaid-)
  --no-css-variables        Skip CSS variable rewrite
  --no-web-compatibility    Skip viewBox/width/height/background normalization
  --strip-background        Force background strip (default on with web compat)
  --no-strip-background     Keep backgrounds
  -h, --help                Show help

Examples:
  mermaid-svg-css-vars diagram.svg -o diagram.themed.svg --theme-vars theme.json
  mmdc -i diagram.mmd -o diagram.svg && mermaid-svg-css-vars diagram.svg -o out.svg --theme-vars theme.json
`);
}

function parseArgs(argv: string[]) {
  const args = {
    input: '' as string,
    output: '' as string,
    themeVarsPath: '' as string,
    prefix: '--mermaid-',
    cssVariables: undefined as boolean | undefined,
    webCompatibility: true,
    stripBackground: undefined as boolean | undefined,
    help: false,
  };

  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    switch (a) {
      case '-h':
      case '--help':
        args.help = true;
        break;
      case '-o':
      case '--output':
        args.output = argv[++i] ?? '';
        break;
      case '--theme-vars':
        args.themeVarsPath = argv[++i] ?? '';
        break;
      case '--prefix':
        args.prefix = argv[++i] ?? '--mermaid-';
        break;
      case '--no-css-variables':
        args.cssVariables = false;
        break;
      case '--no-web-compatibility':
        args.webCompatibility = false;
        break;
      case '--strip-background':
        args.stripBackground = true;
        break;
      case '--no-strip-background':
        args.stripBackground = false;
        break;
      default:
        if (a.startsWith('-')) {
          throw new Error(`Unknown option: ${a}`);
        }
        positional.push(a);
    }
  }

  args.input = positional[0] ?? '';
  return args;
}

export function runCli(argv = process.argv.slice(2)): number {
  const args = parseArgs(argv);
  if (args.help || !args.input) {
    printHelp();
    return args.help ? 0 : 1;
  }

  const svg = readFileSync(args.input, 'utf8');
  let themeVariables: ThemeVariables | undefined;
  if (args.themeVarsPath) {
    themeVariables = JSON.parse(readFileSync(args.themeVarsPath, 'utf8')) as ThemeVariables;
  }

  const cssVariables =
    args.cssVariables === false ? false : themeVariables !== undefined;

  if (args.cssVariables !== false && !themeVariables) {
    process.stderr.write(
      'warning: no --theme-vars provided; skipping CSS variable rewrite (webCompatibility only)\n'
    );
  }

  const webCompatibility =
    args.webCompatibility === false
      ? false
      : {
          ...(args.stripBackground !== undefined
            ? { stripBackground: args.stripBackground }
            : {}),
        };

  const out = prepareMermaidSvgForWeb(svg, {
    themeVariables,
    cssVariables,
    webCompatibility,
    prefix: args.prefix,
  });

  if (args.output) {
    writeFileSync(args.output, out, 'utf8');
  } else {
    process.stdout.write(out);
  }
  return 0;
}

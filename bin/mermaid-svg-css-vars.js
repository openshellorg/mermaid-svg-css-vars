#!/usr/bin/env node
import { runCli } from '../dist/src/cli.js';

try {
  process.exitCode = runCli();
} catch (err) {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
}

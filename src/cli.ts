#!/usr/bin/env node
import path from 'path'
import { Command } from 'commander'
import { Builder, DiagnosticsError } from './builder.js'
import fs from 'fs'
import { utils } from './utils.js';

const program = new Command();

const opts = program
    .name('make-helium')
    .version('0.1.0')
    .option('--output <FILE>', 'the Helium script output file', 'helium.hls')
    .option('--rootDir <DIRECTORY>', 'the TypeScript input directory', process.cwd())
    .option('--init', 'create default tsconfig.json and index.ts files')
    .showHelpAfterError()
    .parse(process.argv)
    .opts()

const localPath = (subPath: string) => new URL(subPath, import.meta.url)
const tsRootPath = (subPath: string) => path.resolve(opts.rootDir, subPath)

if (opts.init) {
    utils.createDirectory(tsRootPath('tsconfig.json'))
    fs.copyFileSync(localPath('./content/default-tsconfig.jsonc'), tsRootPath('tsconfig.json'))
    fs.copyFileSync(localPath('./content/default-index.ts'), tsRootPath('index.ts'))
    fs.copyFileSync(localPath('./content/default-types.ts'), tsRootPath('types.ts'))
}
else {
    const builder = new Builder(opts.rootDir);
    builder.build(opts.output);
}

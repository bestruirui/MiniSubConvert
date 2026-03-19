const esbuild = require('esbuild');
const peggy = require('peggy');
const fs = require('node:fs');
const path = require('node:path');

const CLI_FLAGS = new Set(process.argv.slice(2));
const SHOULD_BUILD_BUNDLE = !CLI_FLAGS.has('--parsers-only');
const PEGGY_IMPORT_SOURCE_RE =
    /(from\s+['"])\.\/peggy\/(?!generated\/)([^'"]+)(['"])/g;
const HELP_TEXT = `Usage: node scripts/build.js [--parsers-only]

--parsers-only   Only generate pre-compiled Peggy parsers.
Without --parsers-only, build the Node bundle from .build/src/node.js.`;

if (CLI_FLAGS.has('--help')) {
    console.log(HELP_TEXT);
    process.exit(0);
}

const PATHS = createPaths();

function createPaths() {
    const rootDir = path.resolve(__dirname, '..');
    const buildDir = path.join(rootDir, '.build');
    const buildSrcDir = path.join(buildDir, 'src');
    const buildParsersDir = path.join(buildSrcDir, 'core/proxy-utils/parsers');
    const buildPeggyDir = path.join(buildParsersDir, 'peggy');

    return {
        rootDir,
        srcDir: path.join(rootDir, 'src'),
        rootTsconfigPath: path.join(rootDir, 'jsconfig.json'),
        buildDir,
        buildSrcDir,
        buildTsconfigPath: path.join(buildDir, 'jsconfig.json'),
        buildPeggyDir,
        buildGeneratedDir: path.join(buildPeggyDir, 'generated'),
        buildParsersIndexPath: path.join(buildParsersDir, 'index.js'),
        nodeEntryPath: path.join(buildSrcDir, 'node.js'),
        nodeOutputPath: path.join(rootDir, 'dist/minisubconvert.js'),
    };
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function prepareBuildWorkspace() {
    fs.rmSync(PATHS.buildDir, { recursive: true, force: true });
    ensureDir(PATHS.buildDir);
    fs.cpSync(PATHS.srcDir, PATHS.buildSrcDir, { recursive: true });
    fs.copyFileSync(PATHS.rootTsconfigPath, PATHS.buildTsconfigPath);
}

function getPeggyGrammarFiles() {
    const grammarFiles = fs
        .readdirSync(PATHS.buildPeggyDir)
        .filter((fileName) => fileName.endsWith('.peg'))
        .sort();

    if (grammarFiles.length === 0) {
        throw new Error(`No .peg files found in ${PATHS.buildPeggyDir}`);
    }

    return grammarFiles;
}

function createParserModuleCode(pegFileName, parserSource) {
    return [
        `// Auto-generated from ${pegFileName} - DO NOT EDIT`,
        parserSource,
        '',
        'let cachedParser = null;',
        'export default function getParser() {',
        '    if (!cachedParser) {',
        '        cachedParser = peg$parse;',
        '        cachedParser.parse = peg$parse;',
        '    }',
        '    return cachedParser;',
        '}',
        '',
    ].join('\n');
}

function compilePeggyParser(pegFileName) {
    const grammarPath = path.join(PATHS.buildPeggyDir, pegFileName);
    const outputPath = path.join(
        PATHS.buildGeneratedDir,
        `${path.parse(pegFileName).name}.js`,
    );
    const parserSource = peggy.generate(fs.readFileSync(grammarPath, 'utf-8'), {
        output: 'source',
        format: 'es',
    });

    fs.writeFileSync(
        outputPath,
        createParserModuleCode(pegFileName, parserSource),
        'utf-8',
    );
    console.log(`  Generated: ${path.relative(PATHS.rootDir, outputPath)}`);
}

function compilePeggyParsers() {
    prepareBuildWorkspace();
    ensureDir(PATHS.buildGeneratedDir);

    const grammarFiles = getPeggyGrammarFiles();

    console.log('Pre-compiling Peggy grammars...');

    for (const pegFileName of grammarFiles) {
        compilePeggyParser(pegFileName);
    }

    rewriteParserIndexImports();
    console.log(`Generated ${grammarFiles.length} parser modules.`);
}

function rewriteParserIndexImports() {
    const source = fs.readFileSync(PATHS.buildParsersIndexPath, 'utf-8');
    const rewritten = source.replace(
        PEGGY_IMPORT_SOURCE_RE,
        '$1./peggy/generated/$2$3',
    );

    if (rewritten !== source) {
        fs.writeFileSync(PATHS.buildParsersIndexPath, rewritten, 'utf-8');
        console.log(
            `  Rewired: ${path.relative(PATHS.rootDir, PATHS.buildParsersIndexPath)}`,
        );
    }
}

async function buildNodeBundle() {
    ensureDir(path.dirname(PATHS.nodeOutputPath));

    await esbuild.build({
        entryPoints: [PATHS.nodeEntryPath],
        outfile: PATHS.nodeOutputPath,
        bundle: true,
        minify: true,
        platform: 'node',
        format: 'cjs',
        target: 'node20',
        sourcemap: false,
        banner: {
            js: '#!/usr/bin/env node',
        },
        tsconfig: PATHS.buildTsconfigPath,
        logLevel: 'info',
    });

    console.log(
        `Node bundle generated: ${path.relative(PATHS.rootDir, PATHS.nodeOutputPath)}`,
    );
}

async function main() {
    try {
        compilePeggyParsers();

        if (SHOULD_BUILD_BUNDLE) {
            await buildNodeBundle();
        }

        console.log('Build complete.');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

main();

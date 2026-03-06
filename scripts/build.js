const esbuild = require('esbuild');
const peggy = require('peggy');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const PEGGY_DIR = path.join(SRC_DIR, 'core/proxy-utils/parsers/peggy');
const GENERATED_DIR = path.join(PEGGY_DIR, 'generated');
const NODE_ENTRY = path.join(SRC_DIR, 'node.js');
const NODE_OUTPUT = path.join(ROOT_DIR, 'dist/minisubconvert.js');

const args = new Set(process.argv.slice(2));
if (args.has('--help')) {
    console.log('Usage: node scripts/build.js [--parsers-only] [--node-only]');
    process.exit(0);
}

const shouldBuildParsers = !args.has('--node-only');
const shouldBuildNode = !args.has('--parsers-only');

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function compilePeggyParsers() {
    ensureDir(GENERATED_DIR);

    const pegFiles = fs
        .readdirSync(PEGGY_DIR)
        .filter((fileName) => fileName.endsWith('.peg'))
        .sort();

    if (pegFiles.length === 0) {
        throw new Error(`No .peg files found in ${PEGGY_DIR}`);
    }

    console.log('Pre-compiling Peggy grammars...');

    for (const pegFile of pegFiles) {
        const baseName = path.basename(pegFile, '.peg');
        const pegPath = path.join(PEGGY_DIR, pegFile);
        const outputPath = path.join(GENERATED_DIR, `${baseName}.js`);
        const grammar = fs.readFileSync(pegPath, 'utf-8');
        const parserSource = peggy.generate(grammar, {
            output: 'source',
            format: 'es',
        });

        const moduleCode = `// Auto-generated from ${pegFile} - DO NOT EDIT\n${parserSource}\n\nlet cachedParser = null;\nexport default function getParser() {\n    if (!cachedParser) {\n        cachedParser = peg$parse;\n        cachedParser.parse = peg$parse;\n    }\n    return cachedParser;\n}\n`;

        fs.writeFileSync(outputPath, moduleCode, 'utf-8');
        console.log(`  Generated: ${path.relative(ROOT_DIR, outputPath)}`);
    }

    const peggyShimPath = path.join(GENERATED_DIR, 'peggy-shim.js');
    fs.writeFileSync(
        peggyShimPath,
        `// Peggy shim - parsers are pre-compiled, no runtime generation needed\nexport function generate() {\n    throw new Error('Peggy runtime generation is disabled. Use pre-compiled parsers.');\n}\nexport default { generate };\n`,
        'utf-8',
    );

    console.log(`Generated ${pegFiles.length} parser modules.`);
}

async function buildNodeBundle() {
    ensureDir(path.dirname(NODE_OUTPUT));

    await esbuild.build({
        entryPoints: [NODE_ENTRY],
        outfile: NODE_OUTPUT,
        bundle: true,
        minify: true,
        platform: 'node',
        format: 'cjs',
        target: 'node20',
        sourcemap: false,
        banner: {
            js: '#!/usr/bin/env node',
        },
        tsconfig: path.join(ROOT_DIR, 'jsconfig.json'),
        logLevel: 'info',
    });

    console.log(`Node bundle generated: ${path.relative(ROOT_DIR, NODE_OUTPUT)}`);
}

(async () => {
    try {
        if (!shouldBuildParsers && !shouldBuildNode) {
            console.log('Nothing to build.');
            return;
        }

        if (shouldBuildParsers) {
            compilePeggyParsers();
        }

        if (shouldBuildNode) {
            await buildNodeBundle();
        }

        console.log('Build complete.');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
})();

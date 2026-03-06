#!/usr/bin/env node

const fsp = require('node:fs/promises');
const path = require('node:path');
const JSZip = require('jszip');

(async () => {
    try {
        const targetBase = path.resolve(__dirname, '../src/core/proxy-utils');
        const sourceBase = 'Sub-Store-master/backend/src/core/proxy-utils';
        const folders = ['parsers', 'preprocessors', 'producers'];

        console.log('Downloading upstream ZIP...');
        const response = await fetch('https://github.com/sub-store-org/Sub-Store/archive/refs/heads/master.zip');
        if (!response.ok) {
            throw new Error(`Download failed: HTTP ${response.status}`);
        }
        const zipBuffer = Buffer.from(await response.arrayBuffer());
        console.log(`Download complete (${(zipBuffer.length / 1024).toFixed(2)} KB)`);
        console.log('');

        console.log('Checking source folders in ZIP...');
        const zip = await JSZip.loadAsync(zipBuffer);

        for (const folder of folders) {
            const prefix = `${sourceBase}/${folder}/`;
            const exists = Object.keys(zip.files).some((entryName) => entryName.startsWith(prefix));
            if (!exists) {
                throw new Error(`Source folder not found: ${sourceBase}/${folder}`);
            }
            console.log(`  ✓ ${folder}`);
        }
        console.log('');

        console.log('Removing local target folders...');
        for (const folder of folders) {
            const targetPath = path.join(targetBase, folder);
            await fsp.rm(targetPath, { recursive: true, force: true });
            console.log(`  ✓ Removed: ${folder}`);
        }
        console.log('');

        console.log('Extracting...');
        const sourcePrefix = `${sourceBase}/`;
        for (const [entryName, entry] of Object.entries(zip.files)) {
            if (entry.dir || !entryName.startsWith(sourcePrefix)) {
                continue;
            }
            const relativePath = entryName.slice(sourcePrefix.length);
            const [folder] = relativePath.split('/');
            if (!folders.includes(folder)) {
                continue;
            }
            const targetPath = path.join(targetBase, relativePath);
            await fsp.mkdir(path.dirname(targetPath), { recursive: true });
            await fsp.writeFile(targetPath, await entry.async('nodebuffer'));
            console.log(`  ✓ ${relativePath}`);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
})();

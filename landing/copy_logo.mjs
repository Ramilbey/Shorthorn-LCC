// Run once: node copy_logo.mjs
import { readFileSync, writeFileSync } from 'fs';
const src = new URL('../../../shorthorn_Logo.jpg', import.meta.url);
const dest = new URL('../public/shorthorn_logo.jpg', import.meta.url);
writeFileSync(dest, readFileSync(src));
console.log('Logo copied to public/shorthorn_logo.jpg');

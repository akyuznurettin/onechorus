import { mkdir, copyFile, writeFile } from 'node:fs/promises';

const assets = ['index.html', 'product.html', 'styles.css', 'app.js', 'demo.js', 'favicon.svg'];
await mkdir('dist', { recursive: true });
await Promise.all(assets.map(file => copyFile(file, `dist/${file}`)));
await writeFile('dist/_headers', `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n`);
console.log(`Built ${assets.length} public files into dist/. Ready for static hosting.`);

import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';

const root = path.resolve(process.argv[2] || '.');
const port = Number(process.env.ONECHORUS_PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
// Only serve public assets, even when previewing from the project root.
const allowed = new Set(['index.html', 'product.html', 'styles.css', 'app.js', 'demo.js', 'favicon.svg']);
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
    if (!allowed.has(file)) { res.writeHead(404); res.end('Not found'); return; }
    const target = path.join(root, file);
    if (!(await stat(target)).isFile()) throw new Error('Not a file');
    const data = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`OneChorus preview: http://127.0.0.1:${port}`));

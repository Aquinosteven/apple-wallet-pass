import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const serverBundlePath = path.join(rootDir, 'dist-server', 'prerender.js');

const template = await readFile(path.join(distDir, 'index.html'), 'utf8');
const { renderHead, renderPath } = await import(pathToFileURL(serverBundlePath).href);

const routes = ['/', '/pricing', '/apple-wallet-pass-software', '/google-wallet-pass-software'];

for (const route of routes) {
  const appHtml = renderPath(route);
  const headHtml = renderHead(route);
  const documentHtml = template
    .replace('<!--seo-head-->', headHtml)
    .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

  if (route === '/') {
    await writeFile(path.join(distDir, 'index.html'), documentHtml, 'utf8');
    continue;
  }

  const outputDir = path.join(distDir, route.replace(/^\/+/, ''));
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'index.html'), documentHtml, 'utf8');
}

await rm(path.join(rootDir, 'dist-server'), { recursive: true, force: true });

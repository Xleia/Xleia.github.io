import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const siteOrigin = 'https://xleia.github.io';
const outputDirectory = 'dist';
const expectedRoutes = ['/', '/projects/', '/projects/koto/', '/projects/train-libre/', '/blog/', '/lab/', '/about/', '/404.html'];
const failures = [];

function filesUnder(directory) {
  const result = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const location = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...filesUnder(location));
    else if (entry.isFile()) result.push(location);
  }
  return result;
}

function outputPath(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\\') || decoded.split('/').includes('..')) return null;
  const trimmed = decoded.replace(/^\/+/, '');
  return join(outputDirectory, trimmed, trimmed.endsWith('/') || !trimmed ? 'index.html' : '');
}

if (!existsSync(outputDirectory)) {
  throw new Error('dist/ not found. Run npm run build first.');
}

for (const route of expectedRoutes) {
  const filename = outputPath(route);
  if (!filename || !existsSync(filename)) failures.push(`Missing route: ${route}`);
}

const htmlFiles = filesUnder(outputDirectory).filter((file) => file.endsWith('.html'));

for (const filename of htmlFiles) {
  const html = readFileSync(filename, 'utf8');
  const filenameFromRoot = relative(outputDirectory, filename).split(sep).join('/');
  const route = filenameFromRoot === 'index.html'
    ? '/'
    : filenameFromRoot.endsWith('/index.html')
      ? '/' + filenameFromRoot.slice(0, -'index.html'.length)
      : '/' + filenameFromRoot;
  const pageUrl = new URL(route, siteOrigin);

  // P2-3: Public project pages must not link to private app deployments,
  // unverified downloads or upstream builds presented as this fork.
  // To approve a future public project URL, review it and add the exact URL
  // to this allowlist in the same PR as the project page change.
  if (route === '/projects/koto/' || route === '/projects/train-libre/') {
    const approvedProjectExternalLinks = new Set(['https://github.com/Xleia']);
    for (const match of html.matchAll(/\bhref="([^"]+)"/g)) {
      let target;
      try { target = new URL(match[1].replaceAll('&amp;', '&'), pageUrl); }
      catch { continue; } // The generic link validator below reports malformed URLs.
      if ((target.protocol === 'https:' || target.protocol === 'http:') &&
          target.origin !== siteOrigin &&
          !approvedProjectExternalLinks.has(target.href)) {
        failures.push(`Unapproved external URL on project detail page ${route}; review publication safety first.`);
      }
    }
  }

  if (!html.includes('<html lang="zh-CN"')) failures.push(`Missing lang attribute: ${route}`);
  if (!html.includes('<meta name="description"')) failures.push(`Missing description: ${route}`);

  const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/);
  const expectedCanonical = pageUrl.href;
  if (!canonicalMatch || canonicalMatch[1] !== expectedCanonical) {
    failures.push(`Unexpected canonical in ${route}: ${canonicalMatch?.[1] ?? 'missing'}`);
  }

  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const rawLink = match[1];
    if (rawLink.startsWith('#') || /^(?:mailto:|tel:|data:|javascript:)/i.test(rawLink)) continue;
    let target;
    try { target = new URL(rawLink.replaceAll('&amp;', '&'), pageUrl); }
    catch { failures.push(`Invalid URL in ${route}: ${rawLink}`); continue; }
    if (target.origin !== siteOrigin) continue;
    const targetFile = outputPath(target.pathname);
    if (!targetFile || !existsSync(targetFile)) {
      failures.push(`Unresolved local link in ${route}: ${rawLink}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Static site verified: ${htmlFiles.length} HTML pages, ${expectedRoutes.length} required routes, canonical URLs and local links.`);
}

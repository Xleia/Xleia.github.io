import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const siteOrigin = 'https://xleia.github.io';
const outputDirectory = 'dist';
const expectedRoutes = ['/', '/projects/', '/projects/koto/', '/projects/train-libre/', '/blog/', '/lab/', '/about/', '/studio/', '/404.html'];
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

// Keep WebGL2 shadow sampler precision explicit: TypeScript/Astro checks do not compile GLSL.
const studioShaderSource = readFileSync('src/scripts/studio-webgl.ts','utf8');
if (!/uniform\s+(?:lowp|mediump|highp)\s+sampler2DShadow\s+uShadowMap\s*;/.test(studioShaderSource)) {
  failures.push('Studio WebGL2 shadow sampler must declare explicit precision');
}


// Studio V0.4: enforce local-only glTF / texture delivery and validate embedded geometry.
const studioAssets = [
  'models/studio/pendant-lamp.gltf',
  'textures/studio/walnut-albedo.svg',
  'textures/studio/walnut-roughness.svg'
];
for (const asset of studioAssets) {
  if (!existsSync(join(outputDirectory, asset))) failures.push('Missing Studio asset: '+asset);
}
const modelPath=join(outputDirectory, studioAssets[0]);
if (existsSync(modelPath)) {
  try {
    const model=JSON.parse(readFileSync(modelPath,'utf8'));
    if (model.asset?.version !== '2.0' || model.buffers?.length !== 1 ||
        !model.buffers[0].uri.startsWith('data:application/octet-stream;base64,')) {
      throw new Error('Unsupported or externally referenced model');
    }
    const raw=Buffer.from(model.buffers[0].uri.split(',')[1],'base64');
    if(raw.length!==model.buffers[0].byteLength || raw.length>5_000_000)
      throw new Error('Embedded glTF buffer size mismatch');
    if(model.meshes?.length!==4 || model.nodes?.length!==4 || model.materials?.length!==3)
      throw new Error('Unexpected glTF mesh inventory');
    for(const accessor of model.accessors??[]) {
      const view=model.bufferViews?.[accessor.bufferView];
      if(!view || view.buffer!==0 || accessor.componentType!==5126 || accessor.type!=='VEC3')
        throw new Error('Unexpected glTF accessor');
      const stride=view.byteStride??12, base=(view.byteOffset??0)+(accessor.byteOffset??0);
      const end=base+(accessor.count-1)*stride+12;
      if(accessor.count<=0||end>raw.length)throw new Error('Out-of-bounds glTF accessor');
    }
  } catch(error) {
    failures.push('Invalid Studio glTF asset: '+String(error));
  }
}
for (const asset of studioAssets.slice(1)) {
  const name=join(outputDirectory,asset);
  if(existsSync(name)) {
    const svg=readFileSync(name,'utf8');
    if(!svg.includes('xmlns="http://www.w3.org/2000/svg"')||
       /<script\b|href\s*=\s*["']https?:/i.test(svg))
      failures.push('Studio texture must remain local and script-free: '+asset);
  }
}


// Verify the complete original article inventory and copied public assets.
const sourceBlogDirectory = 'src/content/blog';
const markdownFiles = filesUnder(sourceBlogDirectory).filter((file) => file.endsWith('.md'));
const originalArticleRoutes = [];
const articleImagePaths = new Set();
let articleImageReferences = 0;

for (const markdownFile of markdownFiles) {
  const source = readFileSync(markdownFile, 'utf8');
  const legacyPath = source.match(/^legacyPath: "([^"]+)"$/m)?.[1];
  if (!legacyPath || !/^\/2023\/\d{2}\/\d{2}\/[^/]+\/$/.test(legacyPath)) {
    failures.push(`Invalid historical route in ${markdownFile}`);
    continue;
  }
  originalArticleRoutes.push(legacyPath);

  for (const match of source.matchAll(/!\[[^\]]*\]\((\/img\/[^\s)]+)\)/g)) {
    articleImageReferences++;
    articleImagePaths.add(match[1]);
    const imageFile = outputPath(match[1]);
    if (!imageFile || !existsSync(imageFile)) failures.push(`Missing article image ${match[1]} in ${markdownFile}`);
  }
}

// Ensure real legacy tables survive the conversion from HTML to Markdown.
const expectedLegacyTables = [
  { file: 'src/content/blog/2023-06-25-10.md', count: 6 },
  { file: 'src/content/blog/2023-06-22-08.md', count: 1 },
  { file: 'src/content/blog/2023-06-30-12.md', count: 8 },
  { file: 'src/content/blog/2023-07-13-18.md', count: 1 },
];
for (const { file, count } of expectedLegacyTables) {
  const markdown = readFileSync(file, 'utf8');
  const actual = (markdown.match(/<table\s+class="legacy-table">/g) ?? []).length;
  if (actual !== count) failures.push(`Expected ${count} restored legacy tables in ${file}, found ${actual}`);
}

if (markdownFiles.length !== 19) failures.push(`Expected 19 historical posts, found ${markdownFiles.length}`);
if (new Set(originalArticleRoutes).size !== 19) failures.push('Expected 19 unique historical URLs');
if (articleImageReferences !== 75) failures.push(`Expected 75 image references, found ${articleImageReferences}`);
if (articleImagePaths.size !== 74) failures.push(`Expected 74 distinct article images, found ${articleImagePaths.size}`);
expectedRoutes.push(...originalArticleRoutes);

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

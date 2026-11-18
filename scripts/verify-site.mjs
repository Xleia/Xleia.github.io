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
// V0.5: check three independent furniture models, transform bounds and material contracts.
const furnitureAssets = [
  {file:'models/studio/desk.gltf',minimumNodes:12},
  {file:'models/studio/bookshelf.gltf',minimumNodes:50},
  {file:'models/studio/chair.gltf',minimumNodes:15}
];
for (const {file,minimumNodes} of furnitureAssets) {
  const path=join(outputDirectory,file);
  if(!existsSync(path)){failures.push('Missing modular furniture asset: '+file);continue;}
  try {
    const model=JSON.parse(readFileSync(path,'utf8'));
    if(model.asset?.version!=='2.0'||model.buffers?.length!==1||model.extensionsRequired?.length)
      throw new Error('Unapproved glTF format or extensions');
    if(!model.buffers[0].uri?.startsWith('data:application/octet-stream;base64,'))
      throw new Error('External buffers not approved');
    const raw=Buffer.from(model.buffers[0].uri.split(',')[1],'base64');
    if(raw.length!==model.buffers[0].byteLength||raw.length>3_000_000)
      throw new Error('Unexpected embedded buffer size');
    if(model.nodes?.length<minimumNodes||model.nodes.length>512||model.meshes?.length>256)
      throw new Error('Incorrect furniture node inventory');
    for(const node of model.nodes){
      if(node.mesh===undefined||!model.meshes[node.mesh]||node.children?.length)
        throw new Error('Unsupported furniture node structure');
      if(node.translation?.length!==3||!node.translation.every(Number.isFinite)||
         node.scale?.length!==3||!node.scale.every(n=>Number.isFinite(n)&&n>0&&n<=50))
        throw new Error('Invalid furniture transform');
      if(node.rotation&&
         (node.rotation.length!==4||!node.rotation.every(Number.isFinite)))
        throw new Error('Invalid furniture quaternion');
    }
    for(const mesh of model.meshes){
      for(const primitive of mesh.primitives??[]){
        if((primitive.mode??4)!==4||primitive.indices!==undefined)
          throw new Error('Unsupported primitive format');
        for(const id of [primitive.attributes?.POSITION,primitive.attributes?.NORMAL]){
          const accessor=model.accessors?.[id],view=model.bufferViews?.[accessor?.bufferView];
          if(!accessor||!view||view.buffer!==0||accessor.componentType!==5126||
             accessor.type!=='VEC3'||accessor.count<1)
            throw new Error('Invalid furniture accessor');
          const step=view.byteStride??12,start=(view.byteOffset??0)+(accessor.byteOffset??0);
          const end=start+(accessor.count-1)*step+12;
          if(step<12||start<0||end>raw.length||end>(view.byteOffset??0)+view.byteLength)
            throw new Error('Furniture data out of bounds');
        }
      }
    }
    if(!model.materials?.every(mat=>
      Number.isInteger(mat.extras?.studioKind)&&
      mat.extras.studioKind>=0&&mat.extras.studioKind<=4))
      throw new Error('Missing Studio material classification');
  } catch(error){failures.push('Studio furniture glTF invalid: '+file+' ('+String(error)+')');}
}
const sceneSource=readFileSync('src/scripts/studio-webgl.ts','utf8');
for(const furniture of ['desk','bookshelf','chair']){
  if(!sceneSource.includes("legacyFurniture('"+furniture+"'"))
    failures.push('Missing fallback for Studio furniture: '+furniture);
}
if(!sceneSource.includes('let shadowDirty=true')||
   !sceneSource.includes('shadow&&shadowDirty'))
  failures.push('Studio static shadow cache is missing');

// V0.6: assert packed PBR attributes, quality tiers and geometry granularity.
const studioLoaderSource=readFileSync('src/scripts/studio-assets.ts','utf8');
for(const key of ['metallic: number','roughness: number','metallic,roughness']) {
  if(!studioLoaderSource.includes(key)) failures.push('Studio material-factor attribute missing: '+key);
}
for(const key of ['layout(location=5) in float aMetallic','layout(location=6) in float aRoughness',
                  'uniform highp sampler2DShadow uShadowMap','const stride=13*4',
                  'kind,item.metallic,item.roughness']) {
  if(!studioShaderSource.includes(key)) failures.push('Studio V0.6 shader packing contract missing: '+key);
}
for(const key of ["low:{pixelRatio:1,shadowSize:512}",
                  "balanced:{pixelRatio:1.5,shadowSize:1024}",
                  "high:{pixelRatio:1.75,shadowSize:1536}"]) {
  if(!studioShaderSource.includes(key)) failures.push('Studio GPU quality tier missing: '+key);
}
// V0.7: validate LOD variants, locally hosted fabric maps and sampler contracts.
for(const id of ['desk','bookshelf','chair']){
  const highFile=join(outputDirectory,'models/studio/'+id+'.gltf');
  const lowFile=join(outputDirectory,'models/studio/'+id+'-low.gltf');
  if(!existsSync(lowFile)){failures.push('Studio low LOD missing: '+id);continue;}
  try{
    const high=JSON.parse(readFileSync(highFile,'utf8'));
    const low=JSON.parse(readFileSync(lowFile,'utf8'));
    if(low.nodes.length>=high.nodes.length || low.nodes.length<5)
      throw new Error('LOD node count must be reduced');
    if(low.meshes.length!==high.meshes.length ||
       low.buffers[0].byteLength!==high.buffers[0].byteLength)
      throw new Error('Unexpected LOD buffer structure');
    for(const node of low.nodes)
      if(node.mesh===undefined || !low.meshes[node.mesh])
        throw new Error('Invalid LOD mesh index');
  }catch(error){failures.push('Invalid Studio LOD '+id+': '+String(error));}
}
for(const name of ['fabric-albedo.svg','fabric-roughness.svg']){
  const path=join(outputDirectory,'textures/studio',name);
  if(!existsSync(path)){failures.push('Studio fabric texture missing: '+name);continue;}
  const svg=readFileSync(path,'utf8');
  if(!svg.includes('xmlns="http://www.w3.org/2000/svg"')||
     svg.includes('<script')||svg.includes('href="https:')||svg.includes('href="http:'))
    failures.push('Unsafe fabric texture: '+name);
}
for(const contract of [
  "const meshLevels={high:buildLevel('high'),low:buildLevel('low')}",
  'graphics.count=meshLevels[currentLOD].length/13',
  "const BENCHMARK_MS=5000",
  'shadowDirty=true',
  'requestAnimationFrame(step)',
  'uniform sampler2D uWalnutAlbedo, uWalnutRoughness, uFabricAlbedo, uFabricRoughness',
  'gl.uniform1i(uniforms.fabricAlbedo,3)'
]){
  if(!studioShaderSource.includes(contract))
    failures.push('Missing Studio V0.7 shader/runtime contract: '+contract);
}
const studioUI=readFileSync('src/pages/studio/index.astro','utf8');
if(!studioUI.includes('data-studio-benchmark') ||
   !studioUI.includes('data-studio-benchmark-status'))
  failures.push('Missing Studio V0.7 benchmark controls');

const chairAsset=join(outputDirectory,'models/studio/chair.gltf');
if(existsSync(chairAsset)) {
  const chair=JSON.parse(readFileSync(chairAsset,'utf8'));
  const fine=chair.meshes?.find(mesh=>mesh.name==='rounded-cushion');
  const accessor=chair.accessors?.[fine?.primitives?.[0]?.attributes?.POSITION];
  if(!fine||!accessor||accessor.count<500)
    failures.push('Studio V0.6 rounded upholstery mesh missing');
  for(const name of ['Seat cushion','Back cushion']) {
    const node=chair.nodes?.find(node=>node.name===name);
    if(!node||chair.meshes[node.mesh]?.name!=='rounded-cushion')
      failures.push('Studio '+name+' is not using rounded mesh');
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

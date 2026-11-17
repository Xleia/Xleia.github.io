import { STUDIO_ZONES, type StudioZone, type Vec3 } from '../data/studio';

// Dependency-free perspective blockout. This is intentionally not the final
// WebGL/GLB pipeline: it tests spatial composition and interaction first.
type Camera = { target: [number, number, number]; azimuth: number; elevation: number; distance: number };
type Block = { center: Vec3; size: Vec3; color: string };
type Face = { vertices: Vec3[]; depth: number; color: string; light: number };
type Projected = { x: number; y: number; depth: number };

const HOME: Camera = { target: [0, 1.17, -0.05], azimuth: 0.36, elevation: 0.32, distance: 12.8 };
const blocks: Block[] = [];
const color = {
  wall: '#273047', leftWall: '#1d2c3e', floor: '#584235', wood: '#79563c', woodDark: '#50392e',
  panel: '#151f32', metal: '#667b89', darkMetal: '#26384b', paper: '#b29a7e',
  shelf: '#62472f', bookA: '#415f71', bookB: '#9a664f', bookC: '#7b7a6b',
  night: '#102443', window: '#1b3855', light: '#e9b66d', cyan: '#63b5d7',
  screen: '#20496e', green: '#567768', fabric: '#53616a', rug: '#3b4556',
} as const;

function add(center: Vec3, size: Vec3, c: string): void { blocks.push({ center, size, color: c }); }

function buildRoom(): void {
  add([0, -0.16, 0], [8.6, 0.25, 6.7], color.floor);
  add([0, 1.72, -3.31], [8.6, 3.7, .18], color.wall);
  add([-4.28, 1.72, 0], [.17, 3.7, 6.7], color.leftWall);

  // Floor planks, inset rug, window opening and skyline pin lights.
  for (let z = -3.03; z <= 3.02; z += .42) add([0, -.026, z], [8.22, .013, .39], (Math.round(z * 100) % 3 === 0) ? '#634936' : '#604633');
  add([-0.2, .008, 1.29], [4.2, .025, 2.2], color.rug);
  add([0.62, 2.25, -3.19], [3.8, 1.63, .07], color.night);
  add([-.47, 2.25, -3.1], [.07, 1.72, .1], color.metal);
  add([1.66, 2.25, -3.1], [.07, 1.72, .1], color.metal);
  add([.62, 3.12, -3.1], [3.95, .09, .12], color.darkMetal);
  add([.62, 1.37, -3.1], [3.95, .08, .12], color.darkMetal);
  add([.62, 2.22, -3.1], [3.9, .045, .1], '#4b627f');
  for (let x = -1.05; x < 2.25; x += .21) {
    for (let y = 1.65; y < 2.79; y += .19) {
      if (Math.sin(x * 19 + y * 27) > .22) add([x, y, -3.13], [.045, .061, .023], Math.sin(x * 27) > 0 ? '#adab98' : '#56849d');
    }
  }

  // Tall knowledge shelf with multiple shelves, book spines and small plants.
  for (const x of [-3.88, -2.64]) add([x, 1.37, -2.24], [.13, 2.76, .85], color.shelf);
  for (const y of [.16, .76, 1.34, 1.92, 2.53, 2.75]) add([-3.26, y, -2.22], [1.38, .085, .96], color.shelf);
  for (let level = 0; level < 4; level++) {
    for (let i = 0; i < 10; i++) {
      const height = .28 + .15 * (1 + Math.sin(i * 2.1 + level * 1.3)) / 2;
      add([-3.78 + i * .115, .2 + level * .59 + height / 2, -1.77], [.084, height, .33], [color.bookA, color.bookB, color.bookC][(i + level) % 3]);
    }
  }
  add([-3.24, 2.89, -2.24], [1.28, .09, .98], color.wood);

  // Main walnut workstation and two large legs.
  add([0, .79, -.68], [3.4, .15, 1.55], color.wood);
  for (const x of [-1.39, 1.39]) for (const z of [-1.21, -.08]) add([x, .36, z], [.16, .73, .14], color.woodDark);
  add([0, 1.62, -1.01], [1.61, 1.04, .12], color.darkMetal);
  add([0, 1.63, -.929], [1.44, .88, .025], color.screen);
  add([0, 1.05, -1], [.09, .26, .11], color.metal);
  add([0, .905, -.96], [.55, .034, .25], color.darkMetal);
  add([.05, .89, -.18], [.86, .035, .25], '#3c4b55');
  for (let i = 0; i < 14; i++) add([-.34 + i * .063, .914, -.17], [.038, .006, .11], '#8497a0');
  add([1.03, .89, -.2], [.14, .045, .21], '#526b77');

  // Lamp: warm spot on the table, plus small cup and desk notes.
  add([-1.22, .9, -1.07], [.26, .055, .26], color.metal);
  add([-1.22, 1.26, -1.07], [.048, .72, .048], color.metal);
  add([-1.13, 1.61, -1.04], [.4, .16, .27], color.light);
  add([-1.04, .89, -.33], [.16, .19, .16], color.paper);
  add([-.82, .876, -.27], [.36, .012, .23], color.paper);

  // A desk chair with backrest and a modest arm support.
  add([.04, .49, .7], [1.05, .16, .96], color.fabric);
  add([.04, 1.03, 1.05], [1.05, 1.1, .18], '#455767');
  add([.04, .2, .73], [.14, .55, .13], color.metal);

  // Secondary phone pedestal and upright display (Train Libre).
  add([2.21, .65, .41], [.79, 1.12, .66], color.woodDark);
  add([2.21, 1.23, .41], [.88, .09, .78], color.wood);
  add([2.17, 1.53, .56], [.4, .71, .075], color.darkMetal);
  add([2.17, 1.54, .61], [.33, .6, .02], '#2d6280');
  add([2.17, 1.15, .53], [.22, .06, .23], color.metal);

  // Right-hand Lab workbench, tools, experimental light boxes.
  add([3.14, .82, -1.95], [1.75, .11, 1.0], color.wood);
  for (const x of [2.46, 3.8]) add([x, .37, -2.08], [.1, .81, .09], color.darkMetal);
  add([2.93, 1.5, -2.39], [.71, .68, .13], color.darkMetal);
  add([2.93, 1.5, -2.29], [.61, .53, .02], '#2c6a86');
  add([3.62, 1.09, -2.15], [.42, .43, .48], '#374a61');
  add([3.62, 1.34, -2.15], [.18, .12, .27], color.cyan);
  add([3.2, .95, -1.65], [.3, .17, .32], color.metal);
  add([3.37, 1.98, -2.78], [1.25, .1, .48], color.shelf);
  add([2.93, 2.15, -2.74], [.21, .27, .2], color.paper);
  add([3.32, 2.15, -2.74], [.19, .27, .2], color.bookA);

  // A personal lounge area with sofa, noticeboard and plant.
  add([-2.82, .33, 1.6], [1.72, .48, .9], '#415661');
  add([-2.84, .75, 2.03], [1.7, .83, .18], '#3d4a55');
  for (const x of [-3.49, -2.14]) add([x, .58, 1.61], [.2, .52, .93], '#364451');
  add([-2.57, .61, 1.46], [.59, .14, .44], '#727b79');
  add([-2.94, 1.84, -3.10], [.76, .53, .08], '#ac9272');
  add([-2.94, 1.84, -3.045], [.45, .3, .012], color.paper);
  add([-3.85, .38, .58], [.34, .75, .34], color.woodDark);
  add([-3.86, .94, .58], [.46, .53, .4], color.green);
}

buildRoom();

function cloneCamera(c: Camera): Camera { return { ...c, target: [...c.target] as [number, number, number] }; }
function limit(value: number, low: number, high: number): number { return Math.max(low, Math.min(high, value)); }
function rgbShade(hex: string, intensity: number): string {
  const n = parseInt(hex.slice(1), 16);
  const p = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(limit(v * intensity, 0, 255)));
  return `rgb(${p[0]} ${p[1]} ${p[2]})`;
}
function dot(a: Vec3, b: Vec3): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function subtract(a: Vec3, b: Vec3): [number, number, number] { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }

export function mountStudio(): void {
  const root = document.querySelector<HTMLElement>('[data-studio]');
  if (!root) return;
  const canvas = root.querySelector<HTMLCanvasElement>('[data-studio-canvas]');
  const stage = root.querySelector<HTMLElement>('[data-studio-stage]');
  const fallback = root.querySelector<HTMLElement>('[data-studio-fallback]');
  const detailContainer = root.querySelector<HTMLElement>('[data-studio-details]');
  const reset = root.querySelector<HTMLButtonElement>('[data-studio-reset]');
  const viewButton = root.querySelector<HTMLButtonElement>('[data-studio-view]');
  if (!canvas || !stage || !fallback || !detailContainer || !reset || !viewButton) return;

  const maybeContext = canvas.getContext('2d', { alpha: false });
  if (!maybeContext) return; // Preserve the complete 2D navigation if canvas is unavailable.
  const ctx: CanvasRenderingContext2D = maybeContext;
  reset.disabled = false;
  viewButton.disabled = false;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = window.matchMedia('(max-width: 760px)');
  const pins = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-studio-pin]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-studio-panel]'));
  let current = cloneCamera(HOME);
  let target = cloneCamera(HOME);
  let active: StudioZone | undefined;
  let is3D = !(reduceMotion.matches || narrow.matches);
  let frame = 0;
  let width = 1;
  let height = 1;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let pointerMoved = false;

  const applyView = () => {
    stage.hidden = !is3D;
    fallback.hidden = is3D;
    detailContainer.hidden = !is3D || !active;
    viewButton.textContent = is3D ? '切换 2D 模式' : '进入 3D 场景';
    if (is3D) { resize(); requestFrame(); }
  };

  const cameraBasis = () => {
    const a = current.azimuth, e = current.elevation;
    const offset: Vec3 = [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)];
    const camera: Vec3 = [
      current.target[0] + offset[0] * current.distance,
      current.target[1] + offset[1] * current.distance,
      current.target[2] + offset[2] * current.distance,
    ];
    const right: Vec3 = [Math.cos(a), 0, -Math.sin(a)];
    const up: Vec3 = [-Math.sin(a) * Math.sin(e), Math.cos(e), -Math.cos(a) * Math.sin(e)];
    const forward: Vec3 = [-offset[0], -offset[1], -offset[2]];
    return { camera, right, up, forward };
  };

  const render = () => {
    if (!is3D) return;
    const basis = cameraBasis();
    const focal = height / (2 * Math.tan((40 * Math.PI / 180) / 2));
    const project = (point: Vec3): Projected => {
      const v = subtract(point, basis.camera);
      const depth = dot(v, basis.forward);
      return { x: width / 2 + dot(v, basis.right) * focal / Math.max(depth, .03), y: height / 2 - dot(v, basis.up) * focal / Math.max(depth, .03), depth };
    };

    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, '#101a2c');
    background.addColorStop(1, '#2b3445');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const faces: Face[] = [];
    const definitions = [
      { ids: [4, 5, 6, 7], light: .96 }, { ids: [1, 0, 3, 2], light: .58 },
      { ids: [5, 1, 2, 6], light: .7 }, { ids: [0, 4, 7, 3], light: .82 },
      { ids: [7, 6, 2, 3], light: 1.19 }, { ids: [0, 1, 5, 4], light: .52 },
    ];
    for (const block of blocks) {
      const [x, y, z] = block.center;
      const [sx, sy, sz] = block.size;
      const x0 = x - sx / 2, x1 = x + sx / 2;
      const y0 = y - sy / 2, y1 = y + sy / 2;
      const z0 = z - sz / 2, z1 = z + sz / 2;
      const vertices: Vec3[] = [
        [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
        [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
      ];
      for (const face of definitions) {
        const points = face.ids.map((index) => vertices[index]);
        const depth = points.reduce((sum, p) => sum + project(p).depth, 0) / points.length;
        faces.push({ vertices: points, depth, color: block.color, light: face.light });
      }
    }
    faces.sort((a, b) => b.depth - a.depth);
    ctx.lineWidth = .7;
    for (const face of faces) {
      const points = face.vertices.map(project);
      if (points.some((p) => p.depth <= .03)) continue;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.fillStyle = rgbShade(face.color, face.light);
      ctx.fill();
      ctx.strokeStyle = 'rgba(12, 18, 32, .24)';
      ctx.stroke();
    }

    // Low-cost luminous haze and labels, retained as atmosphere rather than
    // claiming physically accurate lighting in the blockout.
    const halo = project([-1.12, 1.63, -.99]);
    const radius = height * .29 / Math.max(halo.depth / 8, .5);
    if (halo.depth > 0) {
      const light = ctx.createRadialGradient(halo.x, halo.y, 1, halo.x, halo.y, Math.max(radius, 50));
      light.addColorStop(0, 'rgba(255, 191, 117, .16)');
      light.addColorStop(1, 'rgba(255, 191, 117, 0)');
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, width, height);
    }

    function mark(text: string, position: Vec3, fill: string, size: number) {
      const p = project(position);
      if (p.depth <= 0) return;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `700 ${Math.round(limit(size * focal / p.depth, 9, 26))}px system-ui`;
      ctx.shadowColor = '#081425';
      ctx.shadowBlur = 8;
      ctx.fillStyle = fill;
      ctx.fillText(text, p.x, p.y);
      ctx.restore();
    }
    mark('KOTO', [0, 1.62, -.882], '#d6edff', .18);
    mark('LAB', [2.93, 1.5, -2.26], '#c5f0ff', .14);
    mark('TRAIN', [2.17, 1.56, .64], '#e4f4ff', .075);

    for (const pin of pins) {
      const zone = STUDIO_ZONES.find((z) => z.id === pin.dataset.studioPin);
      if (!zone) continue;
      const p = project(zone.pin);
      pin.hidden = p.depth <= .03 || p.x < -90 || p.x > width + 90 || p.y < -90 || p.y > height + 90;
      pin.style.left = `${p.x}px`;
      pin.style.top = `${p.y}px`;
    }
  };

  const animate = () => {
    frame = 0;
    const speed = reduceMotion.matches ? 1 : .13;
    let distance = 0;
    for (let i = 0; i < 3; i++) {
      const diff = target.target[i] - current.target[i];
      current.target[i] += diff * speed;
      distance += Math.abs(diff);
    }
    for (const key of ['distance', 'azimuth', 'elevation'] as const) {
      const diff = target[key] - current[key];
      current[key] += diff * speed;
      distance += Math.abs(diff);
    }
    render();
    if (distance > .004) requestFrame();
  };
  const requestFrame = () => { if (is3D && !frame) frame = window.requestAnimationFrame(animate); };
  const resize = () => {
    if (!is3D) return;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    width = rect.width;
    height = rect.height;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    requestFrame();
  };

  const select = (zone: StudioZone | undefined) => {
    active = zone;
    if (zone) {
      target = { target: [...zone.focus] as [number, number, number], distance: zone.distance, azimuth: zone.azimuth, elevation: zone.elevation };
    } else target = cloneCamera(HOME);
    for (const pin of pins) pin.setAttribute('aria-pressed', String(pin.dataset.studioPin === zone?.id));
    for (const panel of panels) panel.hidden = panel.dataset.studioPanel !== zone?.id;
    detailContainer.hidden = !zone || !is3D;
    requestFrame();
  };

  for (const pin of pins) {
    pin.addEventListener('click', () => {
      if (pointerMoved) { pointerMoved = false; return; }
      select(STUDIO_ZONES.find((z) => z.id === pin.dataset.studioPin));
    });
  }
  root.querySelectorAll<HTMLButtonElement>('[data-studio-close]').forEach((button) => button.addEventListener('click', () => select(undefined)));
  reset.addEventListener('click', () => select(undefined));
  viewButton.addEventListener('click', () => { is3D = !is3D; applyView(); });

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true; pointerMoved = false;
    lastX = event.clientX; lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX, dy = event.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) pointerMoved = true;
    target.azimuth = limit(target.azimuth + dx * .004, -.17, .88);
    target.elevation = limit(target.elevation + dy * .003, .12, .58);
    lastX = event.clientX; lastY = event.clientY;
    requestFrame();
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('wheel', (event) => {
    if (!is3D) return;
    event.preventDefault();
    target.distance = limit(target.distance + Math.sign(event.deltaY) * .55, 4.4, 15.5);
    requestFrame();
  }, { passive: false });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && active) select(undefined); });
  new ResizeObserver(resize).observe(stage);
  applyView();
}

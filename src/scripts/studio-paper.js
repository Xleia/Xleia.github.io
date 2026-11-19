// Store vector strokes so repainting and undo never degrade the drawing.
const paper = document.querySelector('.paper');
const ctx = paper.getContext('2d');
const undo = document.querySelector('[data-undo]');
const save = document.querySelector('[data-save]');
const status = document.querySelector('.paper-status');
const key = 'xleia-studio-sketch-v1';
const strokes = [];
let active;
function validPoint(point) {
  return Array.isArray(point) && point.length === 2 &&
    point.every(n => Number.isFinite(n) && n >= 0 && n <= 1);
}
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (Array.isArray(saved) && saved.every(line => Array.isArray(line) && line.length && line.every(validPoint))) {
    strokes.push(...saved);
  }
} catch { /* Private browsing may disable local storage. */ }

function segment(a, b) {
  ctx.beginPath();
  ctx.moveTo(a[0] * paper.width, a[1] * paper.height);
  ctx.lineTo(b[0] * paper.width + .01, b[1] * paper.height + .01);
  ctx.stroke();
}
function paint() {
  ctx.fillStyle = '#eadabe';
  ctx.fillRect(0, 0, paper.width, paper.height);
  ctx.strokeStyle = '#493b32';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const line of strokes) line.forEach((point, i) => segment(line[i-1] || point, point));
  undo.disabled = save.disabled = !strokes.length;
}
function persist() {
  try {
    localStorage.setItem(key, JSON.stringify(strokes));
    status.textContent = strokes.length ? '已存于此浏览器' : '在纸上画一笔';
  } catch { status.textContent = '仅本次保留，可保存图像'; }
  undo.disabled = save.disabled = !strokes.length;
}
function addPoint(event) {
  const rect = paper.getBoundingClientRect();
  const unit = n => Math.min(1, Math.max(0, n));
  const point = [unit((event.clientX-rect.left)/rect.width),unit((event.clientY-rect.top)/rect.height)];
  segment(active.line.at(-1) || point, point);
  active.line.push(point);
}
if (ctx) {
  paint();
  if (strokes.length) status.textContent = '已恢复上次速写';
  paper.addEventListener('pointerdown', event => {
    if (active || event.button !== 0) return;
    active = {id:event.pointerId, line:[]};
    paper.setPointerCapture(event.pointerId);
    addPoint(event);
  });
  paper.addEventListener('pointermove', event => {
    if (active?.id === event.pointerId) addPoint(event);
  });
  paper.addEventListener('lostpointercapture', () => {
    if (!active) return;
    strokes.push(active.line);
    active = undefined;
    persist();
  });
} else status.textContent = '当前浏览器无法使用画纸';
undo.addEventListener('click', () => {
  strokes.pop();
  paint();
  persist();
});
save.addEventListener('click', () => {
  paper.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Xleia-Studio-sketch.png';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, 'image/png');
});

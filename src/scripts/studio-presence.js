const room = document.querySelector('.room');
const view = document.querySelector('.view');
const menu = document.querySelector('details');
const hint = document.querySelector('#room-tip');
const glassHint = document.querySelector('#glass-tip');
const glass = view.querySelector('canvas');
const back = view.querySelector('.return');
const ctx = glass.getContext('2d');
const stage = document.querySelector('main');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let yaw = 0;
let focal = 1200;
let minYaw = 0;
let maxYaw = 0;
let drag;
let leaving = false;
let fade;
Promise.all([...room.querySelectorAll('.layer-photo,.chair,.foreground')].map(img => img.decode()))
  .then(() => room.classList.add('layered'))
  .catch(() => { hint.textContent = '点窗户走近 · 点桌灯开关'; });

// Rotate the whole view around the observer. Limit the turn to rays covered
// by the room photograph, including the extra crop on portrait screens.
function fitCamera() {
  const rect = room.getBoundingClientRect();
  const half = stage.clientWidth / 2;
  const eye = half - rect.left;
  focal = Math.max(stage.clientWidth, stage.clientHeight) * .95;
  const edgeAngle = Math.atan(half / focal);
  const margin = rect.width * .08;
  const cap = Math.PI / 18;
  minYaw = -Math.min(cap, Math.max(0, Math.atan((eye + margin) / focal) - edgeAngle));
  maxYaw = Math.min(cap, Math.max(0, Math.atan((rect.width - eye + margin) / focal) - edgeAngle));
  room.style.setProperty('--eye-x', eye + 'px');
  room.style.setProperty('--focal', focal + 'px');
  setYaw(yaw);
}
function setYaw(angle) {
  yaw = Math.max(minYaw, Math.min(maxYaw, angle));
  room.style.setProperty('--yaw', yaw + 'rad');
}
new ResizeObserver(fitCamera).observe(stage);
fitCamera();
stage.addEventListener('pointerdown', e => {
  if (room.inert || menu.open || motion.matches || !room.classList.contains('layered')
      || !e.isPrimary || e.button || e.target.closest('button')) return;
  drag = {id:e.pointerId, x:e.clientX};
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', e => {
  if (drag?.id !== e.pointerId) return;
  const delta = e.clientX - drag.x;
  drag.x = e.clientX;
  if (!delta) return;
  setYaw(yaw - delta * .65 / focal);
  hint.hidden = true;
});
stage.addEventListener('lostpointercapture', () => { drag = undefined; });
stage.addEventListener('keydown', e => {
  if (room.inert || menu.open || motion.matches || !room.classList.contains('layered')) return;
  if (e.key === 'Home') setYaw(0);
  else if (e.key === 'ArrowLeft') setYaw(yaw - .018);
  else if (e.key === 'ArrowRight') setYaw(yaw + .018);
  else return;
  hint.hidden = true;
  e.preventDefault();
});
let origin;
let previous;
let pointer;

for (const lamp of document.querySelectorAll('[data-lamp]')) {
  lamp.addEventListener('click', () => {
    const off = room.classList.toggle('dark');
    for (const control of document.querySelectorAll('[data-lamp]')) {
      control.setAttribute('aria-pressed', String(!off));
    }
    hint.hidden = true;
    if (menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });
}

function coatGlass() {
  if (view.hidden || !ctx) return;
  const width = Math.max(1, Math.round(glass.clientWidth / 2));
  const height = Math.max(1, Math.round(glass.clientHeight / 2));
  if (glass.dataset.coated && glass.width === width && glass.height === height) return;
  const saved = document.createElement('canvas');
  if (glass.dataset.coated) {
    saved.width = glass.width;
    saved.height = glass.height;
    saved.getContext('2d').drawImage(glass, 0, 0);
  }
  glass.width = width;
  glass.height = height;
  if (glass.dataset.coated) {
    ctx.drawImage(saved, 0, 0, width, height);
    return;
  }
  glass.dataset.coated = 'true';
  const fog = ctx.createLinearGradient(0, 0, 0, glass.height);
  fog.addColorStop(0, 'rgba(181,199,212,.18)');
  fog.addColorStop(.55, 'rgba(191,196,201,.47)');
  fog.addColorStop(1, 'rgba(157,169,178,.68)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, glass.width, glass.height);
}

for (const button of document.querySelectorAll('[data-window]')) {
  button.addEventListener('click', () => {
    origin = menu.contains(button) ? menu.querySelector('summary') : button;
    menu.open = false;
    menu.hidden = true;
    room.inert = true;
    room.dispatchEvent(new Event('viewchange'));
    room.classList.add('travel','approach');
    view.hidden = false;
    if (!motion.matches) {
      fade = view.animate([{opacity:0, offset:0}, {opacity:0, offset:.4}, {opacity:1}], {duration:900});
    }
    hint.hidden = true;
    glassHint.hidden = !ctx || glass.dataset.wiped === 'true';
    coatGlass();
    (ctx ? glass : back).focus();
  });
}
function sitDown() {
  if (leaving) return;
  leaving = true;
  previous = undefined;
  pointer = undefined;
  const opacity = getComputedStyle(view).opacity;
  fade?.cancel();
  room.classList.remove('approach');
  view.inert = true;
  function finish() {
    leaving = false;
    view.inert = false;
    view.hidden = true;
    room.classList.remove('travel');
    room.inert = false;
    menu.hidden = false;
    room.dispatchEvent(new Event('viewchange'));
    origin?.focus({preventScroll:true});
  }
  if (motion.matches) finish();
  else {
    fade = view.animate([{opacity}, {opacity:0, offset:.68}, {opacity:0}], {duration:850});
    fade.finished.then(finish, finish);
  }
}
back.addEventListener('click', sitDown);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !view.hidden) sitDown();
});
window.addEventListener('resize', coatGlass);

function dab(x, y) {
  const radius = Math.max(18, Math.min(42, glass.width * .055));
  const brush = ctx.createRadialGradient(x, y, 0, x, y, radius);
  brush.addColorStop(0, '#000');
  brush.addColorStop(.65, 'rgba(0,0,0,.88)');
  brush.addColorStop(1, 'transparent');
  ctx.fillStyle = brush;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function wipe(x, y) {
  if (!ctx) return;
  const start = previous || {x, y};
  const steps = Math.max(1, Math.ceil(Math.hypot(x - start.x, y - start.y) / 5));
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 1; i <= steps; i++) dab(start.x + (x - start.x) * i / steps, start.y + (y - start.y) * i / steps);
  ctx.globalCompositeOperation = 'source-over';
  previous = {x, y};
  glass.dataset.wiped = 'true';
  glassHint.hidden = true;
}
function stroke(event) {
  const rect = glass.getBoundingClientRect();
  wipe((event.clientX - rect.left) * glass.width / rect.width, (event.clientY - rect.top) * glass.height / rect.height);
}
glass.addEventListener('pointerdown', event => {
  if (pointer !== undefined || event.button !== 0) return;
  pointer = event.pointerId;
  glass.setPointerCapture(pointer);
  stroke(event);
});
glass.addEventListener('pointermove', event => {
  if (pointer === event.pointerId) stroke(event);
});
glass.addEventListener('lostpointercapture', () => { pointer = undefined; previous = undefined; });
glass.addEventListener('keydown', event => {
  if (event.code !== 'Space') return;
  event.preventDefault();
  previous = undefined;
  wipe(glass.width * .35, glass.height * .48);
  wipe(glass.width * .65, glass.height * .52);
  previous = undefined;
});

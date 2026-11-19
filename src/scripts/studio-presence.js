const room = document.querySelector('.room');
const view = document.querySelector('.view');
const menu = document.querySelector('details');
const hint = document.querySelector('#room-tip');
const glassHint = document.querySelector('#glass-tip');
const glass = view.querySelector('canvas');
const back = view.querySelector('.return');
const ctx = glass.getContext('2d');
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
  glass.width = Math.max(1, Math.round(glass.clientWidth / 2));
  glass.height = Math.max(1, Math.round(glass.clientHeight / 2));
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
    view.hidden = false;
    hint.hidden = true;
    glassHint.hidden = !ctx;
    coatGlass();
    (ctx ? glass : back).focus();
  });
}
function sitDown() {
  previous = undefined;
  pointer = undefined;
  view.hidden = true;
  room.inert = false;
  menu.hidden = false;
  room.dispatchEvent(new Event('viewchange'));
  origin?.focus();
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

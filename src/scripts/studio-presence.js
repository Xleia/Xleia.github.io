import {createCanvasWalk} from './studio-walk-canvas.js';
import {createRenderer} from './studio-sketch-renderer.js';
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
  if (room.classList.contains('walking') || room.inert || menu.open || motion.matches || !room.classList.contains('layered')
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
  if (room.classList.contains('walking') || room.inert || menu.open || motion.matches || !room.classList.contains('layered')) return;
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

const detail = document.querySelector('.detail');
const catalogue = detail.querySelector('.catalogue');
const desk = detail.querySelector('.paper-desk');
const openPaper = detail.querySelector('.open-paper');
openPaper.addEventListener('click', () => {
  desk.hidden = false;
  openPaper.hidden = true;
  desk.querySelector('canvas').setAttribute('tabindex','-1');
  desk.querySelector('canvas').focus({preventScroll:true});
});
const locationName = document.querySelector('.location span');
const labels = {window:'窗边', shelf:'书架', sketch:'速写本'};
const spots = new Map([...room.querySelectorAll('[data-place]')].map(button => [button.dataset.place, button]));
let route;
let progress = 0;
let destination;
const initialHint = matchMedia('(pointer:coarse)').matches ? '轻点房间里的物件，或从目录选择去处' : '指向书架、窗户或速写本，向上滚动走近';

const passage = stage.querySelector('.passage');
let renderWalk;
let lookAngle = 0;
let lookPitch = 0;
let pendingFrame = 0;
function paintPassage() {
  const active = route === 'window' && progress > 0 && renderWalk && !motion.matches;
  passage.hidden = !active;
  if (active) renderWalk(yaw + lookAngle, lookPitch, -2, progress, room.classList.contains('dark'));
}
async function preparePassage() {
  try { renderWalk = await createRenderer(passage,true) || await createCanvasWalk(passage); paintPassage(); }
  catch { renderWalk = undefined; passage.hidden = true; }
}
passage.addEventListener('webglcontextlost', event => {
  event.preventDefault(); renderWalk = undefined; passage.hidden = true;
});
passage.addEventListener('webglcontextrestored',preparePassage);
window.addEventListener('resize',paintPassage);
motion.addEventListener('change',paintPassage);
preparePassage();

function turnInPassage(delta) {
  lookAngle = Math.max(-.32, Math.min(.32, lookAngle + delta));
  paintPassage();
}
let walkDrag;
passage.addEventListener('pointerdown', e => {
  if (!e.isPrimary || e.button) return;
  cancelAnimationFrame(pendingFrame);
  walkDrag = {id:e.pointerId,x:e.clientX,y:e.clientY};
  passage.setPointerCapture(e.pointerId);
});
passage.addEventListener('pointermove', e => {
  if (walkDrag?.id !== e.pointerId) return;
  lookPitch = Math.max(-.16, Math.min(.35,lookPitch + (walkDrag.y-e.clientY)/focal));
  walkDrag.y=e.clientY;
  turnInPassage((walkDrag.x-e.clientX)/focal);
  walkDrag.x=e.clientX;
});
passage.addEventListener('lostpointercapture',()=>{walkDrag=undefined;});
stage.addEventListener('keydown', e => {
  if(passage.hidden || destination || menu.open)return;
  if(e.key==='ArrowLeft')turnInPassage(-.035);
  else if(e.key==='ArrowRight')turnInPassage(.035);
  else return;
  e.preventDefault();
});
function aimAt(place) {
  route = place;
  // Use the hotspot's projected position, including the current yaw and mobile crop.
  const box = spots.get(place).getBoundingClientRect();
  const dx = stage.clientWidth / 2 - box.left - box.width / 2;
  const dy = stage.clientHeight / 2 - box.top - box.height / 2;
  room.style.setProperty('--aim-x', dx + 'px');
  room.style.setProperty('--aim-y', dy + 'px');
}
function walk(value) {
  progress = Math.max(0, Math.min(1, value));
  room.style.setProperty('--walk', String(progress));
  room.style.setProperty('--walk-x', 'calc(var(--aim-x) * var(--walk) * .85)');
  room.style.setProperty('--walk-y', 'calc(var(--aim-y) * var(--walk) * .85)');
  room.classList.toggle('walking', progress > 0);
  hint.hidden = false;
  hint.textContent = progress ? labels[route] + ' · 向上走近 / 向下退回' : initialHint;
  if (!progress) { route = undefined; lookAngle = 0; lookPitch = 0; }
  paintPassage();
  if (!destination) locationName.textContent = passage.hidden ? '沙发' : progress < .52 ? '茶几旁' : '窗前';
  if (!passage.hidden && !destination) hint.textContent = '滚轮前进或后退 · 拖动环顾';
}

function arrive(place, button) {
  if (destination) return;
  if (route !== place) { walk(0); aimAt(place); }
  const fromWheel = progress === 1;
  if (!fromWheel) room.classList.add('travel');
  walk(1);
  destination = place === 'window' ? view : detail;
  locationName.textContent = labels[place];
  origin = menu.contains(button) ? menu.querySelector('summary') : button;
  menu.open = false;
  menu.hidden = true;
  room.inert = true;
  room.dispatchEvent(new Event('viewchange'));
  destination.hidden = false;
  hint.hidden = true;
  if (destination === view) {
    glassHint.hidden = !ctx || glass.dataset.wiped === 'true';
    coatGlass();
    (ctx ? glass : back).focus({preventScroll:true});
  } else {
    detail.dataset.scene = place;
    detail.setAttribute('aria-label', labels[place]);
    detail.querySelector('img').alt = place === 'shelf' ? '左侧书架与架上的藏书' : '茶几上摊开的东京夜景速写';
    catalogue.hidden = place !== 'shelf';
    desk.hidden = true;
    openPaper.hidden = place !== 'sketch';
    detail.querySelector('button').focus({preventScroll:true});
  }
  if (!motion.matches) fade = destination.animate([{opacity:0},{opacity:1}], {duration:fromWheel ? 320 : 550});
}
for (const button of document.querySelectorAll('[data-place]')) {
  button.addEventListener('click', () => {
    cancelAnimationFrame(pendingFrame);
    if (button.dataset.place !== 'window' || !renderWalk || motion.matches) {
      arrive(button.dataset.place,button); return;
    }
    menu.open=false;
    if (route !== 'window') { walk(0); aimAt('window'); }
    const start=performance.now(), initial=progress;
    function advance(now) {
      const t=Math.min(1,(now-start)/1850);
      walk(initial+(1-initial)*t*t*(3-2*t));
      if(t<1) pendingFrame=requestAnimationFrame(advance);
      else arrive('window',button);
    }
    pendingFrame=requestAnimationFrame(advance);
  });
}

function sitDown() {
  if (!destination || leaving) return;
  leaving = true;
  previous = undefined;
  pointer = undefined;
  const opacity = getComputedStyle(destination).opacity;
  fade?.cancel();
  destination.inert = true;
  room.classList.add('travel');
  walk(0);
  hint.hidden = true;
  function finish() {
    destination.inert = false;
    destination.hidden = true;
    destination = undefined;
    locationName.textContent = '沙发';
    leaving = false;
    room.inert = false;
    menu.hidden = false;
    room.classList.remove('travel');
    room.dispatchEvent(new Event('viewchange'));
    origin?.focus({preventScroll:true});
  }
  if (motion.matches) finish();
  else {
    fade = destination.animate([{opacity}, {opacity:0}], {duration:850});
    fade.finished.then(finish, finish);
  }
}
back.addEventListener('click', sitDown);
detail.querySelector('button').addEventListener('click', sitDown);
stage.addEventListener('wheel', e => {
  if (menu.open || e.target.closest('.catalogue,.paper-desk') || e.ctrlKey || !e.deltaY || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  cancelAnimationFrame(pendingFrame);
  const units = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? stage.clientHeight : 1;
  const stride = Math.max(-.24, Math.min(.24, -e.deltaY * units / 620));
  if (destination) {
    if (stride < 0) sitDown();
    e.preventDefault();
    return;
  }
  if (!route) {
    const spot = e.target.closest('.spot[data-place]');
    if (!spot || stride <= 0) return;
    aimAt(spot.dataset.place);
  }
  e.preventDefault();
  walk(progress + (route === 'window' && renderWalk ? stride*.48 : stride));
  if (progress === 1) arrive(route, spots.get(route));
}, {passive:false});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  cancelAnimationFrame(pendingFrame);
  if (destination) sitDown();
  else if (route) walk(0);
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

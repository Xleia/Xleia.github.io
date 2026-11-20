import {wetGlass} from './studio-wet-glass.js';
// Window masks are traced in the photographs' coordinates. Keeping the weather
// in that space also keeps it behind the sill when object-fit crops the view.
const frameWidth = 836;
const frameHeight = 470.5;
const panes = {
  room: [
    [[332,38],[427,36],[427,158],[372,158],[370,117],[338,112]],
    [[442,37],[551,36],[551,193],[484,193],[484,159],[442,159]],
    [[563,37],[638,38],[638,189],[563,189]],
  ],
  window: [
    [[88,0],[746,0],[724,39],[745,74],[727,142],[757,120],[723,213],[771,174],[747,251],[794,210],[788,454],[86,427]],
  ],
};
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const menu = document.querySelector('details');
const room = document.querySelector('.room');
const view = document.querySelector('.view');
const passage = document.querySelector('.passage');
const layers = [...document.querySelectorAll('[data-rain]')].map(canvas => {
  const name = canvas.dataset.rain;
  const path = new Path2D();
  for (const points of panes[name]) {
    path.moveTo(...points[0]);
    for (const point of points.slice(1)) path.lineTo(...point);
    path.closePath();
  }
  // The room canvas only occupies the skyline, not the whole screen.
  const close = name === 'window';
  const bounds = close ? [0,0,frameWidth,frameHeight] : [328,32,314,166];
  const [x,y,width,height] = bounds;
  const count = close ? 82 : 42;
  const drops = Array.from({length:count}, () => {
    const depth = Math.random();
    return {x: Math.random() * width, y: Math.random() * height,
      speed:(close ? 64 : 33) * (.7 + depth), length:(close ? 5 : 3) * (.45 + depth),
      depth, warm: Math.random() < .12};
  });
  const water = wetGlass({x,y,width,height,close},close ? view.querySelector('img') : room.querySelector('.poster'));
  return {water,canvas, ctx:canvas.getContext('2d'), path, x,y,width,height,drops,close};
});
let timer;
let last = 0;
let time = 0;
function paint(layer) {
  const {canvas,ctx,path,x,y,width,height,close} = layer;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h || !ctx) return;
  const density = Math.min(devicePixelRatio || 1, 1.5, 1800 / Math.max(w,h));
  const bw = Math.max(1,Math.round(w*density)), bh = Math.max(1,Math.round(h*density));
  if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,bw,bh);
  const scale = Math.max(w/width,h/height);
  ctx.setTransform(scale*bw/w,0,0,scale*bh/h,((w-width*scale)/2-x*scale)*bw/w,((h-height*scale)/2-y*scale)*bh/h);
  ctx.save();
  ctx.clip(path);
  for (const drop of layer.drops) {
    const travel = time * drop.speed;
    const px = x + (drop.x + travel*.22 + 2*Math.sin(time*.5+drop.y)) % width;
    const py = y + (drop.y + travel) % height;
    ctx.strokeStyle = drop.warm ? '#efd2a6' : '#c8e2f7';
    ctx.globalAlpha = .055 + drop.depth*.10;
    ctx.lineWidth = (close ? .65 : .48) + drop.depth*.35;
    ctx.beginPath();
    ctx.moveTo(px-drop.length*.22,py-drop.length);
    ctx.lineTo(px,py);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  layer.water.draw(ctx);
  ctx.restore();
}
function syncRain() {
  clearInterval(timer);
  const layer = layers.find(item => item.close ? !view.hidden : !room.inert && passage.hidden);
  if (!layer || document.hidden || menu.open) return;
  paint(layer);
  if (motion.matches) return;
  last = performance.now();
  timer = setInterval(() => {
    const now = performance.now();
    const dt = Math.min(.1,(now-last)/1000);
    layer.water.advance(dt);
    time += dt;
    last = now;
    paint(layer);
  }, 1000/30);
}
const observer = new MutationObserver(syncRain);
for (const el of [view,passage]) observer.observe(el,{attributes:true,attributeFilter:['hidden']});
room.addEventListener('viewchange',syncRain);
menu.addEventListener('toggle',syncRain);
motion.addEventListener('change',syncRain);
document.addEventListener('visibilitychange',syncRain);
window.addEventListener('resize',syncRain);
window.addEventListener('pagehide',()=>clearInterval(timer));
window.addEventListener('pageshow',syncRain);
syncRain();

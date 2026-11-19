// The canvas covers just the glass. Each drop refracts a small sample of the
// photographed city; the frame, desk, and the rest of the room stay still.
const room = document.querySelector('.room');
const photo = room.querySelector('.poster');
const glass = room.querySelector('.glass');
const menu = document.querySelector('details');
const toggle = menu.querySelector('summary');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const ctx = glass.getContext('2d');
const drops = [
  // Room coordinates. The mullion lies between x=1105 and x=1135.
  {x:1027,y:135,run:57,r:1.65,cycle:13100,offset:2300},
  {x:1165,y:117,run:68,r:1.85,cycle:17900,offset:0},
  {x:1207,y:199,run:44,r:1.5,cycle:11300,offset:7300},
  {x:1249,y:156,run:77,r:1.9,cycle:19700,offset:4900},
  {x:1001,y:236,run:41,r:1.45,cycle:14900,offset:8900}
];
let timer = 0, elapsed = 0, lastTime = 0;
const left = 1672*.58, top = 941*.10;
const width = 1672*.183, height = 941*.27;

function paint(now){
  if (!ctx || !photo.naturalWidth) return;
  elapsed += now-lastTime;
  lastTime = now;
  ctx.clearRect(0,0,width,height);
  for (const d of drops){
    const t = ((elapsed+d.offset)%d.cycle)/d.cycle;
    if(t>.68) continue;
    const progress = Math.max(0,(t-.17)/.51);
    const fall = progress*progress;
    const x = d.x + Math.sin(fall*4.5)*1.3;
    const y = d.y + d.run*fall;
    const alpha = Math.min(1,t/.09,(.68-t)/.09);
    ctx.save();
    ctx.globalAlpha = alpha*.68;
    ctx.translate(x-left,y-top);
    ctx.beginPath();ctx.ellipse(0,0,d.r,d.r*(1.25+.55*progress),.06,0,Math.PI*2);
    ctx.clip();
    ctx.drawImage(photo,x-7,y-11,14,17,-d.r,-2*d.r,2*d.r,4*d.r);
    ctx.fillStyle='rgba(209,224,240,.65)';
    ctx.fillRect(-d.r*.58,-d.r*.9,d.r*.72,.8);
    ctx.restore();
  }
}

function resize(){
  if(!ctx)return;
  const density=Math.min(devicePixelRatio||1,2);
  glass.width=Math.max(1,Math.round(glass.clientWidth*density));
  glass.height=Math.max(1,Math.round(glass.clientHeight*density));
  ctx.setTransform(glass.width/width,0,0,glass.height/height,0,0);
}

function sync(){
  clearInterval(timer);
  const pause=document.hidden||motion.matches||menu.open;
  room.classList.toggle('resting',pause);
  if(pause||!ctx||!photo.naturalWidth)return;
  lastTime=performance.now();
  paint(lastTime);
  timer=setInterval(()=>paint(performance.now()),80);
}
new ResizeObserver(()=>{resize();sync();}).observe(room);
photo.addEventListener('load',sync);
menu.addEventListener('toggle',sync);
document.addEventListener('visibilitychange',sync);
motion.addEventListener('change',sync);
window.addEventListener('pagehide',()=>clearInterval(timer));
window.addEventListener('pageshow',sync);
document.querySelector('main').addEventListener('click',()=>{if(menu.open)menu.open=false;});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && menu.open){menu.open=false;toggle.focus();}
});
resize();sync();

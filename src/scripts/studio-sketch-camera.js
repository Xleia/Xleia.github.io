// Reproject the photographed planes from a common reference camera.
// Distances are in scene units and screen coordinates are fractions of the frame.
const stage=document.querySelector('main');
const room=stage.querySelector('.room');
const poster=room.querySelector('.poster');
const planes=[...room.querySelectorAll('[data-distance]')];
const menu=document.querySelector('details');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const target={x:0,y:0,zoom:0};
const current={...target};
const pointers=new Map();
let frame=0,previous=0,lastTap=null,ready=false;
let width,height,viewWidth,viewHeight;

function renderPlane(el,distance){
  // Zoom moves the eye forward, so nearby objects expand faster.
  const scale=(1+.14*Math.max(Math.abs(current.x),Math.abs(current.y)))*distance/(distance-current.zoom*.74);
  const limitX=Math.max(0,(width*scale-viewWidth)/2);
  const limitY=Math.max(0,(height*scale-viewHeight)/2);
  const portraitBias=viewWidth<viewHeight ? -.1*width : 0;
  const panorama=Math.max(0,(width-viewWidth)/2)*current.x;
  const x=clamp(portraitBias+panorama+current.x*.19*width/(distance-current.zoom*.74),-limitX,limitX);
  const y=clamp(current.y*.13*height/(distance-current.zoom*.74)-(scale-1)*height*.32,-limitY,limitY);
  el.style.transform='translate3d('+x+'px,'+y+'px,0) scale('+scale+')';
}
function draw(){
  if(ready) for(const el of planes) renderPlane(el,Number(el.dataset.distance));
  else renderPlane(poster,7);
}
function resize(){
  width=room.offsetWidth;height=room.offsetHeight;
  viewWidth=stage.clientWidth;viewHeight=stage.clientHeight;
  draw();
}
resize();
new ResizeObserver(resize).observe(stage);
Promise.all(planes.map(el=>el.querySelector('img').decode())).then(()=>{
  ready=true;draw();room.classList.add('ready');
}).catch(()=>{ /* Keep the complete photograph if a cutout fails to load. */ });

function tick(time){
  const ease=reduced.matches?1:1-Math.exp(-Math.min(64,time-previous)/75);
  previous=time;
  let moving=false;
  for(const key of ['x','y','zoom']){
    current[key]+=(target[key]-current[key])*ease;
    if(Math.abs(target[key]-current[key])<.0003) current[key]=target[key];
    else moving=true;
  }
  draw();frame=moving?requestAnimationFrame(tick):0;
}
function schedule(){
  if(!frame){previous=performance.now()-16;frame=requestAnimationFrame(tick);}
}
function zoom(delta){target.zoom=clamp(target.zoom+delta,0,1);schedule();}
function gap(){
  const [a,b]=pointers.values();
  return Math.hypot(a.x-b.x,a.y-b.y);
}
stage.addEventListener('pointerdown',e=>{
  if(menu.open){menu.open=false;return;}
  if(e.button!==0 || pointers.size===2)return;
  stage.focus({preventScroll:true});
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false});
  if(pointers.size===2) for(const point of pointers.values())point.moved=true;
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
  const point=pointers.get(e.pointerId);if(!point)return;
  const dx=e.clientX-point.x,dy=e.clientY-point.y;
  const pinch=pointers.size===2,oldGap=pinch?gap():0;
  point.x=e.clientX;point.y=e.clientY;
  if(Math.hypot(point.x-point.startX,point.y-point.startY)>5)point.moved=true;
  if(pinch){zoom((gap()-oldGap)/220);return;}
  target.x=clamp(target.x+dx/Math.min(width*.33,320),-1,1);
  target.y=clamp(target.y+dy/Math.min(height*.4,260),-1,1);
  schedule();
});
stage.addEventListener('pointerup',e=>{
  const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);
  if(!p||p.moved){lastTap=null;return;}
  const now=performance.now();
  if(lastTap && now-lastTap.time<360 && Math.hypot(lastTap.x-p.x,lastTap.y-p.y)<32){
    target.zoom=target.zoom>.5?0:1;schedule();lastTap=null;
  }else lastTap={time:now,x:p.x,y:p.y};
});
stage.addEventListener('lostpointercapture',e=>pointers.delete(e.pointerId));
stage.addEventListener('wheel',e=>{
  if(menu.open||e.ctrlKey)return;
  e.preventDefault();
  const units=e.deltaMode===1?16:e.deltaMode===2?viewHeight:1;
  zoom(-e.deltaY*units*.0015);
},{passive:false});
stage.addEventListener('keydown',e=>{
  if(menu.open)return;
  switch(e.key){
    case 'Home': Object.assign(target,{x:0,y:0,zoom:0});break;
    case 'ArrowLeft':target.x=clamp(target.x+.15,-1,1);break;
    case 'ArrowRight':target.x=clamp(target.x-.15,-1,1);break;
    case 'ArrowUp':target.y=clamp(target.y+.15,-1,1);break;
    case 'ArrowDown':target.y=clamp(target.y-.15,-1,1);break;
    case '+':case '=':zoom(.2);break;
    case '-':zoom(-.2);break;
    default:return;
  }
  e.preventDefault();schedule();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && menu.open){menu.open=false;menu.querySelector('summary').focus();}
});

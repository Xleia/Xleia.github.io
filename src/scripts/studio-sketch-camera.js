import {createRenderer} from './studio-sketch-renderer.js';

const stage=document.querySelector('main'),canvas=stage.querySelector('canvas');
const menu=document.querySelector('details'),motion=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=v=>Math.max(-1,Math.min(1,v));
let render=null,x=0,y=0,aimX=0,aimY=0,pointer=null,lastTap=null;
let frame=0,timer=0,previous=0,trainStart=0;
function tick(time){
  frame=0;
  if(!render||document.hidden)return;
  const k=motion.matches?1:1-Math.exp(-Math.min(64,time-previous)/75);
  previous=time;x+=(aimX-x)*k;y+=(aimY-y)*k;
  const moving=Math.abs(x-aimX)+Math.abs(y-aimY)>.0003;
  if(!moving){x=aimX;y=aimY;}
  const seconds=(time-trainStart)/1000;
  const passing=!motion.matches && seconds>=0 && seconds<5;
  render(x,y,passing?seconds*.30-.46:-2);
  if(moving||passing)frame=requestAnimationFrame(tick);
  else if(!timer&&!motion.matches){
    const delay=seconds<0?-seconds*1000:18000;
    timer=setTimeout(()=>{timer=0;trainStart=performance.now();schedule();},delay);
  }
}
function schedule(){
  if(render&&!frame&&!document.hidden){previous=performance.now()-16;frame=requestAnimationFrame(tick);}
}
function restart(){
  clearTimeout(timer);timer=0;cancelAnimationFrame(frame);frame=0;
  trainStart=performance.now()+3200;schedule();
}
async function init(){
  try{
    render=await createRenderer(canvas);
    if(render && !canvas.getContext('webgl').isContextLost()){
      render(x,y,-2);canvas.classList.add('ready');restart();
    }
  }catch{render=null;canvas.classList.remove('ready');}
}
canvas.addEventListener('webglcontextlost',e=>{
  e.preventDefault();render=null;canvas.classList.remove('ready');restart();
});
canvas.addEventListener('webglcontextrestored',init);
document.addEventListener('visibilitychange',restart);motion.addEventListener('change',restart);
new ResizeObserver(schedule).observe(stage);init();
function move(dx,dy){
  aimX=clamp(aimX+dx);aimY=clamp(aimY+dy);schedule();
}
function center(){aimX=0;aimY=0;schedule();}
stage.addEventListener('pointerdown',e=>{
  if(menu.open){menu.open=false;return;}
  if(!e.isPrimary||e.button!==0)return;
  stage.focus({preventScroll:true});pointer={id:e.pointerId,x:e.clientX,y:e.clientY,travel:0};
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
  if(pointer?.id!==e.pointerId)return;
  const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
  pointer.x=e.clientX;pointer.y=e.clientY;pointer.travel+=Math.hypot(dx,dy);
  move(-dx/Math.min(330,stage.clientWidth*.55),-dy/240);
});
stage.addEventListener('pointerup',e=>{
  if(pointer?.id!==e.pointerId)return;
  const now=performance.now();
  if(pointer.travel>6)lastTap=null;
  else if(lastTap && now-lastTap.time<340 && Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<30){center();lastTap=null;}
  else lastTap={time:now,x:e.clientX,y:e.clientY};
  pointer=null;
});
stage.addEventListener('lostpointercapture',()=>{pointer=null;});
stage.addEventListener('wheel',e=>{
  if(menu.open||e.ctrlKey||!render)return;
  e.preventDefault();
  const units=e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1;
  move((Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*units/700,0);
},{passive:false});
stage.addEventListener('keydown',e=>{
  if(menu.open)return;
  const steps={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[0,-.15],ArrowDown:[0,.15]};
  if(e.key==='Home')center();
  else if(steps[e.key])move(...steps[e.key]);
  else return;
  e.preventDefault();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}
});

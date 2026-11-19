// Project a calibrated reference photograph onto surfaces in metres.
// The entry camera is at the origin looking along +Z, with image Y pointing down.
export const WIDTH=1672, HEIGHT=941, FOCAL=1080;
const clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
const mix=(a,b,t)=>a+(b-a)*t;
function surface(file,box){
  const vertices=[];
  const [l,t,r,b]=box;
  function point([x,y,z]){
    vertices.push((x-WIDTH/2)*z/FOCAL,(y-HEIGHT/2)*z/FOCAL,z,(x-l)/(r-l),(y-t)/(b-t));
  }
  function quad(a,b,c,d){[a,b,c,a,c,d].forEach(point);}
  return {file,vertices,point,quad};
}
function grid(file,box,depth,step){
  const s=surface(file,box);
  const [l,t,r,b]=box;
  for(let y=t;y<b;y+=step)for(let x=l;x<r;x+=step){
    const right=Math.min(r,x+step),bottom=Math.min(b,y+step);
    const p=(u,v)=>[u,v,depth(u,v)];
    s.quad(p(x,y),p(right,y),p(right,bottom),p(x,bottom));
  }
  return s;
}
function room(x,y){
  // Intersect the view ray with side walls, back wall and horizontal floor.
  const back=6.4;
  const floor=6.4*260/Math.max(1,y-443);
  const side=x<836?6.4*440/Math.max(440,836-x):6.4*475/Math.max(475,x-836);
  return Math.min(back,floor,side);
}
function table(x,y){
  const desktop=clamp(780/Math.max(1,y-416),1.48,2.7);
  const sofa=clamp(2.55-(y-585)*.002,1.78,2.6);
  return mix(desktop,sofa,clamp((x-1340)/130,0,1));
}
function mug(){
  const s=surface('cup',[1133,660,1278,786]);
  // Elliptical image contours of a circular rim and tapered foot.
  const at=(a,top)=>{
    const radius=top?50.5:47;
    return [(top?1188:1186)+radius*Math.cos(a),(top?675:768)+(top?10.5:12)*Math.sin(a),
      2.22-.104*Math.sin(a)];
  };
  for(let i=0;i<64;i++){
    const a=i*Math.PI/32,b=(i+1)*Math.PI/32;
    s.quad(at(a,true),at(b,true),at(b,false),at(a,false));
    s.point([1188,675,2.22]);s.point(at(a,true));s.point(at(b,true));
  }
  return s;
}
export function buildRoom(){
  return [
    grid('far',[0,0,WIDTH,HEIGHT],room,32),
    grid('seat',[447,458,765,804],(x,y)=>3.45+.22*clamp((y-600)/180,0,1)+.10*clamp((x-560)/150,0,1),16),
    grid('table',[438,516,1672,941],table,12),
    grid('handle',[1236,686,1278,761],()=>2.23,12),mug()
  ];
}

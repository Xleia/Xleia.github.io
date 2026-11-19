// A sparse textured mesh for browsers without a WebGL context. It follows the
// same camera path; triangles crossing the near plane are clipped before projection.
import {buildRoom, WIDTH, HEIGHT, FOCAL} from './studio-sketch-geometry.js';
import {walkCamera} from './studio-sketch-renderer.js';

export async function createCanvasWalk(canvas) {
  const ctx = canvas.getContext('2d', {alpha:false});
  if (!ctx) return null;
  const textures = new Map();
  const triangles = [];
  for (const mesh of buildRoom(true,true)) {
    if (!textures.has(mesh.file)) {
      const image = new Image();
      image.src = '/studio/sketch-assets/' + mesh.file + '.webp';
      textures.set(mesh.file,image);
    }
    for(let i=0;i<mesh.vertices.length;i+=15) {
      const vertices = [0,5,10].map(k=>mesh.vertices.slice(i+k,i+k+5));
      const order = {far:0,'lamp-off':1,seat:2,edge:3,table:4,handle:5,cup:6};
      triangles.push({file:mesh.file, vertices, order:order[mesh.layer || mesh.file]});
    }
  }
  await Promise.all([...textures.values()].map(image=>image.decode()));

  return (yaw,pitch,_train,progress,dark) => {
    const w=canvas.clientWidth,h=canvas.clientHeight;
    const scale=Math.min(1,960/Math.max(1,w,h));
    const width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
    if(canvas.width!==width || canvas.height!==height){canvas.width=width;canvas.height=height;}
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle='#17151a';ctx.fillRect(0,0,width,height);
    const eye=walkCamera(progress,yaw,pitch,w<h);
    const cy=Math.cos(eye.yaw),sy=Math.sin(eye.yaw),cp=Math.cos(eye.pitch),sp=Math.sin(eye.pitch);
    const focal=FOCAL*1.16*Math.max(width/WIDTH,height/HEIGHT);
    const visible=[];
    for(const triangle of triangles) {
      if(triangle.file==='lamp-off' && !dark)continue;
      const image=textures.get(triangle.file);
      const camera=triangle.vertices.map(([x,y,z,u,v])=>{
        const dx=x-eye.x,dy=y-eye.y,dz=z-eye.z;
        const depth=sy*dx+cy*dz;
        return [cy*dx-sy*dz,cp*dy-sp*depth,sp*dy+cp*depth,u*image.width,v*image.height];
      });
      const clipped=[];
      for(let i=0;i<3;i++){
        const a=camera[i],b=camera[(i+1)%3];
        if(a[2]>=.10)clipped.push(a);
        if((a[2]>=.10)!==(b[2]>=.10)){
          const t=(.10-a[2])/(b[2]-a[2]);
          clipped.push(a.map((n,j)=>n+(b[j]-n)*t));
        }
      }
      const projected=clipped.map(([x,y,z,u,v])=>[width/2+x*focal/z,height/2+y*focal/z,z,u,v]);
      for(let i=2;i<projected.length;i++){
        const points=[projected[0],projected[i-1],projected[i]];
        if(points.every(p=>p[0]<0)||points.every(p=>p[0]>width)||points.every(p=>p[1]<0)||points.every(p=>p[1]>height))continue;
        visible.push({points,image,order:triangle.order,depth:points.reduce((n,p)=>n+p[2],0)});
      }
    }
    visible.sort((a,b)=>a.order-b.order || b.depth-a.depth);
    for(const {points,image} of visible) {
      const [a,b,c]=points;
      const du=b[3]-a[3],dv=b[4]-a[4],eu=c[3]-a[3],ev=c[4]-a[4];
      const det=du*ev-eu*dv;
      if(Math.abs(det)<.00001)continue;
      const dx=b[0]-a[0],dy=b[1]-a[1],ex=c[0]-a[0],ey=c[1]-a[1];
      const m=(dx*ev-ex*dv)/det,n=(dy*ev-ey*dv)/det;
      const r=(ex*du-dx*eu)/det,s=(ey*du-dy*eu)/det;
      ctx.save();ctx.beginPath();
      const mx=(a[0]+b[0]+c[0])/3,my=(a[1]+b[1]+c[1])/3;
      for(const [i,p] of points.entries()){
        const k=.65/Math.max(.1,Math.hypot(p[0]-mx,p[1]-my));
        const x=p[0]+(p[0]-mx)*k,y=p[1]+(p[1]-my)*k;
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.closePath();ctx.clip();
      ctx.setTransform(m,n,r,s,a[0]-m*a[3]-r*a[4],a[1]-n*a[3]-s*a[4]);
      ctx.drawImage(image,0,0);ctx.restore();
    }
  };
}

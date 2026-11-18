// Reference-camera coordinates. Positive Z points into the room.
// The desk has a sloping top, a vertical apron and a recessed knee opening.
const W = 1672, H = 941;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const ramp = (a, b, x) => clamp((x-a)/(b-a), 0, 1);
const mix = (a,b,t) => a+(b-a)*t;

function roomDepth(x, y) {
  // Keep the long vertical outlines rigid. Only the central furniture and
  // the floor immediately below it change depth relative to the back wall.
  const desk = ramp(350,480,x)*ramp(1290,1175,x);
  const nearDesk = ramp(300,490,y)*ramp(840,691,y);
  const top = mix(4.75,4.38,ramp(480,519,y));
  const recess = ramp(644,700,x)*ramp(974,926,x)*ramp(531,564,y);
  return mix(5.65,top + .39*recess,desk*nearDesk);
}

const chair = {box:[632,423,942,839], depth:(x,y) =>
  2.76 - .18*ramp(455,665,y) + .13*ramp(690,810,y) + .08*Math.min(1,Math.abs(x-777)/145)};
const screen = {box:[684,302,1015,495], depth:()=>4.42};
const room = {box:[-160,-85,W+160,H+85], depth:roomDepth};
const vertex = `
attribute vec3 position;
attribute vec2 uv;
uniform vec2 camera;
varying vec3 textureProjection;
void main(){
  float z = position.z, w = z-camera.y;
  vec2 p = (position.xy-vec2(.508,.396))*z;
  p.x += camera.x*(w/5.65-1.);
  vec2 center = vec2(.508,.396) + vec2(0.,.07*camera.y/1.75);
  vec2 projected = p + center*w;
  gl_Position = vec4(2.*projected.x-w,w-2.*projected.y,0.,w);
  textureProjection = vec3(uv*z,z);
}`;
const fragment = `
precision highp float;
varying vec3 textureProjection;
uniform sampler2D surface;
void main(){ gl_FragColor=texture2D(surface,textureProjection.xy/textureProjection.z); }`;

function mesh(surface) {
  const [l,t,r,b] = surface.box;
  const grid = (a,b,step,extra) => [...new Set([a,b,...extra.filter(x=>x>a && x<b),
    ...Array.from({length:Math.floor((b-a)/step)},(_,i)=>a+(i+1)*step)])].sort((a,b)=>a-b);
  const xs=grid(l,r,48,[442,465,471,512,652,681,935,962,1188,1204,1211,1248]);
  const ys=grid(t,b,32,[20,60,438,476,486,492,496,519,531,550,686,691,710]);
  const out=[];
  function point(x,y){out.push(x/W,y/H,surface.depth(x,y),
    surface===room ? x/W : (x-l)/(r-l),surface===room ? y/H : (y-t)/(b-t));}
  for(let j=1;j<ys.length;j++) for(let i=1;i<xs.length;i++){
    const a=xs[i-1],b=xs[i],c=ys[j-1],d=ys[j];
    point(a,c);point(b,c);point(a,d);point(a,d);point(b,c);point(b,d);
  }
  return new Float32Array(out);
}

export async function mountWorkbench(canvas,pins,onUnavailable) {
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false});
  if(!gl) return null;
  const program=gl.createProgram();
  for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
    const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program,shader); gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const surfaces=await Promise.all([[room,'room'],[screen,'monitor'],[chair,'chair']].map(async ([surface,name])=>{
    const image=new Image();image.src='/studio/workbench/'+name+'.webp';await image.decode();
    const buffer=gl.createBuffer(),data=mesh(surface);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
    for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    return {buffer,tex,count:data.length/5};
  }));
  const loc=gl.getUniformLocation(program,'camera'),pos=gl.getAttribLocation(program,'position'),uv=gl.getAttribLocation(program,'uv');
  gl.enableVertexAttribArray(pos);gl.enableVertexAttribArray(uv);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const anchors=pins.map(el=>{
    const x=parseFloat(el.style.left)/100,y=parseFloat(el.style.top)/100;
    return {el,x,y,z:el.dataset.zone==='koto'?4.42:roomDepth(x*W,y*H)};
  });
  let x=0,forward=0,targetX=0,targetForward=0,frame=0,prev=0,done=null,lost=false;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  function draw(){
    const density=Math.min(devicePixelRatio||1,1.5,2200/Math.max(canvas.clientWidth,1));
    const width=Math.max(1,Math.round(canvas.clientWidth*density)),height=Math.max(1,Math.round(canvas.clientHeight*density));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    gl.viewport(0,0,width,height);gl.uniform2f(loc,x,forward);
    for(const s of surfaces){
      gl.bindBuffer(gl.ARRAY_BUFFER,s.buffer);gl.bindTexture(gl.TEXTURE_2D,s.tex);
      gl.vertexAttribPointer(pos,3,gl.FLOAT,false,20,0);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);
      gl.drawArrays(gl.TRIANGLES,0,s.count);
    }
    for(const a of anchors){
      const w=a.z-forward;
      a.el.style.left=(.508+(a.x-.508)*a.z/w+x*(1/5.65-1/w))*100+'%';
      a.el.style.top=(.396+(a.y-.396)*a.z/w+.07*forward/1.75)*100+'%';
    }
  }
  function tick(now){
    frame=0;if(lost)return;
    const k=motion.matches ? 1 : 1-Math.exp(-Math.min(64,now-prev||16)/85);prev=now;
    x=mix(x,targetX,k);forward=mix(forward,targetForward,k);
    const settled=Math.abs(targetX-x)<.0006 && Math.abs(targetForward-forward)<.001;
    if(settled){x=targetX;forward=targetForward;}
    draw();
    if(!settled) frame=requestAnimationFrame(tick);
    else if(done){const cb=done;done=null;cb();}
  }
  function schedule(){if(!frame&&!lost){prev=performance.now()-16;frame=requestAnimationFrame(tick);}}
  const resize=new ResizeObserver(schedule);resize.observe(canvas);
  canvas.addEventListener('webglcontextlost',()=>{
    lost=true;cancelAnimationFrame(frame);resize.disconnect();canvas.hidden=true;
    for(const a of anchors){a.el.style.left=a.x*100+'%';a.el.style.top=a.y*100+'%';}
    onUnavailable();if(done){const cb=done;done=null;cb();}
  },{once:true});
  canvas.hidden=false;draw();
  return {
    pan(fraction){done=null;targetX=clamp(fraction,-1,1)*.21;targetForward=0;schedule();},
    focus(cb){done=cb;targetX=.16;targetForward=1.62;schedule();},
    reset(){done=null;targetX=0;targetForward=0;schedule();}
  };
}

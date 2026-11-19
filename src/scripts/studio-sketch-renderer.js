import { buildRoom,WIDTH,HEIGHT,FOCAL } from './studio-sketch-geometry.js';

const vertex=`
attribute vec3 point;
attribute vec2 uv;
uniform vec3 eye;
uniform vec2 angles;
uniform vec2 focal;
varying highp vec3 photo;
void main(){
  vec3 p=point-eye;
  float cy=cos(angles.x), sy=sin(angles.x), cp=cos(angles.y), sp=sin(angles.y);
  vec3 yawed=vec3(cy*p.x-sy*p.z,p.y,sy*p.x+cy*p.z);
  float z=sp*yawed.y+cp*yawed.z;
  gl_Position=vec4(yawed.x*focal.x,-(cp*yawed.y-sp*yawed.z)*focal.y,.98*z-.15,z);
  photo=vec3(uv*point.z,point.z);
}`;
const fragment=`
precision highp float;
uniform sampler2D image;
uniform float train;
varying highp vec3 photo;
void main(){
  vec2 uv=photo.xy/photo.z;
  vec4 color=texture2D(image,uv);
  if(color.a<.28) discard;
  if(train>-1. && uv.x>.679 && uv.x<.762 && uv.y>.371 && uv.y<.375){
    float wagon=(uv.x-.679)*12.-train;
    if(wagon>0. && wagon<.45 && fract(wagon*31.)>.26)
      color.rgb=mix(color.rgb,vec3(.96,.67,.35),.78);
  }
  gl_FragColor=color;
}`;
export async function createRenderer(canvas, walkMode = false){
  const gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:true});
  if(!gl)return null;
  const program=gl.createProgram();
  for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
    const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));
    gl.attachShader(program,shader);gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const meshes=await Promise.all(buildRoom(walkMode).map(async s=>{
    const img=new Image();img.src='/studio/sketch-assets/'+s.file+'.webp';await img.decode();
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
    for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);
    for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(s.vertices),gl.STATIC_DRAW);
    return {buf,tex,count:s.vertices.length/5,name:s.file};
  }));
  const p=gl.getAttribLocation(program,'point'),u=gl.getAttribLocation(program,'uv');
  gl.enableVertexAttribArray(p);gl.enableVertexAttribArray(u);gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const loc=Object.fromEntries(['eye','angles','focal','train'].map(k=>[k,gl.getUniformLocation(program,k)]));
  return (x,y,train,walk=0,dark=false)=>{
    const w=canvas.clientWidth,h=canvas.clientHeight;
    const density=Math.min(devicePixelRatio||1,1.6,2300/Math.max(w,h,1));
    const bw=Math.max(1,Math.round(w*density)),bh=Math.max(1,Math.round(h*density));
    if(canvas.width!==bw||canvas.height!==bh){canvas.width=bw;canvas.height=bh;}
    gl.viewport(0,0,bw,bh);gl.clearColor(.065,.057,.06,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const portrait=w<h, angle=x*.060, pitch=y*.022;
    const eyeX=4.0*Math.sin(angle),eyeY=y*.082;
    // A bounded arc around the working area. The focal length is fixed throughout the gesture.
    gl.uniform3f(loc.eye,eyeX,eyeY,4*(1-Math.cos(angle)));
    gl.uniform2f(loc.angles,-angle+(portrait ? .12+x*.29 : 0),-pitch);
    if(walkMode){
      // Skirt the left edge of the low table before turning back towards the window.
      const eye = walkCamera(walk,x,y,portrait);
      gl.uniform3f(loc.eye,eye.x,eye.y,eye.z);
      gl.uniform2f(loc.angles,eye.yaw,eye.pitch);
    }
    const fit=(walkMode?1.16:1.14)*Math.max(w/WIDTH,h/HEIGHT);
    gl.uniform2f(loc.focal,2*FOCAL*fit/w,2*FOCAL*fit/h);
    for(const s of meshes){
      if(s.name==='lamp-off' && !dark)continue;
      gl.uniform1f(loc.train,s.name==='far'?train:-2);
      gl.bindTexture(gl.TEXTURE_2D,s.tex);gl.bindBuffer(gl.ARRAY_BUFFER,s.buf);
      gl.vertexAttribPointer(p,3,gl.FLOAT,false,20,0);gl.vertexAttribPointer(u,2,gl.FLOAT,false,20,12);
      gl.drawArrays(gl.TRIANGLES,0,s.count);
    }
  };
}

export function walkCamera(progress, yaw, pitch, portrait) {
  const bend = Math.sin(Math.PI * progress);
  const x = 1.05 * progress * progress - .96 * bend * bend;
  const z = 3.85 * progress;
  return {x, y:-.37 * Math.sin(Math.PI * progress / 2), z,
    yaw:yaw + Math.atan2(1.45-x,6.35-z)*progress + (portrait ? .13 : 0),
    pitch:pitch + .20*Math.sin(Math.PI*Math.min(1,progress*2)) - .08*progress};
}

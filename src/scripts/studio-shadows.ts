/** Real depth-only shadow map pass for the Xleia Studio WebGL2 scene. */
export type ShadowBasis = {eye: readonly number[]; right: readonly number[]; up: readonly number[]; forward: readonly number[]};
const shadowVertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
uniform vec3 uEye, uRight, uUp, uForward;
out float vDepth;
void main() {
  vec3 rel=aPosition-uEye;
  float d=dot(rel,uForward);
  gl_Position=vec4(dot(rel,uRight)/6.0,dot(rel,uUp)/5.0,(d-9.0)/9.0,1.0);
}`;
const shadowFragment=`#version 300 es
precision highp float;
void main(){}
`;

function shader(gl:WebGL2RenderingContext,kind:number,source:string) {
  const item=gl.createShader(kind);if(!item)throw new Error('Shadow shader allocation failed');
  gl.shaderSource(item,source);gl.compileShader(item);
  if(!gl.getShaderParameter(item,gl.COMPILE_STATUS)){
    const message=gl.getShaderInfoLog(item)??'Shadow shader invalid';gl.deleteShader(item);throw new Error(message);
  }
  return item;
}

export function createShadowMap(gl:WebGL2RenderingContext,requestedSize=1024) {
  const maximum=gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  const size=Math.min(Math.max(256,Math.floor(requestedSize)),maximum);
  const texture=gl.createTexture(),framebuffer=gl.createFramebuffer(),program=gl.createProgram();
  if(!texture||!framebuffer||!program)throw new Error('Shadow map resources unavailable');
  const vert=shader(gl,gl.VERTEX_SHADER,shadowVertex),frag=shader(gl,gl.FRAGMENT_SHADER,shadowFragment);
  gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);
  gl.deleteShader(vert);gl.deleteShader(frag);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)??'Shadow program link failed');

  gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,size,size,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
  gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,texture,0);
  gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
  const status=gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindTexture(gl.TEXTURE_2D,null);
  if(status!==gl.FRAMEBUFFER_COMPLETE){
    gl.deleteTexture(texture);gl.deleteFramebuffer(framebuffer);gl.deleteProgram(program);
    throw new Error('Shadow framebuffer incomplete: '+status);
  }
  const uniforms={
    eye:gl.getUniformLocation(program,'uEye'),right:gl.getUniformLocation(program,'uRight'),
    up:gl.getUniformLocation(program,'uUp'),forward:gl.getUniformLocation(program,'uForward')
  };
  return {
    size,texture,
    render(basis:ShadowBasis,vao:WebGLVertexArrayObject,count:number){
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
      gl.viewport(0,0,size,size);
      gl.clearDepth(1);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.colorMask(false,false,false,false);
      gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.5,3.5);
      gl.useProgram(program);gl.bindVertexArray(vao);
      gl.uniform3fv(uniforms.eye,basis.eye);gl.uniform3fv(uniforms.right,basis.right);
      gl.uniform3fv(uniforms.up,basis.up);gl.uniform3fv(uniforms.forward,basis.forward);
      gl.drawArrays(gl.TRIANGLES,0,count);
      gl.disable(gl.POLYGON_OFFSET_FILL);
      gl.colorMask(true,true,true,true);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    },
    dispose(){
      gl.deleteTexture(texture);gl.deleteFramebuffer(framebuffer);gl.deleteProgram(program);
    }
  };
}

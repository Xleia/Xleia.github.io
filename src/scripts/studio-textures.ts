/** Same-origin studio texture loader. Falls back to neutral 1x1 texture. */
export function loadStudioTexture(gl:WebGL2RenderingContext,url:string,onReady:()=>void) {
  const tex=gl.createTexture();
  if(!tex)throw new Error('Studio texture allocation failed');
  gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([188,188,188,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  const image=new Image();
  image.onload=()=>{
    gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,0);
    onReady();
  };
  image.onerror=()=>{console.warn('Studio texture unavailable:',url);onReady();};
  image.src=url;
  return tex;
}

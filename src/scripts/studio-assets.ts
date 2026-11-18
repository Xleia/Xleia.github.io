/** Xleia Studio's strict, same-origin glTF 2.0 subset loader.
 * Supports embedded buffers, non-indexed FLOAT VEC3 triangles, material factors,
 * per-node translation/scale/quaternion rotation, and reusable mesh instances.
 * Unsupported glTF extensions fail closed, leaving in-scene fallback geometry.
 */
import type { Vec3 } from '../data/studio';

export type AssetVertex = {
  position: Vec3;
  normal: Vec3;
  albedo: [number,number,number];
  emissive: number;
  kind: number;
  metallic: number;
  roughness: number;
};
type Accessor = { bufferView:number; byteOffset?:number; componentType:number; count:number; type:string };
type BufferView = { buffer:number; byteOffset?:number; byteStride?:number };
type Primitive = { attributes:{POSITION:number;NORMAL:number}; material?:number; mode?:number; indices?:number };
type Node = {mesh?:number; translation?:number[]; scale?:number[]; rotation?:number[]; children?:number[]};
type Material = {
  name?:string; extras?:{studioKind?:number};
  pbrMetallicRoughness?:{baseColorFactor?:number[];metallicFactor?:number;roughnessFactor?:number};
  emissiveFactor?:number[];
};
type Document = {
  asset:{version:string};
  buffers:Array<{uri:string;byteLength:number}>;
  bufferViews:BufferView[];
  accessors:Accessor[];
  meshes:Array<{primitives:Primitive[]}>;
  nodes:Node[];
  materials?:Material[];
  extensionsRequired?:string[];
};
const MAX_BYTES=3_000_000;
const MAX_VERTICES=120_000;
const finite=(arr:number[],length:number)=>arr.length===length&&arr.every(Number.isFinite);
const vec3=(p:number[]):Vec3=>[p[0],p[1],p[2]];
const rotate=(v:Vec3,q:number[]):Vec3=>{
  const [x,y,z,w]=q;
  const uv:Vec3=[y*v[2]-z*v[1],z*v[0]-x*v[2],x*v[1]-y*v[0]];
  const uuv:Vec3=[y*uv[2]-z*uv[1],z*uv[0]-x*uv[2],x*uv[1]-y*uv[0]];
  return [v[0]+2*(uv[0]*w+uuv[0]),v[1]+2*(uv[1]*w+uuv[1]),v[2]+2*(uv[2]*w+uuv[2])];
};
const normalize=(p:Vec3):Vec3=>{
  const length=Math.hypot(...p)||1;
  return [p[0]/length,p[1]/length,p[2]/length];
};

export async function loadStudioModel(url:string):Promise<AssetVertex[]>{
  if(!url.startsWith('/models/studio/')||!url.endsWith('.gltf')||url.includes('..'))
    throw new Error('Only reviewed local Studio glTF assets are permitted');
  const response=await fetch(url,{cache:'force-cache'});
  if(!response.ok)throw new Error('Studio model HTTP '+response.status);
  const document=await response.json() as Document;
  if(document.asset?.version!=='2.0'||document.buffers?.length!==1||document.extensionsRequired?.length)
    throw new Error('Unsupported glTF version or extension');
  if(document.nodes?.length>512||document.meshes?.length>256)throw new Error('Studio model complexity budget exceeded');
  const bufferInfo=document.buffers[0];
  if(!Number.isSafeInteger(bufferInfo.byteLength)||bufferInfo.byteLength>MAX_BYTES)
    throw new Error('Invalid glTF buffer budget');
  const encoded=bufferInfo.uri;
  if(!encoded?.startsWith('data:application/octet-stream;base64,'))
    throw new Error('Only embedded glTF buffers permitted');
  const decoded=atob(encoded.slice(encoded.indexOf(',')+1));
  if(decoded.length!==bufferInfo.byteLength)throw new Error('Invalid embedded glTF buffer');
  const bytes=new Uint8Array(decoded.length);
  for(let i=0;i<decoded.length;i++)bytes[i]=decoded.charCodeAt(i);
  const binary=new DataView(bytes.buffer);
  const read=(index:number):Vec3[]=>{
    const acc=document.accessors?.[index],view=document.bufferViews?.[acc?.bufferView];
    if(!acc||!view||view.buffer!==0||acc.componentType!==5126||acc.type!=='VEC3'||
       !Number.isSafeInteger(acc.count)||acc.count<=0||acc.count>MAX_VERTICES)
      throw new Error('Unsupported glTF accessor');
    const stride=view.byteStride??12,offset=(view.byteOffset??0)+(acc.byteOffset??0);
    if(stride<12||!Number.isSafeInteger(offset)||offset<0||
       offset+(acc.count-1)*stride+12>binary.byteLength)
      throw new Error('glTF accessor outside buffer');
    return Array.from({length:acc.count},(_,i)=>{
      const p=offset+i*stride;
      return [binary.getFloat32(p,true),binary.getFloat32(p+4,true),binary.getFloat32(p+8,true)];
    });
  };
  const vertices:AssetVertex[]=[];
  for(const node of document.nodes){
    if(node.children?.length)throw new Error('Nested glTF transforms not yet supported');
    if(node.mesh===undefined)continue;
    const mesh=document.meshes[node.mesh];
    if(!mesh)throw new Error('Invalid glTF mesh index');
    const translation=node.translation??[0,0,0],scale=node.scale??[1,1,1],rotation=node.rotation??[0,0,0,1];
    if(!finite(translation,3)||!finite(scale,3)||!finite(rotation,4)||
       scale.some(n=>n<=0||n>50))throw new Error('Invalid glTF node transform');
    const quatLen=Math.hypot(...rotation);
    if(quatLen<0.0001)throw new Error('Invalid glTF rotation');
    const q=rotation.map(v=>v/quatLen);
    for(const primitive of mesh.primitives){
      if((primitive.mode??4)!==4||primitive.indices!==undefined)
        throw new Error('Only non-indexed triangle primitives supported');
      const positions=read(primitive.attributes.POSITION),normals=read(primitive.attributes.NORMAL);
      if(positions.length!==normals.length||positions.length%3)
        throw new Error('Invalid glTF position/normal count');
      const material=document.materials?.[primitive.material??0];
      const color=material?.pbrMetallicRoughness?.baseColorFactor??[1,1,1,1];
      const emissive=material?.emissiveFactor??[0,0,0];
      const metallic=material?.pbrMetallicRoughness?.metallicFactor??0;
      const roughness=material?.pbrMetallicRoughness?.roughnessFactor??1;
      if(!Number.isFinite(metallic)||metallic<0||metallic>1||
         !Number.isFinite(roughness)||roughness<0||roughness>1)
        throw new Error('Invalid glTF PBR material factors');
      const tagged=material?.extras?.studioKind;
      const kind=Number.isInteger(tagged)&&tagged!>=0&&tagged!<=4?tagged!:
        emissive.some(v=>v>.15)?4:metallic>.5?2:0;
      if(color.length!==4||!color.every(Number.isFinite)||!emissive.every(Number.isFinite))
        throw new Error('Invalid glTF material');
      for(let i=0;i<positions.length;i++){
        const p=positions[i],n=normals[i];
        const local:Vec3=[p[0]*scale[0],p[1]*scale[1],p[2]*scale[2]];
        const normal=normalize(rotate([n[0]/scale[0],n[1]/scale[1],n[2]/scale[2]],q));
        const rotated=rotate(local,q);
        const position=vec3(rotated.map((v,j)=>v+translation[j]));
        if([...position,...normal].some(v=>!Number.isFinite(v)))throw new Error('Nonfinite glTF geometry');
        vertices.push({position,normal,albedo:[color[0],color[1],color[2]],emissive:Math.max(...emissive),kind,metallic,roughness});
      }
      if(vertices.length>MAX_VERTICES)throw new Error('Studio model vertex budget exceeded');
    }
  }
  if(!vertices.length)throw new Error('Empty glTF geometry');
  return vertices;
}

/** Backward-compatible V0.4 API. */
export const loadStudioLamp=loadStudioModel;

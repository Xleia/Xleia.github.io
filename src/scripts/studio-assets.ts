/** Minimal, strict glTF 2.0 loader for the bundled V0.4 lamp.
 * Only supports embedded binary data, triangle primitives, FLOAT VEC3 positions/normals,
 * node translations and simple metallic-roughness material factors.
 * This is not a generic glTF/GLB engine; unsupported formats throw and fall back to built-in geometry.
 */
import type { Vec3 } from '../data/studio';

export type AssetVertex = { position: Vec3; normal: Vec3; albedo: [number,number,number]; emissive: number; kind: number };
type GltfAccessor = { bufferView: number; byteOffset?: number; componentType: number; count: number; type: string };
type GltfBufferView = { buffer: number; byteOffset?: number; byteStride?: number };
type GltfPrimitive = { attributes: {POSITION:number; NORMAL:number}; material?: number; mode?: number };
type GltfDoc = {
  asset: { version: string };
  buffers: Array<{ uri: string; byteLength: number }>;
  bufferViews: GltfBufferView[];
  accessors: GltfAccessor[];
  meshes: Array<{ primitives: GltfPrimitive[] }>;
  nodes: Array<{ mesh?: number; translation?: number[] }>;
  materials?: Array<{pbrMetallicRoughness?:{baseColorFactor?:number[];metallicFactor?:number;roughnessFactor?:number};emissiveFactor?:number[]}>;
};
const v3 = (x:number,y:number,z:number):Vec3=>[x,y,z];
const limit = 150000; // max imported vertices; protect the interactive website
export async function loadStudioLamp(url:string):Promise<AssetVertex[]>{
  const response=await fetch(url,{cache:'force-cache'});
  if(!response.ok) throw new Error('Studio model HTTP '+response.status);
  const document=await response.json() as GltfDoc;
  if(document.asset?.version!=='2.0'||document.buffers?.length!==1)throw new Error('Unsupported glTF');
  const encoded=document.buffers[0]?.uri;
  if(!encoded?.startsWith('data:application/octet-stream;base64,'))throw new Error('External glTF buffer not permitted');
  const data=atob(encoded.split(',')[1]);
  if(data.length!==document.buffers[0].byteLength || data.length>5_000_000)throw new Error('Invalid glTF buffer');
  const buffer=new ArrayBuffer(data.length),bytes=new Uint8Array(buffer);
  for(let i=0;i<data.length;i++)bytes[i]=data.charCodeAt(i);
  const dv=new DataView(buffer);
  const read=(id:number):Vec3[]=>{
    const acc=document.accessors[id],view=document.bufferViews[acc?.bufferView];
    if(!acc||!view||view.buffer!==0||acc.componentType!==5126||acc.type!=='VEC3'||!Number.isSafeInteger(acc.count)||acc.count>limit)throw new Error('Unsupported glTF accessor');
    const step=view.byteStride??12,offset=(view.byteOffset??0)+(acc.byteOffset??0);
    if(step<12||offset<0||offset+(acc.count-1)*step+12>buffer.byteLength)throw new Error('Malformed glTF accessor bounds');
    return Array.from({length:acc.count},(_,i)=>{
      const p=offset+i*step;
      return v3(dv.getFloat32(p,true),dv.getFloat32(p+4,true),dv.getFloat32(p+8,true));
    });
  };
  const vertices:AssetVertex[]=[];
  for(const node of document.nodes){
    if(node.mesh===undefined)continue;
    const mesh=document.meshes[node.mesh];if(!mesh)throw new Error('Unknown glTF mesh');
    const t=node.translation??[0,0,0];
    if(t.length!==3||t.some(n=>!Number.isFinite(n)))throw new Error('Unsupported glTF transform');
    for(const primitive of mesh.primitives){
      if((primitive.mode??4)!==4)throw new Error('Only glTF triangles supported');
      const positions=read(primitive.attributes.POSITION),normals=read(primitive.attributes.NORMAL);
      if(positions.length!==normals.length||positions.length%3)throw new Error('Invalid glTF primitive');
      const material=document.materials?.[primitive.material??0];
      const pbr=material?.pbrMetallicRoughness, color=pbr?.baseColorFactor??[1,1,1,1];
      const metal=pbr?.metallicFactor??0,emissive=material?.emissiveFactor??[0,0,0];
      const kind=emissive.some(v=>v>.15)?4:metal>.5?2:0;
      for(let i=0;i<positions.length;i++){
        const pos=positions[i],n=normals[i];
        const position=v3(pos[0]+t[0],pos[1]+t[1],pos[2]+t[2]);
        if([...position,...n].some(v=>!Number.isFinite(v)))throw new Error('Invalid glTF geometry');
        vertices.push({position,normal:n,albedo:[color[0],color[1],color[2]],emissive:Math.max(...emissive),kind});
      }
      if(vertices.length>limit)throw new Error('Studio glTF vertex budget exceeded');
    }
  }
  if(vertices.length===0)throw new Error('Empty glTF');
  return vertices;
}

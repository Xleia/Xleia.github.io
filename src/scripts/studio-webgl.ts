import { STUDIO_ZONES, type StudioZone, type Vec3 } from '../data/studio';

// V0.3: richer hand-built geometry, material response and warm/cool lighting; no CDN or extra runtime dependency.
type Camera = { target: [number, number, number]; azimuth: number; elevation: number; distance: number };
const HOME: Camera = { target: [0, 1.23, -.28], azimuth: .34, elevation: .28, distance: 12.6 };
const TAU = Math.PI * 2;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const rgb = (hex: string): [number,number,number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
};
const palette = {
  floor: '#6a4a34', plank: '#755038', wall: '#263249', left: '#1b283c', wood: '#825b3b', woodDark: '#553a2d',
  bezel: '#1a2536', screen: '#205078', keyboard: '#293949', metal: '#657789', cyan: '#62b6dc', gold: '#e7af72',
  darkBlue: '#102139', paper: '#d4c6a4', green: '#3a6953', slate: '#536574', navy: '#26384d', rug: '#344156',
};

// Interleaved per-vertex data: xyz position, xyz normal, rgb albedo, emissive strength, material kind.
const vertices: number[] = [];
const addTri = (a: Vec3,b: Vec3,c: Vec3,normal: Vec3,col: string,emissive=0,kind=0) => {
  const color = rgb(col);
  for (const p of [a,b,c]) vertices.push(...p,...normal,...color,emissive,kind);
};
function quad(a: Vec3,b: Vec3,c: Vec3,d: Vec3,n: Vec3,col: string,emit=0,kind=0) {
  addTri(a,b,c,n,col,emit,kind); addTri(a,c,d,n,col,emit,kind);
}
function box(x:number,y:number,z:number,w:number,h:number,d:number,col:string,emit=0,kind=0) {
  const x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;
  quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1],col,emit,kind);
  quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[0,0,-1],col,emit,kind);
  quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0],col,emit,kind);
  quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[1,0,0],col,emit,kind);
  quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,1,0],col,emit,kind);
  quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],col,emit,kind);
}
function cylinder(x:number,y:number,z:number,rad:number,height:number,col:string,emit=0,segments=12) {
  for(let i=0;i<segments;i++){
    const a=i/segments*TAU,b=(i+1)/segments*TAU;
    const n:Vec3=[Math.cos((a+b)/2),0,Math.sin((a+b)/2)];
    const p0:Vec3=[x+rad*Math.cos(a),y-height/2,z+rad*Math.sin(a)];
    const p1:Vec3=[x+rad*Math.cos(b),y-height/2,z+rad*Math.sin(b)];
    const p2:Vec3=[p1[0],y+height/2,p1[2]];
    const p3:Vec3=[p0[0],y+height/2,p0[2]];
    quad(p0,p1,p2,p3,n,col,emit);
    addTri([x,y+height/2,z],p3,p2,[0,1,0],col,emit);
  }
}

/** Tapered cylinders and low-poly ellipsoids make the V0.3 furniture less box-like. */
function tapered(x:number,y:number,z:number,bottom:number,top:number,height:number,col:string,emit=0,kind=0,segments=14) {
  for(let i=0;i<segments;i++){
    const a=i*TAU/segments,b=(i+1)*TAU/segments;
    const pa:Vec3=[x+bottom*Math.cos(a),y-height/2,z+bottom*Math.sin(a)];
    const pb:Vec3=[x+bottom*Math.cos(b),y-height/2,z+bottom*Math.sin(b)];
    const pc:Vec3=[x+top*Math.cos(b),y+height/2,z+top*Math.sin(b)];
    const pd:Vec3=[x+top*Math.cos(a),y+height/2,z+top*Math.sin(a)];
    const angle=(a+b)/2, slope=(bottom-top)/height;
    const normal:Vec3=[Math.cos(angle),slope,Math.sin(angle)];
    quad(pa,pb,pc,pd,normal,col,emit,kind);
    addTri([x,y+height/2,z],pd,pc,[0,1,0],col,emit,kind);
  }
}
function ellipsoid(x:number,y:number,z:number,rx:number,ry:number,rz:number,col:string,emit=0,kind=0) {
  const rings=7,segments=12;
  const pt=(a:number,b:number):Vec3=>[x+rx*Math.sin(a)*Math.cos(b),y+ry*Math.cos(a),z+rz*Math.sin(a)*Math.sin(b)];
  for(let j=0;j<rings;j++){
    const a=j*Math.PI/rings,b=(j+1)*Math.PI/rings;
    for(let i=0;i<segments;i++){
      const c=i*TAU/segments,d=(i+1)*TAU/segments;
      const p=pt(a,c),q=pt(a,d),r=pt(b,d),u=pt(b,c);
      const n:Vec3=[Math.sin((a+b)/2)*Math.cos((c+d)/2),Math.cos((a+b)/2),Math.sin((a+b)/2)*Math.sin((c+d)/2)];
      quad(p,q,r,u,n,col,emit,kind);
    }
  }
}

function buildScene(){
  const {floor,plank,wall,left,wood,woodDark,bezel,screen,keyboard,metal,cyan,gold,darkBlue,paper,green,slate,rug}=palette;
  // Architectural shell: floorboards, warm/cool wall surfaces and a large nighttime window.
  box(0,-.17,0,8.7,.26,6.8,floor,0,1);
  for(let i=0;i<17;i++)box(0,-.019,-3.12+i*.389,8.4,.013,.375,i%4===0?'#79543a':plank,0,1);
  box(0,1.79,-3.36,8.7,3.85,.19,wall);
  box(-4.32,1.79,0,.18,3.85,6.8,left);
  box(.45,2.22,-3.236,4.03,1.9,.045,darkBlue,.13);
  // Skyline silhouettes and luminous windows (intentionally abstract, not a location claim).
  for(let i=0;i<17;i++){
    const x=-1.41+i*.226;
    const ht=.27+.75*(.5+.5*Math.sin(i*1.9));
    box(x,1.31+ht/2,-3.203,.192,ht,.02,i%3===0?'#162a43':'#1d3148');
    for(let j=0;j<5;j++){
      const py=1.49+j*.16;
      if(py<1.31+ht && Math.sin(i*5+j*7)>.0) box(x-.05,py,-3.175,.025,.043,.015,j%2===0?'#e6b888':'#80afd5',.93);
    }
  }
  for(const x of [-1.56,.39,2.47]) box(x,2.2,-3.11,.075,1.98,.13,metal);
  for(const y of [1.29,2.21,3.14])box(.45,y,-3.11,4.09,.075,.13,metal);
  // Tall left bookshelf, occupied with differently sized books and trailing plants.
  for(const x of [-3.98,-2.52])box(x,1.45,-2.34,.13,2.9,.92,woodDark);
  for(const y of [.15,.69,1.24,1.8,2.35,2.78])box(-3.25,y,-2.34,1.62,.082,.97,wood);
  const spines=['#8b5a45','#486d80','#a88a5c','#59634d','#546981','#a46b5a','#71546d'];
  for(let r=0;r<4;r++)for(let i=0;i<12;i++){
    const height=.32+.14*(.5+.5*Math.sin(i*2.9+r*2));
    box(-3.89+i*.118,.22+r*.555+height/2,-1.95,.09,height,.47,spines[(i+r*2)%spines.length]);
    if(i%4===0)box(-3.89+i*.118,.22+r*.555+height*.78,-1.695,.075,.015,.015,gold,.3);
  }
  // Main walnut desk, brass accents, KOTO monitor and actual layered glowing screen.
  box(0,.81,-.72,3.57,.14,1.6,wood,0,1);
  for(const x of [-1.55,1.55])for(const z of [-1.3,-.19])box(x,.39,z,.135,.78,.15,woodDark,0,1);
  box(0,1.65,-1.05,1.85,1.12,.13,bezel);
  box(0,1.65,-.971,1.7,.96,.02,screen,1.03);
  box(0,1.32,-.952,1.52,.22,.014,'#173652',.51);
  for(let i=0;i<36;i++){
    const x=-.77+i*.043;const y=1.68+.115*Math.sin(i*.41)+.06*Math.sin(i*.9);
    box(x,y,-.952,.023,.027,.013,'#a0d9e9',.87);
  }
  box(0,1.004,-1.045,.095,.27,.11,metal);box(0,.899,-1.025,.64,.03,.33,bezel);
  box(0,.91,-.17,1.0,.045,.34,keyboard);
  for(let r=0;r<4;r++)for(let i=0;i<15;i++)box(-.43+i*.062,.941,-.299+r*.075,.041,.008,.039,'#8794a5');
  box(1.04,.92,-.20,.13,.05,.22,slate);
  cylinder(-1.12,1.25,-1.11,.044,.68,metal); cylinder(-1.12,.94,-1.11,.19,.12,metal);
  cylinder(-1.12,1.61,-1.11,.28,.19,gold,.88);
  cylinder(-.94,.98,-.36,.09,.18,paper);box(-.65,.89,-.33,.40,.015,.28,'#dbbb8a');
  // Chair with cushion, mechanical base and a rug (separate from the workbench).
  box(.04,.06,1.24,3.98,.035,2.27,rug);
  box(.04,.49,.82,1.06,.20,.93,slate); box(.04,1.03,1.17,1.06,1.12,.20,'#445365');
  cylinder(.04,.23,.9,.065,.55,metal);
  for(const a of [0,1,2,3,4]){
    const ang=a*TAU/5;
    box(.04+Math.cos(ang)*.25,.11,.9+Math.sin(ang)*.25,.36,.05,.08,bezel);
  }
  // Phone display with bright gym UI color blocks; not a screenshot or download link.
  box(2.14,.67,.51,.87,1.13,.76,woodDark,0,1); box(2.14,1.26,.51,1.0,.095,.82,wood,0,1);
  box(2.14,1.64,.65,.47,.77,.09,bezel);box(2.14,1.65,.707,.38,.65,.017,'#256c87',.65);
  box(2.14,1.76,.722,.29,.10,.006,'#64c4d4',.84);
  for(let i=0;i<3;i++)box(2.14,1.62-i*.11,.722,.24,.027,.008,'#96d6e0',.75);
  box(2.14,1.26,.57,.28,.055,.25,metal);
  // Lab workshop, equipment, translucent-inspired cyan emissive cores.
  box(3.16,.85,-1.97,1.75,.12,1.08,wood,0,1);
  for(const x of [2.46,3.87])box(x,.40,-2.05,.13,.86,.15,bezel);
  box(2.98,1.5,-2.43,.75,.72,.11,bezel);box(2.98,1.52,-2.359,.65,.58,.025,'#215274',.87);
  for(let i=0;i<6;i++)box(2.75+i*.08,1.37+.035*Math.sin(i),-2.338,.042,.09,.018,cyan,.72);
  box(3.66,1.10,-2.16,.48,.45,.5,'#3e4e67');cylinder(3.66,1.36,-2.16,.125,.2,cyan,.9);
  box(3.36,2.10,-2.88,1.35,.09,.55,woodDark);box(2.99,2.25,-2.8,.22,.24,.2,paper);
  box(3.37,2.25,-2.8,.21,.24,.2,'#59758a');
  // Personal corner: fabric sofa, plant, pinboard, framed art and small lamps.
  box(-2.84,.37,1.7,1.73,.50,.96,'#455969');box(-2.84,.78,2.10,1.72,.87,.21,'#34475a');
  for(const x of [-3.58,-2.1])box(x,.62,1.7,.2,.52,.94,'#3d5062');
  box(-2.58,.68,1.44,.54,.15,.48,'#847766');
  box(-3.01,1.93,-3.16,.88,.66,.055,'#9b7956');box(-3.01,1.93,-3.115,.60,.38,.02,paper);
  cylinder(-3.85,.44,.57,.18,.57,woodDark);cylinder(-3.85,.83,.57,.10,.33,green);
  for(let i=0;i<7;i++){
    const a=i*TAU/7;
    box(-3.85+Math.cos(a)*.22,1.08+Math.sin(a*2)*.07,.57+Math.sin(a)*.17,.27,.055,.16,'#407c60');
  }
  // Lighting accents to make the scene feel occupied at night.
  box(-1.2,.884,-1.09,.62,.005,.56,'#d6a071',.20);
  box(3.47,.90,-2.07,.5,.005,.46,'#497a9a',.31);

  // V0.3 joinery: layered walnut edge, inset drawers, brass handles and desk cable raceway.
  box(0,.715,-.70,3.49,.050,1.51,'#3b291f',0,1);
  box(0,.875,-.70,3.50,.024,1.55,'#a5764e',0,1);
  for(const x of [-.82,.82]){
    box(x,.55,.06,1.28,.31,.052,'#63422e',0,1);
    box(x,.55,.096,.43,.027,.026,'#c2a076',.11,2);
  }
  box(0,.53,-1.45,2.65,.09,.07,'#2c313c',0,2);
  for(const x of [-1.52,1.52])for(const z of [-1.26,-.20])
    box(x,.08,z,.19,.062,.19,'#222b33',0,2);

  // Peripherals: rounded speakers, headphones, coaster, ceramic cup and layered notes.
  for(const x of [-.98,1.18]) {
    box(x,1.038,-1.035,.27,.38,.28,'#1c2733',0,2);
    cylinder(x,1.075,-.873,.105,.029,'#344b60',0,18);
    cylinder(x,1.075,-.851,.065,.01,'#121e2b',0,18);
  }
  box(-.96,.895,-.37,.27,.016,.27,'#926b4c',0,1);
  cylinder(-.96,.995,-.37,.086,.15,'#e5d5bb',0,18);
  cylinder(-.96,1.073,-.37,.065,.018,'#483022',0,18);
  for(let i=0;i<4;i++)box(-.53+i*.004,.884+i*.006,-.36,.33,.007,.23,
    i%2?'#ccb392':'#ecdbbb',0,3);
  for(let i=0;i<13;i++) {
    const a=Math.PI*(i/12);
    ellipsoid(1.50+Math.cos(a)*.20,1.12+Math.sin(a)*.34,-1.11,.033,.035,.045,'#222e3c',0,2);
  }
  box(1.35,.89,-1.08,.14,.045,.15,'#304252',0,2);

  // Desk lamp: flared brass shade, softer translucent-inspired lower diffuser.
  tapered(-1.12,1.62,-1.11,.29,.12,.22,'#cb9961',.20,2,20);
  tapered(-1.12,1.49,-1.11,.23,.18,.045,'#fff1c7',.64,4,20);
  cylinder(-1.12,1.67,-1.11,.073,.055,'#efe0c2',.27,2,16);
  // Monitor: header, accent framing, subtitle rails and live waveform markers.
  box(0,2.205,-.962,1.68,.018,.022,'#65879b',.12,2);
  box(0,1.51,-.949,1.37,.022,.015,'#29627b',.23,2);
  for(let i=0;i<5;i++) box(-.56+i*.27,1.35,-.936,.18,.019,.015,
    i%2===0?'#5794b2':'#3b6c92',.42);
  ellipsoid(.67,1.97,-.944,.035,.035,.012,'#78dfd5',.92,4);

  // Bookcase carpentry, labels, book stacks and one trailing plant.
  box(-3.26,.10,-1.92,1.58,.09,.95,'#3d2d26',0,1);
  for(const level of [0,1,2,3])for(const i of [1,4,8,10]) {
    const x=-3.89+i*.118;
    box(x,.34+level*.555,-1.696,.075,.022,.019,'#d2bb89',.10,2);
  }
  for(let i=0;i<4;i++){
    box(-3.77+i*.042,2.55+i*.017,-1.90,.46,.032,.32,
      ['#4b6672','#9d735b','#a89976','#53634d'][i],0,3);
  }
  tapered(-2.72,2.52,-1.94,.15,.23,.24,'#796650',0,1);
  for(let i=0;i<9;i++){
    const a=i*TAU/9;
    ellipsoid(-2.72+Math.cos(a)*.20,2.76+Math.sin(a*2)*.09,-1.94+Math.sin(a)*.16,
      .12,.17,.09,'#426d55',0,3);
  }

  // Window depth, sill, mullions, external lights and a subtle warm light strip.
  box(.45,1.225,-3.05,4.20,.095,.25,'#283747',0,2);
  box(.45,3.20,-3.12,4.23,.12,.21,'#394a5b',0,2);
  for(let i=0;i<7;i++){
    const x=-1.18+i*.53;
    box(x,2.95,-3.13,.025,.08,.008,i%2===0?'#f2c68e':'#a0b5cd',.68,4);
  }
  box(-.65,3.45,-3.17,2.2,.035,.07,'#d3a06a',.37,2);
  for(const x of [-1.72,2.59])box(x,2.20,-3.09,.14,2.05,.18,'#334257',0,3);

  // Lab surface: mini server rack, circuit-board traces, instrument keys, glass tubes.
  box(3.20,.925,-1.93,1.34,.025,.83,'#374b59',0,2);
  box(3.75,1.28,-1.76,.29,.61,.28,'#1f2b37',0,2);
  for(let i=0;i<4;i++)box(3.75,1.07+i*.12,-1.602,.18,.018,.013,
    i%2===0?'#6cc4c7':'#658ca5',.55,4);
  for(let i=0;i<4;i++){
    const x=2.69+i*.25;
    box(x,1.01,-1.76,.14,.018,.23,'#396d6b',.23,2);
    box(x,1.03,-1.70,.045,.012,.025,'#bcdfba',.49,4);
  }
  tapered(3.44,1.31,-2.14,.095,.075,.38,'#7fa4b3',.10,4,16);
  ellipsoid(3.44,1.50,-2.14,.10,.09,.10,'#5acbce',.75,4);
  for(let i=0;i<3;i++) box(2.83+i*.12,1.62,-2.324,.075,.017,.019,'#b7e1ef',.66,4);

  // Train Libre phone: screen hierarchy, slim stand and tiny activity indicator.
  box(2.14,1.64,.727,.37,.65,.009,'#1e475e',.45,4);
  box(2.14,1.87,.738,.27,.061,.009,'#78bfd2',.72,4);
  for(let i=0;i<4;i++)box(2.04+i*.069,1.65+(i%2)*.040,.737,.050,.075+(i%2)*.08,.008,
    i===2?'#7abf9a':'#4d9ab2',.56,4);
  box(2.14,1.42,.738,.25,.014,.008,'#8bc1c2',.65,4);

  // About corner: sofa cushions, stitched seams, framed paper and a small floor lamp.
  for(const x of [-3.20,-2.49])ellipsoid(x,.68,1.53,.31,.14,.32,'#75858c',0,3);
  for(const x of [-3.46,-2.24])box(x,.65,1.69,.035,.36,.70,'#263747',0,3);
  box(-2.99,1.93,-3.087,.62,.42,.02,'#685d50',0,1);
  box(-2.99,1.95,-3.071,.39,.013,.009,'#b9d4cf',.18,4);
  for(let i=0;i<4;i++)box(-3.14+i*.09,1.82,-3.07,.045,.045,.009,'#bba27d',.11,3);
  tapered(-3.82,.65,.57,.22,.15,.25,'#81634e',0,1);
  for(let i=0;i<10;i++){
    const a=i*TAU/10;
    ellipsoid(-3.83+Math.cos(a)*.20,1.16+Math.sin(i*2.9)*.13,.57+Math.sin(a)*.18,
      .115,.17,.075,i%3?'#457859':'#638d65',0,3);
  }

}
buildScene();

const vert = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aColor;
layout(location=3) in float aEmissive;
layout(location=4) in float aMaterial;
uniform vec3 uEye; uniform vec3 uRight; uniform vec3 uUp; uniform vec3 uForward;
uniform float uFocal; uniform float uAspect;
out vec3 vWorld; out vec3 vNormal; out vec3 vColor; out float vEmit; out float vMaterial; out float vDistance;
void main(){
  vec3 rel=aPosition-uEye;
  float d=dot(rel,uForward);
  gl_Position=vec4(dot(rel,uRight)*uFocal/uAspect, dot(rel,uUp)*uFocal, (d*500.05-50.0)/499.95, d);
  vWorld=aPosition; vNormal=aNormal; vColor=aColor; vEmit=aEmissive; vMaterial=aMaterial; vDistance=d;
}`;
const frag = `#version 300 es
precision highp float;
in vec3 vWorld; in vec3 vNormal; in vec3 vColor; in float vEmit; in float vMaterial; in float vDistance;
uniform vec3 uEye;
out vec4 outputColor;
void main(){
  vec3 N=normalize(vNormal);
  vec3 L1=vec3(-1.12,1.62,-1.11)-vWorld;
  vec3 L2=vec3(.0,1.72,-.91)-vWorld;
  vec3 L3=vec3(3.65,1.37,-2.15)-vWorld;
  float warm=max(dot(N,normalize(L1)),0.0)*5.8/(2.6+dot(L1,L1));
  float screen=max(dot(N,normalize(L2)),0.0)*2.4/(2.0+dot(L2,L2));
  float lab=max(dot(N,normalize(L3)),0.0)*1.9/(1.6+dot(L3,L3));
  vec3 ambient=mix(vec3(.20,.25,.34),vec3(.42,.43,.46), clamp(N.y*.5+.5,0.0,1.0));
  vec3 diffuse=ambient + warm*vec3(1.02,.70,.44)+screen*vec3(.32,.59,1.05)+lab*vec3(.36,.85,1.06);
  vec3 c=vColor*diffuse;
  float roughness=.88;
  if(vMaterial>.5 && vMaterial<1.5) {
    // Walnut grain is deliberately restrained; avoid a flat repeating stripe.
    float grain=sin(vWorld.z*63.0+sin(vWorld.x*8.7)*1.9)
               +.38*sin(vWorld.z*114.0+vWorld.x*5.2);
    c*=.94+.055*grain;
    roughness=.69;
  } else if(vMaterial>1.5 && vMaterial<2.5) {
    roughness=.30;
  } else if(vMaterial>2.5 && vMaterial<3.5) {
    float weave=.96+.027*sin(vWorld.x*150.0)*sin(vWorld.z*140.0);
    c*=weave;roughness=.96;
  } else if(vMaterial>3.5) {
    roughness=.20;
  }
  vec3 V=normalize(uEye-vWorld);
  vec3 H1=normalize(normalize(L1)+V);
  vec3 H2=normalize(normalize(L2)+V);
  float exponent=mix(10.0,96.0,1.0-roughness);
  float spec1=pow(max(dot(N,H1),0.0),exponent)*warm;
  float spec2=pow(max(dot(N,H2),0.0),exponent)*screen;
  c+=vec3(1.0,.83,.62)*spec1*(.08+.27*(1.0-roughness));
  c+=vec3(.49,.73,1.0)*spec2*(.04+.23*(1.0-roughness));
  // Cheap contact shadowing anchors furniture without extra shadow-map passes.
  if(vWorld.y<.03 && N.y>.8) {
    float desk=exp(-2.1*(vWorld.x*vWorld.x+(vWorld.z+.7)*(vWorld.z+.7)));
    float shelf=exp(-1.6*((vWorld.x+3.25)*(vWorld.x+3.25)+(vWorld.z+2.25)*(vWorld.z+2.25)));
    float labFloor=exp(-1.8*((vWorld.x-3.15)*(vWorld.x-3.15)+(vWorld.z+1.95)*(vWorld.z+1.95)));
    c*=1.0-.17*max(desk,max(shelf,labFloor));
  }
  c+=vColor*vEmit*1.05;
  float fog=clamp((vDistance-8.0)/21.0,0.0,.35);
  c=mix(c,vec3(.045,.072,.12),fog);
  outputColor=vec4(pow(max(c,vec3(0.0)),vec3(.87)),1.0);
}`;

function compile(gl:WebGL2RenderingContext,kind:number,code:string) {
  const sh=gl.createShader(kind);
  if(!sh)throw new Error('WebGL Shader allocation failed');
  gl.shaderSource(sh,code);gl.compileShader(sh);
  if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){
    const msg=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw new Error(msg??'Shader compile failed');
  }
  return sh;
}
function setup(gl:WebGL2RenderingContext){
  const program=gl.createProgram();if(!program)throw new Error('WebGL program allocation failed');
  const vs=compile(gl,gl.VERTEX_SHADER,vert),fs=compile(gl,gl.FRAGMENT_SHADER,frag);
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)??'Shader link failed');
  const buffer=gl.createBuffer(),vao=gl.createVertexArray();if(!buffer||!vao)throw new Error('WebGL buffer allocation failed');
  gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  const stride=11*4;
  for(const [index,size,offset] of [[0,3,0],[1,3,3],[2,3,6],[3,1,9],[4,1,10]]){
    gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,size,gl.FLOAT,false,stride,offset*4);
  }
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
  return {program,vao,buffer,count:vertices.length/11};
}
function basis(camera:Camera){
  const a=camera.azimuth,e=camera.elevation;
  const offset:Vec3=[Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)];
  const eye:Vec3=[camera.target[0]+offset[0]*camera.distance,camera.target[1]+offset[1]*camera.distance,camera.target[2]+offset[2]*camera.distance];
  const right:Vec3=[Math.cos(a),0,-Math.sin(a)];
  const up:Vec3=[-Math.sin(a)*Math.sin(e),Math.cos(e),-Math.cos(a)*Math.sin(e)];
  const forward:Vec3=[-offset[0],-offset[1],-offset[2]];
  return {eye,right,up,forward};
}
const dot=(a:Vec3,b:Vec3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a:Vec3,b:Vec3):Vec3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];

export function mountStudio(): void {
  const root=document.querySelector<HTMLElement>('[data-studio]'); if(!root)return;
  const canvas=root.querySelector<HTMLCanvasElement>('[data-studio-canvas]');
  const stage=root.querySelector<HTMLElement>('[data-studio-stage]');
  const fallback=root.querySelector<HTMLElement>('[data-studio-fallback]');
  const details=root.querySelector<HTMLElement>('[data-studio-details]');
  const reset=root.querySelector<HTMLButtonElement>('[data-studio-reset]');
  const view=root.querySelector<HTMLButtonElement>('[data-studio-view]');
  const note=root.querySelector<HTMLElement>('[data-studio-error]');
  if(!canvas||!stage||!fallback||!details||!reset||!view)return;

  const candidate=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'});
  if(!candidate){if(note){note.hidden=false;note.textContent='此设备无法初始化 WebGL2，已使用完整的 2D 导航。';}return;}
  const gl:WebGL2RenderingContext=candidate;
  const canvasEl:HTMLCanvasElement=canvas, stageEl:HTMLElement=stage, fallbackEl:HTMLElement=fallback, detailsEl:HTMLElement=details, viewEl:HTMLButtonElement=view;
  let graphics:ReturnType<typeof setup>;
  try{graphics=setup(gl);}catch(error){
    console.warn('Studio WebGL initialization failed',error);
    if(note){note.hidden=false;note.textContent='3D 图形初始化失败，已保留 2D 入口。';}
    return;
  }
  const loc=(name:string)=>gl.getUniformLocation(graphics.program,name);
  const uniforms={eye:loc('uEye'),right:loc('uRight'),up:loc('uUp'),forward:loc('uForward'),focal:loc('uFocal'),aspect:loc('uAspect')};
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow=window.matchMedia('(max-width: 760px)');
  const pins=Array.from(root.querySelectorAll<HTMLButtonElement>('[data-studio-pin]'));
  const panels=Array.from(root.querySelectorAll<HTMLElement>('[data-studio-panel]'));
  let active:StudioZone|undefined;
  let current:Camera={...HOME,target:[...HOME.target]};
  let target:Camera={...HOME,target:[...HOME.target]};
  let in3d=!(reduced.matches||narrow.matches),frame=0,width=1,height=1;
  let dragging=false,lastX=0,lastY=0;
  reset.disabled=false;view.disabled=false;

  function redraw(){
    if(!in3d)return;
    const b=basis(current),focal=1/Math.tan(40*Math.PI/360),aspect=width/height;
    gl.viewport(0,0,canvasEl.width,canvasEl.height);gl.clearColor(.045,.073,.122,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(graphics.program);gl.bindVertexArray(graphics.vao);
    gl.uniform3fv(uniforms.eye,new Float32Array(b.eye));gl.uniform3fv(uniforms.right,new Float32Array(b.right));gl.uniform3fv(uniforms.up,new Float32Array(b.up));gl.uniform3fv(uniforms.forward,new Float32Array(b.forward));
    gl.uniform1f(uniforms.focal,focal);gl.uniform1f(uniforms.aspect,aspect);gl.drawArrays(gl.TRIANGLES,0,graphics.count);
    for(const pin of pins){
      const zone=STUDIO_ZONES.find(z=>z.id===pin.dataset.studioPin);if(!zone)continue;
      const v=sub(zone.pin,b.eye),depth=dot(v,b.forward);
      const x=width/2+dot(v,b.right)*height*focal/(2*depth);
      const y=height/2-dot(v,b.up)*height*focal/(2*depth);
      pin.hidden=depth<=.2||x < -90 || x>width+90 || y < -70 || y>height+70;
      pin.style.left=`${x}px`;pin.style.top=`${y}px`;
    }
  }
  function step(){
    frame=0;const speed=reduced.matches?1:.14;let distance=0;
    for(let i=0;i<3;i++){
      const delta=target.target[i]-current.target[i];current.target[i]+=delta*speed;distance+=Math.abs(delta);
    }
    for(const key of ['azimuth','elevation','distance'] as const){
      const delta=target[key]-current[key];current[key]+=delta*speed;distance+=Math.abs(delta);
    }
    redraw();if(distance>.003)requestFrame();
  }
  function requestFrame(){if(in3d&&!frame)frame=window.requestAnimationFrame(step);}
  function resize(){
    if(!in3d)return;
    const rect=stageEl.getBoundingClientRect();if(!rect.width||!rect.height)return;
    width=rect.width;height=rect.height;
    const scale=Math.min(window.devicePixelRatio||1,1.75);
    const w=Math.round(width*scale),h=Math.round(height*scale);
    if(canvasEl.width!==w||canvasEl.height!==h){canvasEl.width=w;canvasEl.height=h;}
    requestFrame();
  }
  function select(zone:StudioZone|undefined){
    active=zone;target=zone?{target:[...zone.focus],distance:zone.distance,azimuth:zone.azimuth,elevation:zone.elevation}:{...HOME,target:[...HOME.target]};
    for(const pin of pins)pin.setAttribute('aria-pressed',String(pin.dataset.studioPin===zone?.id));
    for(const panel of panels)panel.hidden=panel.dataset.studioPanel!==zone?.id;
    detailsEl.hidden=!zone||!in3d;
    requestFrame();
  }
  function applyView(){
    stageEl.hidden=!in3d;fallbackEl.hidden=in3d;detailsEl.hidden=!in3d||!active;
    viewEl.textContent=in3d?'切换 2D 模式':'进入 3D 场景';
    if(in3d)resize();
  }
  pins.forEach(pin=>pin.addEventListener('click',()=>select(STUDIO_ZONES.find(z=>z.id===pin.dataset.studioPin))));
  root.querySelectorAll<HTMLButtonElement>('[data-studio-close]').forEach(button=>button.addEventListener('click',()=>select(undefined)));
  reset.addEventListener('click',()=>select(undefined));
  view.addEventListener('click',()=>{in3d=!in3d;applyView();});
  canvas.addEventListener('pointerdown',event=>{dragging=true;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{
    if(!dragging)return;
    const dx=event.clientX-lastX,dy=event.clientY-lastY;
    target.azimuth=clamp(target.azimuth+dx*.004,-.16,.88);
    target.elevation=clamp(target.elevation+dy*.003,.10,.59);
    lastX=event.clientX;lastY=event.clientY;requestFrame();
  });
  canvas.addEventListener('pointerup',()=>{dragging=false;});
  canvas.addEventListener('pointercancel',()=>{dragging=false;});
  canvas.addEventListener('wheel',event=>{if(!in3d)return;event.preventDefault();target.distance=clamp(target.distance+Math.sign(event.deltaY)*.52,4.4,15.8);requestFrame();},{passive:false});
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'&&active)select(undefined);};
  window.addEventListener('keydown',onKey);
  const observer=new ResizeObserver(resize);observer.observe(stage);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();in3d=false;applyView();if(note){note.hidden=false;note.textContent='WebGL 上下文中断，已切换到完整 2D 导航。';}});
  window.addEventListener('pagehide',()=>{observer.disconnect();window.removeEventListener('keydown',onKey);if(frame)cancelAnimationFrame(frame);gl.deleteBuffer(graphics.buffer);gl.deleteVertexArray(graphics.vao);gl.deleteProgram(graphics.program);},{once:true});
  applyView();
}
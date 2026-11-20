// Coordinates and radii use the reference photograph, so the beads stay on
// the same pane when the viewport crops or the camera moves closer.
export function wetGlass({x,y,width,height,close}, photo) {
  const scale = close ? 1 : .43;
  const beads = [];
  let untilHit = 0;
  let target;
  function hit(initial = false) {
    // Some drops strike an already wet patch. Their combined volume can
    // overcome surface tension and start a run down the pane.
    const nearby = !initial && target && Math.random() < .43;
    const px = nearby ? target.x + (Math.random()-.5)*8*scale : x + Math.random()*width;
    const py = nearby ? target.y + (Math.random()-.5)*8*scale : y + Math.random()*height;
    const radius = scale * (1.15 + Math.random()*2.3);
    const bead = {x:px,y:py,r:radius,age:initial ? 1 : 0,life:7+Math.random()*10,
      phase:Math.random()*6.28,speed:0,trail:[]};
    beads.push(bead);
    target = bead;
  }
  for(let i=0;i<(close ? 52 : 24);i++) hit(true);

  function advance(dt) {
    untilHit -= dt;
    if (untilHit <= 0) {
      hit();
      untilHit = (close ? .08 : .14) + Math.random()*.18;
    }
    for(let i=beads.length-1;i>=0;i--) {
      const bead=beads[i];
      bead.age+=dt;
      if(bead.age>bead.life || bead.y>y+height+8) {
        beads.splice(i,1);
        if(target===bead) target=undefined;
        continue;
      }
      if(bead.r>3.25*scale && bead.age>.42) {
        bead.speed=Math.min(47*scale,bead.speed+25*scale*dt);
        bead.x+=Math.sin(bead.y/(7*scale)+bead.phase)*bead.speed*.12*dt;
        bead.y+=bead.speed*dt;
        const tail=bead.trail.at(-1);
        if(!tail || bead.y-tail.y>1.8*scale) bead.trail.push({x:bead.x,y:bead.y});
        if(bead.trail.length>19) bead.trail.shift();
      }
      if(bead.age<.18) continue;
      for(let j=i+1;j<beads.length;j++) {
        const other=beads[j];
        if(other.age<.18 || Math.hypot(other.x-bead.x,other.y-bead.y)>bead.r+other.r) continue;
        bead.r=Math.min(5*scale,Math.cbrt(bead.r**3+other.r**3));
        bead.life=Math.max(bead.life,bead.age+4);
        if(target===other) target=bead;
        beads.splice(j--,1);
      }
    }
  }
  function draw(ctx) {
    for(const b of beads) {
      const r=b.r, impact=Math.max(0,1-b.age/.22);
      const rx=r*(1+.65*impact), ry=r*(1.16-.55*impact)+b.speed*.024;
      ctx.save();
      ctx.globalAlpha=Math.min(1,b.life-b.age);
      if(b.trail.length>1) {
        ctx.beginPath();ctx.moveTo(b.trail[0].x,b.trail[0].y);
        for(const p of b.trail) ctx.lineTo(p.x,p.y);
        ctx.lineWidth=r*.66;ctx.strokeStyle='rgba(170,191,207,.23)';ctx.stroke();
      }
      ctx.translate(b.x,b.y);
      if(impact>0) {
        // Brief satellite glints from the impact, before the lens settles.
        ctx.fillStyle='rgba(230,238,241,'+impact*.75+')';
        for(let k=0;k<3;k++) {
          const a=b.phase+k*2.2,reach=r*(1.1+2*(1-impact));
          ctx.beginPath();ctx.arc(Math.cos(a)*reach,Math.sin(a)*reach*.68,r*.18,0,2*Math.PI);ctx.fill();
        }
      }
      ctx.beginPath();ctx.ellipse(0,0,rx,ry,.08,0,Math.PI*2);ctx.clip();
      ctx.fillStyle='#334453';ctx.fill();
      if(photo.complete && photo.naturalWidth) {
        // Invert a wider patch of the city through the convex water surface.
        ctx.save();ctx.scale(-1,-1);
        ctx.drawImage(photo,b.x*2-r*6,b.y*2-r*7,r*12,r*14,-rx,-ry,2*rx,2*ry);
        ctx.restore();
      }
      ctx.strokeStyle='rgba(10,18,26,.63)';ctx.lineWidth=r*.42;ctx.stroke();
      ctx.beginPath();ctx.ellipse(-rx*.31,-ry*.41,rx*.29,ry*.12,-.55,0,Math.PI*2);
      ctx.fillStyle='rgba(243,249,255,.84)';ctx.fill();
      ctx.restore();
    }
  }
  return {advance,draw};
}

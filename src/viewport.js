import { distance, formatLength, containsFurniture, segmentDistance, projectBounds } from './model.js';

function roundedRect(ctx,x,y,w,h,r=0.05) {ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(r,w/4,h/4));}
export class PlanView {
  constructor(canvas,getProject,getImage) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.getProject=getProject;this.getImage=getImage;
    this.width=600;this.height=500;this.scale=100;this.origin={x:30,y:30};this.selection=null;this.preview=null;this.frame=0;
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);
    this.resize();
  }
  resize() {
    const rect=this.canvas.getBoundingClientRect(); if(!rect.width||!rect.height)return;
    const oldCenter={x:(this.width/2-this.origin.x)/this.scale,y:(this.height/2-this.origin.y)/this.scale};
    this.width=rect.width;this.height=rect.height;
    const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*dpr);this.canvas.height=Math.round(this.height*dpr);
    this.origin={x:this.width/2-oldCenter.x*this.scale,y:this.height/2-oldCenter.y*this.scale};this.render();
  }
  fit() {
    const b=projectBounds(this.getProject());this.scale=Math.max(.1,Math.min(500,Math.min((this.width-56)/b.width,(this.height-80)/b.height)));
    this.origin={x:this.width/2-(b.x+b.width/2)*this.scale,y:this.height/2-(b.y+b.height/2)*this.scale};this.render();
  }
  zoom(factor,anchor={x:this.width/2,y:this.height/2}) {
    const before={x:(anchor.x-this.origin.x)/this.scale,y:(anchor.y-this.origin.y)/this.scale};
    this.scale=Math.max(.05,Math.min(1000,this.scale*factor));this.origin={x:anchor.x-before.x*this.scale,y:anchor.y-before.y*this.scale};this.render();
  }
  pan(dx,dy) {this.origin.x+=dx;this.origin.y+=dy;this.render();}
  point(event) {const rect=this.canvas.getBoundingClientRect();return {x:(event.clientX-rect.left-this.origin.x)/this.scale,y:(event.clientY-rect.top-this.origin.y)/this.scale};}
  screen(point) {const r=this.canvas.getBoundingClientRect();return {x:r.left+this.origin.x+point.x*this.scale,y:r.top+this.origin.y+point.y*this.scale};}
  hit(point) {
    const p=this.getProject(), tolerance=12/this.scale;
    if(this.selection?.kind==='walls') {
      const w=p.walls.find(w=>w.id===this.selection.id);
      if(w)for(const endpoint of ['a','b'])if(distance(point,w[endpoint])<tolerance)return {id:w.id,kind:'walls',endpoint};
    }
    for(const f of [...p.furniture].reverse())if(containsFurniture(point,f))return {id:f.id,kind:'furniture'};
    for(const m of [...p.measurements].reverse())if(segmentDistance(point,m.a,m.b)<tolerance)return {id:m.id,kind:'measurements'};
    for(const w of [...p.walls].reverse())if(segmentDistance(point,w.a,w.b)<Math.max(tolerance,w.thickness/2))return {id:w.id,kind:'walls'};
    return null;
  }
  render() {if(!this.frame)this.frame=requestAnimationFrame(()=>{this.frame=0;this.draw(this.ctx,this.width,this.height,this.scale,this.origin,{dpr:Math.min(devicePixelRatio||1,2)});});}
  draw(ctx,width,height,scale,origin,options={}) {
    const {dpr=1,exporting=false,background=true}=options, p=this.getProject();
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='#f8f7f3';ctx.fillRect(0,0,width,height);
    ctx.save();ctx.translate(origin.x,origin.y);ctx.scale(scale,scale);
    if(p.settings.showGrid&&!exporting) {
      let step=p.settings.gridSize;while(step*scale<12)step*=2;
      const left=-origin.x/scale,top=-origin.y/scale,right=(width-origin.x)/scale,bottom=(height-origin.y)/scale;
      ctx.strokeStyle='#e5e3db';ctx.lineWidth=1/scale;ctx.beginPath();
      for(let x=Math.floor(left/step)*step;x<right;x+=step){ctx.moveTo(x,top);ctx.lineTo(x,bottom);}
      for(let y=Math.floor(top/step)*step;y<bottom;y+=step){ctx.moveTo(left,y);ctx.lineTo(right,y);}
      ctx.stroke();
    }
    const bg=p.background,img=bg?this.getImage(bg.id)?.image:null;
    if(background&&bg?.visible&&img){ctx.save();ctx.globalAlpha=bg.opacity;ctx.drawImage(img,bg.x,bg.y,bg.pixelWidth*bg.metersPerPixel,bg.pixelHeight*bg.metersPerPixel);ctx.restore();}
    const textSize=exporting?18/scale:Math.max(10/scale,Math.min(0.105,16/scale));
    for(const wall of p.walls) {
      const selected=!exporting&&this.selection?.id===wall.id;
      ctx.strokeStyle=selected?'#bd6547':'#4b5550';ctx.lineWidth=wall.thickness;ctx.lineCap='square';ctx.beginPath();ctx.moveTo(wall.a.x,wall.a.y);ctx.lineTo(wall.b.x,wall.b.y);ctx.stroke();
      const angle=Math.atan2(wall.b.y-wall.a.y,wall.b.x-wall.a.x);
      const middle={x:(wall.a.x+wall.b.x)/2+Math.sin(angle)*.2,y:(wall.a.y+wall.b.y)/2-Math.cos(angle)*.2};
      this.label(ctx,`${formatLength(distance(wall.a,wall.b),p.units)} CL`,middle,textSize,'#5d6560');
      if(selected)for(const point of [wall.a,wall.b]){ctx.beginPath();ctx.arc(point.x,point.y,7/scale,0,2*Math.PI);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#b8593d';ctx.lineWidth=2/scale;ctx.stroke();}
    }
    for(const f of p.furniture) {
      const selected=!exporting&&this.selection?.id===f.id;
      ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.rotation*Math.PI/180);
      roundedRect(ctx,-f.width/2,-f.depth/2,f.width,f.depth);ctx.fillStyle=f.color;ctx.fill();ctx.lineWidth=(selected?2.5:1.2)/scale;ctx.strokeStyle=selected?'#a24c33':'#716f6255';ctx.stroke();
      // Original plan symbols, contained within each item's true footprint.
      ctx.strokeStyle='#ffffff95';ctx.lineWidth=1.5/scale;
      if(f.type==='sofa') {
        roundedRect(ctx,-f.width*.41,-f.depth*.25,f.width*.82,f.depth*.56,.04);ctx.stroke();
        ctx.beginPath();ctx.moveTo(0,-f.depth*.25);ctx.lineTo(0,f.depth*.31);ctx.stroke();
      } else if(f.type==='bed') {
        roundedRect(ctx,-f.width*.43,-f.depth*.43,f.width*.86,f.depth*.22);ctx.stroke();
        ctx.beginPath();ctx.moveTo(-f.width*.45,-f.depth*.12);ctx.lineTo(f.width*.45,-f.depth*.12);ctx.stroke();
      } else if(f.type==='desk'||f.type==='cabinet') {
        ctx.beginPath();ctx.moveTo(-f.width*.43,-f.depth*.27);ctx.lineTo(f.width*.43,-f.depth*.27);ctx.stroke();
      } else if(f.type==='chair') {roundedRect(ctx,-f.width*.37,-f.depth*.2,f.width*.74,f.depth*.55);ctx.stroke();}
      ctx.restore();
      const labelPoint={x:f.x,y:f.y+(f.type==='chair'?0:.02)};
      const label=f.name.length>22?`${f.name.slice(0,21)}…`:f.name;
      this.label(ctx,label,labelPoint,textSize,'#343b36',false);
      if(Math.min(f.width,f.depth)*scale>65)this.label(ctx,`${formatLength(f.width,p.units)} × ${formatLength(f.depth,p.units)}`,{x:f.x,y:f.y+textSize*1.7},textSize*.82,'#454b43',false);
      if(selected) {
        ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.rotation*Math.PI/180);ctx.setLineDash([4/scale,3/scale]);ctx.strokeStyle='#ad573e';ctx.lineWidth=1/scale;ctx.strokeRect(-f.width/2-.05,-f.depth/2-.05,f.width+.1,f.depth+.1);ctx.restore();
      }
    }
    for(const m of p.measurements)this.dimension(ctx,m.a,m.b,formatLength(distance(m.a,m.b),p.units),scale,textSize,!exporting&&this.selection?.id===m.id);
    if(this.preview&&!exporting) {
      const {a,b,kind}=this.preview;
      ctx.strokeStyle='#b4593d';ctx.lineWidth=2/scale;ctx.setLineDash([6/scale,4/scale]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
      for(const point of [a,b]){ctx.beginPath();ctx.arc(point.x,point.y,5/scale,0,2*Math.PI);ctx.fillStyle='#b4593d';ctx.fill();}
      if(kind!=='calibrate')this.label(ctx,formatLength(distance(a,b),p.units),{x:(a.x+b.x)/2,y:(a.y+b.y)/2-.15},textSize,'#a04b31');
    }
    ctx.restore();
    if(!p.walls.length&&!p.furniture.length&&!bg&&!exporting) {
      ctx.fillStyle='#666f67';ctx.font='600 18px system-ui, sans-serif';ctx.textAlign='center';ctx.fillText('A little planning. A better fit.',width/2,height/2-12);
      ctx.font='13px system-ui, sans-serif';ctx.fillText('Import a plan or create a simple room to begin.',width/2,height/2+16);
    }
  }
  label(ctx,text,point,size,color,background=true) {
    ctx.save();ctx.font=`500 ${size}px system-ui, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    if(background){const w=ctx.measureText(text).width;ctx.fillStyle='#f8f7f3ed';ctx.fillRect(point.x-w/2-size*.4,point.y-size*.7,w+size*.8,size*1.4);}
    ctx.fillStyle=color;ctx.fillText(text,point.x,point.y);ctx.restore();
  }
  dimension(ctx,a,b,label,scale,size,selected) {
    ctx.save();ctx.strokeStyle=selected?'#ad573e':'#738671';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=1.5/scale;ctx.setLineDash([4/scale,3/scale]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);
    for(const p of [a,b]){ctx.beginPath();ctx.arc(p.x,p.y,3/scale,0,Math.PI*2);ctx.fill();}
    this.label(ctx,label,{x:(a.x+b.x)/2,y:(a.y+b.y)/2-.13},size,ctx.strokeStyle);ctx.restore();
  }
  async png(includeBackground=true) {
    const p=this.getProject(),b=projectBounds(p,includeBackground), canvas=document.createElement('canvas');
    const pad=100, scale=Math.min(1800/b.width,1300/b.height);canvas.width=Math.ceil(b.width*scale+pad*2);canvas.height=Math.ceil(b.height*scale+pad*2+110);
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('PNG export is unavailable.');
    this.draw(ctx,canvas.width,canvas.height,scale,{x:pad-b.x*scale,y:pad+45-b.y*scale},{exporting:true,background:includeBackground});
    ctx.fillStyle='#303a32';ctx.font='600 28px system-ui, sans-serif';ctx.textAlign='left';ctx.fillText(p.name,48,50,canvas.width-96);
    ctx.font='16px system-ui, sans-serif';ctx.fillStyle='#657062';ctx.fillText(`2D layout · ${p.units==='metric'?'Metric':'Feet & inches'} · Wall labels: centreline (CL)`,48,78);
    ctx.fillStyle='#566153';ctx.font='18px system-ui, sans-serif';ctx.fillText('Planning only · Verify on site',48,canvas.height-45);
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not create a PNG.')),'image/png'));
  }
}

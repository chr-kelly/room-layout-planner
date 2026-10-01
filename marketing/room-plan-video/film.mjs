/** Original coded film. Every visible value is a pure function of time. */
import { exampleProject, validateProject } from '../../src/model.js';
import en from '../../src/locales/en.js';
import zhTW from '../../src/locales/zh-TW.js';
import ja from '../../src/locales/ja.js';
import de from '../../src/locales/de.js';
import fr from '../../src/locales/fr.js';
import es from '../../src/locales/es.js';

export const WIDTH=1080, HEIGHT=1920, FPS=30, DURATION=28;
export const SAMPLE_TIMES=[0,1.5,3.8,6.8,9,11.5,13.5,15,17,18.8,20.5,21.6,23.3,24.8,26.2,27.9];
export const PROJECT=validateProject(exampleProject());
export const SCENES=[
  {start:0,end:3,en:['Moving the sofa.','Again?'],zh:['又要挪沙发？'],subEn:'Try the layout before the heavy lifting.',subZh:'搬动之前，先试试怎么摆。'},
  {start:3,end:6,en:['Try it','on screen.'],zh:['先挪','屏幕里的。'],subEn:'A room planner that runs in your browser.',subZh:'打开浏览器，就能规划房间。'},
  {start:6,end:10,en:['Your room.','Your real sizes.'],zh:['你的房间，','真实尺寸。'],subEn:'Start with the measurements you already have.',subZh:'房间多大，家具多大，按实测尺寸来。'},
  {start:10,end:14,en:['Drag. Rotate.','Try again.'],zh:['拖动、旋转，','多试一种摆法。'],subEn:'Move the idea before you move the furniture.',subZh:'先换个摆法，再决定怎么搬。'},
  {start:14,end:18,en:['From plan','to perspective.'],zh:['从平面，','到立体。'],subEn:'The same layout. A new point of view.',subZh:'同一份布局，换个角度看看。'},
  {start:18,end:21,en:['One plan.','Six languages.'],zh:['同一方案，','六种语言。'],subEn:'Your layout stays right where you left it.',subZh:'切换语言，布局和草稿都保留。'},
  {start:21,end:24,en:['This is the','actual editor.'],zh:['这就是','实际编辑器。'],subEn:'Real screenshots. An editable example.',subZh:'真实运行截图，可编辑的示例房间。'},
  {start:24,end:27,en:['Plan your room.','Before you move.'],zh:['先试摆，','再搬家。'],subEn:'Free. Open source. In your browser.',subZh:'免费、开源，在浏览器里就能用。'},
  {start:27,end:28,en:['Moving the sofa.','Again?'],zh:['又要挪沙发？'],subEn:'Try the layout before the heavy lifting.',subZh:'搬动之前，先试试怎么摆。'}
];
const C={paper:'#f8f6f0',ink:'#29382f',muted:'#788373',accent:'#b76245',soft:'#ecdace',line:'#e1e3d8',grid:'#e9e9df',floor:'#f3f1e9'};
const DICTS={en,'zh-TW':zhTW,ja,de,fr,es};
const LANGS=[['en','English'],['zh-TW','繁體中文'],['ja','日本語'],['de','Deutsch'],['fr','Français'],['es','Español']];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=v=>1-Math.pow(1-clamp(v),3);
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
const range=(t,a,b)=>ease((t-a)/(b-a));
const mix=(a,b,t)=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),rotation:lerp(a.rotation||0,b.rotation||0,t)});

function rr(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}}
function text(ctx,value,x,y,size=32,color=C.ink,weight=500,align='left',max=930){
  ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillStyle=color;
  ctx.font=`${weight} ${size}px "RoomSans", "RoomCJK", Arial, sans-serif`;
  while(ctx.measureText(value).width>max&&size>18){size--;ctx.font=`${weight} ${size}px "RoomSans", "RoomCJK", Arial, sans-serif`;}
  ctx.fillText(value,x,y);
}
function polygon(ctx,pts,fill,stroke){ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(const p of pts.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}
function tint(hex,k){const n=parseInt(hex.slice(1),16);return `rgb(${[n>>16,n>>8&255,n&255].map(v=>Math.round(lerp(v,k>0?255:0,Math.abs(k)))).join(',')})`;}
function icon(ctx,x,y,size=50){rr(ctx,x,y,size,size,size*.23,C.soft);ctx.strokeStyle=C.accent;ctx.lineWidth=size*.06;ctx.beginPath();ctx.moveTo(x+size*.27,y+size*.24);ctx.bezierCurveTo(x+size*.5,y+size*.32,x+size*.5,y+size*.32,x+size*.73,y+size*.24);ctx.bezierCurveTo(x+size*.64,y+size*.5,x+size*.64,y+size*.5,x+size*.73,y+size*.76);ctx.bezierCurveTo(x+size*.5,y+size*.68,x+size*.5,y+size*.68,x+size*.27,y+size*.76);ctx.bezierCurveTo(x+size*.36,y+size*.5,x+size*.36,y+size*.5,x+size*.27,y+size*.24);ctx.stroke();}
function logo(ctx,t){icon(ctx,76,154,58);text(ctx,'room',150,199,47,C.ink,700);text(ctx,'/',267,199,47,'#a2aa99',500);text(ctx,'plan',285,199,47,C.ink,700);text(ctx,'ROOM LAYOUT PLANNER',76,246,17,C.muted,700);}
function pill(ctx,label,x,y,w,active=false){rr(ctx,x,y,w,56,28,active?C.ink:'#f0f1e8',active?undefined:C.line);text(ctx,label,x+w/2,y+37,24,active?'#fff':C.ink,600,'center',w-22);}
function cursor(ctx,x,y,held=false){ctx.save();ctx.translate(x,y);ctx.shadowColor='rgba(34,47,38,.16)';ctx.shadowBlur=12;ctx.shadowOffsetY=4;polygon(ctx,[{x:0,y:0},{x:0,y:42},{x:12,y:31},{x:23,y:52},{x:32,y:47},{x:20,y:27},{x:37,y:25}],C.ink,'#fff');ctx.restore();if(held){ctx.strokeStyle=C.accent;ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,29,0,Math.PI*2);ctx.stroke();}}
function dimension(ctx,a,b,label,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=C.muted;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);const dx=b.y-a.y,dy=-(b.x-a.x),len=Math.hypot(dx,dy)||1;for(const p of [a,b]){ctx.moveTo(p.x+dx/len*10,p.y+dy/len*10);ctx.lineTo(p.x-dx/len*10,p.y-dy/len*10);}ctx.stroke();const x=(a.x+b.x)/2,y=(a.y+b.y)/2;rr(ctx,x-46,y-24,92,40,14,C.paper);text(ctx,label,x,y+5,25,C.ink,600,'center');ctx.restore();}
function projectAt(t){
  const p=PROJECT;
  const crowded=[{x:2,y:1.5,rotation:0},{x:2.55,y:1.35,rotation:0},{x:1.65,y:1.65,rotation:90},{x:2.15,y:1.65,rotation:0}];
  const spans=[[10.1,10.8],[11,11.6],[11.8,12.6],[12.8,13.4]];
  return p.furniture.map((f,i)=>{const move=t>=27?1-range(t,27,27.9):range(t,...spans[i]);return {...f,...mix(crowded[i],f,move),width:i===0&&t>=6&&t<10?lerp(1.7,f.width,range(t,6.6,7.8)):f.width,rotation:i===0&&t<3?Math.sin(t*3)*4:lerp(crowded[i].rotation,f.rotation,move)};});
}
function world(t){const rise=t>=27?1-range(t,27,27.9):range(t,14,15.6);return {pitch:.92*rise,yaw:.68*rise+(t>15.6&&t<18?Math.sin((t-15.6)*.75)*.05:0),scale:lerp(170,150,rise),cx:528,cy:lerp(1150,1190,rise)};}
function projection(w,x,y,h=0){x-=2;y-=1.5;const a=x*Math.cos(w.yaw)-y*Math.sin(w.yaw),b=x*Math.sin(w.yaw)+y*Math.cos(w.yaw);return{x:w.cx+a*w.scale,y:w.cy+b*Math.cos(w.pitch)*w.scale-h*Math.sin(w.pitch)*w.scale};}
function box(ctx,w,x,y,width,depth,height,color,rotation=0){
  const ang=rotation*Math.PI/180;
  const verts=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>({x:x+a*width/2*Math.cos(ang)-b*depth/2*Math.sin(ang),y:y+a*width/2*Math.sin(ang)+b*depth/2*Math.cos(ang)}));
  const low=verts.map(v=>projection(w,v.x,v.y,0)),hi=verts.map(v=>projection(w,v.x,v.y,height));
  const sides=[0,1,2,3].map(i=>({i,y:(low[i].y+low[(i+1)%4].y)/2})).sort((a,b)=>a.y-b.y);
  for(const {i} of sides){const j=(i+1)%4;polygon(ctx,[low[i],low[j],hi[j],hi[i]],tint(color,-.12-(i%2)*.05),tint(color,-.17));}
  polygon(ctx,hi,tint(color,.16),tint(color,-.12));
}
function room(ctx,t,lang='en',alpha=1){
  const w=world(t),items=projectAt(t),three=w.pitch>.08;
  const code=t>=18&&t<21?LANGS[Math.min(5,Math.floor((t-18)/.5))][0]:(lang==='zh-CN'?'zh-TW':'en');
  const d=DICTS[code];
  ctx.save();ctx.globalAlpha=alpha;
  ctx.shadowColor='rgba(38,50,43,.09)';ctx.shadowBlur=46;ctx.shadowOffsetY=16;rr(ctx,60,700,920,784,38,'#fffdfa');ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  text(ctx,d['name.example'],98,755,24,C.ink,600,'left',722);
  pill(ctx,three?'3D':'2D',847,720,84,true);
  ctx.save();ctx.beginPath();ctx.roundRect(72,787,896,678,18);ctx.clip();
  const corners=[[0,0],[4,0],[4,3],[0,3]].map(([x,y])=>projection(w,x,y));
  polygon(ctx,corners,C.floor,C.line);
  ctx.lineWidth=1;ctx.strokeStyle=C.grid;
  for(let i=0;i<=40;i++){let a=projection(w,i*.1,0),b=projection(w,i*.1,3);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  for(let i=0;i<=30;i++){let a=projection(w,0,i*.1),b=projection(w,4,i*.1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  const walls=PROJECT.walls.map(v=>({x:(v.a.x+v.b.x)/2,y:(v.a.y+v.b.y)/2,width:Math.hypot(v.b.x-v.a.x,v.b.y-v.a.y)+v.thickness,depth:v.thickness,height:three?.65:0.008,rotation:Math.atan2(v.b.y-v.a.y,v.b.x-v.a.x)*180/Math.PI,color:three?'#e8e9df':'#485348',wall:true}));
  const objects=[...walls,...items].sort((a,b)=>projection(w,a.x,a.y).y-projection(w,b.x,b.y).y);
  for(const o of objects){
    if(three||o.wall){box(ctx,w,o.x,o.y,o.width,o.depth,o.wall?o.height:o.height,o.color,o.rotation);continue;}
    const q=projection(w,o.x,o.y);ctx.save();ctx.translate(q.x,q.y);ctx.rotate(o.rotation*Math.PI/180);const fw=o.width*w.scale,fh=o.depth*w.scale;
    ctx.shadowColor='rgba(38,50,43,.09)';ctx.shadowBlur=10;ctx.shadowOffsetY=6;rr(ctx,-fw/2,-fh/2,fw,fh,9,o.color,tint(o.color,-.12));ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    if(o.type==='sofa'){ctx.strokeStyle='#f6e9df';ctx.lineWidth=2;rr(ctx,-fw*.41,-fh*.27,fw*.82,fh*.57,7,undefined,'#f6e9df');ctx.beginPath();ctx.moveTo(0,-fh*.27);ctx.lineTo(0,fh*.3);ctx.stroke();}
    text(ctx,d[o.nameKey]||o.name,0,6,24,C.ink,500,'center',fw-20);
    if(fh>105)text(ctx,`${o.width} × ${o.depth} m`,0,36,18,C.ink,500,'center',fw-16);
    ctx.restore();
  }
  if(t>=3&&t<14){dimension(ctx,projection(w,0,-.31),projection(w,4,-.31),'4 m',range(t,3.2,3.8));dimension(ctx,projection(w,4.31,0),projection(w,4.31,3),'3 m',range(t,3.45,4));}
  if(t>=10&&t<13.4){const i=t<10.9?0:t<11.7?1:t<12.7?2:3,f=items[i],q=projection(w,f.x+f.width*.3,f.y+f.depth*.22);cursor(ctx,q.x,q.y,true);}
  else if(t<3){cursor(ctx,projection(w,2.72,1.72).x,projection(w,2.72,1.72).y,t>1.5);}
  ctx.restore();
  if(t>=6&&t<10){
    const pop=range(t,6.05,6.6);ctx.save();ctx.globalAlpha*=pop;const yy=1320+(1-pop)*36;
    rr(ctx,100,yy,794,120,22,C.ink);text(ctx,lang==='en'?'SOFA · REAL DIMENSIONS':'沙发 · 实测尺寸',132,yy+39,19,'#dfe5d8',600);
    text(ctx,`${items[0].width.toFixed(2)} m`,132,yy+89,38,'#fff',700);text(ctx,'×',353,yy+89,30,'#a9b4a1',400);text(ctx,'0.90 m',410,yy+89,38,'#fff',700);text(ctx,lang==='en'?'width × depth':'宽 × 深',668,yy+81,20,'#dfe5d8',500);
    ctx.restore();
  }
  ctx.restore();
}
function langChips(ctx,t){const active=Math.min(5,Math.floor((t-18)/.5));for(let i=0;i<6;i++){const col=i%3,row=Math.floor(i/3),x=84+col*302,y=1524+row*79;pill(ctx,LANGS[i][1],x,y,282,i===active);}}
function actualEditor(ctx,t,lang,assets){
  const a=range(t,21,21.4),use3d=t>=22.5,im=assets[use3d?(lang==='en'?'editor3d':'editor3dZh'):(lang==='en'?'editor2d':'editorZh')];
  ctx.save();ctx.translate(0,(1-a)*70);ctx.globalAlpha=a;
  ctx.shadowColor='rgba(38,50,43,.1)';ctx.shadowBlur=44;ctx.shadowOffsetY=18;rr(ctx,60,700,920,884,32,'#fffdfa');ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  text(ctx,lang==='en'?'REAL PRODUCT · LOCAL RUN':'真实产品 · 本地运行',96,757,20,C.muted,700);
  ctx.save();ctx.beginPath();ctx.roundRect(84,796,872,491,17);ctx.clip();ctx.drawImage(im,84,796,872,491);ctx.restore();
  if(!use3d){
    const imgX=lang==='en'?1000:1000;
    rr(ctx,98,1320,824,187,24,'#f4f3ed',C.line);
    ctx.save();ctx.beginPath();ctx.roundRect(112,1334,220,160,12);ctx.clip();ctx.drawImage(im,imgX,188,272,360,112,1334,220,160);ctx.restore();
    text(ctx,lang==='en'?'Enter your sizes.':'输入自己的尺寸。',366,1403,31,C.ink,600,'left',512);
    text(ctx,lang==='en'?'Keep an editable JSON backup.':'下载 JSON，保留可编辑方案。',366,1452,23,C.muted,500,'left',512);
  }else{
    pill(ctx,lang==='en'?'2D to edit':'2D 里编辑',109,1348,344);pill(ctx,lang==='en'?'3D to explore':'3D 中查看',479,1348,344,true);
    text(ctx,lang==='en'?'One project. Two ways to see it.':'同一方案，两种查看方式。',480,1487,28,C.muted,500,'center',772);
  }
  ctx.restore();
}
function cta(ctx,t,lang){
  room(ctx,17,lang);
  const a=range(t,24.15,24.65);ctx.save();ctx.globalAlpha=a;
  pill(ctx,lang==='en'?'Free':'免费',87,1538,222,true);pill(ctx,lang==='en'?'Open source':'开源',333,1538,312);pill(ctx,lang==='en'?'Local first':'本地处理',668,1538,263);
  text(ctx,lang==='en'?'Know someone moving?':'有朋友准备搬家？',84,1684,34,C.ink,600);
  text(ctx,lang==='en'?'Send them this.':'把这个转给他。',84,1730,34,C.accent,700);
  ctx.restore();
}
export function renderFrame(ctx,rawTime,lang='en',assets={}){
  const time=clamp(rawTime,0,DURATION);
  const t=time>=27.9?0:time;
  const scene=SCENES.find(s=>t>=s.start&&t<s.end)||SCENES[0], chinese=lang==='zh-CN';
  ctx.clearRect(0,0,WIDTH,HEIGHT);ctx.fillStyle=C.paper;ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.save();ctx.globalAlpha=.7;ctx.fillStyle='#e5e6db';for(let x=52;x<1020;x+=44)for(let y=610;y<1570;y+=44){ctx.beginPath();ctx.arc(x,y,1,0,Math.PI*2);ctx.fill();}ctx.restore();
  logo(ctx,t);
  const lines=chinese?scene.zh:scene.en;
  const titleSize=chinese?88:84,titleY=360;
  const arrival=scene.start===0?1:range(t,scene.start,scene.start+.28);
  ctx.save();ctx.globalAlpha=arrival;ctx.translate(0,(1-arrival)*18);
  lines.forEach((line,i)=>text(ctx,line,76,titleY+i*109,titleSize,i===lines.length-1?C.accent:C.ink,700,'left',890));
  text(ctx,chinese?scene.subZh:scene.subEn,79,lines.length===1?456:549,31,C.muted,400,'left',884);
  ctx.restore();
  if(t>=21&&t<24)actualEditor(ctx,t,lang,assets);else if(t>=24&&t<27)cta(ctx,t,lang);else room(ctx,t,lang);
  if(t>=18&&t<21)langChips(ctx,t);
  else if(t<18){text(ctx,chinese?'4 × 3 米内净尺寸 · 可编辑示例':'4 × 3 m inside · editable example',88,1552,25,C.muted,500,'left',885);if(t>=14)text(ctx,chinese?'长方体家具 · 只读 3D 查看':'Simple box furniture · read-only 3D view',88,1600,23,C.muted,400,'left',885);}
  if(t<24){ctx.strokeStyle=C.line;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(80,1728);ctx.lineTo(938,1728);ctx.stroke();text(ctx,'room / plan',80,1785,31,C.ink,700);text(ctx,chinese?'免费 · 开源 · 无需账号':'Free · open source · no account',935,1785,23,C.muted,500,'right',590);}
}

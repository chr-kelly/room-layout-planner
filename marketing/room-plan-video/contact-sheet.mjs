import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {SAMPLE_TIMES} from './film.mjs';
const require=createRequire(import.meta.url);const {createCanvas,loadImage}=require('@napi-rs/canvas');
for(const lang of ['en','zh-CN']){
 const canvas=createCanvas(1440,2660),ctx=canvas.getContext('2d');ctx.fillStyle='#e7e7de';ctx.fillRect(0,0,1440,2660);
 for(let i=0;i<SAMPLE_TIMES.length;i++){
  const t=SAMPLE_TIMES[i],img=await loadImage(fileURLToPath(new URL(`./out/frame-${lang}-${String(t).replace('.','_')}.png`,import.meta.url)));
  const x=(i%4)*360,y=Math.floor(i/4)*665;ctx.drawImage(img,x+4,y+28,352,626);ctx.fillStyle='#29382f';ctx.font='18px sans-serif';ctx.fillText(`${lang} · ${t.toFixed(1)} s`,x+10,y+22);
 }
 await fs.writeFile(new URL(`./out/review-${lang}.jpg`,import.meta.url),await canvas.encode('jpeg'));
}
console.log('Two contact sheets: 16 timeline samples each');

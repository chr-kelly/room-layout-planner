import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {SAMPLE_TIMES} from './film.mjs';
const require=createRequire(import.meta.url);const {createCanvas,loadImage}=require('@napi-rs/canvas');
for(const lang of ['en','zh-CN']){
 const canvas=createCanvas(1440,2660),ctx=canvas.getContext('2d');ctx.fillStyle='#e7e7de';ctx.fillRect(0,0,1440,2660);
 for(let i=0;i<SAMPLE_TIMES.length;i++){
  const t=SAMPLE_TIMES[i],image=await loadImage(fileURLToPath(new URL(`./out/decoded/${lang}/frame-${String(i+1).padStart(2,'0')}.png`,import.meta.url)));
  const x=(i%4)*360,y=Math.floor(i/4)*665;ctx.drawImage(image,x+4,y+28,352,626);ctx.fillStyle='#29382f';ctx.font='18px sans-serif';ctx.fillText(`MP4 ${lang} · ${t.toFixed(1)}s`,x+10,y+22);
 }
 await fs.writeFile(new URL(`./out/final-frames-${lang}.jpg`,import.meta.url),await canvas.encode('jpeg'));
}
console.log('Final MP4 decoded contact sheets: 16 + 16 frames');

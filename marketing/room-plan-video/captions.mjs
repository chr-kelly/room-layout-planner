import fs from 'node:fs/promises';
import {SCENES} from './film.mjs';
function stamp(seconds,sep=','){const h=Math.floor(seconds/3600),m=Math.floor(seconds/60)%60,s=Math.floor(seconds)%60,ms=Math.round((seconds-Math.floor(seconds))*1000);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}${sep}${String(ms).padStart(3,'0')}`;}
for(const lang of ['en','zh-CN']){
 const isEn=lang==='en',blocks=SCENES.map((s,i)=>`${i+1}\n${stamp(s.start)} --> ${stamp(s.end)}\n${(isEn?s.en:s.zh).join(' ')}\n${isEn?s.subEn:s.subZh}\n`);
 await fs.writeFile(new URL(`./out/room-plan-${lang}.srt`,import.meta.url),blocks.join('\n'));
 await fs.writeFile(new URL(`./out/room-plan-${lang}.vtt`,import.meta.url),'WEBVTT\n\n'+blocks.join('\n').replaceAll(/(\d{2}:\d{2}:\d{2}),(\d{3})/g,'$1.$2'));
}
console.log('Two SRT and VTT caption files created');

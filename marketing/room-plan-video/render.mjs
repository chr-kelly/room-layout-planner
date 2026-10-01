import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WIDTH,HEIGHT,FPS,DURATION,SAMPLE_TIMES,renderFrame} from './film.mjs';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
const here=path.dirname(fileURLToPath(import.meta.url));
const out=path.join(here,'out');await fs.mkdir(out,{recursive:true});
for(const [file,family] of [
 ['/System/Library/Fonts/Supplemental/Arial Bold.ttf','RoomSans'],
 ['/System/Library/Fonts/Supplemental/Arial.ttf','RoomSans'],
 ['/System/Library/Fonts/Hiragino Sans GB.ttc','RoomCJK']
]){try{GlobalFonts.registerFromPath(file,family);}catch{}}
const assets={};
for(const [key,file] of [['editor2d','editor-2d.jpg'],['editor3d','editor-3d.jpg'],['editorZh','editor-zh-TW.jpg']])assets[key]=await loadImage(path.join(here,'../../assets/readme',file));
assets.editor3dZh=await loadImage(path.join(here,'assets/editor-3d-zh-TW.jpg'));
const canvas=createCanvas(WIDTH,HEIGHT),ctx=canvas.getContext('2d');
const preview=process.argv.includes('--frames');
const langOption=process.argv.find(x=>x.startsWith('--lang='))?.slice(7);
const languages=langOption?[langOption]:['en','zh-CN'];
if(languages.some(l=>!['en','zh-CN'].includes(l)))throw new Error('Supported languages: en, zh-CN');
for(const lang of languages){
 if(preview){for(const t of SAMPLE_TIMES){renderFrame(ctx,t,lang,assets);await fs.writeFile(path.join(out,`frame-${lang}-${String(t).replace('.','_')}.png`),await canvas.encode('png'));}console.log(`${lang}: ${SAMPLE_TIMES.length} review frames`);continue;}
 const file=path.join(out,`room-plan-${lang}-1080x1920.mp4`);
 const sound=path.join(out,'soundtrack.wav');await fs.access(sound);
 const args=['-hide_banner','-loglevel','warning','-y','-f','rawvideo','-pixel_format','rgba','-video_size',`${WIDTH}x${HEIGHT}`,'-framerate',String(FPS),'-i','pipe:0','-i',sound,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t',String(DURATION),'-movflags','+faststart','-metadata',`title=Room Layout Planner — ${lang==='en'?'Plan before you move':'先试摆，再搬家'}`,file];
 const child=spawn('ffmpeg',args,{stdio:['pipe','inherit','inherit']});
 let pipeError;child.stdin.on('error',e=>{pipeError=e;});
 const completion=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error(`ffmpeg exit ${code}`)));});
 const began=Date.now();
 for(let frame=0;frame<FPS*DURATION;frame++){
  if(pipeError)throw pipeError;
  renderFrame(ctx,frame/FPS,lang,assets);
  const data=Buffer.from(ctx.getImageData(0,0,WIDTH,HEIGHT).data);
  if(!child.stdin.write(data))await once(child.stdin,'drain');
  if(frame%120===0)console.log(`${lang}: ${frame}/${FPS*DURATION} frames, ${Math.round((Date.now()-began)/1000)}s`);
 }
 child.stdin.end();await completion;
 renderFrame(ctx,24.8,lang,assets);await fs.writeFile(path.join(out,`cover-${lang}.jpg`),await canvas.encode('jpeg'));
 console.log(`DONE ${file}`);
}

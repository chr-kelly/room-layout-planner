/** Original score and effects: seeded synthesis, no external music samples. */
import fs from 'node:fs/promises';
import {DURATION} from './film.mjs';
const rate=48000,n=DURATION*rate,left=new Float64Array(n),right=new Float64Array(n);
let seed=9341;const noise=()=>{seed=(1664525*seed+1013904223)>>>0;return(seed/4294967296)*2-1;};
function add(at,length,fn,pan=0){const start=Math.round(at*rate),count=Math.round(length*rate);for(let i=0;i<count&&start+i<n;i++){const x=fn(i/rate,i);left[start+i]+=x*(1-pan*.25);right[start+i]+=x*(1+pan*.25);}}
for(let beat=0;beat<56;beat++){
 const at=beat*.5,bar=Math.floor(beat/4),b=beat%4;
 add(at,.24,t=>Math.sin(2*Math.PI*(49*t+35*.032*(1-Math.exp(-t/.032))))*Math.exp(-t*22)*.24);
 if(b%2===1)add(at,.12,t=>noise()*Math.exp(-t*45)*.047+Math.sin(2*Math.PI*178*t)*Math.exp(-t*40)*.024);
 add(at,.055,t=>noise()*Math.exp(-t*95)*.018,.5);
 if(beat>5&&beat<49){add(at+.25,.04,t=>noise()*Math.exp(-t*120)*.013,-.5);}
 const roots=[55,65.406,73.416,49][bar%4];
 if(b===0)add(at,1.8,t=>Math.sin(2*Math.PI*roots*t)*Math.exp(-t*2)*.078);
 const chord=[roots*4,roots*4*Math.pow(2,3/12),roots*6];
 const note=chord[b%3]*(b===3?2:1);
 if(beat>=6&&beat<54)add(at+.005,.55,t=>(Math.sin(2*Math.PI*note*t)*.049+Math.sin(2*Math.PI*note*2*t)*.017)*Math.exp(-t*9)*(1-Math.exp(-t*210)),b%2?.4:-.4);
}
for(const [at,f] of [[3,660],[6,740],[10,880],[11,990],[12.5,1050],[14,660],[18,880],[18.5,990],[19,1110],[19.5,1240],[20,1320],[20.5,1480],[21,990],[22.5,1110],[24,660]])add(at,.09,t=>Math.sin(2*Math.PI*f*t)*Math.exp(-t*65)*.061);
// A quiet resolved three-note chime at the brand payoff.
for(const [off,hz] of [[0,523.251],[.12,659.255],[.25,783.991]])add(24.35+off,.95,t=>(Math.sin(2*Math.PI*hz*t)+.25*Math.sin(2*Math.PI*hz*2.003*t))*Math.exp(-t*6)*.038);
const wav=Buffer.alloc(44+n*4);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(n*4,40);
let peak=0;for(let i=0;i<n;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
const scale=.52/peak;
for(let i=0;i<n;i++){const t=i/rate,fade=Math.min(1,t/.06,(DURATION-t)/.1);wav.writeInt16LE(Math.round(left[i]*scale*fade*32767),44+i*4);wav.writeInt16LE(Math.round(right[i]*scale*fade*32767),46+i*4);}
await fs.mkdir(new URL('./out/',import.meta.url),{recursive:true});await fs.writeFile(new URL('./out/soundtrack.wav',import.meta.url),wav);console.log(`Original score: ${DURATION}s, 120 BPM, stereo PCM 48kHz; peak ${20*Math.log10(.52)} dBFS`);

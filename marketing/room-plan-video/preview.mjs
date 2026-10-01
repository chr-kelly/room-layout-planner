import {renderFrame,DURATION} from './film.mjs';
const assets={};
for(const [key,file] of [['editor2d','editor-2d.jpg'],['editor3d','editor-3d.jpg'],['editorZh','editor-zh-TW.jpg']]){
 const image=new Image();image.src=`../../assets/readme/${file}`;await image.decode();assets[key]=image;
}
const chinese3d=new Image();chinese3d.src='assets/editor-3d-zh-TW.jpg';await chinese3d.decode();assets.editor3dZh=chinese3d;
const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d'),slider=document.getElementById('time'),lang=document.getElementById('language'),clock=document.getElementById('clock'),button=document.getElementById('play');
let playing=false,origin=0,frame=0;
function seek(t){renderFrame(ctx,t,lang.value,assets);clock.textContent=`${t.toFixed(2)} s`;slider.value=t;}
function tick(now){if(!playing)return;const t=((now-origin)/1000)%DURATION;seek(t);frame=requestAnimationFrame(tick);}
button.addEventListener('click',()=>{playing=!playing;button.textContent=playing?'暂停':'播放动画';if(playing){origin=performance.now()-Number(slider.value)*1000;frame=requestAnimationFrame(tick);}else cancelAnimationFrame(frame);});
slider.addEventListener('input',()=>{playing=false;button.textContent='播放动画';cancelAnimationFrame(frame);seek(Number(slider.value));});lang.addEventListener('change',()=>seek(Number(slider.value)));seek(0);

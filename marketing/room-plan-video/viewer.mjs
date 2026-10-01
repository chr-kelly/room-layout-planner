const video=document.getElementById('film');
for(const [id,lang] of [['zh','zh-CN'],['en','en']]){
 document.getElementById(id).addEventListener('click',()=>{
  video.pause();video.src=`out/room-plan-${lang}-1080x1920.mp4`;video.poster=`out/cover-${lang}.jpg`;
  video.setAttribute('aria-label',lang==='en'?'Room Layout Planner English promo film':'Room Layout Planner 中文宣传片');
  document.getElementById('zh').setAttribute('aria-pressed',String(lang==='zh-CN'));
  document.getElementById('en').setAttribute('aria-pressed',String(lang==='en'));
  const download=document.getElementById('download');download.href=video.src;download.textContent=lang==='en'?'下载英语版 MP4':'下载中文版 MP4';document.getElementById('cover').href=`out/cover-${lang}.jpg`;
 });
}

import { blankProject, exampleProject, PRESETS, newFurniture, rectangleWalls, clone, id, distance, snap, History, validateProject, parseProject, serializableProject, wallWithLength, calibrateBackground, worldToPixel, formatLength, metersToFeetInches, feetInchesToMeters, number, LIMITS } from './model.js';
import { saveProject, loadProject, clearProject } from './storage.js';
import { readImage, decodeEmbedded, compressBackground } from './images.js';
import { PlanView } from './viewport.js';

const $=selector=>document.querySelector(selector);
function el(tag,props={},children=[]) {
  const node=document.createElement(tag);
  for(const [key,value] of Object.entries(props)) {
    if(key==='text')node.textContent=value;
    else if(key==='class')node.className=value;
    else if(key.startsWith('on'))node.addEventListener(key.slice(2),value);
    else if(key in node && !key.startsWith('aria-'))node[key]=value;
    else node.setAttribute(key,String(value));
  }
  for(const child of Array.isArray(children)?children:[children])if(child!==null&&child!==undefined)node.append(typeof child==='string'?document.createTextNode(child):child);
  return node;
}
function button(text,fn,props={}) {return el('button',{type:'button',text,...props,onclick:safe(fn)});}
const restored=loadProject();let project=restored.project||blankProject(),selection=null,tool='select',mode='2d',firstPoint=null,drag=null,scene=null,sceneLoading=false,saveTimer=null,toastTimer=null;
const history=new History(60),images=new Map(),view=new PlanView($('#plan-canvas'),()=>project,key=>images.get(key));
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,6500);}
function safe(fn){return async(...args)=>{try{return await fn(...args);}catch(error){toast(error.message||'Something went wrong. Your project was not replaced.');}};}
function notice(text){$('#notice').textContent=text||'';$('#notice').hidden=!text;}
function saveStatus(text,failed=false){$('#save-status').textContent=text;$('.header-status').classList.toggle('failed',failed);}
function saveNow(){clearTimeout(saveTimer);saveTimer=null;const result=saveProject(project);saveStatus(result.ok?'Saved on this device':'Not saved — export JSON',!result.ok);if(!result.ok)notice(result.error);}
function scheduleSave(){saveStatus('Saving…');clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,500);}
function missingBackgroundNotice(){if(project.background&&!images.has(project.background.id))notice('Background not restored: images stay in this session only. Re-select the same image and confirm its alignment, or import a JSON with an embedded image.');else notice('');}
function pruneImages(){const wanted=new Set([project,...history.past,...history.future].map(p=>p.background?.id).filter(Boolean));for(const [key,value] of images)if(!wanted.has(key)){if(value.url?.startsWith('blob:'))URL.revokeObjectURL(value.url);images.delete(key);}}
function commit(next,before=project){const clean=validateProject(next);if(!history.record(before,clean))return false;project=clean;project.updatedAt=new Date().toISOString();pruneImages();updateUI();scheduleSave();return true;}
function change(fn){const next=clone(project);fn(next);return commit(next);}
function replaceProject(next,{save=true}={}){clearTimeout(saveTimer);saveTimer=null;project=validateProject(next);history.clear();selection=null;firstPoint=null;view.preview=null;setTool('select');pruneImages();updateUI();view.fit();missingBackgroundNotice();if(scene)scene.reset();if(save)scheduleSave();}
function hasWork(){return Boolean(project.walls.length||project.furniture.length||project.measurements.length||project.background);}
function download(blob,extension){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${project.name.toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'room-layout'}.${extension}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function exportJSON(include=false){let imageData;if(include&&project.background){const entry=images.get(project.background.id);if(!entry)throw new Error('Re-select the missing background first, or export without it.');imageData=entry.encoded||(entry.encoded=await compressBackground(entry.image));}const payload=JSON.stringify(serializableProject(project,imageData),null,2);if(new TextEncoder().encode(payload).byteLength>LIMITS.bytes)throw new Error('This JSON exceeds 10 MB. Export without the background.');download(new Blob([payload],{type:'application/json'}),'json');}

// Every imported/user-supplied string is inserted as text, never as markup.
function openModal(title,description,{cancelable=true,onCancel=()=>{}}={}) {
  const modal=$('#modal');if(modal.open)modal.close();modal.replaceChildren();
  const body=el('div',{class:'modal-body'}),top=el('div',{class:'modal-top'}),heading=el('h2',{id:'modal-title',text:title});
  const close=()=>modal.close();top.append(heading);if(cancelable)top.append(button('×',()=>{close();onCancel();},{class:'icon-button','aria-label':'Close dialog'}));
  const content=el('div'),error=el('div',{class:'error-message',role:'alert'}),actions=el('div',{class:'modal-actions'});
  body.append(top,el('p',{class:'modal-description',text:description}),content,error,actions);modal.append(body);
  modal.oncancel=e=>{e.preventDefault();if(cancelable){close();onCancel();}};modal.showModal();
  let busy=false;
  const action=(label,handler,{primary=false,...props}={})=>{const b=button(label,async()=>{if(busy)return;busy=true;error.textContent='';b.disabled=true;try{await handler();}catch(e){error.textContent=e.message;}finally{busy=false;b.disabled=false;}},{class:primary?'primary':'',...props});actions.append(b);return b;};
  return {body,content,error,actions,close,action};
}
function confirmAction(title,description,backup=true){return new Promise(resolve=>{const m=openModal(title,description,{onCancel:()=>resolve(false)});if(backup)m.action('Download JSON first',()=>exportJSON(false));m.action('Cancel',()=>{m.close();resolve(false);});m.action('Confirm',()=>{m.close();resolve(true);},{primary:true});});}
function rawNumber(input,label){if(!input.value.trim())throw new Error(`${label} is required.`);const value=Number(input.value);if(!Number.isFinite(value))throw new Error(`${label} must be a number.`);return value;}
function field(parent,label,value,{type='text',key='',min,max,step='any',maxLength=100}={}) {
  const fieldId=`field-${key||id()}`,wrap=el('div',{class:'form-field'}),input=el('input',{id:fieldId,type,value:String(value),step,maxLength});
  if(min!==undefined)input.min=String(min);if(max!==undefined)input.max=String(max);
  wrap.append(el('label',{htmlFor:fieldId,text:label}),input);parent.append(wrap);return input;
}
function lengthField(parent,label,meters,{key='',min=.01,max=100,units=project.units}={}) {
  const wrap=el('div',{class:'form-field'}),labelId=`label-${key||id()}`;wrap.append(el('label',{id:labelId,text:label}));parent.append(wrap);
  if(units==='metric') {
    const initial=String(Number(meters.toFixed(6))),input=el('input',{type:'number',value:initial,step:'any','aria-labelledby':labelId,id:`field-${key}-m`});
    wrap.append(el('div',{class:'unit-input'},[input,el('span',{text:'m'})]));
    return ()=>input.value===initial?meters:number(rawNumber(input,label),label,min,max);
  }
  const {feet,inches}=metersToFeetInches(meters),a=String(feet),b=String(inches);
  const ft=el('input',{type:'number',value:a,step:'1','aria-label':`${label} feet`,id:`field-${key}-ft`}),inc=el('input',{type:'number',value:b,step:'any',min:0,max:11.9999,'aria-label':`${label} inches`,id:`field-${key}-in`});
  wrap.append(el('div',{class:'imperial-fields'},[el('div',{class:'unit-input'},[ft,el('span',{text:'ft'})]),el('div',{class:'unit-input'},[inc,el('span',{text:'in'})])]));
  return ()=>{if(ft.value===a&&inc.value===b)return meters;const f=rawNumber(ft,`${label} feet`),i=rawNumber(inc,`${label} inches`);if(!Number.isInteger(f)||i<0||i>=12)throw new Error('Use whole feet and inches from 0 up to (but not including) 12.');return number(feetInchesToMeters(f,i),label,min,max);};
}
function check(parent,label,checked,key){const input=el('input',{type:'checkbox',checked,id:key});parent.append(el('label',{class:'check-label'},[input,document.createTextNode(label)]));return input;}
function welcome(initial=false){const m=openModal('Your space. Your layout.','Plan your furniture layout before you move. Start with a simple room or explore an editable example.',{cancelable:!initial});m.body.prepend(el('div',{class:'welcome-icon',text:'⌑'}));
  const unitWrap=el('div',{class:'form-field'}),units=el('select',{id:'welcome-units'},[el('option',{value:'metric',text:'Metric · metres'}),el('option',{value:'imperial',text:'Imperial · feet + inches'})]);units.value=project.units;unitWrap.append(el('label',{htmlFor:'welcome-units',text:'Choose your units'}),units);m.content.append(unitWrap,el('div',{class:'welcome-points'},['No account. No uploads. No AI guessing.',el('br'),'Just real dimensions and a little room to experiment.']));
  m.action('Start blank',()=>{m.close();replaceProject(blankProject(units.value));});m.action('Try an example',()=>{m.close();replaceProject(exampleProject(units.value));toast('Example: a 4 × 3 m room, measured between inside wall faces. Its dimensions are illustrative.');},{primary:true});m.content.append(el('p',{class:'welcome-foot',text:'Planning only. Verify furniture, doors, elevators and clearances on site. This tool does not assess structures or safe access.'}));}
function selectObject(hit){selection=hit?{id:hit.id,kind:hit.kind}:null;view.selection=selection;renderInspector();renderObjects();view.render();}
function getSelected(){return selection?project[selection.kind].find(v=>v.id===selection.id):null;}
function renderInspector(){
  const host=$('#inspector');host.replaceChildren();const item=getSelected();
  if(!item){selection=null;view.selection=null;$('#inspector-title').textContent='Your room';host.append(el('div',{class:'inspector-empty'},[el('div',{class:'empty-mark',text:'▱'}),el('p',{text:'Select furniture or a wall to edit its real dimensions.'}),el('p',{class:'hint',text:'2D is for editing. 3D is for exploring.'})]));return;}
  $('#inspector-title').textContent=selection.kind==='furniture'?item.name:selection.kind==='walls'?'Wall segment':'Measurement';
  const form=el('form',{noValidate:true}),error=el('div',{class:'error-message',role:'alert'});host.append(form);let apply;
  if(selection.kind==='furniture'){
    const name=field(form,'Name',item.name,{key:'name'}),row=el('div',{class:'field-row'});form.append(row);
    const width=lengthField(row,'Width',item.width,{key:'width'}),depth=lengthField(row,'Depth',item.depth,{key:'depth'}),height=lengthField(form,'Height',item.height,{key:'height'});
    const coords=el('div',{class:'field-row'});form.append(coords);const x=lengthField(coords,'Centre X',item.x,{key:'x',min:-500,max:500}),y=lengthField(coords,'Centre Y',item.y,{key:'y',min:-500,max:500});
    const rot=field(form,'Rotation (degrees clockwise)',item.rotation,{type:'number',key:'rotation',min:-36000,max:36000}),color=field(form,'Color',item.color,{type:'color',key:'color'});
    apply=()=>change(p=>{Object.assign(p.furniture.find(f=>f.id===item.id),{name:name.value.trim(),width:width(),depth:depth(),height:height(),x:x(),y:y(),rotation:rawNumber(rot,'Rotation'),color:color.value});});
    form.append(button('Rotate 90°',()=>rotate(90),{class:'wide',id:'rotate-item'}));
  } else if(selection.kind==='walls') {
    form.append(el('p',{class:'hint',text:'Length is measured along the wall centreline (CL), not the clear space between inside faces. Drag a round endpoint to reshape.'}));
    const length=lengthField(form,'Centreline length',distance(item.a,item.b),{key:'wall-length'});
    const coords=el('div',{class:'field-row'});form.append(coords);const ax=lengthField(coords,'Start X',item.a.x,{key:'ax',min:-500,max:500}),ay=lengthField(coords,'Start Y',item.a.y,{key:'ay',min:-500,max:500});
    const ends=el('div',{class:'field-row'});form.append(ends);const bx=lengthField(ends,'End X',item.b.x,{key:'bx',min:-500,max:500}),by=lengthField(ends,'End Y',item.b.y,{key:'by',min:-500,max:500});
    const originalLength=distance(item.a,item.b);apply=()=>change(p=>{const wall=p.walls.find(w=>w.id===item.id);wall.a={x:ax(),y:ay()};wall.b={x:bx(),y:by()};const targetLength=length();if(targetLength!==originalLength)Object.assign(wall,wallWithLength(wall,targetLength));});
    form.append(el('p',{class:'hint',text:'Editing a wall does not move adjoining walls automatically. Use Create / resize room to change a simple rectangle. No structural safety assessment is made.'}));
  } else {
    form.append(el('p',{text:formatLength(distance(item.a,item.b),project.units)}));
    const start=el('div',{class:'field-row'}),end=el('div',{class:'field-row'});form.append(start,end);
    const ax=lengthField(start,'Start X',item.a.x,{key:'max',min:-500,max:500}),ay=lengthField(start,'Start Y',item.a.y,{key:'may',min:-500,max:500}),bx=lengthField(end,'End X',item.b.x,{key:'mbx',min:-500,max:500}),by=lengthField(end,'End Y',item.b.y,{key:'mby',min:-500,max:500});
    apply=()=>change(p=>{Object.assign(p.measurements.find(m=>m.id===item.id),{a:{x:ax(),y:ay()},b:{x:bx(),y:by()}});});
  }
  form.append(el('button',{type:'submit',text:'Apply changes',class:'primary wide',id:'apply-properties'}),error);
  form.addEventListener('submit',e=>{e.preventDefault();try{apply();toast('Changes applied.');}catch(err){error.textContent=err.message;}});
  const actions=el('div',{class:'form-actions'});if(selection.kind==='furniture')actions.append(button('Duplicate',duplicate,{id:'duplicate-item'}));actions.append(button('Delete',deleteSelected,{class:'danger-text',id:'delete-item'}));host.append(actions);
}
function renderObjects(){const list=$('#object-list');list.replaceChildren();$('#object-count').textContent=String(project.furniture.length+project.walls.length+project.measurements.length);
  for(const [kind,items] of [['furniture',project.furniture],['walls',project.walls],['measurements',project.measurements]])items.forEach((item,i)=>{
    const name=kind==='furniture'?item.name:kind==='walls'?`Wall ${i+1}`:`Measurement ${i+1}`;
    const row=button('',()=>selectObject({id:item.id,kind}),{class:'object-row','aria-pressed':selection?.id===item.id,'aria-label':`Select ${name}`});
    const swatch=el('span',{class:'swatch'});swatch.style.backgroundColor=item.color|| (kind==='walls'?'#586252':'#7f9972');row.append(swatch,el('span',{class:'object-name',text:name}),el('span',{class:'object-size',text:kind==='furniture'?formatLength(item.width,project.units):formatLength(distance(item.a,item.b),project.units)}));list.append(row);
  });if(!list.children.length)list.append(el('p',{class:'hint',text:'Your walls and furniture will appear here.'}));
}
function renderBackground(){const host=$('#background-controls'),bg=project.background;host.hidden=!bg;host.replaceChildren();if(!bg)return;
  host.append(el('h2',{text:'Background image'}),el('p',{class:'hint',text:bg.calibration?'Calibrated using a known distance.':'Not calibrated. Do not trace to assumed dimensions.'}));
  const visible=check(host,'Show background',bg.visible,'bg-visible');visible.onchange=()=>change(p=>p.background.visible=visible.checked);
  const lock=check(host,'Lock background',bg.locked,'bg-locked');lock.onchange=()=>change(p=>p.background.locked=lock.checked);
  const opacity=field(host,'Opacity',bg.opacity,{type:'range',key:'opacity',min:0,max:1,step:.05});opacity.onchange=()=>change(p=>p.background.opacity=Number(opacity.value));
  host.append(button('Calibrate with 2 points',()=>{closePanels();setTool('calibrate');},{class:'wide'}),button('Re-select / replace image',()=>$('#image-file').click(),{class:'wide'}));
  host.append(el('p',{class:'hint',text:'Unlock to drag the image in Select mode. Changing its scale never changes existing walls or furniture.'}));
}
function updateUI(){
  if(selection&&!getSelected())selection=null;view.selection=selection;
  $('#project-name').textContent=project.name;$('#units').value=project.units;$('#snap-grid').checked=project.settings.snap;$('#show-grid').checked=project.settings.showGrid;
  $('#undo').disabled=!history.past.length;$('#redo').disabled=!history.future.length;
  renderInspector();renderObjects();renderBackground();view.render();if(scene)scene.build();
}
function furnitureSymbol(preset){const wrap=el('div');const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 80 46');svg.setAttribute('aria-hidden','true');
  const rect=(x,y,w,h,fill,rx=3)=>{const r=document.createElementNS(ns,'rect');for(const[k,v]of Object.entries({x,y,width:w,height:h,rx,fill,stroke:'#6b705b55','stroke-width':1}))r.setAttribute(k,v);svg.append(r);};
  const c=preset.color;if(preset.type==='sofa'){rect(8,10,64,27,c,5);rect(17,15,22,17,'#ffffff33');rect(41,15,22,17,'#ffffff33');rect(8,14,8,23,c);rect(64,14,8,23,c);}else if(preset.type==='bed'){rect(20,4,40,38,c);rect(23,7,15,8,'#ffffff88');rect(42,7,15,8,'#ffffff88');rect(23,19,34,20,'#ffffff33');}else if(preset.type==='chair'){rect(26,10,28,27,c,7);rect(30,17,20,15,'#ffffff44');}else {rect(12,10,56,27,c);rect(16,13,48,4,'#ffffff55');}
  return svg;
}
for(const preset of PRESETS){const b=button('',()=>addFurniture(preset),{class:'preset-card','aria-label':`Add ${preset.name}`});b.append(furnitureSymbol(preset),el('strong',{text:preset.name}),el('small',{text:`${preset.width} × ${preset.depth} m`}));$('#presets').append(b);}
function addFurniture(preset){if(mode==='3d')switchView('2d');const f=newFurniture(preset,Math.max(-490,Math.min(490,(view.width/2-view.origin.x)/view.scale)),Math.max(-490,Math.min(490,(view.height/2-view.origin.y)/view.scale)));change(p=>p.furniture.push(f));selectObject({id:f.id,kind:'furniture'});setTool('select');closePanels();toast(`${f.name} added. Drag to move; edit dimensions in Details.`);}
function rotate(degrees){if(selection?.kind!=='furniture')return;change(p=>{const f=p.furniture.find(f=>f.id===selection.id);f.rotation+=degrees;});}
function duplicate(){if(selection?.kind!=='furniture')return;const item=getSelected(),copy={...clone(item),id:id(),x:item.x+.15,y:item.y+.15};change(p=>p.furniture.push(copy));selectObject({id:copy.id,kind:'furniture'});}
function deleteSelected(){if(!selection)return;const chosen=selection;change(p=>p[chosen.kind]=p[chosen.kind].filter(v=>v.id!==chosen.id));selection=null;updateUI();}
function undo(){const previous=history.undo(project);if(previous){project=previous;selection=null;firstPoint=null;view.preview=null;updateUI();missingBackgroundNotice();scheduleSave();}}
function redo(){const next=history.redo(project);if(next){project=next;selection=null;updateUI();missingBackgroundNotice();scheduleSave();}}
function setTool(next){
  if(next==='calibrate'&&(!project.background||!images.has(project.background.id))){toast('Import or re-select a background image before calibration.');return;}
  if(mode==='3d')switchView('2d');tool=next;firstPoint=null;view.preview=null;view.render();
  for(const b of document.querySelectorAll('[data-tool]'))b.setAttribute('aria-pressed',String(b.dataset.tool===tool));
  const hints={select:'Select or drag an item. Edit exact sizes in Details.',wall:'Tap two endpoints. Hold Shift for a straight axis.',measure:'Tap two points to measure their distance.',calibrate:'Tap two image points with a known real distance.',pan:'Drag the canvas to move your view.'};$('#tool-hint').textContent=hints[tool];$('#plan-canvas').style.cursor=tool==='select'?'default':tool==='pan'?'grab':'crosshair';
}
function drawPoint(event){let p=view.point(event);if(tool==='calibrate')return p;
  if(project.settings.snap){let closest=null,d=10/view.scale;for(const w of project.walls)for(const q of [w.a,w.b])if(distance(p,q)<d){d=distance(p,q);closest=q;}p=closest?clone(closest):{x:snap(p.x,project.settings.gridSize),y:snap(p.y,project.settings.gridSize)};}
  if(event.shiftKey&&firstPoint){if(Math.abs(p.x-firstPoint.x)>Math.abs(p.y-firstPoint.y))p.y=firstPoint.y;else p.x=firstPoint.x;}return p;
}
function inBackground(point){const bg=project.background,p=worldToPixel(point,bg);return p.x>=0&&p.y>=0&&p.x<=bg.pixelWidth&&p.y<=bg.pixelHeight;}
async function secondPoint(a,b){
  if(tool==='calibrate'){
    const bg=clone(project.background),pa=worldToPixel(a,bg),pb=worldToPixel(b,bg);if(distance(pa,pb)<1)throw new Error('Choose two different image points.');
    const m=openModal('Set a known distance','Use a length you measured or a reliable dimension printed on the plan. Do not guess from doors or furniture. Recalibration changes only the background scale; walls and furniture stay unchanged.');
    const read=lengthField(m.content,'Actual distance',bg.calibration?.realMeters||4,{key:'calibration',min:.001,max:100});m.action('Cancel',()=>{m.close();view.preview=null;view.render();});m.action('Apply calibration',()=>{const updated=calibrateBackground(bg,pa,pb,read());change(p=>p.background=updated);m.close();setTool('select');toast('Background calibrated. Existing geometry was not scaled.');},{primary:true});return;
  }
  if(distance(a,b)<.01)throw new Error('Choose two points at least 0.01 m apart.');
  if(tool==='wall'){const w={id:id(),a,b,height:project.settings.wallHeight,thickness:project.settings.wallThickness};change(p=>p.walls.push(w));selectObject({id:w.id,kind:'walls'});}
  else {const m={id:id(),a,b};change(p=>p.measurements.push(m));selectObject({id:m.id,kind:'measurements'});toast(`Distance: ${formatLength(distance(a,b),project.units)}`);}
}
const canvas=$('#plan-canvas');
canvas.addEventListener('pointerdown',safe(async event=>{
  if(event.button!==0||drag||mode!=='2d')return;canvas.focus({preventScroll:true});
  if(['wall','measure','calibrate'].includes(tool)){
    const p=drawPoint(event);if(tool==='calibrate'&&!inBackground(p))throw new Error('Choose points inside the background image.');
    if(!firstPoint){firstPoint=p;view.preview={a:p,b:p,kind:tool};view.render();$('#tool-hint').textContent='First point set. Tap the second point.';}
    else {const a=clone(firstPoint);firstPoint=null;view.preview=null;view.render();await secondPoint(a,p);}return;
  }
  const point=view.point(event),hit=tool==='select'?view.hit(point):null;
  if(tool==='select')selectObject(hit);
  let type=tool==='pan'?'pan':hit?'object':'none';
  if(type==='none'&&project.background&&!project.background.locked&&images.has(project.background.id)&&inBackground(point))type='background';
  drag={type,hit,start:point,client:{x:event.clientX,y:event.clientY},origin:clone(view.origin),before:clone(project),pointerId:event.pointerId,moved:false};canvas.setPointerCapture(event.pointerId);
}));
canvas.addEventListener('pointermove',event=>{
  if(firstPoint){const p=drawPoint(event);view.preview={a:firstPoint,b:p,kind:tool};view.render();}
  if(!drag||drag.pointerId!==event.pointerId)return;
  const dx=event.clientX-drag.client.x,dy=event.clientY-drag.client.y;if(Math.hypot(dx,dy)>3)drag.moved=true;if(!drag.moved)return;
  if(drag.type==='pan'){view.origin={x:drag.origin.x+dx,y:drag.origin.y+dy};view.render();return;}
  const delta={x:dx/view.scale,y:dy/view.scale};
  if(drag.type==='object'){
    const {kind,id:objectId,endpoint}=drag.hit,old=drag.before[kind].find(v=>v.id===objectId),item=project[kind].find(v=>v.id===objectId),grid=project.settings.gridSize;
    const move=p=>{let x=p.x+delta.x,y=p.y+delta.y;if(project.settings.snap){x=snap(x,grid);y=snap(y,grid);}return{x,y};};
    if(kind==='furniture')Object.assign(item,move(old));else if(endpoint)item[endpoint]=move(old[endpoint]);else {const target=move(old.a),offset={x:target.x-old.a.x,y:target.y-old.a.y};item.a=target;item.b={x:old.b.x+offset.x,y:old.b.y+offset.y};}
  } else if(drag.type==='background'){project.background.x=drag.before.background.x+delta.x;project.background.y=drag.before.background.y+delta.y;}
  view.render();
});
function finishDrag(cancel=false){if(!drag)return;const previous=drag;drag=null;
  if(previous.type==='object'||previous.type==='background'){
    if(cancel||!previous.moved){project=previous.before;view.render();return;}
    try{commit(project,previous.before);}catch(error){project=previous.before;updateUI();toast(error.message);}
  }
}
canvas.addEventListener('pointerup',()=>finishDrag());canvas.addEventListener('pointercancel',()=>finishDrag(true));window.addEventListener('blur',()=>finishDrag(true));
canvas.addEventListener('wheel',e=>{if(mode==='2d'){e.preventDefault();const r=canvas.getBoundingClientRect();view.zoom(e.deltaY<0?1.1:1/1.1,{x:e.clientX-r.left,y:e.clientY-r.top});}},{passive:false});

async function switchView(next){
  if(next==='3d'&&sceneLoading)return;
  if(next==='2d'){mode='2d';if(scene)scene.hide();$('#three-host').hidden=true;$('#three-error').hidden=true;canvas.hidden=false;$('#tool-rail').hidden=false;$('#three-options').hidden=true;$('#walk-controls').hidden=true;$('#view-2d').setAttribute('aria-pressed','true');$('#view-3d').setAttribute('aria-pressed','false');view.resize();view.render();return;}
  firstPoint=null;view.preview=null;finishDrag();sceneLoading=true;$('#view-3d').disabled=true;
  try{
    $('#three-host').hidden=false;
    if(!scene){const {SceneView}=await import('./scene3d.js');scene=new SceneView($('#three-host'),()=>project,reason=>{switchView('2d');notice(reason);});}
    mode='3d';canvas.hidden=true;$('#tool-rail').hidden=true;$('#three-error').hidden=true;$('#three-options').hidden=false;$('#view-2d').setAttribute('aria-pressed','false');$('#view-3d').setAttribute('aria-pressed','true');scene.show();$('#tool-hint').textContent='Drag to orbit. Scroll or pinch to zoom. Ground plane is illustrative.';
  }catch(error){$('#three-host').hidden=true;$('#three-host').replaceChildren();mode='2d';canvas.hidden=false;notice('3D is unavailable: WebGL2 or the local Three.js files could not be loaded. 2D editing, JSON backup and PNG export still work.');}
  finally{sceneLoading=false;$('#view-3d').disabled=false;}
}
function setWalk(enabled){if(!scene)return;scene.setWalk(enabled);$('#walk-controls').hidden=!enabled;$('#overview').setAttribute('aria-pressed',String(!enabled));$('#walk').setAttribute('aria-pressed',String(enabled));if(!enabled)scene.reset();$('#tool-hint').textContent=enabled?'WASD or touch buttons move. Drag to look. No collision checks.':'Drag to orbit. The ground plane is illustrative.';}
function closePanels(){for(const p of document.querySelectorAll('.panel'))p.classList.remove('open');for(const b of document.querySelectorAll('[data-panel]'))b.classList.remove('active');}
for(const b of document.querySelectorAll('[data-close-panel]'))b.onclick=closePanels;
for(const b of document.querySelectorAll('[data-panel]'))b.onclick=()=>{const isOpen=b.classList.contains('active');closePanels();if(isOpen)return;if(b.dataset.panel==='tools'){switchView('2d');$('#tool-rail').hidden=false;toast('Choose Select, Wall, Measure, Calibrate or Pan above the canvas.');return;}b.classList.add('active');$(`#${b.dataset.panel}-panel`).classList.add('open');};
for(const b of document.querySelectorAll('[data-tool]'))b.onclick=()=>{closePanels();setTool(b.dataset.tool);};
for(const b of document.querySelectorAll('[data-walk]')){b.onpointerdown=e=>{if(!scene)return;e.preventDefault();b.setPointerCapture(e.pointerId);scene.keys.add(b.dataset.walk);};const stop=()=>scene?.keys.delete(b.dataset.walk);b.onpointerup=stop;b.onpointercancel=stop;b.onlostpointercapture=stop;}
$('#view-2d').onclick=()=>switchView('2d');$('#view-3d').onclick=()=>switchView('3d');$('#overview').onclick=()=>setWalk(false);$('#walk').onclick=()=>setWalk(true);$('#cutaway').onchange=e=>scene?.setCutaway(e.target.checked);
$('#undo').onclick=undo;$('#redo').onclick=redo;
$('#zoom-in').onclick=()=>mode==='3d'?scene?.zoom(1.2):view.zoom(1.2);$('#zoom-out').onclick=()=>mode==='3d'?scene?.zoom(1/1.2):view.zoom(1/1.2);$('#fit-view').onclick=()=>{if(mode==='3d'){scene?.reset();setWalk(false);}else view.fit();};
$('#snap-grid').onchange=e=>change(p=>p.settings.snap=e.target.checked);$('#show-grid').onchange=e=>change(p=>p.settings.showGrid=e.target.checked);$('#units').onchange=e=>change(p=>p.units=e.target.value);
$('#new-project').onclick=safe(async()=>{if(hasWork()&&!await confirmAction('Start a new project?','This replaces the current plan and starts a new undo history. Download a JSON backup first.'))return;welcome();});
$('#project-name').onclick=()=>{const m=openModal('Name your project','Use a short name to recognize your exported layouts.');const name=field(m.content,'Project name',project.name,{key:'project-name'});m.action('Save name',()=>{change(p=>p.name=name.value.trim());m.close();},{primary:true});};
$('#rectangle-room').onclick=()=>{
  let width=4,depth=3;if(project.walls.length===4){const pts=project.walls.flatMap(w=>[w.a,w.b]);width=Math.max(...pts.map(p=>p.x))-Math.min(...pts.map(p=>p.x))-project.settings.wallThickness;depth=Math.max(...pts.map(p=>p.y))-Math.min(...pts.map(p=>p.y))-project.settings.wallThickness;}
  const m=openModal('Create / resize a room','Enter clear INSIDE dimensions. Four straight wall segments will replace existing walls. Furniture and measurements stay in place; this can be undone. The room’s inside top-left corner is (0, 0).');
  const w=lengthField(m.content,'Inside width',width,{key:'room-width',min:.1,max:99}),d=lengthField(m.content,'Inside depth',depth,{key:'room-depth',min:.1,max:99});
  m.action('Cancel',m.close);m.action(project.walls.length?'Replace walls':'Create room',()=>{change(p=>p.walls=rectangleWalls(w(),d(),p.settings,p.walls.length===4?p.walls:[]));m.close();closePanels();setTool('select');view.fit();},{primary:true});
};
$('#wall-settings').onclick=()=>{const m=openModal('Wall dimensions','These values apply to ALL walls and to new wall segments. They are model dimensions, not structural advice.');const height=lengthField(m.content,'Wall height',project.settings.wallHeight,{key:'global-height',min:.1,max:10}),thickness=lengthField(m.content,'Wall thickness',project.settings.wallThickness,{key:'global-thickness',min:.02,max:1});m.action('Apply to all walls',()=>{change(p=>{p.settings.wallHeight=height();p.settings.wallThickness=thickness();for(const w of p.walls){w.height=p.settings.wallHeight;w.thickness=p.settings.wallThickness;}});m.close();toast('Wall dimensions updated. Recheck clear inside dimensions.');},{primary:true});};
$('#custom-furniture').onclick=()=>{const m=openModal('Add custom furniture','A simple box with your real dimensions. All dimensions can be edited later.');const name=field(m.content,'Name','Custom item',{key:'custom-name'}),width=lengthField(m.content,'Width',1,{key:'custom-width'}),depth=lengthField(m.content,'Depth',.6,{key:'custom-depth'}),height=lengthField(m.content,'Height',.8,{key:'custom-height'}),color=field(m.content,'Color','#bac4ad',{type:'color',key:'custom-color'});m.action('Add furniture',()=>{addFurniture({type:'box',name:name.value.trim(),width:width(),depth:depth(),height:height(),color:color.value});m.close();},{primary:true});};
$('#clear-project').onclick=safe(async()=>{if(!await confirmAction('Clear the current project?','This removes this app’s current plan and its saved browser copy. Downloaded files and other websites’ data are not deleted. Undo history will be cleared.'))return;const units=project.units;replaceProject(blankProject(units),{save:false});const result=clearProject();saveStatus(result.ok?'Cleared — no saved project':'Could not clear saved copy',!result.ok);if(!result.ok)notice(result.error);closePanels();});
$('#export-project').onclick=()=>{const m=openModal('Take your plan with you','Save JSON to keep editing. Save PNG to show your layout. To compare alternatives, export layout A, make changes, then export layout B.');const opts=el('div',{class:'export-options'}),include=check(opts,'Include background image',false,'export-background');opts.append(el('p',{text:'JSON embeds a re-encoded image of at most 2 MB. Without it, re-select the original image next time.'}));m.content.append(opts);m.action('Download JSON',async()=>{await exportJSON(include.checked);toast('JSON downloaded. Keep a copy outside this browser.');},{primary:true});m.action('Download PNG',async()=>{if(include.checked&&project.background&&!images.has(project.background.id))throw new Error('Re-select the missing background first.');download(await view.png(include.checked),'png');toast('PNG downloaded. Use JSON to keep editing.');});};
$('#import-project').onclick=()=>$('#project-file').click();$('#import-image').onclick=()=>$('#image-file').click();
$('#project-file').onchange=safe(async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;if(file.size>LIMITS.bytes)throw new Error('JSON files must be 10 MB or smaller.');const incoming=parseProject(await file.text());let imageEntry=null;if(incoming.background?.dataURL){imageEntry=await decodeEmbedded(incoming.background.dataURL,incoming.background.pixelWidth,incoming.background.pixelHeight);delete incoming.background.dataURL;}
  if(hasWork()&&!await confirmAction('Open this project?','The imported plan passed validation. Opening it replaces the current plan and starts a new undo history.'))return;
  if(imageEntry)images.set(incoming.background.id,imageEntry);replaceProject(incoming);toast('Project opened.');
});
function backgroundChoice(dimsMatch){return new Promise(resolve=>{const m=openModal('Replace the background?',dimsMatch?'The pixel dimensions match. Only keep the current alignment if this is the SAME image with the SAME crop and orientation. Otherwise start uncalibrated.':'The pixel dimensions changed. The old calibration cannot be reused. Start uncalibrated and calibrate the new image.',{onCancel:()=>resolve('cancel')});m.action('Cancel',()=>{m.close();resolve('cancel');});m.action('Start uncalibrated',()=>{m.close();resolve('reset');},{primary:!dimsMatch});if(dimsMatch)m.action('Keep alignment',()=>{m.close();resolve('keep');},{primary:true});});}
$('#image-file').onchange=safe(async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;const entry=await readImage(file),old=project.background;let choice='reset';
  if(old)choice=await backgroundChoice(old.pixelWidth===entry.width&&old.pixelHeight===entry.height);
  if(choice==='cancel'){URL.revokeObjectURL(entry.url);return;}
  const bg=choice==='keep'?{...clone(old),id:id()}: {id:id(),pixelWidth:entry.width,pixelHeight:entry.height,x:0,y:0,metersPerPixel:Math.min(6/entry.width,5/entry.height),opacity:.55,visible:true,locked:true,calibration:null};
  delete bg.dataURL;images.set(bg.id,entry);try{change(p=>p.background=bg);}catch(error){images.delete(bg.id);URL.revokeObjectURL(entry.url);throw error;}
  missingBackgroundNotice();view.fit();closePanels();if(!bg.calibration){setTool('calibrate');toast('Image imported locally. Choose two points to set a known distance.');}else toast('Image restored with your confirmed alignment.');
});
$('#help').onclick=()=>{const m=openModal('A little help, a better fit.','A free, local-first 2D & 3D room layout planner.');const content=el('div',{class:'help-copy'});for(const [title,text] of [
  ['01 · Establish the scale','Create a room using its inside dimensions, or import a PNG / JPG and calibrate it with two points and a known distance. There is no image recognition or size guessing.'],
  ['02 · Trace, then arrange','Wall and Measure use two clicks or taps. Select furniture to drag it. Select a wall and drag a round endpoint. Details provides exact dimensions, positions, angles, duplication and deletion. Wall labels show centreline length (CL), not clear inside dimensions.'],
  ['03 · Check it in 3D','Overview supports orbit and zoom. Walk through supports WASD, arrow keys and touch direction buttons; drag to look. Cutaway walls intentionally display shorter walls. Turn it off to see their full height. There is no collision or path-safety assessment.'],
  ['Save outside the browser','Geometry autosaves locally. Background images are session-only unless embedded in an exported JSON. Export both JSON and PNG before clearing storage or switching devices. No share links or cloud sync are provided.'],
  ['Keyboard shortcuts','V Select · W Wall · M Measure · P Pan · F Fit · R Rotate 90° · Delete Remove · Ctrl / Cmd D Duplicate · Ctrl / Cmd Z Undo · Ctrl / Cmd Shift Z Redo · Escape Cancel. Shortcuts do not delete or edit objects while typing in fields. Every basic task also has a button.'],
  ['Privacy and offline use','No accounts, analytics, ads, remote fonts or third-party runtime requests. Your image and plan are not uploaded. A hosting provider may log ordinary page requests. Run the downloaded folder through a local static HTTP server; opening index.html with file:// is not supported.'],
  ['Limits and safety','Single floor, straight walls, 200 walls + 200 furniture items + 200 measurements, 10 MB input files, 16 megapixel images. This is a planning aid, not a construction, structural, compliance, delivery or accessibility assessment. Verify on site.'],
  ['Open source','Original implementation: MIT. Inspired by wy51ai/floorplan-3d, now MIT-licensed. Three.js and its controls retain their upstream MIT license. Dependency versions and notices are included in the source package.']])content.append(el('h3',{text:title}),el('p',{text}));m.content.append(content);m.action('Back to my room',m.close,{primary:true});};
window.addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea,select,[contenteditable]')||$('#modal').open)return;
  const key=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
  if(mod&&key==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if(mod&&key==='y'){e.preventDefault();redo();return;}
  if(mod&&key==='d'){e.preventDefault();duplicate();return;}
  if(key==='escape'){finishDrag(true);firstPoint=null;view.preview=null;selectObject(null);closePanels();setTool('select');return;}
  if(mode==='3d')return;
  if(key==='delete'||key==='backspace'){e.preventDefault();deleteSelected();}
  else if(key==='r')rotate(e.shiftKey?-90:90);
  else if(key==='f')view.fit();
  else if(['v','w','m','p'].includes(key)&&!mod)setTool({v:'select',w:'wall',m:'measure',p:'pan'}[key]);
});
window.addEventListener('pagehide',()=>{if(saveTimer)saveNow();});
updateUI();requestAnimationFrame(()=>view.fit());
if(!restored.ok){saveStatus('Could not restore saved copy',true);notice(restored.error);}else if(!restored.project)welcome(true);else{saveStatus('Restored from this device');missingBackgroundNotice();}
if(location.protocol==='file:')notice('Open this app through a local HTTP server, not by double-clicking index.html. See README for instructions.');
// Read-only diagnostics are opt-in and used by the browser tests, not by normal sessions.
if(new URLSearchParams(location.search).has('test'))Object.defineProperty(window,'plannerTest',{value:{snapshot:()=>clone(project),screen:p=>view.screen(p),history:()=>({undo:history.past.length,redo:history.future.length}),mode:()=>mode,scene:()=>scene?.snapshot()||[]}});

import { message, isMessage, PlannerError } from './messages.js';
import { LOCALES, getLocale, initializeLocale, changeLocale, onLocaleChange, translateDOM, bindText, bindAttribute, refreshBindings, resolve, t, formatNumber, formatLength, displayName, nameMessage, errorMessage, suggestedLocale } from './i18n.js';
import { blankProject, exampleProject, PRESETS, newFurniture, rectangleWalls, clone, id, distance, snap, History, validateProject, parseProject, serializableProject, wallWithLength, calibrateBackground, worldToPixel, metersToFeetInches, feetInchesToMeters, number, LIMITS } from './model.js';
import { saveProject, loadProject, clearProject } from './storage.js';
import { readImage, decodeEmbedded, compressBackground } from './images.js';
import { PlanView } from './viewport.js';

const $=selector=>document.querySelector(selector);
await initializeLocale();
translateDOM();
const namedInputs=new Map();
function el(tag,props={},children=[]) {
  const node=document.createElement(tag);
  for(const [key,value] of Object.entries(props)) {
    if(key==='text'){if(isMessage(value)||typeof value==='function')bindText(node,value);else node.textContent=value;}
    else if(key==='class')node.className=value;
    else if(key.startsWith('on'))node.addEventListener(key.slice(2),value);
    else if(isMessage(value)||typeof value==='function')bindAttribute(node,key,value);
    else if(key in node && !key.startsWith('aria-'))node[key]=value;
    else node.setAttribute(key,String(value));
  }
  for(const child of Array.isArray(children)?children:[children])if(child!==null&&child!==undefined)node.append(isMessage(child)?el('span',{text:child}):typeof child==='string'?document.createTextNode(child):child);
  return node;
}
function button(text,fn,props={}) {return el('button',{type:'button',text,...props,onclick:safe(fn)});}
const restored=loadProject();let project=restored.project||blankProject(),selection=null,tool='select',mode='2d',firstPoint=null,drag=null,scene=null,sceneLoading=false,saveTimer=null,toastTimer=null;
const history=new History(60),images=new Map(),view=new PlanView($('#plan-canvas'),()=>project,key=>images.get(key));
function toast(text){bindText($('#toast'),text);$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,6500);}
function safe(fn){return async(...args)=>{try{return await fn(...args);}catch(error){toast(errorMessage(error));}};}
function notice(text){bindText($('#notice'),text||'');$('#notice').hidden=!text;}
function saveStatus(text,failed=false){bindText($('#save-status'),text);$('.header-status').classList.toggle('failed',failed);}
function saveNow(){clearTimeout(saveTimer);saveTimer=null;const result=saveProject(project);saveStatus(result.ok?message('ui.saved_on_this_device'):message('ui.not_saved_export_json'),!result.ok);if(!result.ok)notice(message(result.errorCode));}
function scheduleSave(){saveStatus(message('ui.saving'));clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,500);}
function missingBackgroundNotice(){if(project.background&&!images.has(project.background.id))notice(message('ui.background_not_restored_images_stay_in_this_session'));else notice('');}
function pruneImages(){const wanted=new Set([project,...history.past,...history.future].map(p=>p.background?.id).filter(Boolean));for(const [key,value] of images)if(!wanted.has(key)){if(value.url?.startsWith('blob:'))URL.revokeObjectURL(value.url);images.delete(key);}}
function commit(next,before=project){const clean=validateProject(next);if(!history.record(before,clean))return false;project=clean;project.updatedAt=new Date().toISOString();pruneImages();updateUI();scheduleSave();return true;}
function change(fn){const next=clone(project);fn(next);return commit(next);}
function replaceProject(next,{save=true}={}){clearTimeout(saveTimer);saveTimer=null;project=validateProject(next);history.clear();selection=null;firstPoint=null;view.preview=null;setTool('select');pruneImages();updateUI();view.fit();missingBackgroundNotice();if(scene)scene.reset();if(save)scheduleSave();}
function hasWork(){return Boolean(project.walls.length||project.furniture.length||project.measurements.length||project.background);}
function download(blob,extension){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${project.name.toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'room-layout'}.${extension}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function exportJSON(include=false){let imageData;if(include&&project.background){const entry=images.get(project.background.id);if(!entry)throw new PlannerError('ui.re_select_the_missing_background_first_or_export');imageData=entry.encoded||(entry.encoded=await compressBackground(entry.image));}const payload=JSON.stringify(serializableProject(project,imageData),null,2);if(new TextEncoder().encode(payload).byteLength>LIMITS.bytes)throw new PlannerError('ui.this_json_exceeds_10_mb_export_without_the');download(new Blob([payload],{type:'application/json'}),'json');}

// Every imported/user-supplied string is inserted as text, never as markup.
function openModal(title,description,{cancelable=true,onCancel=()=>{}}={}) {
  const modal=$('#modal');if(modal.open)modal.close();modal.replaceChildren();
  const body=el('div',{class:'modal-body'}),top=el('div',{class:'modal-top'}),heading=el('h2',{id:'modal-title',text:title});
  const close=()=>modal.close();top.append(heading);if(cancelable)top.append(button('×',()=>{close();onCancel();},{class:'icon-button','aria-label':message('ui.close_dialog')}));
  const content=el('div'),error=el('div',{class:'error-message',role:'alert'}),actions=el('div',{class:'modal-actions'});
  body.append(top,el('p',{class:'modal-description',text:description}),content,error,actions);modal.append(body);
  modal.oncancel=e=>{e.preventDefault();if(cancelable){close();onCancel();}};modal.showModal();
  let busy=false;
  const action=(label,handler,{primary=false,...props}={})=>{const b=button(label,async()=>{if(busy)return;busy=true;bindText(error,'');b.disabled=true;try{await handler();}catch(e){bindText(error,errorMessage(e));}finally{busy=false;b.disabled=false;}},{class:primary?'primary':'',...props});actions.append(b);return b;};
  return {body,content,error,actions,close,action};
}
function confirmAction(title,description,backup=true){return new Promise(resolve=>{const m=openModal(title,description,{onCancel:()=>resolve(false)});if(backup)m.action(message('ui.download_json_first'),()=>exportJSON(false));m.action(message('ui.cancel'),()=>{m.close();resolve(false);});m.action(message('ui.confirm'),()=>{m.close();resolve(true);},{primary:true});});}
function rawNumber(input,label){const text=input.value.trim();if(!text)throw new PlannerError('error.required',{label});if(!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(text))throw new PlannerError('error.number',{label});const value=Number(text.replace(',','.'));if(!Number.isFinite(value))throw new PlannerError('error.number',{label});return value;}
function field(parent,label,value,{type='text',key='',min,max,step='any',maxLength=100}={}) {
  const fieldId=`field-${key||id()}`,wrap=el('div',{class:'form-field'}),input=el('input',{id:fieldId,type:type==='number'?'text':type,value:resolve(value),step,maxLength});if(type==='number')input.inputMode='decimal';
  if(min!==undefined)input.min=String(min);if(max!==undefined)input.max=String(max);
  wrap.append(el('label',{htmlFor:fieldId,text:label}),input);parent.append(wrap);return input;
}
function namedField(parent,label,item,options){const input=field(parent,label,displayName(item),options);const entry={item,initial:input.value,edited:false};namedInputs.set(input,entry);input.addEventListener('input',()=>entry.edited=true);return input;}
function assignName(target,input){const entry=namedInputs.get(input);if(entry&&!entry.edited&&input.value===entry.initial){target.name=entry.item.name;if(entry.item.nameKey)target.nameKey=entry.item.nameKey;else delete target.nameKey;}else{target.name=input.value.trim();delete target.nameKey;}}
function lengthField(parent,label,meters,{key='',min=.01,max=100,units=project.units}={}) {
  const wrap=el('div',{class:'form-field'}),labelId=`label-${key||id()}`;wrap.append(el('label',{id:labelId,text:label}));parent.append(wrap);
  if(units==='metric') {
    const initial=String(Number(meters.toFixed(6))),input=el('input',{type:'text',inputMode:'decimal',value:initial,'aria-labelledby':labelId,id:`field-${key}-m`});
    wrap.append(el('div',{class:'unit-input'},[input,el('span',{text:'m'})]));
    return ()=>input.value===initial?meters:number(rawNumber(input,label),label,min,max);
  }
  const {feet,inches}=metersToFeetInches(meters),a=String(feet),b=String(inches);
  const ft=el('input',{type:'text',inputMode:'numeric',value:a,'aria-label':message('field.feet',{label}),id:`field-${key}-ft`}),inc=el('input',{type:'text',inputMode:'decimal',value:b,'aria-label':message('field.inches',{label}),id:`field-${key}-in`});
  wrap.append(el('div',{class:'imperial-fields'},[el('div',{class:'unit-input'},[ft,el('span',{text:'ft'})]),el('div',{class:'unit-input'},[inc,el('span',{text:'in'})])]));
  return ()=>{if(ft.value===a&&inc.value===b)return meters;const f=rawNumber(ft,message('field.feet',{label})),i=rawNumber(inc,message('field.inches',{label}));if(!Number.isInteger(f)||i<0||i>=12)throw new PlannerError('ui.use_whole_feet_and_inches_from_0_up');return number(feetInchesToMeters(f,i),label,min,max);};
}
function check(parent,label,checked,key){const input=el('input',{type:'checkbox',checked,id:key});parent.append(el('label',{class:'check-label'},[input,el('span',{text:label})]));return input;}
function languageSelect(id){const input=el('select',{id,'data-language-picker':'','aria-label':message('language.label')},LOCALES.map(l=>el('option',{value:l.code,text:l.name,lang:l.code})));input.value=getLocale();input.onchange=async()=>{input.disabled=true;try{await changeLocale(input.value);}catch{input.value=getLocale();toast(message('language.error'));}finally{input.disabled=false;}};return input;}
function welcome(initial=false){const m=openModal(message('ui.your_space_your_layout'),message('ui.plan_your_furniture_layout_before_you_move_start'),{cancelable:!initial});m.body.prepend(el('div',{class:'welcome-icon',text:'⌑'}));
  const languageWrap=el('div',{class:'form-field'});languageWrap.append(el('label',{htmlFor:'welcome-language',text:message('language.label')}),languageSelect('welcome-language'));m.content.append(languageWrap);
  const suggestion=initial?suggestedLocale():null;if(suggestion){const row=el('div',{class:'language-suggestion'},[el('span',{text:message('language.suggestion',{language:suggestion.name})}),button(message('language.use',{language:suggestion.name}),async()=>{await changeLocale(suggestion.code);row.remove();})]);m.content.append(row);}
  const unitWrap=el('div',{class:'form-field'}),units=el('select',{id:'welcome-units'},[el('option',{value:'metric',text:message('ui.metric_metres')}),el('option',{value:'imperial',text:message('ui.imperial_feet_inches')})]);units.value=project.units;unitWrap.append(el('label',{htmlFor:'welcome-units',text:message('ui.choose_your_units')}),units);m.content.append(unitWrap,el('div',{class:'welcome-points'},[message('ui.no_account_no_uploads_no_ai_guessing'),el('br'),message('ui.just_real_dimensions_and_a_little_room_to')]));
  m.action(message('ui.start_blank'),()=>{m.close();replaceProject(blankProject(units.value));});m.action(message('ui.try_an_example'),()=>{m.close();replaceProject(exampleProject(units.value));toast(message('ui.example_a_4_3_m_room_measured_between'));},{primary:true});m.content.append(el('p',{class:'welcome-foot',text:message('ui.planning_only_verify_furniture_doors_elevators_and_clearances')}));}
function selectObject(hit){selection=hit?{id:hit.id,kind:hit.kind}:null;view.selection=selection;renderInspector();renderObjects();view.render();}
function getSelected(){return selection?project[selection.kind].find(v=>v.id===selection.id):null;}
function renderInspector(){
  const host=$('#inspector');host.replaceChildren();const item=getSelected();
  if(!item){selection=null;view.selection=null;bindText($('#inspector-title'),message('ui.your_room'));host.append(el('div',{class:'inspector-empty'},[el('div',{class:'empty-mark',text:'▱'}),el('p',{text:message('ui.select_furniture_or_a_wall_to_edit_its')}),el('p',{class:'hint',text:message('ui.2d_is_for_editing_3d_is_for_exploring')})]));return;}
  bindText($('#inspector-title'),selection.kind==='furniture'?()=>nameMessage(getSelected()):selection.kind==='walls'?message('ui.wall_segment'):message('ui.measurement'));
  const form=el('form',{noValidate:true}),error=el('div',{class:'error-message',role:'alert'});host.append(form);let apply;
  if(selection.kind==='furniture'){
    const name=namedField(form,message('ui.name'),item,{key:'name'}),row=el('div',{class:'field-row'});form.append(row);
    const width=lengthField(row,message('ui.width'),item.width,{key:'width'}),depth=lengthField(row,message('ui.depth'),item.depth,{key:'depth'}),height=lengthField(form,message('ui.height'),item.height,{key:'height'});
    const coords=el('div',{class:'field-row'});form.append(coords);const x=lengthField(coords,message('ui.centre_x'),item.x,{key:'x',min:-500,max:500}),y=lengthField(coords,message('ui.centre_y'),item.y,{key:'y',min:-500,max:500});
    const rot=field(form,message('ui.rotation_degrees_clockwise'),item.rotation,{type:'number',key:'rotation',min:-36000,max:36000}),color=field(form,message('ui.color'),item.color,{type:'color',key:'color'});
    apply=()=>change(p=>{const f=p.furniture.find(f=>f.id===item.id);assignName(f,name);Object.assign(f,{width:width(),depth:depth(),height:height(),x:x(),y:y(),rotation:rawNumber(rot,message('ui.rotation')),color:color.value});});
    form.append(button(message('ui.rotate_90'),()=>rotate(90),{class:'wide',id:'rotate-item'}));
  } else if(selection.kind==='walls') {
    form.append(el('p',{class:'hint',text:message('ui.length_is_measured_along_the_wall_centreline_cl')}));
    const length=lengthField(form,message('ui.centreline_length'),distance(item.a,item.b),{key:'wall-length'});
    const coords=el('div',{class:'field-row'});form.append(coords);const ax=lengthField(coords,message('ui.start_x'),item.a.x,{key:'ax',min:-500,max:500}),ay=lengthField(coords,message('ui.start_y'),item.a.y,{key:'ay',min:-500,max:500});
    const ends=el('div',{class:'field-row'});form.append(ends);const bx=lengthField(ends,message('ui.end_x'),item.b.x,{key:'bx',min:-500,max:500}),by=lengthField(ends,message('ui.end_y'),item.b.y,{key:'by',min:-500,max:500});
    const originalLength=distance(item.a,item.b);apply=()=>change(p=>{const wall=p.walls.find(w=>w.id===item.id);wall.a={x:ax(),y:ay()};wall.b={x:bx(),y:by()};const targetLength=length();if(targetLength!==originalLength)Object.assign(wall,wallWithLength(wall,targetLength));});
    form.append(el('p',{class:'hint',text:message('ui.editing_a_wall_does_not_move_adjoining_walls')}));
  } else {
    form.append(el('p',{text:()=>formatLength(distance(item.a,item.b),project.units)}));
    const start=el('div',{class:'field-row'}),end=el('div',{class:'field-row'});form.append(start,end);
    const ax=lengthField(start,message('ui.start_x'),item.a.x,{key:'max',min:-500,max:500}),ay=lengthField(start,message('ui.start_y'),item.a.y,{key:'may',min:-500,max:500}),bx=lengthField(end,message('ui.end_x'),item.b.x,{key:'mbx',min:-500,max:500}),by=lengthField(end,message('ui.end_y'),item.b.y,{key:'mby',min:-500,max:500});
    apply=()=>change(p=>{Object.assign(p.measurements.find(m=>m.id===item.id),{a:{x:ax(),y:ay()},b:{x:bx(),y:by()}});});
  }
  form.append(el('button',{type:'submit',text:message('ui.apply_changes'),class:'primary wide',id:'apply-properties'}),error);
  form.addEventListener('submit',e=>{e.preventDefault();try{apply();toast(message('ui.changes_applied'));}catch(err){bindText(error,errorMessage(err));}});
  const actions=el('div',{class:'form-actions'});if(selection.kind==='furniture')actions.append(button(message('ui.duplicate'),duplicate,{id:'duplicate-item'}));actions.append(button(message('ui.delete'),deleteSelected,{class:'danger-text',id:'delete-item'}));host.append(actions);
}
function renderObjects(){const list=$('#object-list');list.replaceChildren();$('#object-count').textContent=String(project.furniture.length+project.walls.length+project.measurements.length);
  for(const [kind,items] of [['furniture',project.furniture],['walls',project.walls],['measurements',project.measurements]])items.forEach((item,i)=>{
    const name=kind==='furniture'?nameMessage(item):message(kind==='walls'?'object.wall':'object.measurement',{number:i+1});
    const row=button('',()=>selectObject({id:item.id,kind}),{class:'object-row','aria-pressed':selection?.id===item.id,'aria-label':message('object.select',{name})});
    const swatch=el('span',{class:'swatch'});swatch.style.backgroundColor=item.color|| (kind==='walls'?'#586252':'#7f9972');row.append(swatch,el('span',{class:'object-name',text:name}),el('span',{class:'object-size',text:kind==='furniture'?formatLength(item.width,project.units):formatLength(distance(item.a,item.b),project.units)}));list.append(row);
  });if(!list.children.length)list.append(el('p',{class:'hint',text:message('ui.your_walls_and_furniture_will_appear_here')}));
}
function renderBackground(){const host=$('#background-controls'),bg=project.background;host.hidden=!bg;host.replaceChildren();if(!bg)return;
  host.append(el('h2',{text:message('ui.background_image')}),el('p',{class:'hint',text:bg.calibration?message('ui.calibrated_using_a_known_distance'):message('ui.not_calibrated_do_not_trace_to_assumed_dimensions')}));
  const visible=check(host,message('ui.show_background'),bg.visible,'bg-visible');visible.onchange=()=>change(p=>p.background.visible=visible.checked);
  const lock=check(host,message('ui.lock_background'),bg.locked,'bg-locked');lock.onchange=()=>change(p=>p.background.locked=lock.checked);
  const opacity=field(host,message('ui.opacity'),bg.opacity,{type:'range',key:'opacity',min:0,max:1,step:.05});opacity.onchange=()=>change(p=>p.background.opacity=Number(opacity.value));
  host.append(button(message('ui.calibrate_with_2_points'),()=>{closePanels();setTool('calibrate');},{class:'wide'}),button(message('ui.re_select_replace_image'),()=>$('#image-file').click(),{class:'wide'}));
  host.append(el('p',{class:'hint',text:message('ui.unlock_to_drag_the_image_in_select_mode')}));
}
function updateUI(){
  if(selection&&!getSelected())selection=null;view.selection=selection;
  bindText($('#project-name'),()=>nameMessage(project));$('#units').value=project.units;$('#snap-grid').checked=project.settings.snap;$('#show-grid').checked=project.settings.showGrid;
  $('#undo').disabled=!history.past.length;$('#redo').disabled=!history.future.length;
  renderInspector();renderObjects();renderBackground();refreshBindings();view.render();if(scene)scene.build();
}
function furnitureSymbol(preset){const wrap=el('div');const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 80 46');svg.setAttribute('aria-hidden','true');
  const rect=(x,y,w,h,fill,rx=3)=>{const r=document.createElementNS(ns,'rect');for(const[k,v]of Object.entries({x,y,width:w,height:h,rx,fill,stroke:'#6b705b55','stroke-width':1}))r.setAttribute(k,v);svg.append(r);};
  const c=preset.color;if(preset.type==='sofa'){rect(8,10,64,27,c,5);rect(17,15,22,17,'#ffffff33');rect(41,15,22,17,'#ffffff33');rect(8,14,8,23,c);rect(64,14,8,23,c);}else if(preset.type==='bed'){rect(20,4,40,38,c);rect(23,7,15,8,'#ffffff88');rect(42,7,15,8,'#ffffff88');rect(23,19,34,20,'#ffffff33');}else if(preset.type==='chair'){rect(26,10,28,27,c,7);rect(30,17,20,15,'#ffffff44');}else {rect(12,10,56,27,c);rect(16,13,48,4,'#ffffff55');}
  return svg;
}
for(const preset of PRESETS){const b=button('',()=>addFurniture(preset),{class:'preset-card','aria-label':message('object.add',{name:nameMessage(preset)})});b.append(furnitureSymbol(preset),el('strong',{text:nameMessage(preset)}),el('small',{text:()=>project.units==='metric'?t('preset.dimensions',{width:formatNumber(preset.width),depth:formatNumber(preset.depth)}):`${formatLength(preset.width,project.units)} × ${formatLength(preset.depth,project.units)}`}));$('#presets').append(b);}
function addFurniture(preset){if(mode==='3d')switchView('2d');const f=newFurniture(preset,Math.max(-490,Math.min(490,(view.width/2-view.origin.x)/view.scale)),Math.max(-490,Math.min(490,(view.height/2-view.origin.y)/view.scale)));change(p=>p.furniture.push(f));selectObject({id:f.id,kind:'furniture'});setTool('select');closePanels();toast(message('object.added',{name:nameMessage(f)}));}
function rotate(degrees){if(selection?.kind!=='furniture')return;change(p=>{const f=p.furniture.find(f=>f.id===selection.id);f.rotation+=degrees;});}
function duplicate(){if(selection?.kind!=='furniture')return;const item=getSelected(),copy={...clone(item),id:id(),x:item.x+.15,y:item.y+.15};change(p=>p.furniture.push(copy));selectObject({id:copy.id,kind:'furniture'});}
function deleteSelected(){if(!selection)return;const chosen=selection;change(p=>p[chosen.kind]=p[chosen.kind].filter(v=>v.id!==chosen.id));selection=null;updateUI();}
function undo(){const previous=history.undo(project);if(previous){project=previous;selection=null;firstPoint=null;view.preview=null;updateUI();missingBackgroundNotice();scheduleSave();}}
function redo(){const next=history.redo(project);if(next){project=next;selection=null;updateUI();missingBackgroundNotice();scheduleSave();}}
function setTool(next){
  if(next==='calibrate'&&(!project.background||!images.has(project.background.id))){toast(message('ui.import_or_re_select_a_background_image_before'));return;}
  if(mode==='3d')switchView('2d');tool=next;firstPoint=null;view.preview=null;view.render();
  for(const b of document.querySelectorAll('[data-tool]'))b.setAttribute('aria-pressed',String(b.dataset.tool===tool));
  const hints={select:message('ui.select_or_drag_an_item_edit_exact_sizes'),wall:message('ui.tap_two_endpoints_hold_shift_for_a_straight'),measure:message('ui.tap_two_points_to_measure_their_distance'),calibrate:message('ui.tap_two_image_points_with_a_known_real'),pan:message('ui.drag_the_canvas_to_move_your_view')};bindText($('#tool-hint'),hints[tool]);$('#plan-canvas').style.cursor=tool==='select'?'default':tool==='pan'?'grab':'crosshair';
}
function drawPoint(event){let p=view.point(event);if(tool==='calibrate')return p;
  if(project.settings.snap){let closest=null,d=10/view.scale;for(const w of project.walls)for(const q of [w.a,w.b])if(distance(p,q)<d){d=distance(p,q);closest=q;}p=closest?clone(closest):{x:snap(p.x,project.settings.gridSize),y:snap(p.y,project.settings.gridSize)};}
  if(event.shiftKey&&firstPoint){if(Math.abs(p.x-firstPoint.x)>Math.abs(p.y-firstPoint.y))p.y=firstPoint.y;else p.x=firstPoint.x;}return p;
}
function inBackground(point){const bg=project.background,p=worldToPixel(point,bg);return p.x>=0&&p.y>=0&&p.x<=bg.pixelWidth&&p.y<=bg.pixelHeight;}
function calibrationPixel(point,bg){const pixel=worldToPixel(point,bg);return{x:Math.round(pixel.x),y:Math.round(pixel.y)};}
async function secondPoint(a,b){
  if(tool==='calibrate'){
    // Pointer coordinates have browser subpixel noise. Calibration uses image pixels.
    const bg=clone(project.background),pa=calibrationPixel(a,bg),pb=calibrationPixel(b,bg);if(distance(pa,pb)<1)throw new PlannerError('ui.choose_two_different_image_points');
    const m=openModal(message('ui.set_a_known_distance'),message('ui.use_a_length_you_measured_or_a_reliable'));
    const read=lengthField(m.content,message('ui.actual_distance'),bg.calibration?.realMeters||4,{key:'calibration',min:.001,max:100});m.action(message('ui.cancel'),()=>{m.close();view.preview=null;view.render();});m.action(message('ui.apply_calibration'),()=>{const updated=calibrateBackground(bg,pa,pb,read());change(p=>p.background=updated);m.close();setTool('select');toast(message('ui.background_calibrated_existing_geometry_was_not_scaled'));},{primary:true});return;
  }
  if(distance(a,b)<.01)throw new PlannerError('ui.choose_two_points_at_least_0_01_m');
  if(tool==='wall'){const w={id:id(),a,b,height:project.settings.wallHeight,thickness:project.settings.wallThickness};change(p=>p.walls.push(w));selectObject({id:w.id,kind:'walls'});}
  else {const m={id:id(),a,b};change(p=>p.measurements.push(m));selectObject({id:m.id,kind:'measurements'});toast(()=>t('measurement.distance',{distance:formatLength(distance(a,b),project.units)}));}
}
const canvas=$('#plan-canvas');
canvas.addEventListener('pointerdown',safe(async event=>{
  if(event.button!==0||drag||mode!=='2d')return;canvas.focus({preventScroll:true});
  if(['wall','measure','calibrate'].includes(tool)){
    const p=drawPoint(event);if(tool==='calibrate'&&!inBackground(p))throw new PlannerError('ui.choose_points_inside_the_background_image');
    if(!firstPoint){firstPoint=p;view.preview={a:p,b:p,kind:tool};view.render();bindText($('#tool-hint'),message('ui.first_point_set_tap_the_second_point'));}
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
    try{commit(project,previous.before);}catch(error){project=previous.before;updateUI();toast(errorMessage(error));}
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
    mode='3d';canvas.hidden=true;$('#tool-rail').hidden=true;$('#three-error').hidden=true;$('#three-options').hidden=false;$('#view-2d').setAttribute('aria-pressed','false');$('#view-3d').setAttribute('aria-pressed','true');scene.show();bindText($('#tool-hint'),message('ui.drag_to_orbit_scroll_or_pinch_to_zoom'));
  }catch(error){$('#three-host').hidden=true;$('#three-host').replaceChildren();mode='2d';canvas.hidden=false;notice(message('ui.3d_is_unavailable_webgl2_or_the_local_three'));}
  finally{sceneLoading=false;$('#view-3d').disabled=false;}
}
function setWalk(enabled){if(!scene)return;scene.setWalk(enabled);$('#walk-controls').hidden=!enabled;$('#overview').setAttribute('aria-pressed',String(!enabled));$('#walk').setAttribute('aria-pressed',String(enabled));if(!enabled)scene.reset();bindText($('#tool-hint'),enabled?message('ui.wasd_or_touch_buttons_move_drag_to_look'):message('ui.drag_to_orbit_the_ground_plane_is_illustrative'));}
function closePanels(){for(const p of document.querySelectorAll('.panel'))p.classList.remove('open');for(const b of document.querySelectorAll('[data-panel]'))b.classList.remove('active');}
for(const b of document.querySelectorAll('[data-close-panel]'))b.onclick=closePanels;
for(const b of document.querySelectorAll('[data-panel]'))b.onclick=()=>{const isOpen=b.classList.contains('active');closePanels();if(isOpen)return;if(b.dataset.panel==='tools'){switchView('2d');$('#tool-rail').hidden=false;toast(message('ui.choose_select_wall_measure_calibrate_or_pan_above'));return;}b.classList.add('active');$(`#${b.dataset.panel}-panel`).classList.add('open');};
for(const b of document.querySelectorAll('[data-tool]'))b.onclick=()=>{closePanels();setTool(b.dataset.tool);};
for(const b of document.querySelectorAll('[data-walk]')){b.onpointerdown=e=>{if(!scene)return;e.preventDefault();b.setPointerCapture(e.pointerId);scene.keys.add(b.dataset.walk);};const stop=()=>scene?.keys.delete(b.dataset.walk);b.onpointerup=stop;b.onpointercancel=stop;b.onlostpointercapture=stop;}
$('#view-2d').onclick=()=>switchView('2d');$('#view-3d').onclick=()=>switchView('3d');$('#overview').onclick=()=>setWalk(false);$('#walk').onclick=()=>setWalk(true);$('#cutaway').onchange=e=>scene?.setCutaway(e.target.checked);
$('#undo').onclick=undo;$('#redo').onclick=redo;
$('#zoom-in').onclick=()=>mode==='3d'?scene?.zoom(1.2):view.zoom(1.2);$('#zoom-out').onclick=()=>mode==='3d'?scene?.zoom(1/1.2):view.zoom(1/1.2);$('#fit-view').onclick=()=>{if(mode==='3d'){scene?.reset();setWalk(false);}else view.fit();};
$('#snap-grid').onchange=e=>change(p=>p.settings.snap=e.target.checked);$('#show-grid').onchange=e=>change(p=>p.settings.showGrid=e.target.checked);$('#units').onchange=e=>change(p=>p.units=e.target.value);
$('#new-project').onclick=safe(async()=>{if(hasWork()&&!await confirmAction(message('ui.start_a_new_project'),message('ui.this_replaces_the_current_plan_and_starts_a')))return;welcome();});
$('#project-name').onclick=()=>{const m=openModal(message('ui.name_your_project'),message('ui.use_a_short_name_to_recognize_your_exported'));const name=namedField(m.content,message('ui.project_name'),project,{key:'project-name'});m.action(message('ui.save_name'),()=>{change(p=>assignName(p,name));m.close();},{primary:true});};
$('#rectangle-room').onclick=()=>{
  let width=4,depth=3;if(project.walls.length===4){const pts=project.walls.flatMap(w=>[w.a,w.b]);width=Math.max(...pts.map(p=>p.x))-Math.min(...pts.map(p=>p.x))-project.settings.wallThickness;depth=Math.max(...pts.map(p=>p.y))-Math.min(...pts.map(p=>p.y))-project.settings.wallThickness;}
  const m=openModal(message('ui.create_resize_a_room'),message('ui.enter_clear_inside_dimensions_four_straight_wall_segments'));
  const w=lengthField(m.content,message('ui.inside_width'),width,{key:'room-width',min:.1,max:99}),d=lengthField(m.content,message('ui.inside_depth'),depth,{key:'room-depth',min:.1,max:99});
  m.action(message('ui.cancel'),m.close);m.action(project.walls.length?message('ui.replace_walls'):message('ui.create_room'),()=>{change(p=>p.walls=rectangleWalls(w(),d(),p.settings,p.walls.length===4?p.walls:[]));m.close();closePanels();setTool('select');view.fit();},{primary:true});
};
$('#wall-settings').onclick=()=>{const m=openModal(message('ui.wall_dimensions'),message('ui.these_values_apply_to_all_walls_and_to'));const height=lengthField(m.content,message('ui.wall_height'),project.settings.wallHeight,{key:'global-height',min:.1,max:10}),thickness=lengthField(m.content,message('ui.wall_thickness'),project.settings.wallThickness,{key:'global-thickness',min:.02,max:1});m.action(message('ui.apply_to_all_walls'),()=>{change(p=>{p.settings.wallHeight=height();p.settings.wallThickness=thickness();for(const w of p.walls){w.height=p.settings.wallHeight;w.thickness=p.settings.wallThickness;}});m.close();toast(message('ui.wall_dimensions_updated_recheck_clear_inside_dimensions'));},{primary:true});};
$('#custom-furniture').onclick=()=>{const m=openModal(message('ui.add_custom_furniture'),message('ui.a_simple_box_with_your_real_dimensions_all'));const name=namedField(m.content,message('ui.name'),{name:'Custom item',nameKey:'name.custom'},{key:'custom-name'}),width=lengthField(m.content,message('ui.width'),1,{key:'custom-width'}),depth=lengthField(m.content,message('ui.depth'),.6,{key:'custom-depth'}),height=lengthField(m.content,message('ui.height'),.8,{key:'custom-height'}),color=field(m.content,message('ui.color'),'#bac4ad',{type:'color',key:'custom-color'});m.action(message('ui.add_furniture'),()=>{const item={type:'box',width:width(),depth:depth(),height:height(),color:color.value};assignName(item,name);addFurniture(item);m.close();},{primary:true});};
$('#clear-project').onclick=safe(async()=>{if(!await confirmAction(message('ui.clear_the_current_project'),message('ui.this_removes_this_app_s_current_plan_and')))return;const units=project.units;replaceProject(blankProject(units),{save:false});const result=clearProject();saveStatus(result.ok?message('ui.cleared_no_saved_project'):message('ui.could_not_clear_saved_copy'),!result.ok);if(!result.ok)notice(message(result.errorCode));closePanels();});
$('#export-project').onclick=()=>{const m=openModal(message('ui.take_your_plan_with_you'),message('ui.save_json_to_keep_editing_save_png_to'));const opts=el('div',{class:'export-options'}),include=check(opts,message('ui.include_background_image'),false,'export-background');opts.append(el('p',{text:message('ui.json_embeds_a_re_encoded_image_of_at')}));m.content.append(opts);m.action(message('ui.download_json'),async()=>{await exportJSON(include.checked);toast(message('ui.json_downloaded_keep_a_copy_outside_this_browser'));},{primary:true});m.action(message('ui.download_png'),async()=>{if(include.checked&&project.background&&!images.has(project.background.id))throw new PlannerError('ui.re_select_the_missing_background_first');download(await view.png(include.checked),'png');toast(message('ui.png_downloaded_use_json_to_keep_editing'));});};
$('#import-project').onclick=()=>$('#project-file').click();$('#import-image').onclick=()=>$('#image-file').click();
$('#project-file').onchange=safe(async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;if(file.size>LIMITS.bytes)throw new PlannerError('ui.json_files_must_be_10_mb_or_smaller');const incoming=parseProject(await file.text());let imageEntry=null;if(incoming.background?.dataURL){imageEntry=await decodeEmbedded(incoming.background.dataURL,incoming.background.pixelWidth,incoming.background.pixelHeight);delete incoming.background.dataURL;}
  if(hasWork()&&!await confirmAction(message('ui.open_this_project'),message('ui.the_imported_plan_passed_validation_opening_it_replaces')))return;
  if(imageEntry)images.set(incoming.background.id,imageEntry);replaceProject(incoming);toast(message('ui.project_opened'));
});
function backgroundChoice(dimsMatch){return new Promise(resolve=>{const m=openModal(message('ui.replace_the_background'),dimsMatch?message('ui.the_pixel_dimensions_match_only_keep_the_current'):message('ui.the_pixel_dimensions_changed_the_old_calibration_cannot'),{onCancel:()=>resolve('cancel')});m.action(message('ui.cancel'),()=>{m.close();resolve('cancel');});m.action(message('ui.start_uncalibrated'),()=>{m.close();resolve('reset');},{primary:!dimsMatch});if(dimsMatch)m.action(message('ui.keep_alignment'),()=>{m.close();resolve('keep');},{primary:true});});}
$('#image-file').onchange=safe(async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;const entry=await readImage(file),old=project.background;let choice='reset';
  if(old)choice=await backgroundChoice(old.pixelWidth===entry.width&&old.pixelHeight===entry.height);
  if(choice==='cancel'){URL.revokeObjectURL(entry.url);return;}
  const bg=choice==='keep'?{...clone(old),id:id()}: {id:id(),pixelWidth:entry.width,pixelHeight:entry.height,x:0,y:0,metersPerPixel:Math.min(6/entry.width,5/entry.height),opacity:.55,visible:true,locked:true,calibration:null};
  delete bg.dataURL;images.set(bg.id,entry);try{change(p=>p.background=bg);}catch(error){images.delete(bg.id);URL.revokeObjectURL(entry.url);throw error;}
  missingBackgroundNotice();view.fit();closePanels();if(!bg.calibration){setTool('calibrate');toast(message('ui.image_imported_locally_choose_two_points_to_set'));}else toast(message('ui.image_restored_with_your_confirmed_alignment'));
});
$('#help').onclick=()=>{const m=openModal(message('ui.a_little_help_a_better_fit'),message('ui.a_free_local_first_2d_3d_room_layout'));const content=el('div',{class:'help-copy'});for(const [title,text] of [
  [message('ui.01_establish_the_scale'),message('ui.create_a_room_using_its_inside_dimensions_or')],
  [message('ui.02_trace_then_arrange'),message('ui.wall_and_measure_use_two_clicks_or_taps')],
  [message('ui.03_check_it_in_3d'),message('ui.overview_supports_orbit_and_zoom_walk_through_supports')],
  [message('ui.save_outside_the_browser'),message('ui.geometry_autosaves_locally_background_images_are_session_only')],
  [message('ui.keyboard_shortcuts'),message('ui.v_select_w_wall_m_measure_p_pan')],
  [message('ui.privacy_and_offline_use'),message('ui.no_accounts_analytics_ads_remote_fonts_or_third')],
  [message('ui.limits_and_safety'),message('ui.single_floor_straight_walls_200_walls_200_furniture')],
  [message('ui.open_source'),message('ui.original_implementation_mit_inspired_by_wy51ai_floorplan_3d')]])content.append(el('h3',{text:title}),el('p',{text}));m.content.append(content);m.action(message('ui.back_to_my_room'),m.close,{primary:true});};
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
$('#language-control').append(languageSelect('language'));
onLocaleChange(()=>{
  for(const input of document.querySelectorAll('[data-language-picker]'))input.value=getLocale();
  for(const [input,entry] of namedInputs){if(!input.isConnected){namedInputs.delete(input);continue;}if(!entry.edited&&input.value===entry.initial){input.value=displayName(entry.item);entry.initial=input.value;}}
  renderObjects();view.render();
});
updateUI();requestAnimationFrame(()=>view.fit());
if(!restored.ok){saveStatus(message('ui.could_not_restore_saved_copy'),true);notice(message(restored.errorCode));}else if(!restored.project)welcome(true);else{saveStatus(message('ui.restored_from_this_device'));missingBackgroundNotice();}
if(location.protocol==='file:')notice(message('ui.open_this_app_through_a_local_http_server'));
// Read-only diagnostics are opt-in and used by the browser tests, not by normal sessions.
if(new URLSearchParams(location.search).has('test'))Object.defineProperty(window,'plannerTest',{value:{snapshot:()=>clone(project),screen:p=>view.screen(p),history:()=>({undo:history.past.length,redo:history.future.length}),mode:()=>mode,scene:()=>scene?.snapshot()||[]}});

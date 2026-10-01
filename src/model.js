/** Geometry is always stored in metres. UI unit changes must never rescale it. */
export const LIMITS = Object.freeze({ bytes: 10 * 1024 * 1024, embeddedBytes: 2 * 1024 * 1024, pixels: 16_000_000, objects: 200, coordinate: 500, dimension: 100 });
export const SCHEMA_VERSION = 1;
export const FOOT = 0.3048;
export const INCH = 0.0254;
export const clone = value => structuredClone(value);
export const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
export const normalizeAngle = degrees => ((degrees % 360) + 360) % 360;
export const snap = (value, interval) => Math.round(value / interval) * interval;
export const id = () => globalThis.crypto?.randomUUID?.() || `obj-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export const feetInchesToMeters = (feet, inches) => feet * FOOT + inches * INCH;
export function metersToFeetInches(meters) {
  let feet = Math.floor(meters / FOOT);
  let inches = Math.round((meters / FOOT - feet) * 12 * 10000) / 10000;
  if (inches >= 12) { feet++; inches = 0; }
  return { feet, inches };
}
export function formatLength(meters, units = 'metric', precision = 3) {
  if (units === 'metric') return `${Number(meters.toFixed(precision))} m`;
  const sign = meters < 0 ? '−' : '';
  const { feet, inches } = metersToFeetInches(Math.abs(meters));
  const rounded = Math.round(inches * 100) / 100;
  return rounded === 12 ? `${sign}${feet + 1} ft 0 in` : `${sign}${feet} ft ${rounded} in`;
}
export function blankProject(units = 'metric') {
  const now = new Date().toISOString();
  return { schemaVersion: 1, name: 'Untitled room', createdAt: now, updatedAt: now, units,
    settings: { wallHeight: 2.4, wallThickness: 0.12, gridSize: 0.1, snap: true, showGrid: true },
    walls: [], furniture: [], measurements: [], background: null };
}
export function rectangleWalls(width, depth, settings, existing = []) {
  number(width, 'Inside width', 0.1, 99); number(depth, 'Inside depth', 0.1, 99);
  const t = settings.wallThickness / 2;
  const pts = [{ x: -t, y: -t }, { x: width + t, y: -t }, { x: width + t, y: depth + t }, { x: -t, y: depth + t }];
  return pts.map((a, n) => ({ id: existing[n]?.id || id(), a, b: clone(pts[(n + 1) % 4]), thickness: settings.wallThickness, height: settings.wallHeight }));
}
export const PRESETS = Object.freeze([
  { type: 'sofa', name: 'Sofa', width: 2, depth: 0.9, height: 0.8, color: '#d8a08a' },
  { type: 'bed', name: 'Double bed', width: 1.5, depth: 2, height: 0.6, color: '#b2beb0' },
  { type: 'desk', name: 'Desk', width: 1.2, depth: 0.6, height: 0.75, color: '#c5ad84' },
  { type: 'chair', name: 'Chair', width: 0.5, depth: 0.5, height: 0.8, color: '#abc0c6' },
  { type: 'cabinet', name: 'Cabinet', width: 0.9, depth: 0.4, height: 1.8, color: '#b5aaa0' },
  { type: 'table', name: 'Coffee table', width: 1, depth: 0.55, height: 0.42, color: '#dcc9a6' }
]);
export function newFurniture(preset, x = 1, y = 1) { return { ...clone(preset), id: id(), x, y, rotation: 0 }; }
export function exampleProject(units = 'metric') {
  const p = blankProject(units); p.name = 'Living + working';
  p.walls = rectangleWalls(4, 3, p.settings);
  p.furniture = [newFurniture(PRESETS[0], 1.15, 0.6), newFurniture(PRESETS[5], 1.15, 1.65), newFurniture(PRESETS[2], 3.25, 0.5), newFurniture(PRESETS[3], 3.25, 1.25)];
  p.measurements = [{ id: id(), a: { x: 2.15, y: 0.85 }, b: { x: 2.65, y: 0.85 } }];
  return p;
}
export function wallWithLength(wall, length) {
  number(length, 'Wall length', 0.01, LIMITS.dimension);
  const angle = Math.atan2(wall.b.y - wall.a.y, wall.b.x - wall.a.x);
  return { ...clone(wall), b: { x: wall.a.x + length * Math.cos(angle), y: wall.a.y + length * Math.sin(angle) } };
}
export function furnitureCorners(f) {
  const angle = f.rotation * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([dx,dy]) => ({ x: f.x + dx * f.width / 2 * c - dy * f.depth / 2 * s, y: f.y + dx * f.width / 2 * s + dy * f.depth / 2 * c }));
}
export function containsFurniture(p, f, padding = 0) {
  const r = -f.rotation * Math.PI / 180, x = p.x - f.x, y = p.y - f.y;
  return Math.abs(x * Math.cos(r) - y * Math.sin(r)) <= f.width / 2 + padding && Math.abs(x * Math.sin(r) + y * Math.cos(r)) <= f.depth / 2 + padding;
}
export function segmentDistance(p, a, b) {
  const len2 = (b.x-a.x)**2 + (b.y-a.y)**2;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/len2)) : 0;
  return distance(p, { x:a.x+t*(b.x-a.x), y:a.y+t*(b.y-a.y) });
}
export function projectBounds(p, includeBackground = true) {
  const points = [...p.walls.flatMap(w => [w.a,w.b]), ...p.furniture.flatMap(furnitureCorners), ...p.measurements.flatMap(m => [m.a,m.b])];
  const bg = p.background;
  if (includeBackground && bg?.visible) points.push({x:bg.x,y:bg.y}, {x:bg.x+bg.pixelWidth*bg.metersPerPixel,y:bg.y+bg.pixelHeight*bg.metersPerPixel});
  if (!points.length) return { x: -0.3, y: -0.3, width: 4.6, height: 3.6 };
  const minx=Math.min(...points.map(p=>p.x)), miny=Math.min(...points.map(p=>p.y));
  return { x:minx-0.35, y:miny-0.35, width:Math.max(1, Math.max(...points.map(p=>p.x))-minx+0.7), height:Math.max(1, Math.max(...points.map(p=>p.y))-miny+0.7) };
}
/** Pixel calibration is independent of wall/furniture geometry. Keep the first point anchored. */
export function calibrateBackground(bg, a, b, realMeters) {
  number(realMeters, 'Known distance', 0.001, LIMITS.dimension);
  const pixels = distance(a,b);
  if (pixels < 1) throw new Error('Choose two different points at least one image pixel apart.');
  const scale = realMeters / pixels;
  number(scale, 'Image scale', 0.000001, 10);
  const worldA = { x:bg.x+a.x*bg.metersPerPixel, y:bg.y+a.y*bg.metersPerPixel };
  return { ...clone(bg), x:worldA.x-a.x*scale, y:worldA.y-a.y*scale, metersPerPixel:scale, calibration:{a:clone(a),b:clone(b),realMeters} };
}
export function worldToPixel(p,bg) { return { x:(p.x-bg.x)/bg.metersPerPixel, y:(p.y-bg.y)/bg.metersPerPixel }; }
export function number(value, label, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label} must be a finite number between ${min} and ${max}.`);
  return value;
}
function object(value,label) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is missing or invalid.`); return value; }
function text(value,label,max=100) { if (typeof value !== 'string' || !value.trim() || value.length>max) throw new Error(`${label} must contain 1–${max} characters.`); return value; }
function boolean(value,label) { if (typeof value !== 'boolean') throw new Error(`${label} must be true or false.`); return value; }
function point(value,label) { object(value,label); return { x:number(value.x,`${label} X`,-500,500), y:number(value.y,`${label} Y`,-500,500) }; }
function date(value,label) { text(value,label,40); if (!Number.isFinite(Date.parse(value))) throw new Error(`${label} is invalid.`); return value; }
function array(value,label) { if (!Array.isArray(value) || value.length>LIMITS.objects) throw new Error(`${label} must be a list of no more than ${LIMITS.objects} items.`); return value; }
function imagePoint(value,bg,label) { object(value,label); return { x:number(value.x,`${label} X`,0,bg.pixelWidth), y:number(value.y,`${label} Y`,0,bg.pixelHeight) }; }
export function dataUrlBytes(url) { return Math.floor((url.length - url.indexOf(',') - 1)*3/4) - (url.endsWith('==') ? 2 : url.endsWith('=') ? 1 : 0); }
/** Whitelist fields into a NEW object. Never assign imported object prototypes or URLs to the DOM. */
export function validateProject(raw) {
  object(raw,'Project');
  if (raw.schemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported project version. This app supports schemaVersion ${SCHEMA_VERSION}.`);
  if (!['metric','imperial'].includes(raw.units)) throw new Error('Units must be metric or imperial.');
  const s=object(raw.settings,'Settings'), seen=new Set();
  const takeId=value=>{ text(value,'Object ID',100); if(seen.has(value)) throw new Error('Object IDs must be unique.'); seen.add(value); return value; };
  const result={ schemaVersion:1, name:text(raw.name,'Project name'), createdAt:date(raw.createdAt,'Created date'), updatedAt:date(raw.updatedAt,'Modified date'), units:raw.units,
    settings:{wallHeight:number(s.wallHeight,'Wall height',0.1,10),wallThickness:number(s.wallThickness,'Wall thickness',0.02,1),gridSize:number(s.gridSize,'Grid size',0.01,1),snap:boolean(s.snap,'Snap'),showGrid:boolean(s.showGrid,'Show grid')},
    walls:array(raw.walls,'Walls').map(w=>{ object(w,'Wall'); const a=point(w.a,'Wall start'),b=point(w.b,'Wall end'); number(distance(a,b),'Wall length',0.01,100); return {id:takeId(w.id),a,b,thickness:number(w.thickness,'Wall thickness',0.02,1),height:number(w.height,'Wall height',0.1,10)}; }),
    furniture:array(raw.furniture,'Furniture').map(f=>{ object(f,'Furniture'); if(!/^#[0-9a-f]{6}$/i.test(f.color)) throw new Error('Furniture color must be a six-digit hex color.'); return {id:takeId(f.id),name:text(f.name,'Furniture name'),type:PRESETS.some(p=>p.type===f.type)?f.type:'box',x:number(f.x,'Furniture X',-500,500),y:number(f.y,'Furniture Y',-500,500),width:number(f.width,'Width',0.01,100),depth:number(f.depth,'Depth',0.01,100),height:number(f.height,'Height',0.01,100),rotation:normalizeAngle(number(f.rotation,'Rotation',-36000,36000)),color:f.color}; }),
    measurements:array(raw.measurements,'Measurements').map(m=>{object(m,'Measurement');const a=point(m.a,'Measurement start'),b=point(m.b,'Measurement end');number(distance(a,b),'Measurement length',0.001,1000);return {id:takeId(m.id),a,b};}), background:null };
  if(raw.background!==null) {
    const bg=object(raw.background,'Background');
    const pixelWidth=number(bg.pixelWidth,'Image width',1,16000), pixelHeight=number(bg.pixelHeight,'Image height',1,16000);
    if(!Number.isInteger(pixelWidth)||!Number.isInteger(pixelHeight)||pixelWidth*pixelHeight>LIMITS.pixels) throw new Error('Image exceeds the 16 megapixel limit.');
    result.background={id:takeId(bg.id),pixelWidth,pixelHeight,x:number(bg.x,'Image X',-500,500),y:number(bg.y,'Image Y',-500,500),metersPerPixel:number(bg.metersPerPixel,'Image scale',0.000001,10),opacity:number(bg.opacity,'Image opacity',0,1),visible:boolean(bg.visible,'Image visibility'),locked:boolean(bg.locked,'Image lock'),calibration:null};
    if(bg.calibration!==null) {
      const c=object(bg.calibration,'Calibration'), a=imagePoint(c.a,bg,'Calibration start'),b=imagePoint(c.b,bg,'Calibration end');
      const realMeters=number(c.realMeters,'Known distance',0.001,100);
      if(distance(a,b)<1) throw new Error('Calibration points must be different.');
      if(Math.abs(realMeters/distance(a,b)-bg.metersPerPixel)>Math.max(1e-9,bg.metersPerPixel*1e-6)) throw new Error('Calibration and image scale are inconsistent.');
      result.background.calibration={a,b,realMeters};
    }
    if(bg.dataURL!==undefined) {
      if(typeof bg.dataURL!=='string'||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(bg.dataURL)||dataUrlBytes(bg.dataURL)>LIMITS.embeddedBytes) throw new Error('Embedded background must be a PNG or JPEG of at most 2 MB. External URLs are not allowed.');
      result.background.dataURL=bg.dataURL;
    }
  }
  return result;
}
export function parseProject(json) {
  if(typeof json!=='string'||new TextEncoder().encode(json).byteLength>LIMITS.bytes) throw new Error('Project JSON exceeds the 10 MB limit.');
  let raw;try {raw=JSON.parse(json);}catch {throw new Error('This is not valid project JSON.');}
  return validateProject(raw);
}
export function serializableProject(project, dataURL) {
  const copy=clone(project);
  if(copy.background) { delete copy.background.dataURL; if(dataURL!==undefined) copy.background.dataURL=dataURL; }
  return validateProject(copy);
}
/** Snapshot history excludes raster bytes. One drag calls record once, after pointer release. */
export class History {
  constructor(limit=60) {this.limit=limit;this.past=[];this.future=[];}
  record(before,after) {
    if(JSON.stringify(before)===JSON.stringify(after)) return false;
    this.past.push(clone(before)); if(this.past.length>this.limit)this.past.shift(); this.future=[];return true;
  }
  undo(current) {if(!this.past.length)return null;this.future.push(clone(current));return this.past.pop();}
  redo(current) {if(!this.future.length)return null;this.past.push(clone(current));return this.future.pop();}
  clear() {this.past=[];this.future=[];}
}

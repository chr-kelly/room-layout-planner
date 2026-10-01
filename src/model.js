import { message, english, PlannerError } from './messages.js';
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
  return { schemaVersion: 1, name: 'Untitled room', nameKey: 'name.untitled', createdAt: now, updatedAt: now, units,
    settings: { wallHeight: 2.4, wallThickness: 0.12, gridSize: 0.1, snap: true, showGrid: true },
    walls: [], furniture: [], measurements: [], background: null };
}
export function rectangleWalls(width, depth, settings, existing = []) {
  number(width, message('ui.inside_width'), 0.1, 99); number(depth, message('ui.inside_depth'), 0.1, 99);
  const t = settings.wallThickness / 2;
  const pts = [{ x: -t, y: -t }, { x: width + t, y: -t }, { x: width + t, y: depth + t }, { x: -t, y: depth + t }];
  return pts.map((a, n) => ({ id: existing[n]?.id || id(), a, b: clone(pts[(n + 1) % 4]), thickness: settings.wallThickness, height: settings.wallHeight }));
}
export const PRESETS = Object.freeze([
  { type: 'sofa', name: 'Sofa', nameKey: 'name.sofa', width: 2, depth: 0.9, height: 0.8, color: '#d8a08a' },
  { type: 'bed', name: 'Double bed', nameKey: 'name.bed', width: 1.5, depth: 2, height: 0.6, color: '#b2beb0' },
  { type: 'desk', name: 'Desk', nameKey: 'name.desk', width: 1.2, depth: 0.6, height: 0.75, color: '#c5ad84' },
  { type: 'chair', name: 'Chair', nameKey: 'name.chair', width: 0.5, depth: 0.5, height: 0.8, color: '#abc0c6' },
  { type: 'cabinet', name: 'Cabinet', nameKey: 'name.cabinet', width: 0.9, depth: 0.4, height: 1.8, color: '#b5aaa0' },
  { type: 'table', name: 'Coffee table', nameKey: 'name.table', width: 1, depth: 0.55, height: 0.42, color: '#dcc9a6' }
]);
export function newFurniture(preset, x = 1, y = 1) { return { ...clone(preset), id: id(), x, y, rotation: 0 }; }
export function exampleProject(units = 'metric') {
  const p = blankProject(units); p.name = 'Living + working'; p.nameKey = 'name.example';
  p.walls = rectangleWalls(4, 3, p.settings);
  p.furniture = [newFurniture(PRESETS[0], 1.15, 0.6), newFurniture(PRESETS[5], 1.15, 1.65), newFurniture(PRESETS[2], 3.25, 0.5), newFurniture(PRESETS[3], 3.25, 1.25)];
  p.measurements = [{ id: id(), a: { x: 2.15, y: 0.85 }, b: { x: 2.65, y: 0.85 } }];
  return p;
}
export function wallWithLength(wall, length) {
  number(length, message('ui.wall_length'), 0.01, LIMITS.dimension);
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
  number(realMeters, message('ui.known_distance'), 0.001, LIMITS.dimension);
  const pixels = distance(a,b);
  if (pixels < 1) throw new PlannerError('ui.choose_two_different_points_at_least_one_image');
  const scale = realMeters / pixels;
  number(scale, message('ui.image_scale'), 0.000001, 10);
  const worldA = { x:bg.x+a.x*bg.metersPerPixel, y:bg.y+a.y*bg.metersPerPixel };
  return { ...clone(bg), x:worldA.x-a.x*scale, y:worldA.y-a.y*scale, metersPerPixel:scale, calibration:{a:clone(a),b:clone(b),realMeters} };
}
export function worldToPixel(p,bg) { return { x:(p.x-bg.x)/bg.metersPerPixel, y:(p.y-bg.y)/bg.metersPerPixel }; }
export function number(value, label, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new PlannerError('error.numberRange', {label, min, max});
  return value;
}
function object(value,label) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PlannerError('error.object', {label}); return value; }
function text(value,label,max=100) { if (typeof value !== 'string' || !value.trim() || value.length>max) throw new PlannerError('error.text', {label, max}); return value; }
function boolean(value,label) { if (typeof value !== 'boolean') throw new PlannerError('error.boolean', {label}); return value; }
function point(value,label) { object(value,label); return { x:number(value.x,message('field.axisX',{label}),-500,500), y:number(value.y,message('field.axisY',{label}),-500,500) }; }
function date(value,label) { text(value,label,40); if (!Number.isFinite(Date.parse(value))) throw new PlannerError('error.date', {label}); return value; }
function array(value,label) { if (!Array.isArray(value) || value.length>LIMITS.objects) throw new PlannerError('error.list', {label, max:LIMITS.objects}); return value; }
function imagePoint(value,bg,label) { object(value,label); return { x:number(value.x,message('field.axisX',{label}),0,bg.pixelWidth), y:number(value.y,message('field.axisY',{label}),0,bg.pixelHeight) }; }
export function dataUrlBytes(url) { return Math.floor((url.length - url.indexOf(',') - 1)*3/4) - (url.endsWith('==') ? 2 : url.endsWith('=') ? 1 : 0); }
function nameMetadata(raw, allowed) {
  // Untagged legacy names and user edits stay literal; never infer identity from spelling.
  return allowed.includes(raw.nameKey) && raw.name === english(message(raw.nameKey)) ? {nameKey:raw.nameKey} : {};
}
/** Whitelist fields into a NEW object. Never assign imported object prototypes or URLs to the DOM. */
export function validateProject(raw) {
  object(raw,message('ui.project'));
  if (raw.schemaVersion !== SCHEMA_VERSION) throw new PlannerError('error.version', {version:SCHEMA_VERSION});
  if (!['metric','imperial'].includes(raw.units)) throw new PlannerError('ui.units_must_be_metric_or_imperial');
  const s=object(raw.settings,message('ui.settings')), seen=new Set();
  const takeId=value=>{ text(value,message('ui.object_id'),100); if(seen.has(value)) throw new PlannerError('ui.object_ids_must_be_unique'); seen.add(value); return value; };
  const result={ schemaVersion:1, name:text(raw.name,message('ui.project_name')), ...nameMetadata(raw,['name.untitled','name.example']), createdAt:date(raw.createdAt,message('ui.created_date')), updatedAt:date(raw.updatedAt,message('ui.modified_date')), units:raw.units,
    settings:{wallHeight:number(s.wallHeight,message('ui.wall_height'),0.1,10),wallThickness:number(s.wallThickness,message('ui.wall_thickness'),0.02,1),gridSize:number(s.gridSize,message('ui.grid_size'),0.01,1),snap:boolean(s.snap,message('ui.snap')),showGrid:boolean(s.showGrid,message('ui.show_grid'))},
    walls:array(raw.walls,message('ui.walls')).map(w=>{ object(w,message('ui.wall')); const a=point(w.a,message('ui.wall_start')),b=point(w.b,message('ui.wall_end')); number(distance(a,b),message('ui.wall_length'),0.01,100); return {id:takeId(w.id),a,b,thickness:number(w.thickness,message('ui.wall_thickness'),0.02,1),height:number(w.height,message('ui.wall_height'),0.1,10)}; }),
    furniture:array(raw.furniture,message('ui.furniture')).map(f=>{ object(f,message('ui.furniture')); if(!/^#[0-9a-f]{6}$/i.test(f.color)) throw new PlannerError('ui.furniture_color_must_be_a_six_digit_hex'); return {id:takeId(f.id),name:text(f.name,message('ui.furniture_name')),...nameMetadata(f,PRESETS.map(p=>p.nameKey).concat('name.custom')),type:PRESETS.some(p=>p.type===f.type)?f.type:'box',x:number(f.x,message('ui.furniture_x'),-500,500),y:number(f.y,message('ui.furniture_y'),-500,500),width:number(f.width,message('ui.width'),0.01,100),depth:number(f.depth,message('ui.depth'),0.01,100),height:number(f.height,message('ui.height'),0.01,100),rotation:normalizeAngle(number(f.rotation,message('ui.rotation'),-36000,36000)),color:f.color}; }),
    measurements:array(raw.measurements,message('ui.measurements')).map(m=>{object(m,message('ui.measurement'));const a=point(m.a,message('ui.measurement_start')),b=point(m.b,message('ui.measurement_end'));number(distance(a,b),message('ui.measurement_length'),0.001,1000);return {id:takeId(m.id),a,b};}), background:null };
  if(raw.background!==null) {
    const bg=object(raw.background,message('ui.background'));
    const pixelWidth=number(bg.pixelWidth,message('ui.image_width'),1,16000), pixelHeight=number(bg.pixelHeight,message('ui.image_height'),1,16000);
    if(!Number.isInteger(pixelWidth)||!Number.isInteger(pixelHeight)||pixelWidth*pixelHeight>LIMITS.pixels) throw new PlannerError('ui.image_exceeds_the_16_megapixel_limit');
    result.background={id:takeId(bg.id),pixelWidth,pixelHeight,x:number(bg.x,message('ui.image_x'),-500,500),y:number(bg.y,message('ui.image_y'),-500,500),metersPerPixel:number(bg.metersPerPixel,message('ui.image_scale'),0.000001,10),opacity:number(bg.opacity,message('ui.image_opacity'),0,1),visible:boolean(bg.visible,message('ui.image_visibility')),locked:boolean(bg.locked,message('ui.image_lock')),calibration:null};
    if(bg.calibration!==null) {
      const c=object(bg.calibration,message('ui.calibration')), a=imagePoint(c.a,bg,message('ui.calibration_start')),b=imagePoint(c.b,bg,message('ui.calibration_end'));
      const realMeters=number(c.realMeters,message('ui.known_distance'),0.001,100);
      if(distance(a,b)<1) throw new PlannerError('ui.calibration_points_must_be_different');
      if(Math.abs(realMeters/distance(a,b)-bg.metersPerPixel)>Math.max(1e-9,bg.metersPerPixel*1e-6)) throw new PlannerError('ui.calibration_and_image_scale_are_inconsistent');
      result.background.calibration={a,b,realMeters};
    }
    if(bg.dataURL!==undefined) {
      if(typeof bg.dataURL!=='string'||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(bg.dataURL)||dataUrlBytes(bg.dataURL)>LIMITS.embeddedBytes) throw new PlannerError('ui.embedded_background_must_be_a_png_or_jpeg');
      result.background.dataURL=bg.dataURL;
    }
  }
  return result;
}
export function parseProject(json) {
  if(typeof json!=='string'||new TextEncoder().encode(json).byteLength>LIMITS.bytes) throw new PlannerError('ui.project_json_exceeds_the_10_mb_limit');
  let raw;try {raw=JSON.parse(json);}catch {throw new PlannerError('ui.this_is_not_valid_project_json');}
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

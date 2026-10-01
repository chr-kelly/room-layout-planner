"""Browser regression tests. Requires Playwright; no application build or backend.
Run: pip install -r requirements-test.txt && playwright install chromium
     python tests/browser_test.py
CHROMIUM_PATH can select a preinstalled test browser. Screenshots and results go
under test-results/. These are emulated viewports, not real-device certification.
"""
from __future__ import annotations
import base64, contextlib, functools, http.server, json, math, os, pathlib, struct, sys, threading, time, traceback, zlib
from playwright.sync_api import sync_playwright, expect
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
RESULTS = []
PERF = {}
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_): pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}/?test=1'

def png(width=800, height=600):
    def chunk(kind, data): return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
    rows=[]
    for y in range(height):
        row=bytearray([255,255,255]*width)
        if width==800:
            for x in range(95,506):
                if 95<=y<=105 or 475<=y<=485 or (100<=y<=480 and (95<=x<=105 or 495<=x<=505)):
                    row[x*3:x*3+3]=b'\x30\x40\x35'
        rows.append(b'\x00'+row)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')
IMAGE = png()
def payload(data, name='test.json', mime='application/json'): return {'name': name, 'mimeType': mime, 'buffer': data if isinstance(data,bytes) else data.encode()}
def snapshot(p): return p.evaluate('plannerTest.snapshot()')
def geometry(p):
    s=snapshot(p); return {k:s[k] for k in ['walls','furniture','measurements']}
def point(p,x,y): return p.evaluate('(q)=>plannerTest.screen(q)',{'x':x,'y':y})
def click_point(p,x,y):
    pos=point(p,x,y);p.mouse.click(pos['x'],pos['y'])
def example(p): p.get_by_role('button',name='Try an example',exact=True).click()
def blank(p): p.get_by_role('button',name='Start blank',exact=True).click()
def choose_sofa(p): p.get_by_role('button',name='Select Sofa',exact=True).first.click()
def close_dialog(p): p.get_by_role('button',name='Close dialog',exact=True).click()
def export_download(p,label='Download JSON'):
    p.locator('#export-project').click()
    with p.expect_download() as info: p.get_by_role('button',name=label,exact=True).click()
    path=info.value.path(); data=pathlib.Path(path).read_bytes();close_dialog(p);return data

def create_room(p,width=6,depth=6):
    p.locator('#rectangle-room').click();p.locator('#field-room-width-m').fill(str(width));p.locator('#field-room-depth-m').fill(str(depth));p.get_by_role('button',name='Create room',exact=True).click()
def import_image(p,data=IMAGE,name='plan.png',mime='image/png'):
    p.locator('#image-file').set_input_files(payload(data,name,mime))
    p.wait_for_function('plannerTest.snapshot().background !== null')
def calibrate(p):
    bg=snapshot(p)['background']
    for x in [100,500]: click_point(p,bg['x']+x*bg['metersPerPixel'],bg['y']+100*bg['metersPerPixel'])
    p.locator('#field-calibration-m').fill('4');p.get_by_role('button',name='Apply calibration',exact=True).click()

with sync_playwright() as pw:
    launch={'headless':True,'args':['--no-sandbox','--enable-unsafe-swiftshader']}
    if os.environ.get('CHROMIUM_PATH'): launch['executable_path']=os.environ['CHROMIUM_PATH']
    browser=pw.chromium.launch(**launch)
    browser_version=browser.version
    @contextlib.contextmanager
    def page(mobile=False, init=None, block_vendor=False):
        ctx=browser.new_context(viewport={'width':390 if mobile else 1366,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile,device_scale_factor=1)
        if init: ctx.add_init_script(init)
        if block_vendor: ctx.route('**/vendor/three/**',lambda route:route.abort())
        p=ctx.new_page();p.set_default_timeout(6000)
        errors=[];requests=[]
        p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url))
        p.goto(URL);p.wait_for_function('window.plannerTest !== undefined')
        try:
            yield p,errors,requests
        finally: ctx.close()
    def run(name, fn):
        try:
            fn();RESULTS.append({'name':name,'status':'passed'});print('PASS',name,flush=True)
        except Exception as exc:
            RESULTS.append({'name':name,'status':'failed','error':str(exc)});print('FAIL',name,repr(exc),flush=True);traceback.print_exc()
    def test_example():
        with page() as (p,errors,requests):
            example(p);s=snapshot(p);assert len(s['furniture'])==4 and len(s['walls'])==4
            assert math.isclose(s['walls'][1]['a']['x']-s['walls'][3]['a']['x']-.12,4)
            p.wait_for_timeout(600);expect(p.locator('#save-status')).to_have_text('Saved on this device')
            assert not errors;assert all(r.startswith(URL.split('?')[0]) for r in requests)
            p.locator('#toast').evaluate('(e)=>e.hidden=true');p.screenshot(path=str(OUT/'desktop-2d.png'))
    run('Desktop example, metric geometry, local autosave and zero external requests',test_example)
    def test_furniture():
        with page() as (p,e,r):
            example(p);choose_sofa(p);p.locator('#field-width-m').fill('2.2');p.locator('#apply-properties').click()
            assert snapshot(p)['furniture'][0]['width']==2.2
            p.locator('#rotate-item').click();assert snapshot(p)['furniture'][0]['rotation']==90
            p.locator('#duplicate-item').click();s=snapshot(p);assert len(s['furniture'])==5;assert s['furniture'][0]['x']!=s['furniture'][-1]['x']
            p.locator('#delete-item').click();assert len(snapshot(p)['furniture'])==4
            p.locator('#undo').click();assert len(snapshot(p)['furniture'])==5
            p.locator('#redo').click();assert len(snapshot(p)['furniture'])==4;assert not e
    run('Furniture dimensions, rotate, duplicate, delete, undo and redo',test_furniture)
    def test_invalid_dimension():
        with page() as (p,e,r):
            example(p);choose_sofa(p);before=geometry(p);p.locator('#field-width-m').fill('-1');p.locator('#apply-properties').click()
            expect(p.locator('#inspector [role=alert]')).to_contain_text('between');assert geometry(p)==before
    run('Negative furniture dimensions leave project unchanged',test_invalid_dimension)
    def test_drag():
        with page() as (p,e,r):
            example(p);p.locator('[data-tool=select]').click();start=point(p,1.15,.6);end=point(p,1.55,1.0)
            old=p.evaluate('plannerTest.history().undo');p.mouse.move(start['x'],start['y']);p.mouse.down();p.mouse.move(end['x'],end['y'],steps=20);p.mouse.up()
            assert snapshot(p)['furniture'][0]['x']!=1.15
            assert p.evaluate('plannerTest.history().undo')==old+1;p.locator('#undo').click();assert snapshot(p)['furniture'][0]['x']==1.15
    run('Dragging creates exactly one undo step',test_drag)
    def test_input_shortcut():
        with page() as (p,e,r):
            example(p);choose_sofa(p);count=len(snapshot(p)['furniture']);p.locator('#field-name').focus();p.keyboard.press('Delete');p.keyboard.press('Backspace');assert len(snapshot(p)['furniture'])==count
    run('Delete and Backspace in input fields do not remove furniture',test_input_shortcut)
    def test_units():
        with page() as (p,e,r):
            example(p);before=geometry(p)
            for i in range(10):p.locator('#units').select_option('imperial' if i%2==0 else 'metric')
            assert geometry(p)==before
    run('Ten metric/imperial switches preserve geometry exactly',test_units)
    def test_wall_measurement():
        with page() as (p,e,r):
            blank(p);create_room(p);p.locator('[data-tool=wall]').click();click_point(p,1,1);click_point(p,4,1)
            assert len(snapshot(p)['walls'])==5
            p.locator('#field-wall-length-m').fill('2');p.locator('#apply-properties').click();w=snapshot(p)['walls'][-1];assert math.isclose(math.dist(list(w['a'].values()),list(w['b'].values())),2)
            p.locator('[data-tool=measure]').click();click_point(p,1,1);click_point(p,4,5);m=snapshot(p)['measurements'][-1];assert math.isclose(math.hypot(m['a']['x']-m['b']['x'],m['a']['y']-m['b']['y']),5)
    run('Two-tap wall drawing, length edit and 3–4–5 measurement',test_wall_measurement)
    def test_room_resize():
        with page() as (p,e,r):
            example(p);old=snapshot(p)['furniture'];p.locator('#rectangle-room').click();p.locator('#field-room-depth-m').fill('3.5');p.get_by_role('button',name='Replace walls',exact=True).click();s=snapshot(p)
            assert math.isclose(s['walls'][2]['a']['y']-s['walls'][0]['a']['y']-.12,3.5);assert s['furniture']==old
            p.locator('#undo').click();assert math.isclose(snapshot(p)['walls'][2]['a']['y']-snapshot(p)['walls'][0]['a']['y']-.12,3)
    run('4 × 3 to 4 × 3.5 m clear-inside rectangle resize, undo',test_room_resize)
    def test_calibration():
        with page() as (p,e,r):
            example(p);before=geometry(p);import_image(p);calibrate(p);bg=snapshot(p)['background'];assert math.isclose(bg['metersPerPixel'],.01);assert geometry(p)==before
            p.locator('#undo').click();assert snapshot(p)['background']['calibration'] is None;assert geometry(p)==before
    run('400 pixel / 4 m calibration, geometry preservation and undo',test_calibration)
    def test_images():
        with page() as (p,e,r):
            example(p);before=geometry(p)
            invalid=[payload(b'%PDF-1.7','plan.pdf','application/pdf'),payload(b'broken','broken.png','image/png'),payload(b'0'*(10*1024*1024+1),'large.png','image/png')]
            huge=bytearray(24);huge[:8]=b'\x89PNG\r\n\x1a\n';huge[16:24]=struct.pack('>II',5000,5000);invalid.append(payload(bytes(huge),'huge.png','image/png'))
            for file in invalid:
                p.locator('#image-file').set_input_files(file);p.wait_for_timeout(100);assert geometry(p)==before;assert snapshot(p)['background'] is None
            jpg=p.evaluate("()=>{const c=document.createElement('canvas');c.width=800;c.height=600;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,800,600);return c.toDataURL('image/jpeg').split(',')[1]}")
            import_image(p,base64.b64decode(jpg),'plan.jpg','image/jpeg');assert snapshot(p)['background']['pixelWidth']==800
    run('PNG/JPEG input; corrupt, PDF, >10 MB and >16 MP rejection',test_images)
    def test_png():
        with page() as (p,e,r):
            example(p);data=export_download(p,'Download PNG');assert data[:8]==b'\x89PNG\r\n\x1a\n';w,h=struct.unpack('>II',data[16:24]);assert w>=1200 and h>=800;(OUT/'example-export.png').write_bytes(data)
    run('Downloadable high-resolution 2D PNG export',test_png)
    def test_json_roundtrip():
        with page() as (p,e,r):
            example(p);import_image(p);calibrate(p);before=geometry(p);p.locator('#export-project').click();p.locator('#export-background').check()
            with p.expect_download() as info:p.get_by_role('button',name='Download JSON',exact=True).click()
            data=pathlib.Path(info.value.path()).read_bytes();raw=json.loads(data);assert raw['background']['dataURL'].startswith('data:image/png;base64,');close_dialog(p)
            p.locator('#project-file').set_input_files(payload(data));p.get_by_role('button',name='Confirm',exact=True).click();assert geometry(p)==before
            assert p.evaluate('plannerTest.history().undo')==0
            p.wait_for_timeout(650);p.reload();p.wait_for_function('window.plannerTest !== undefined');assert geometry(p)==before;expect(p.locator('#notice')).to_contain_text('Background not restored')
    run('Embedded-background JSON roundtrip, import history boundary and refresh recovery',test_json_roundtrip)
    def test_invalid_json():
        with page() as (p,e,r):
            example(p);before=snapshot(p);bad=[]
            version=json.loads(json.dumps(before));version['schemaVersion']=999;bad.append(version)
            negative=json.loads(json.dumps(before));negative['furniture'][0]['height']=-1;bad.append(negative)
            duplicate=json.loads(json.dumps(before));duplicate['furniture'][0]['id']=duplicate['walls'][0]['id'];bad.append(duplicate)
            for data in [json.dumps(v) for v in bad]+['{broken',' '*(10*1024*1024+1)]:
                p.locator('#project-file').set_input_files(payload(data));p.wait_for_timeout(70);assert snapshot(p)==before
    run('Unknown JSON schema, negative dimensions, duplicate IDs, corrupt/oversize JSON rejected atomically',test_invalid_json)
    def test_cancel_import_new_clear():
        with page() as (p,e,r):
            example(p);before=snapshot(p);other=json.loads(json.dumps(before));other['name']='Other plan'
            p.locator('#project-file').set_input_files(payload(json.dumps(other)));p.get_by_role('button',name='Cancel',exact=True).click();assert snapshot(p)==before
            p.locator('#new-project').click();p.get_by_role('button',name='Cancel',exact=True).click();assert snapshot(p)==before
            p.locator('#clear-project').click();p.get_by_role('button',name='Cancel',exact=True).click();assert snapshot(p)==before
            p.evaluate("localStorage.setItem('another-app','untouched')");p.locator('#clear-project').click();p.get_by_role('button',name='Confirm',exact=True).click()
            assert not snapshot(p)['walls'];assert p.evaluate("localStorage.getItem('room-layout-planner.project.v1')") is None;assert p.evaluate("localStorage.getItem('another-app')")=='untouched'
    run('Import, new and clear cancellations; confirmed clear removes only app cache',test_cancel_import_new_clear)
    def test_storage_disabled():
        with page(init="Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}})") as (p,e,r):
            p.locator('#new-project').click();example(p);p.wait_for_timeout(650);expect(p.locator('#save-status')).to_contain_text('Not saved');assert len(snapshot(p)['furniture'])==4
            assert json.loads(export_download(p))['schemaVersion']==1
    run('Disabled browser storage reports failure but preserves editing and JSON download',test_storage_disabled)
    def test_webgl_failure():
        js="const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return ['webgl','webgl2','experimental-webgl'].includes(type)?null:get.call(this,type,...args)}"
        with page(init=js) as (p,e,r):
            example(p);p.locator('#view-3d').click();expect(p.locator('#notice')).to_contain_text('3D is unavailable');expect(p.locator('#plan-canvas')).to_be_visible();assert json.loads(export_download(p))['schemaVersion']==1
    run('WebGL unavailable falls back to usable 2D and export',test_webgl_failure)
    def test_vendor_failure():
        with page(block_vendor=True) as (p,e,r):
            example(p);p.locator('#view-3d').click();expect(p.locator('#notice')).to_contain_text('3D is unavailable');p.get_by_role('button',name='Add Desk',exact=True).click();assert len(snapshot(p)['furniture'])==5
    run('Missing Three.js dependency does not block the editor',test_vendor_failure)
    def test_3d():
        with page() as (p,e,r):
            example(p);before=geometry(p);p.locator('#view-3d').click();p.wait_for_function("plannerTest.mode()==='3d'");p.wait_for_timeout(600)
            meshes=p.evaluate('plannerTest.scene()');assert len(meshes)==4
            for f in snapshot(p)['furniture']:
                m=next(m for m in meshes if m['id']==f['id'])
                assert all(math.isclose(m[k],f[k]) for k in ['x','y','width','depth','height'])
            p.locator('#toast').evaluate('(e)=>e.hidden=true');p.screenshot(path=str(OUT/'desktop-3d.png'))
            p.locator('#walk').click();expect(p.locator('#walk-controls')).to_be_visible();p.locator('[data-walk=w]').hover();p.mouse.down();p.wait_for_timeout(100);p.mouse.up()
            p.locator('#overview').click();p.locator('#cutaway').uncheck();p.locator('#view-2d').click();assert geometry(p)==before;assert not e
            assert all(req.startswith(URL.split('?')[0]) for req in r)
    run('Real Three.js 3D geometry, overview, walk, full wall height and return to 2D',test_3d)
    def test_mobile():
        with page(mobile=True) as (p,e,r):
            example(p);p.locator('[data-panel=library]').tap();p.get_by_role('button',name='Add Desk',exact=True).tap();assert len(snapshot(p)['furniture'])==5
            p.locator('[data-panel=inspector]').tap();p.locator('#field-width-m').fill('1.6');p.locator('#apply-properties').tap();assert snapshot(p)['furniture'][-1]['width']==1.6
            p.locator('#units').select_option('imperial');p.locator('#field-width-ft').fill('5');p.locator('#field-width-in').fill('3');p.locator('#apply-properties').tap();assert math.isclose(snapshot(p)['furniture'][-1]['width'],1.6002)
            p.get_by_role('button',name='Close details',exact=True).tap();assert p.evaluate('document.documentElement.scrollWidth <= innerWidth')
            buttons=p.locator('button').evaluate_all("nodes=>nodes.filter(e=>e.getClientRects().length && !e.closest('[hidden]')).map(e=>({name:e.textContent.trim(),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))")
            assert all(b['w']>=43.9 and b['h']>=43.9 for b in buttons),[b for b in buttons if b['w']<43.9 or b['h']<43.9]
            p.locator('#toast').evaluate('(e)=>e.hidden=true');p.screenshot(path=str(OUT/'mobile-390.png'));assert not e
    run('390 px touch workflow, imperial fields, no overflow and 44 px button targets',test_mobile)
    def test_xss():
        with page() as (p,e,r):
            example(p);p.locator('#project-name').click();p.locator('#field-project-name').fill('<img src=x onerror=alert(1)>');p.get_by_role('button',name='Save name',exact=True).click();expect(p.locator('#project-name')).to_have_text('<img src=x onerror=alert(1)>');assert p.locator('#project-name img').count()==0;assert not e
    run('Imported/user names render as plain text, not executable HTML',test_xss)
    def test_alignment():
        with page() as (p,e,r):
            example(p);import_image(p);calibrate(p);old=snapshot(p)['background'];p.locator('#image-file').set_input_files(payload(IMAGE,'same.png','image/png'));p.get_by_role('button',name='Keep alignment',exact=True).click();assert snapshot(p)['background']['metersPerPixel']==old['metersPerPixel']
            p.locator('#image-file').set_input_files(payload(png(100,100),'different.png','image/png'));expect(p.locator('#modal')).to_contain_text('pixel dimensions changed');assert p.get_by_role('button',name='Keep alignment',exact=True).count()==0
            p.get_by_role('button',name='Cancel',exact=True).click();assert snapshot(p)['background']['metersPerPixel']==old['metersPerPixel']
    run('Background re-selection requires explicit matching alignment; mismatch cannot reuse calibration',test_alignment)
    def test_performance():
        with page() as (p,e,r):
            example(p);s=snapshot(p);base=s['furniture'][0];s['furniture']=[{**base,'id':f'load-f-{i}','x':(i%10)*2.5,'y':(i//10)*1.6} for i in range(50)]
            s['walls']=[{'id':f'load-w-{i}','a':{'x':(i%10)*2.5,'y':(i//10)*1.6},'b':{'x':(i%10)*2.5+2,'y':(i//10)*1.6},'height':2.4,'thickness':.12} for i in range(50)]
            s['measurements']=[];s['background']={'id':'load-bg','pixelWidth':2048,'pixelHeight':1024,'x':0,'y':0,'metersPerPixel':.012,'opacity':.5,'visible':True,'locked':True,'calibration':None,'dataURL':'data:image/png;base64,'+base64.b64encode(png(2048,1024)).decode()}
            p.locator('#project-file').set_input_files(payload(json.dumps(s)));p.get_by_role('button',name='Confirm',exact=True).click();p.locator('#view-3d').click();p.wait_for_function("plannerTest.mode()==='3d'")
            timing=p.evaluate("()=>new Promise(resolve=>{let frames=[],start=performance.now(),last=start;function tick(t){frames.push(t-last);last=t;if(t-start<2000)requestAnimationFrame(tick);else resolve({frames:frames.length,seconds:(t-start)/1000,over33ms:frames.filter(v=>v>33.34).length})}requestAnimationFrame(tick)})")
            PERF.update(timing);PERF['mean_fps']=round(timing['frames']/timing['seconds'],1);PERF['note']='Headless Linux software-rendering observation; not real-device certification or a guaranteed FPS.'
    run('50-wall / 50-item / 2048 px image load and observed 3D frame timing',test_performance)
    browser.close()
server.shutdown()
report={'browser':f'Chromium {browser_version}','platform':'Linux headless','desktop_viewport':'1366 × 900','mobile_viewport':'390 × 844 (emulated, not real device)','passed':sum(r['status']=='passed' for r in RESULTS),'failed':sum(r['status']=='failed' for r in RESULTS),'cases':RESULTS,'performance':PERF,'not_tested':['current stable Chrome/Edge/Firefox/macOS Safari','real iOS Safari / Android Chrome devices','physical-device frame rate','external GitHub deployment']}
(OUT/'browser-results.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='cases'},indent=2,ensure_ascii=False))
sys.exit(1 if report['failed'] else 0)

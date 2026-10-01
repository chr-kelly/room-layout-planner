import { message } from './messages.js';
import { bindAttribute } from './i18n.js';
import * as THREE from '../vendor/three/three.module.min.js';
import { OrbitControls } from '../vendor/three/OrbitControls.js';
import { projectBounds, distance } from './model.js';

/** Read-only view of the exact same metre-based model used by the 2D editor. */
export class SceneView {
  constructor(host,getProject,onFailure) {
    this.host=host;this.getProject=getProject;this.active=false;this.walk=false;this.cutaway=true;this.keys=new Set();this.yaw=0;this.pitch=0;this.frame=0;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#f3f2eb');
    this.camera=new THREE.PerspectiveCamera(45,1,0.025,3000);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;
    bindAttribute(this.renderer.domElement,'aria-label',message('ui.3d_view_of_the_current_layout'));this.renderer.domElement.tabIndex=0;
    host.append(this.renderer.domElement);
    this.renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();this.hide();onFailure(message('ui.the_graphics_context_was_lost_reload_to_retry'));});
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.08;this.controls.maxPolarAngle=Math.PI*.49;this.controls.minDistance=.4;this.controls.maxDistance=1500;
    this.scene.add(new THREE.HemisphereLight('#ffffff','#a6ad9a',3));
    this.sun=new THREE.DirectionalLight('#fff7e3',4);this.sun.position.set(4,10,6);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.normalBias=.035;this.scene.add(this.sun);this.scene.add(this.sun.target);
    this.group=new THREE.Group();this.scene.add(this.group);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);
    let drag=null;
    this.renderer.domElement.addEventListener('pointerdown',e=>{if(this.walk){drag={x:e.clientX,y:e.clientY,id:e.pointerId};this.renderer.domElement.setPointerCapture(e.pointerId);}});
    this.renderer.domElement.addEventListener('pointermove',e=>{if(this.walk&&drag){this.yaw-=(e.clientX-drag.x)*.005;this.pitch=Math.max(-1.2,Math.min(1.2,this.pitch-(e.clientY-drag.y)*.005));drag.x=e.clientX;drag.y=e.clientY;}});
    const release=()=>{drag=null;};this.renderer.domElement.addEventListener('pointerup',release);this.renderer.domElement.addEventListener('pointercancel',release);
    window.addEventListener('keydown',e=>{if(this.active&&this.walk&&!e.target.closest('input,textarea,select,[contenteditable]')&&!document.querySelector('dialog[open]')){const key=e.key.toLowerCase();if(['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown'].includes(key)){this.keys.add(key);e.preventDefault();}}});
    window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>this.keys.clear());
    document.addEventListener('visibilitychange',()=>{this.keys.clear();});
    this.build();this.reset();
  }
  resize() {const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  disposeGroup() {this.group.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material){for(const m of Array.isArray(obj.material)?obj.material:[obj.material])m.dispose();}});this.group.clear();}
  box(w,h,d,x,y,z,color,rotation=0) {
    const geo=new THREE.BoxGeometry(w,h,d),material=new THREE.MeshStandardMaterial({color,roughness:.82,metalness:0});
    const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.castShadow=true;mesh.receiveShadow=true;this.group.add(mesh);
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:'#485145',transparent:true,opacity:.14}));mesh.add(edges);return mesh;
  }
  build() {
    this.disposeGroup();const p=this.getProject(),b=projectBounds(p,false),cx=b.x+b.width/2,cz=b.y+b.height/2;
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(b.width+.5,b.height+.5),new THREE.MeshStandardMaterial({color:'#e3dfd1',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.set(cx,-.006,cz);floor.receiveShadow=true;this.group.add(floor);
    for(const w of p.walls){const height=this.cutaway?Math.min(w.height,.65):w.height;this.box(distance(w.a,w.b)+w.thickness,height,w.thickness,(w.a.x+w.b.x)/2,height/2,(w.a.y+w.b.y)/2,'#f5f0e6',-Math.atan2(w.b.y-w.a.y,w.b.x-w.a.x));}
    for(const f of p.furniture){const mesh=this.box(f.width,f.height,f.depth,f.x,f.height/2,f.y,f.color,-f.rotation*Math.PI/180);mesh.userData={kind:'furniture',id:f.id};}
    const range=Math.max(b.width,b.height,5);this.sun.position.set(cx+range*.5,range*1.5,cz+range*.6);this.sun.target.position.set(cx,0,cz);Object.assign(this.sun.shadow.camera,{left:-range,right:range,top:range,bottom:-range,far:range*5});this.sun.shadow.camera.updateProjectionMatrix();
  }
  reset() {
    const b=projectBounds(this.getProject(),false),x=b.x+b.width/2,z=b.y+b.height/2,r=Math.max(b.width,b.height,3);
    this.setWalk(false);this.controls.target.set(x,.1,z);this.camera.position.set(x+r*.92,r*.95,z+r*1.02);this.controls.update();
  }
  setWalk(walk) {
    this.walk=walk;this.controls.enabled=!walk;this.keys.clear();
    if(walk){const b=projectBounds(this.getProject(),false);this.camera.position.set(b.x+b.width/2,1.65,b.y+b.height*.75);this.yaw=0;this.pitch=-.1;this.camera.rotation.order='YXZ';}
  }
  snapshot(){return this.group.children.filter(o=>o.userData.kind==='furniture').map(o=>({id:o.userData.id,width:o.geometry.parameters.width,depth:o.geometry.parameters.depth,height:o.geometry.parameters.height,x:o.position.x,y:o.position.z,rotation:o.rotation.y}));}
  setCutaway(value){this.cutaway=value;this.build();}
  zoom(factor){if(this.walk)return;this.camera.position.sub(this.controls.target).multiplyScalar(1/factor).add(this.controls.target);this.controls.update();}
  show() {this.active=true;this.resize();this.build();this.previousTime=performance.now();if(!this.frame)this.frame=requestAnimationFrame(time=>this.animate(time));}
  hide() {this.active=false;this.keys.clear();if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;}
  animate(time) {
    this.frame=0;if(!this.active)return;
    const dt=Math.min(.04,(time-this.previousTime)/1000);this.previousTime=time;
    if(document.visibilityState!=='hidden') {
      if(this.walk) {
        let f=Number(this.keys.has('w')||this.keys.has('arrowup'))-Number(this.keys.has('s')||this.keys.has('arrowdown'));
        let side=Number(this.keys.has('d'))-Number(this.keys.has('a'));
        if(f&&side){f/=Math.SQRT2;side/=Math.SQRT2;}
        this.yaw+=(Number(this.keys.has('arrowleft'))-Number(this.keys.has('arrowright')))*dt*1.5;
        this.camera.position.x+=(-Math.sin(this.yaw)*f+Math.cos(this.yaw)*side)*dt*1.8;
        this.camera.position.z+=(-Math.cos(this.yaw)*f-Math.sin(this.yaw)*side)*dt*1.8;
        this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');
      } else this.controls.update();
      this.renderer.render(this.scene,this.camera);
    }
    this.frame=requestAnimationFrame(next=>this.animate(next));
  }
}

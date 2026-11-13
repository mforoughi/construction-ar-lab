import {loadEngine} from './xr-adapter.js';
// World tracking is isolated from the existing image engine by a page reload.
// Placement uses an estimated horizontal ground plane, not scene mesh detection.
export async function startFloor({THREE,container,model,onReady,onTracking,onFrame,onStatus,onError,onPlaced=()=>{}}) {
  const XR8=await loadEngine(THREE,'/construction-ar-lab/vendor/8thwall-world/xr.js');
  XR8.XrController.configure({disableWorldTracking:false,imageTargetData:[],scale:'responsive'});
  const canvas=document.createElement('canvas');container.append(canvas);
  let stopped=false,started=false,normal=false,placed=false,renderer,camera,ring,anchor,timer;
  const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();
  let resolve,reject;const ready=new Promise((a,b)=>{resolve=a;reject=b;});
  const resize=()=>{const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(container.clientWidth*d));canvas.height=Math.max(1,Math.round(container.clientHeight*d));};
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  const stop=()=>{if(stopped)return;stopped=true;clearTimeout(timer);observer.disconnect();canvas.removeEventListener('click',place);canvas.removeEventListener('webglcontextlost',lost);document.removeEventListener('visibilitychange',visibility);XR8.stop();XR8.clearCameraPipelineModules();ring?.geometry.dispose();ring?.material.dispose();renderer?.dispose();canvas.remove();};
  const fail=e=>{if(stopped)return;const error=e instanceof Error?e:new Error(e?.message||'Floor AR stopped. Tap Retry floor.');const wasStarted=started;stop();wasStarted?onError(error):reject(error);};
  const lost=e=>{e.preventDefault();fail(new Error('Graphics interrupted. Tap Retry floor.'));};
  const visibility=()=>{if(document.hidden){normal=false;onTracking(false);}};
  function place(){if(!normal||placed||!ring?.visible)return;anchor.position.copy(ring.position);anchor.visible=true;placed=true;ring.visible=false;onTracking(true);onPlaced(true);onStatus('Placed on estimated floor · press Play. Adjust height if needed.');}
  canvas.addEventListener('click',place);canvas.addEventListener('webglcontextlost',lost);document.addEventListener('visibilitychange',visibility);
  try {
    XR8.addCameraPipelineModules([XR8.GlTextureRenderer.pipelineModule(),XR8.XrController.pipelineModule(),XR8.Threejs.pipelineModule(),{
      name:'construction-floor',
      onStart:()=>{if(stopped)return;const state=XR8.Threejs.xrScene();renderer=state.renderer;camera=state.camera;camera.position.set(0,3,0);
        XR8.XrController.updateCameraProjectionMatrix({origin:camera.position,facing:camera.quaternion});
        anchor=new THREE.Group();anchor.visible=false;state.scene.add(anchor);anchor.add(model);model.position.set(0,0,0);model.rotation.set(0,0,0);model.scale.setScalar(1);
        ring=new THREE.Mesh(new THREE.RingGeometry(.12,.16,40),new THREE.MeshBasicMaterial({color:0xe2b85a,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.visible=false;state.scene.add(ring);
        onReady(state);started=true;clearTimeout(timer);onStatus('Move your phone slowly, then aim down at the floor.');resolve();},
      onUpdate:({processCpuResult})=>{if(!started||stopped)return;const r=processCpuResult?.reality;normal=!document.hidden&&r?.trackingStatus==='NORMAL';
        onTracking(normal&&placed);anchor.visible=placed&&normal;ring.visible=false;
        if(!normal){onStatus('Move slowly over a well-lit, textured floor · playback waiting.');}
        else if(!placed){camera.updateMatrixWorld(true);ray.setFromCamera(new THREE.Vector2(0,0),camera);const hit=ray.ray.intersectPlane(plane,point);if(hit&&ray.ray.direction.y<-.08&&point.distanceTo(camera.position)<30){ring.position.copy(point);ring.visible=true;onStatus('Aim the gold ring at the floor, then tap Place here.');}else onStatus('Point down toward the floor.');}
        else onStatus('Placed on estimated floor · press Play. Adjust height if needed.');
        onFrame(performance.now());},
      onCameraStatusChange:({status})=>{if(status==='requesting')onStatus('Allow camera and motion access when asked.');if(status==='failed')fail(new Error('Camera access failed. Allow access and retry.'));},onException:fail
    }]);
    timer=setTimeout(()=>fail(new Error('Floor AR startup timed out. Allow camera access and retry.')),60000);
    XR8.run({canvas,allowedDevices:XR8.XrConfig.device().ANY});await ready;
    return {stop,place,reposition(){placed=false;onPlaced(false);anchor.visible=false;onTracking(false);},adjust({scale,rotation,elevation}){model.scale.setScalar(scale);model.rotation.y=rotation;model.position.y=elevation;}};
  }catch(e){stop();throw e;}
}

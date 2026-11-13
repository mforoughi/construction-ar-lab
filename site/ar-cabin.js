import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createEquipmentRig} from './equipment-rig.js';
import {prepareCabinBody,createCabinCamera} from './equipment-cabin.js';
import {createCameraSession} from './ar-cabin-camera.js';
import {readResource,withTimeout} from './viewer-loading.js';
const $=id=>document.getElementById(id);const outside=new URLSearchParams(location.search).get('outside');if(['sheet','floor','preview'].includes(outside))$('outside').href='/construction-ar-lab/equipment.html?mode='+outside;
let renderer,rig,model,restoreBody,observer,frame,cameraActive=false,cameraReady=false,wantSound=false,soundRunning=false,soundGeneration=0;
const sound=new Audio();sound.loop=true;sound.preload='none';sound.volume=.5;
async function soundSource(){sound.src='/construction-ar-lab/equipment/engine-sample.wav';}
soundSource();
function syncSound(){if(cameraActive&&wantSound&&!document.hidden){if(soundRunning)return;soundRunning=true;const generation=++soundGeneration;sound.play().catch(()=>{if(generation!==soundGeneration)return;soundRunning=false;wantSound=false;$('hearSound').checked=false;$('status').textContent='Tap Hear engine sound after the camera opens to enable audio.';});}else{soundGeneration++;soundRunning=false;sound.pause();}}
$('hearSound').onchange=()=>{wantSound=$('hearSound').checked;syncSound();};$('volume').oninput=()=>sound.volume=Number($('volume').value);
const session=createCameraSession({video:$('cameraVideo'),getUserMedia:constraints=>{if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera access requires a supported browser and HTTPS.');return navigator.mediaDevices.getUserMedia(constraints);},onState:state=>{cameraActive=state==='active';$('start').disabled=state==='starting'||cameraActive||!cameraReady;$('stop').disabled=state==='stopped';$('intro').hidden=cameraActive;$('virtualCab').hidden=!cameraActive;$('dashboard').hidden=!cameraActive||!$('showCab').checked;$('status').textContent=state==='starting'?'Allow camera access when asked.':cameraActive?'Camera live · point your phone around to see your surroundings from the virtual cabin.':'Camera stopped. Tap Start camera to resume.';syncSound();}});
$('start').onclick=async()=>{try{await session.start();}catch(e){$('status').textContent=e.name==='NotAllowedError'?'Camera access was not allowed. Enable camera access for this site and retry.':e.name==='NotFoundError'?'No camera was found on this device.':e.message||'The camera could not start. Retry after closing other camera apps.';}};
$('stop').onclick=session.stop;
$('showCab').onchange=()=>{document.body.classList.toggle('no-cab',!$('showCab').checked);if(model)model.visible=$('showCab').checked;$('dashboard').hidden=!cameraActive||!$('showCab').checked;};
document.addEventListener('visibilitychange',()=>{if(document.hidden)session.stop();});
window.addEventListener('pagehide',()=>{session.stop();sound.pause();cancelAnimationFrame(frame);observer?.disconnect();restoreBody?.();rig?.dispose();renderer?.dispose();});
try{
 const bytes=await readResource('/construction-ar-lab/equipment/backhoe.glb',{label:'Cabin model'});const gltf=await withTimeout(new GLTFLoader().parseAsync(bytes,location.origin+'/construction-ar-lab/equipment/'),30000,'The cabin model could not finish loading. Reload to retry.');rig=createEquipmentRig(THREE,gltf.scene);rig.apply({lift:6,bucket:5,boom:-12,dipper:-18,rearBucket:-30});rig.setDriving(true,0);model=new THREE.Group();model.add(rig.vehicle);model.visible=$('showCab').checked;restoreBody=prepareCabinBody(THREE,rig.vehicle);
 const scene=new THREE.Scene();scene.add(model);scene.add(new THREE.HemisphereLight(0xffffff,0x697463,2));const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(-4,10,7);scene.add(sun);
 const camera=new THREE.PerspectiveCamera(75,1,.035,200);const seat=rig.vehicle.position.clone().add(new THREE.Vector3(1.1,2.9,0));createCabinCamera(THREE,{camera,motion:model,seat}).update();
 renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;$('virtualCab').append(renderer.domElement);
 observer=new ResizeObserver(()=>{const width=$('stage').clientWidth,height=$('stage').clientHeight;camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();renderer.setSize(width,height,false);});observer.observe($('stage'));
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();session.stop();cameraReady=false;$('start').disabled=true;$('status').textContent='Graphics interrupted. Reload this page to restart the cabin.';});
 const draw=()=>{frame=requestAnimationFrame(draw);if(cameraActive)renderer.render(scene,camera);};draw();cameraReady=true;$('start').disabled=false;$('status').textContent='Ready. Tap Start camera to enter the AR cabin.';$('virtualCab').hidden=true;$('dashboard').hidden=true;
}catch(e){session.stop();$('start').disabled=true;$('status').textContent='The virtual cabin could not load. Check WebGL support and your connection, then reload. '+e.message;}

import {createCabinCamera,bindCabinLook,prepareCabinBody} from './equipment-cabin.js';
import {createDriveState,stepDrive,bindDriveButtons,composeDrivePose} from './equipment-drive.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/OrbitControls.js';
import {startTracking} from './xr-adapter.js';
import {startFloor} from './floor-ar.js';
import {readResource,withTimeout} from './viewer-loading.js';
import {createEquipmentRig,operationPose,advanceEquipment,JOINT_LIMITS} from './equipment-rig.js';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),mode=['sheet','floor','cabin'].includes(params.get('mode'))?params.get('mode'):'preview';
const labels={lift:'Front loader lift',bucket:'Front bucket tilt',boom:'Rear boom',dipper:'Rear dipper arm',rearBucket:'Rear bucket curl'};
let rig,model,previewRenderer,orbit,engine,resizeObserver,playing=false,tracked=mode==='preview'||mode==='cabin',progress=0,last=0,raf,busy=false,manual=false;
let cabinCamera,cabinLookCleanup,cabinBodyCleanup;let driveJointPose={},wheelOffset=0;let driving=false,driveNode,driveState=createDriveState(),driveInput={throttle:0,steering:0};
const driveButtons=bindDriveButtons([...document.querySelectorAll('[data-drive]')],{allowed:()=>driving&&!!rig&&tracked&&!busy&&!document.hidden,onInput:value=>{driveInput=value;syncSound();}});
const transportPose=()=>({lift:6,bucket:5,boom:-12,dipper:-18,rearBucket:-30,wheels:0});
function stopDrive(){driveButtons.stop();driveState.moving=false;driveState.steer=0;rig?.setDriving(driving,0);if($('driveState'))$('driveState').textContent=tracked?'Stopped':'Waiting for tracking';syncSound();}
function applyOperationPose(pose){if(driving){driveJointPose={...pose};rig.apply(composeDrivePose(driveJointPose,driveState.roll,wheelOffset));}else rig.apply(pose);}
function driveMode(){driving=$('driveEnabled').checked;playing=false;manual=true;stopDrive();$('drivePad').hidden=!driving;if(driving)applyOperationPose(transportPose());rig.setDriving(driving,0);last=0;sync();}
$('driveEnabled').onchange=driveMode;$('driveStop').onclick=()=>{stopDrive();playing=false;sync();};
function resetDrive(){stopDrive();playing=false;driveState=createDriveState();driveNode?.position.set(0,0,0);driveNode?.rotation.set(0,0,0);wheelOffset=0;$('driveWheels').value='0';$('driveWheelsValue').textContent='0°';$('driveHeading').value='0';$('driveHeadingValue').textContent='0°';if(driving)applyOperationPose(transportPose());}
$('driveReset').onclick=resetDrive;
$('driveHeading').oninput=()=>{stopDrive();driveState.yaw=Number($('driveHeading').value)*Math.PI/180;$('driveHeadingValue').textContent=$('driveHeading').value+'°';};
$('driveWheels').oninput=()=>{playing=false;wheelOffset=Number($('driveWheels').value)*Math.PI/180;$('driveWheelsValue').textContent=$('driveWheels').value+'°';applyOperationPose(driveJointPose);sync();};
for(const button of document.querySelectorAll('[data-operation]'))button.onclick=()=>{$('operation').value=button.dataset.operation;selectOperation();playing=true;last=0;sync();};
window.addEventListener('blur',stopDrive);
const sound=new Audio();sound.loop=true;sound.preload='none';sound.volume=.5;let hasSound=false,soundPlaying=false,soundAttempt=0;
function syncSound(){const run=hasSound&&$('soundEnabled').checked&&(playing||(driving&&driveInput.throttle!==0&&!driveState.boundary))&&tracked&&!document.hidden;if(run&&!soundPlaying){soundPlaying=true;const attempt=++soundAttempt;sound.play().catch(()=>{if(attempt!==soundAttempt)return;soundPlaying=false;$('soundEnabled').checked=false;$('soundStatus').textContent='Tap Hear equipment sound to enable audio on this phone.';});}else if(!run){soundPlaying=false;soundAttempt++;sound.pause();}}
$('soundEnabled').onchange=syncSound;$('volume').oninput=()=>sound.volume=Number($('volume').value);
async function loadSound(){hasSound=true;sound.src='/construction-ar-lab/equipment/engine-sample.wav';$('soundStatus').textContent='Generated engine-noise sample. Sound is optional.';$('soundEnabled').disabled=false;}
loadSound();
$('status').parentElement.parentElement.append($('status'));
const message=text=>{$('status').textContent=text;};
for(const link of document.querySelectorAll('[data-mode]'))if(link.dataset.mode===mode)link.setAttribute('aria-current','page');
const outsideMode=['sheet','floor'].includes(params.get('outside'))?params.get('outside'):'preview';
$('arCabinLink').href='/construction-ar-lab/ar-cabin.html?outside='+(mode==='cabin'?outsideMode:mode);
$('cabinLink').href=mode==='cabin'?'/construction-ar-lab/equipment.html?mode='+outsideMode:'/construction-ar-lab/equipment.html?mode=cabin&outside='+mode;
if(mode==='cabin'){$('cabinLink').textContent='Outside view';document.body.classList.add('cabin-active');$('cabinHUD').hidden=false;$('centerLook').onclick=()=>{stopDrive();cabinCamera?.reset();};}
$('modeTag').textContent=mode==='cabin'?'CABIN SIMULATION':mode==='preview'?'INTERACTIVE 3D':mode==='sheet'?'SHEET AR':'FLOOR AR';
$('startAR').hidden=mode==='preview'||mode==='cabin';$('startAR').textContent=mode==='floor'?'Start floor AR':'Start sheet AR';
$('viewNote').textContent=mode==='cabin'?'Drag to look around · hold driving buttons to move · Center view to look forward':mode==='floor'?'Aim at a clear floor · place the equipment · walk around slowly':mode==='sheet'?'Print the tracking sheet · keep its full border in view':'Drag to orbit · pinch or scroll to zoom';
const experienceURL=new URL('/construction-ar-lab/equipment.html?mode=sheet',location.origin).href;
const qrCanvas=document.createElement('canvas');$('qr').append(qrCanvas);QRCode.toCanvas(qrCanvas,experienceURL,{width:220,margin:4,errorCorrectionLevel:'M',color:{dark:'#183c35',light:'#ffffff'}});
$('share').onclick=()=>{stopDrive();$('shareDialog').showModal();};$('help').onclick=()=>{stopDrive();$('helpDialog').showModal();};
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>button.closest('dialog').close();
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText(experienceURL);$('copyStatus').textContent='Experience link copied.';}catch{$('copyStatus').textContent=experienceURL;}};
$('reload').onclick=()=>location.reload();
for(const [key,[min,max]]of Object.entries(JOINT_LIMITS)){
 const label=document.createElement('label');label.className='range-label';label.htmlFor=key;label.textContent=labels[key];const output=document.createElement('output');output.id=key+'Value';output.textContent='0°';label.append(output);
 const slider=document.createElement('input');Object.assign(slider,{type:'range',id:key,min:String(min),max:String(max),step:'1',value:'0',disabled:true});slider.setAttribute('aria-label',labels[key]);
 slider.oninput=()=>{playing=false;manual=true;const pose=driving?{...driveJointPose}:rig.getPose();pose[key]=Number(slider.value);applyOperationPose(pose);sync();};$('jointControls').append(label,slider);
}
function sync(){
 syncSound();
 $('play').textContent=playing?'Ⅱ Pause':'▶ Play';$('play').setAttribute('aria-label',playing?'Pause equipment animation':'Play equipment animation');$('timeline').value=String(progress);$('progressValue').textContent=Math.round(progress*100)+'%';
 $('playState').textContent=playing?(tracked?'Playing':'Waiting for tracking'):manual?'Manual pose':'Paused';
 if(rig){const pose=rig.getPose();for(const key of Object.keys(JOINT_LIMITS)){$(key).value=String(pose[key]);$(key+'Value').textContent=Math.round(pose[key])+'°';}}
}
function selectOperation(){playing=false;manual=false;progress=0;applyOperationPose(operationPose($('operation').value,0));const texts={loader:'The front arms lift the bucket; the bucket then tips and returns.',dig:'The rear boom, dipper, and bucket move through a digging demonstration.',wheels:'The wheels rotate in place so the model stays on its AR anchor.'};$('operationInfo').textContent=texts[$('operation').value];sync();}
$('operation').onchange=selectOperation;
$('play').onclick=()=>{if(!rig)return;if(!playing){if(manual||progress>=1){progress=0;manual=false;applyOperationPose(operationPose($('operation').value,progress));}last=0;}playing=!playing;sync();};
$('reset').onclick=()=>{playing=false;manual=false;progress=0;applyOperationPose({});sync();};
$('timeline').oninput=()=>{playing=false;manual=false;progress=Number($('timeline').value);applyOperationPose(operationPose($('operation').value,progress));sync();};
function frame(now){if(!last)last=now;const dt=(now-last)/1000;last=now;
 const next=advanceEquipment(progress,dt,Number($('speed').value),{playing,tracked:tracked&&!document.hidden,loop:$('loop').checked});
 if(next.progress!==progress||next.playing!==playing){progress=next.progress;playing=next.playing;applyOperationPose(operationPose($('operation').value,progress));sync();}
 if(driving&&rig&&driveNode){driveState=stepDrive(driveState,{...driveInput,speed:rig.width*.15*Number($('driveSpeed').value),dt,enabled:driving,tracked:tracked&&!document.hidden,limit:mode==='sheet'?1.3:rig.width*4});driveNode.position.set(driveState.x,0,driveState.z);driveNode.rotation.y=driveState.yaw;rig.apply(composeDrivePose(driveJointPose,driveState.roll,wheelOffset));rig.setDriving(true,driveState.steer);const heading=Math.round((driveState.yaw*180/Math.PI+540)%360-180);$('driveHeadingValue').textContent=heading+'°';if(document.activeElement!==$('driveHeading'))$('driveHeading').value=String(heading);$('driveState').textContent=driveState.boundary?'Travel limit reached · reverse or reset position':!tracked?'Waiting for tracking':driveState.moving?(driveInput.throttle>0?'Driving forward':'Reversing'):'Stopped';syncSound();}
}
function lights(scene){scene.add(new THREE.HemisphereLight(0xffffff,0x697463,2));const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(-4,10,7);scene.add(sun);}
function preview(){
 const scene=new THREE.Scene();scene.background=new THREE.Color(mode==='cabin'?'#bfd3dd':'#e4e8dd');lights(scene);scene.add(model);
 const camera=new THREE.PerspectiveCamera(mode==='cabin'?75:38,1,mode==='cabin'?.035:.01,200);camera.position.set(-rig.width*1.05,rig.width*.6,rig.width*1.15);
 previewRenderer=new THREE.WebGLRenderer({antialias:true});previewRenderer.setPixelRatio(Math.min(devicePixelRatio||1,2));previewRenderer.outputColorSpace=THREE.SRGBColorSpace;previewRenderer.toneMapping=THREE.ACESFilmicToneMapping;previewRenderer.toneMappingExposure=1.1;$('scene').append(previewRenderer.domElement);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0xe4e8dd,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.025;scene.add(ground);
 const grid=new THREE.GridHelper(mode==='cabin'?100:22,mode==='cabin'?100:22,0xc0c8b8,0xd0d6c7);grid.position.y=-.015;scene.add(grid);
 if(mode==='cabin'){
  cabinBodyCleanup=prepareCabinBody(THREE,rig.vehicle);
  const seat=rig.vehicle.position.clone().add(new THREE.Vector3(1.1,2.9,0));cabinCamera=createCabinCamera(THREE,{camera,motion:driveNode,seat});cabinLookCleanup=bindCabinLook(previewRenderer.domElement,cabinCamera);cabinCamera.update();
 }else{
 orbit=new OrbitControls(camera,previewRenderer.domElement);orbit.target.set(0,rig.height*.43,0);orbit.enableDamping=true;orbit.minDistance=2;orbit.maxDistance=30;orbit.maxPolarAngle=Math.PI*.49;orbit.update();

 }
 resizeObserver=new ResizeObserver(()=>{const w=$('scene').clientWidth,h=$('scene').clientHeight;camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();previewRenderer.setSize(w,h,false);});resizeObserver.observe($('scene'));
 const draw=now=>{raf=requestAnimationFrame(draw);frame(now);orbit?.update();cabinCamera?.update();if(mode==='cabin'){$('cabinGear').textContent=driveState.moving?(driveInput.throttle>0?'Forward':'Reverse'):'Stopped';$('cabinWheel').style.transform='rotate('+(-driveState.steer*180/Math.PI*3)+'deg)';}previewRenderer.render(scene,camera);};raf=requestAnimationFrame(draw);
}
function stopPreview(){cabinLookCleanup?.();cabinBodyCleanup?.();cancelAnimationFrame(raf);resizeObserver?.disconnect();orbit?.dispose();previewRenderer?.dispose();previewRenderer?.domElement.remove();previewRenderer=null;model.removeFromParent();}
function tracking(value){if(tracked!==value){tracked=value;if(!value)stopDrive();last=0;sync();}}
function adjustFloor(){const length=Number($('size').value),rotation=Number($('rotation').value),height=Number($('height').value);$('sizeValue').textContent=length.toFixed(1)+' m';$('rotationValue').textContent=rotation+'°';$('heightValue').textContent=height.toFixed(2)+' m';engine?.adjust({scale:length/rig.width,rotation:rotation*Math.PI/180,elevation:height});}
for(const id of ['size','rotation','height'])$(id).oninput=adjustFloor;
function nudgeSize(delta){const input=$('size');input.value=String(Math.max(Number(input.min),Math.min(Number(input.max),Math.round((Number(input.value)+delta)*10)/10)));adjustFloor();}
$('sizeDown').onclick=()=>nudgeSize(-.5);$('sizeUp').onclick=()=>nudgeSize(.5);

$('place').onclick=()=>engine?.place();$('reposition').onclick=()=>{resetDrive();engine?.reposition();};
async function startAR(){
 if(busy||!rig)return;resetDrive();busy=true;$('startAR').disabled=true;playing=false;last=0;tracking(false);sync();stopPreview();engine?.stop();document.body.classList.add('ar-active');message('Starting camera…');
 try{
  const onReady=({scene})=>{scene.background=null;lights(scene);};
  const onError=error=>{playing=false;tracking(false);sync();message(error.message+' Reload the viewer to retry.');$('startAR').textContent='Reload AR';$('startAR').disabled=false;$('startAR').onclick=()=>location.reload();};
  if(mode==='floor'){
   engine=await startFloor({THREE,container:$('scene'),model,onReady:state=>{onReady(state);model.scale.setScalar(Number($('size').value)/rig.width);},onTracking:tracking,onFrame:frame,onStatus:message,onError,onPlaced:value=>{$('place').hidden=value;$('reposition').hidden=!value;}});
   $('floorActions').hidden=false;$('quickSize').hidden=false;$('floorAdjust').hidden=false;adjustFloor();
  }else{
   engine=await startTracking({THREE,container:$('scene'),model,info:{},targetPath:'/construction-ar-lab/equipment/target.json',onReady,onFound:()=>{tracking(true);message('Sheet found · tap Play or move a joint slider.');},onLost:()=>{tracking(false);message('Keep the whole tracking sheet in view · playback waiting.');},onFrame:frame,onStatus:status=>message({camera:'Allow camera access when asked.',loading:'Loading the equipment tracking sheet…',scanning:'Point at the whole printed equipment sheet, including its border.'}[status]||status),onError,onRecover:()=>message('Pull back and point at the whole tracking sheet to find it again.')});
  }
  $('startAR').textContent='Restart AR';$('startAR').onclick=()=>location.reload();
 }catch(error){playing=false;tracking(false);sync();message(error.message+' Reload the viewer to retry.');$('startAR').textContent='Reload AR';$('startAR').onclick=()=>location.reload();}
 finally{busy=false;$('startAR').disabled=false;}
}
$('startAR').onclick=startAR;
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden)stopDrive();syncSound();});
window.addEventListener('pagehide',()=>{stopDrive();sound.pause();cabinLookCleanup?.();cabinBodyCleanup?.();cancelAnimationFrame(raf);engine?.stop();previewRenderer?.dispose();orbit?.dispose();resizeObserver?.disconnect();});
try{
 const bytes=await readResource('/construction-ar-lab/equipment/backhoe.glb',{label:'Backhoe model'});const gltf=await withTimeout(new GLTFLoader().parseAsync(bytes,location.origin+'/construction-ar-lab/equipment/'),30000,'The model could not finish preparing. Reload to retry.');rig=createEquipmentRig(THREE,gltf.scene);model=new THREE.Group();model.name='EquipmentDisplay';const orientation=new THREE.Group();orientation.name='EquipmentOrientation';if(mode==='sheet')orientation.rotation.y=Math.PI/2;driveNode=new THREE.Group();driveNode.name='EquipmentDrivingMotion';driveNode.add(rig.vehicle);orientation.add(driveNode);model.add(orientation);
 for(const id of ['driveEnabled','operation','play','reset','speed','timeline',...Object.keys(JOINT_LIMITS)])$(id).disabled=false;
 sync();$('startAR').disabled=false;
 if(mode==='preview'||mode==='cabin'){preview();if(mode==='cabin'){$('driveEnabled').checked=true;driveMode();message('Cabin simulation · drag to look around; hold the driving controls to move.');}else message('Choose an operation and tap Play.');}
 else{preview();tracked=false;message(mode==='sheet'?'Print the equipment sheet, then tap Start sheet AR.':'Tap Start floor AR, aim down, and place your equipment.');}
}catch(error){console.error('Equipment viewer failed',error);$('loadError').hidden=false;$('loadError').querySelector('p').textContent='The 3D viewer could not load. Enable WebGL and check your connection, then reload.';message('The tracking sheet and instructions are available above.');for(const id of ['driveEnabled','operation','play','reset','speed','timeline',...Object.keys(JOINT_LIMITS)])$(id).disabled=true;}

/** Direct pointer gestures on the camera view; real camera tracking stays with the AR engine. */
export function createARTouch({THREE,container,root,parts,inspection,camera,isReady,onSelect=()=>{},onCutaway=()=>{},onManipulate=()=>{}}){
 const bounds=inspection.getBounds(),size=bounds.getSize(new THREE.Vector3()),span=Math.max(size.x,size.z,.01),x=bounds.max.x+span*.08,z=bounds.max.z+span*.04;
 const handle=new THREE.Mesh(new THREE.SphereGeometry(span*.035,16,12),new THREE.MeshBasicMaterial({color:0xe5aa3c,depthTest:false,depthWrite:false}));handle.name='Drag cutaway handle';handle.renderOrder=1001;
 const rail=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,bounds.min.y,z),new THREE.Vector3(x,bounds.max.y,z)]),new THREE.LineBasicMaterial({color:0xe5aa3c,transparent:true,opacity:.65,depthTest:false,depthWrite:false}));rail.renderOrder=1000;root.add(handle,rail);
 const ray=new THREE.Raycaster(),point=new THREE.Vector3(),plane=new THREE.Plane(),highlights=new Map();let gesture=null,selected=null,disposed=false;
 function visible(mesh){let node=mesh;while(node){if(!node.visible)return false;node=node.parent;}return true;}
 function select(mesh){for(const [material,color]of highlights){material.emissive?.copy(color);}highlights.clear();selected=mesh;if(mesh){for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(material.emissive){highlights.set(material,material.emissive.clone());material.emissive.setHex(0x5e4a0b);}}onSelect(mesh);}
 function setRay(event){const rect=container.getBoundingClientRect();if(!rect.width||!rect.height)return false;camera.updateWorldMatrix(true,false);root.updateWorldMatrix(true,true);ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);return true;}
 function handleHit(event){const rect=container.getBoundingClientRect(),p=handle.getWorldPosition(new THREE.Vector3()).project(camera);if(p.z< -1||p.z>1)return false;const px=rect.left+(p.x+1)*rect.width/2,py=rect.top+(1-p.y)*rect.height/2;return Math.hypot(event.clientX-px,event.clientY-py)<=28;}
 function cancel(){if(gesture){try{container.releasePointerCapture(gesture.id);}catch{}gesture=null;}}
 function down(event){if(disposed||gesture||!isReady()||event.isPrimary===false||(event.button!==undefined&&event.button!==0)||!setRay(event))return;update();
  if(handleHit(event)){gesture={id:event.pointerId,type:'cut',y:event.clientY,start:inspection.getCutaway(),pixels:Math.max(120,container.getBoundingClientRect().height*.5)};}
  else{const hits=ray.intersectObjects(parts.filter(p=>visible(p.mesh)).map(p=>p.mesh),false);const hit=hits.find(h=>inspection.isPointVisible(h.point));if(!hit){select(null);return;}select(hit.object);const normal=camera.getWorldDirection(new THREE.Vector3());plane.setFromNormalAndCoplanarPoint(normal,hit.point);gesture={id:event.pointerId,type:'part',mesh:hit.object,startWorld:hit.point.clone(),startOffset:inspection.getPartOffset(hit.object)};}
  onManipulate();event.preventDefault();event.stopPropagation();try{container.setPointerCapture(event.pointerId);}catch{}
 }
 function move(event){if(!gesture||event.pointerId!==gesture.id)return;if(!isReady()){cancel();return;}event.preventDefault();event.stopPropagation();
  if(gesture.type==='cut'){const value=Math.max(0,Math.min(100,gesture.start+(gesture.y-event.clientY)/gesture.pixels*100));inspection.setCutaway(value);onCutaway(value);update();}
  else{if(!visible(gesture.mesh)||!setRay(event)||!ray.ray.intersectPlane(plane,point))return;const inverse=root.matrixWorld.clone().invert(),delta=point.clone().sub(gesture.startWorld);delta.applyMatrix4(inverse).sub(new THREE.Vector3().applyMatrix4(inverse));inspection.setPartOffset(gesture.mesh,gesture.startOffset.clone().add(delta));}
 }
 function up(event){if(!gesture||gesture.id!==event.pointerId)return;event.preventDefault();event.stopPropagation();cancel();}
 function update(){if(disposed)return;const ready=isReady();handle.visible=rail.visible=ready;if(!ready){cancel();return;}handle.position.set(x,bounds.min.y+size.y*inspection.getCutaway()/100,z);if(selected&&!visible(selected))select(null);}
 const listeners=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',()=>{gesture=null;}]];
 for(const [type,fn]of listeners)container.addEventListener(type,fn,{capture:true,passive:false});
 update();return {update,cancel,clearSelection:()=>select(null),resetSelected(){if(selected)inspection.resetPart(selected);},dispose(){if(disposed)return;cancel();select(null);disposed=true;for(const [type,fn]of listeners)container.removeEventListener(type,fn,true);root.remove(handle,rail);handle.geometry.dispose();handle.material.dispose();rail.geometry.dispose();rail.material.dispose();}};
}

export function createCabinCamera(THREE,{camera,motion,seat}){
 let yaw=0,pitch=-.12;const direction=new THREE.Vector3(),position=new THREE.Vector3(),target=new THREE.Vector3();
 function update(){motion.updateWorldMatrix(true,false);position.copy(seat);motion.localToWorld(position);direction.set(-Math.cos(pitch)*Math.cos(yaw),Math.sin(pitch),Math.cos(pitch)*Math.sin(yaw));target.copy(seat).add(direction);motion.localToWorld(target);camera.position.copy(position);camera.up.set(0,1,0);camera.lookAt(target);camera.updateMatrixWorld(true);}
 return {update,look(dx,dy){yaw-=dx*.005;pitch=Math.max(-.85,Math.min(.65,pitch+dy*.005));update();},reset(){yaw=0;pitch=-.12;update();},getLook:()=>({yaw,pitch})};
}
export function bindCabinLook(canvas,controller){
 let pointer=null,last;const start=e=>{if(pointer!==null)return;e.preventDefault();pointer=e.pointerId;last={x:e.clientX,y:e.clientY};canvas.setPointerCapture(pointer);};
 const move=e=>{if(e.pointerId!==pointer)return;controller.look(e.clientX-last.x,e.clientY-last.y);last={x:e.clientX,y:e.clientY};};
 const end=e=>{if(e.pointerId===pointer)pointer=null;};
 canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointermove',move);for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,end);
 return ()=>{canvas.removeEventListener('pointerdown',start);canvas.removeEventListener('pointermove',move);for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.removeEventListener(event,end);};
}
// The supplied cab has opaque atlas-coloured window faces, not interior glass.
// Cull their inward faces only in the cabin simulation; preserve outside views.
export function prepareCabinBody(THREE,vehicle){const changes=[];vehicle.traverse(mesh=>{if(mesh.isMesh&&mesh.name.replace(/\./g,'')==='Body025'){const original=mesh.material;const materials=(Array.isArray(original)?original:[original]).map(m=>{const copy=m.clone();copy.side=THREE.FrontSide;return copy;});mesh.material=Array.isArray(original)?materials:materials[0];changes.push({mesh,original,materials});}});return ()=>{for(const {mesh,original,materials}of changes){mesh.material=original;materials.forEach(m=>m.dispose());}};}

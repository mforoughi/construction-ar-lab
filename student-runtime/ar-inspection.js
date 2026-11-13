/** Model-local inspection effects: never move the AR placement root or edit geometry. */
export function createARInspection(THREE,root,parts){
 root.updateWorldMatrix(true,true);
 const rootInverse=root.matrixWorld.clone().invert(),bounds=new THREE.Box3(),byMesh=new Map();
 const records=parts.map(({mesh})=>{
  if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
  const relative=rootInverse.clone().multiply(mesh.matrixWorld),box=mesh.geometry.boundingBox.clone().applyMatrix4(relative);
  bounds.union(box);
  const parentInRoot=rootInverse.clone().multiply(mesh.parent.matrixWorld);
  const original=mesh.material,materials=(Array.isArray(original)?original:[original]).map(material=>{const copy=material.clone();copy.clippingPlanes=[];copy.clipShadows=true;copy.side=THREE.DoubleSide;return copy;});
  mesh.material=Array.isArray(original)?materials:materials[0];
  const record={mesh,base:mesh.position.clone(),center:box.getCenter(new THREE.Vector3()),parentInverse:parentInRoot.invert(),original,materials,manual:new THREE.Vector3()};byMesh.set(mesh,record);return record;
 });
 if(bounds.isEmpty())throw Error('The model has no inspectable geometry.');
 const center=bounds.getCenter(new THREE.Vector3());
 for(const record of records)record.offset=record.center.clone().sub(center).multiply(new THREE.Vector3(.65,.9,.65));
 for(const record of records){
  let parent=record.mesh.parent;
  while(parent&&parent!==root){if(byMesh.has(parent)){record.ancestor=byMesh.get(parent);break;}parent=parent.parent;}
 }
 const localPlane=new THREE.Plane(new THREE.Vector3(0,-1,0),0),worldPlane=new THREE.Plane();
 let cutaway=100,explode=0,disposed=false;
 const clamp=value=>Math.max(0,Math.min(100,Number(value)||0));
 function updateWorldPlane(){if(disposed||cutaway>=100)return;root.updateWorldMatrix(true,false);worldPlane.copy(localPlane).applyMatrix4(root.matrixWorld);}
 function setCutaway(value){if(disposed)return;cutaway=clamp(value);localPlane.constant=bounds.min.y+(bounds.max.y-bounds.min.y)*cutaway/100;updateWorldPlane();for(const r of records)for(const m of r.materials){const enabled=m.clippingPlanes.length>0;m.clippingPlanes=cutaway<100?[worldPlane]:[];if(enabled!==(cutaway<100))m.needsUpdate=true;}}
 function applyOffsets(){
  const fraction=explode/100;
  for(const r of records)r.desired=r.offset.clone().multiplyScalar(fraction).add(r.manual);
  for(const r of records){const delta=r.desired.clone();if(r.ancestor)delta.sub(r.ancestor.desired);delta.applyMatrix4(r.parentInverse).sub(new THREE.Vector3().applyMatrix4(r.parentInverse));r.mesh.position.copy(r.base).add(delta);}
 }
 function setExplode(value){if(disposed)return;explode=clamp(value);applyOffsets();}
 function setPartOffset(mesh,offset){const r=byMesh.get(mesh);if(disposed||!r||![offset.x,offset.y,offset.z].every(Number.isFinite))return;r.manual.copy(offset).clampLength(0,Math.max(bounds.getSize(new THREE.Vector3()).length()*2,1));applyOffsets();}
 function resetPart(mesh){const r=byMesh.get(mesh);if(disposed||!r)return;r.manual.set(0,0,0);applyOffsets();}
 function reset(){for(const r of records)r.manual.set(0,0,0);setExplode(0);setCutaway(100);}
 return {setCutaway,setExplode,setPartOffset,resetPart,getPartOffset:mesh=>byMesh.get(mesh)?.manual.clone()||new THREE.Vector3(),getBounds:()=>bounds.clone(),getCutaway:()=>cutaway,isPointVisible:point=>cutaway>=100||worldPlane.distanceToPoint(point)>=-1e-6,updateWorldPlane,reset,dispose(){if(disposed)return;reset();disposed=true;for(const r of records){r.mesh.material=r.original;for(const m of r.materials)m.dispose();}}};
}

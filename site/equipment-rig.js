// Authored teaching rig for the supplied static FBX. Units remain metres inside
// the vehicle; the outer display wrapper owns all AR placement and scaling.
export const OPERATIONS=Object.freeze({loader:'Front loader cycle',dig:'Rear digging cycle',wheels:'Wheel rotation'});
export const JOINT_LIMITS=Object.freeze({lift:[0,35],bucket:[-40,15],boom:[-18,12],dipper:[-22,22],rearBucket:[-45,20]});
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function keys(t,points){for(let i=1;i<points.length;i++)if(t<=points[i][0]){const [a,x]=points[i-1],[b,y]=points[i];return x+(y-x)*smooth((t-a)/(b-a));}return points.at(-1)[1];}
export function operationPose(operation,progress){
 const t=Math.max(0,Math.min(1,Number(progress)||0));const pose={lift:0,bucket:0,boom:0,dipper:0,rearBucket:0,wheels:0};
 if(operation==='loader'){pose.lift=keys(t,[[0,0],[.35,32],[.65,32],[1,0]]);pose.bucket=keys(t,[[0,0],[.35,10],[.55,-38],[.7,-38],[1,0]]);}
 else if(operation==='dig'){pose.boom=keys(t,[[0,0],[.28,10],[.55,-16],[.78,-16],[1,0]]);pose.dipper=keys(t,[[0,0],[.28,18],[.55,-18],[.78,-18],[1,0]]);pose.rearBucket=keys(t,[[0,0],[.25,15],[.52,-42],[.8,-42],[1,0]]);}
 else if(operation==='wheels')pose.wheels=t*Math.PI*8;
 return pose;
}
export function advanceEquipment(progress,seconds,speed,{playing,tracked,loop}){
 if(!playing||!tracked)return {progress,playing};
 const next=progress+Math.min(.1,Math.max(0,seconds))*speed/12;
 return next>=1?{progress:loop?next%1:1,playing:!!loop}:{progress:next,playing:true};
}
export function createEquipmentRig(THREE,source){
 const vehicle=new THREE.Group();vehicle.name='EquipmentVehicle';vehicle.add(source);vehicle.updateMatrixWorld(true);
 const originalBounds=new THREE.Box3().setFromObject(source),size=originalBounds.getSize(new THREE.Vector3());
 const lookup=new Map();source.traverse(o=>lookup.set(o.name.replace(/\./g,''),o));
 const part=i=>lookup.get(i===0?'Body':'Body'+String(i).padStart(3,'0'));
 function group(name,point,parts){const g=new THREE.Group();g.name=name;g.position.set(...point);vehicle.add(g);g.updateMatrixWorld(true);for(const i of parts){const mesh=part(i);if(mesh)g.attach(mesh);}return g;}
 const lift=group('LoaderLift',[.015,1.96,0],[2,3,4,5,6,7,8,9,18,19,20,21,22,36,37,38,39,40,41]);
 const bucket=group('LoaderBucket',[-3.26,.46,0],[0,1,10,11,12,13,14,15]);lift.attach(bucket);
 const boom=group('RearBoom',[3.6,.85,0],[57,58,60,71,74]);
 const dipper=group('RearDipper',[5.11,3.71,0],[62,63,64,65,68]);boom.attach(dipper);
 const rearBucket=group('RearBucket',[5.56,.85,0],[61,66,69,70]);dipper.attach(rearBucket);
 // Replace rigid hydraulic representations with telescoping teaching cylinders.
 for(const i of [4,5,6,7,8,9,18,19,20,21,22,36,37,16,17,27,28,29,30,31,32,33,34,35,42,43,44,45,59,67]){const mesh=part(i);if(mesh)mesh.visible=false;}
 const yellow=new THREE.MeshStandardMaterial({color:0xd9a139,roughness:.65}),metal=new THREE.MeshStandardMaterial({color:0xb9bfc2,metalness:.65,roughness:.3});
 const cylinderGeometry=new THREE.CylinderGeometry(1,1,1,12),up=new THREE.Vector3(0,1,0),cylinders=[];
 function attachment(parent,point){const p=new THREE.Object3D();p.position.set(...point);vehicle.add(p);p.updateMatrixWorld(true);parent.attach(p);return p;}
 function cylinder(aParent,a,bParent,b,radius=.055){const start=attachment(aParent,a),end=attachment(bParent,b);vehicle.updateMatrixWorld(true);const p=new THREE.Vector3(),q=new THREE.Vector3();start.getWorldPosition(p);end.getWorldPosition(q);const restLength=p.distanceTo(q);const outer=new THREE.Mesh(cylinderGeometry,yellow),rod=new THREE.Mesh(cylinderGeometry,metal);vehicle.add(outer,rod);cylinders.push({start,end,outer,rod,restLength,radius});}
 for(const side of [-.65,.65]){
  cylinder(vehicle,[-.02,1.33,side],lift,[-1.1,1.48,side]);
  cylinder(lift,[.015,1.96,side],bucket,[-3.27,1.1,side],.045);
 }
 cylinder(vehicle,[3.68,1.92,0],boom,[5,4.65,0],.065);
 cylinder(dipper,[5.66,2.7,0],rearBucket,[5.96,.82,0],.045);
 const wheels=[];
 for(let i=1;i<=4;i++){const mesh=lookup.get('Wheel'+i);if(!mesh)continue;vehicle.updateMatrixWorld(true);const center=new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());const g=new THREE.Group();g.name='WheelPivot'+i;g.position.copy(center);vehicle.add(g);g.updateMatrixWorld(true);g.attach(mesh);wheels.push({pivot:g,radius:i<=2?.5766:.8445});}
 for(let i=0;i<2;i++){const w=wheels[i];if(!w)continue;const steer=new THREE.Group();steer.name='FrontSteering'+i;steer.position.copy(w.pivot.position);vehicle.add(steer);steer.updateMatrixWorld(true);steer.attach(w.pivot);w.steer=steer;}
 const stabilizers=[group('LeftStabilizer',[2.76,1.84,1.33],[50]),group('RightStabilizer',[2.76,1.84,-1.33],[51])];
 function setDriving(enabled,steering=0){for(const w of wheels)if(w.steer)w.steer.rotation.y=enabled?steering:0;stabilizers.forEach((g,i)=>g.rotation.x=enabled?(i===0?1:-1)*Math.PI*.4:0);}
 const joints={lift,bucket,boom,dipper,rearBucket};const current={};
 const p=new THREE.Vector3(),q=new THREE.Vector3(),direction=new THREE.Vector3();
 function hydraulics(){vehicle.updateMatrixWorld(true);for(const c of cylinders){c.start.getWorldPosition(p);c.end.getWorldPosition(q);vehicle.worldToLocal(p);vehicle.worldToLocal(q);direction.subVectors(q,p);const length=direction.length();direction.normalize();const barrel=Math.min(c.restLength*.55,length*.9),rodLength=Math.max(.001,length-barrel);c.outer.position.copy(p).addScaledVector(direction,barrel/2);c.outer.quaternion.setFromUnitVectors(up,direction);c.outer.scale.set(c.radius,barrel,c.radius);c.rod.position.copy(p).addScaledVector(direction,barrel+rodLength/2);c.rod.quaternion.copy(c.outer.quaternion);c.rod.scale.set(c.radius*.55,rodLength,c.radius*.55);}}
 function apply(pose={}){for(const [name,joint]of Object.entries(joints)){const [min,max]=JOINT_LIMITS[name];const angle=Math.max(min,Math.min(max,Number(pose[name])||0));current[name]=angle;joint.rotation.z=-angle*Math.PI/180;}current.wheels=Number(pose.wheels)||0;for(const w of wheels)w.pivot.rotation.z=current.wheels*(.5766/w.radius);hydraulics();}
 vehicle.position.set(-(originalBounds.min.x+originalBounds.max.x)/2,-originalBounds.min.y,0);
 apply();
 return {vehicle,joints,wheels,cylinders,width:size.x,height:size.y,apply,setDriving,getPose:()=>({...current}),dispose(){cylinderGeometry.dispose();yellow.dispose();metal.dispose();}};
}

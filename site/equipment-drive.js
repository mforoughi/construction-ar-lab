// Local vehicle motion only. Never modify the tracking/placement root.
export function createDriveState(){return {x:0,z:0,yaw:0,roll:0,steer:0,moving:false,boundary:false};}
export function stepDrive(state,{throttle=0,steering=0,speed=1,dt=0,enabled=false,tracked=false,limit=40}={}){
 const next={...state,moving:false,boundary:false,steer:0};if(!enabled||!tracked)return next;
 const clamp=v=>Math.max(-1,Math.min(1,Number(v)||0));next.steer=clamp(steering)*Math.PI/6;
 const distance=clamp(throttle)*Math.max(0,Math.min(3,Number(speed)||0))*Math.max(0,Math.min(.05,Number(dt)||0));if(!distance)return next;
 const turn=distance/2.93*Math.tan(next.steer),angle=state.yaw+turn/2;
 const x=state.x-Math.cos(angle)*distance,z=state.z+Math.sin(angle)*distance;
 if(Math.hypot(x,z)>limit){next.boundary=true;return next;}
 next.x=x;next.z=z;next.yaw=(state.yaw+turn)%(Math.PI*2);next.roll=state.roll+distance/.5766;next.moving=true;return next;
}
export function bindDriveButtons(buttons,{onInput,allowed=()=>true}){
 const held=new Map();const emit=()=>{const values=[...held.values()];onInput({throttle:Number(values.includes('forward'))-Number(values.includes('reverse')),steering:Number(values.includes('left'))-Number(values.includes('right'))});};
 const stop=()=>{held.clear();for(const b of buttons)b.classList.remove('held');emit();};
 for(const button of buttons){button.addEventListener('pointerdown',event=>{if(!allowed())return;event.preventDefault();held.set(event.pointerId,button.dataset.drive);button.classList.add('held');button.setPointerCapture(event.pointerId);emit();});const end=event=>{held.delete(event.pointerId);button.classList.remove('held');emit();};for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,end);button.addEventListener('contextmenu',event=>event.preventDefault());}
 return {stop};
}

export function composeDrivePose(pose,travelRoll=0,wheelOffset=0){return {...pose,wheels:(Number(pose.wheels)||0)+travelRoll+wheelOffset};}

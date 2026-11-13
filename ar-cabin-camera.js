// Camera overlay lifecycle. A late permission response must never reopen a stopped session.
export function createCameraSession({video,getUserMedia,onState=()=>{}}){
 let generation=0,stream=null;const release=s=>s?.getTracks().forEach(t=>t.stop());
 function stop(){generation++;const old=stream;stream=null;video.pause();video.srcObject=null;release(old);onState('stopped');}
 async function start(){stop();const attempt=generation;onState('starting');let candidate;
  try{candidate=await getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});if(attempt!==generation){release(candidate);return;}stream=candidate;video.srcObject=stream;for(const track of stream.getTracks())track.addEventListener?.('ended',()=>{if(attempt===generation)stop();},{once:true});await video.play();if(attempt!==generation)return;onState('active');}
  catch(error){if(attempt!==generation)return;stop();throw error;}
 }
 return {start,stop};
}

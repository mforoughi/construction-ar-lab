/** Dismiss a disclosure without blocking the action that was tapped outside it. */
export function dismissDetailsOutside(details,owner=document){
 const outside=event=>{if(details.open&&!details.contains(event.target))details.open=false;};
 owner.addEventListener('pointerdown',outside,true);
 owner.addEventListener('click',outside,true); // Also covers keyboard-activated buttons.
 return ()=>{owner.removeEventListener('pointerdown',outside,true);owner.removeEventListener('click',outside,true);};
}

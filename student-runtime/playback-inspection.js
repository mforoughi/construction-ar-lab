/** Playback must not inherit a section plane that hides its construction stages. */
export function prepareInspectionForPlayback({inspection,touch,slider,output}){
 touch?.cancel();
 inspection?.setCutaway(100);
 slider.value=100;
 output.textContent='100%';
 touch?.update();
}

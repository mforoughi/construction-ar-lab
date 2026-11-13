/** Public viewer's optional, user-gesture-driven music and voice controls. */
export function createProjectAudioPlayer({assets,assetUrl,root,onMessage=()=>{},placement='sheet'}) {
  const tracks=[{kind:'music',label:'♪ Music',loop:true},{kind:'voice',label:'🎙 Voice',loop:false},
    {kind:placement==='floor'?'guide-floor':'guide-sheet',label:'Guide',loop:false,instructional:true}]
    .filter(t=>assets?.some(a=>a.kind===t.kind));
  if(!root || !tracks.length){if(root)root.hidden=true;return {pause(){},pauseAll(){},resumeOnGesture(){},seek(){},rewind(){},dispose(){}};}
  root.hidden=false;
  root.replaceChildren();
  const players=new Map();
  let disposed=false;
  for(const t of tracks){
    const audio=document.createElement('audio');
    audio.preload='none';audio.loop=t.loop;audio.playsInline=true;
    audio.src=assetUrl(t.kind);
    const button=document.createElement('button');button.type='button';button.className='audio-track';button.setAttribute('aria-pressed','false');
    button.textContent=t.label+' ▷';button.title='Play or pause '+t.label;
    const entry={...t,audio,button,enabled:false};
    players.set(t.kind,entry);
    const state=()=>{button.setAttribute('aria-pressed',String(entry.enabled && !audio.paused));button.textContent=t.label+(entry.enabled && !audio.paused?' Ⅱ':' ▷');};
    const start=()=>{
      if(disposed)return;
      // This method must be called within a genuine tap/click to satisfy mobile Safari.
      if(audio.ended)audio.currentTime=0;
      const maybePromise=audio.play();
      maybePromise?.catch(error=>{
        if(disposed)return;
        entry.enabled=false;state();onMessage('Tap the audio button to enable sound. '+(error?.name==='NotSupportedError'?'This audio format may not be supported.':''));
      });
    };
    entry.start=start;
    button.addEventListener('click',()=>{
      entry.enabled=audio.paused;
      // Two spoken tracks must not talk over each other. Music can accompany either.
      if(entry.enabled && t.kind!=='music')for(const other of players.values())if(other.kind!=='music' && other!==entry){other.enabled=false;other.audio.pause();}
      if(entry.enabled)start();else audio.pause();
      state();
    });
    audio.addEventListener('play',state);
    audio.addEventListener('pause',state);
    audio.addEventListener('ended',()=>{if(!entry.loop){entry.enabled=false;state();}});
    audio.addEventListener('error',()=>{entry.enabled=false;state();onMessage('This audio file could not be played. Try an MP3 or M4A file.');});
    root.append(button);
  }
  return {
    /** Call synchronously from the viewer's Play-button handler. */
    resumeOnGesture(){for(const p of players.values())if(p.enabled&&!p.instructional)p.start();},
    // Instructions remain audible while acquiring tracking, placing, or scrubbing.
    pause(){for(const p of players.values())if(!p.instructional)p.audio.pause();},
    pauseAll(){for(const p of players.values())p.audio.pause();},
    rewind(){for(const p of players.values()){if(!p.instructional&&p.audio.readyState>=1)p.audio.currentTime=0;}},
    seek(fraction){
      const f=Math.max(0,Math.min(1,Number(fraction)||0));
      for(const p of players.values())if(!p.instructional && !p.loop && Number.isFinite(p.audio.duration) && p.audio.duration>0)
        p.audio.currentTime=f*p.audio.duration;
    },
    dispose(){disposed=true;for(const p of players.values()){p.audio.pause();p.audio.removeAttribute('src');p.audio.load();}root.replaceChildren();root.hidden=true;players.clear();}
  };
}

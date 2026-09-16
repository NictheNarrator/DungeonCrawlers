// One pointer owns movement. Releasing, cancelling, or opening a menu stops it.
export function bindHoldControls(buttons,{move,canMove,setTimer=setTimeout,clearTimer=clearTimeout}){
 let timer=null,owner=null,pointer=null;
 function stop(){clearTimer(timer);timer=null;owner?.classList.remove('held');owner=null;pointer=null;}
 for(const button of buttons){
  const step=()=>{if(button.disabled||!canMove()){stop();return false;}move(...button.dataset.move.split(',').map(Number));return true;};
  button.addEventListener('pointerdown',event=>{
   if(button.disabled||!canMove())return;event.preventDefault();stop();owner=button;pointer=event.pointerId;button.setPointerCapture(pointer);button.classList.add('held');
   if(!step())return;const repeat=()=>{if(owner!==button)return;if(step())timer=setTimer(repeat,165);};timer=setTimer(repeat,270);
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>{if(event.pointerId===pointer)stop();});
  // Screen readers and keyboard activation emit a zero-detail click. Pointer
  // clicks already moved on pointerdown and must not move a second time.
  button.addEventListener('click',event=>{if(event.detail===0)step();});
 }
 return {stop};
}

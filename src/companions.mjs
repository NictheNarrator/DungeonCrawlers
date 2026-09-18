// Companion rules. Everything here works on the existing save state: the
// character's body, conditions and location live on s.npcs/s.places, while
// this record holds what makes them a person rather than a follower.
export const APPROVAL_MIN=-100,APPROVAL_MAX=100;
export const BANDS=[
 {key:'hostile',label:'Hostile',min:-100,max:-60},
 {key:'resentful',label:'Resentful',min:-59,max:-25},
 {key:'neutral',label:'Neutral',min:-24,max:24},
 {key:'friendly',label:'Friendly',min:25,max:59},
 {key:'loyal',label:'Loyal',min:60,max:100}
];
export function bandFor(approval){return BANDS.find(band=>approval>=band.min&&approval<=band.max)||BANDS[2];}
export function relationshipText(companion){const band=bandFor(companion.approval);
 if(companion.left)return 'Gone. She left and is not coming back on her own.';
 if(companion.hostile)return 'Hostile. She would rather you were not here.';
 if(companion.separated)return 'Separated. She is somewhere else in the building.';
 const flavour={hostile:'She barely tolerates your presence.',resentful:'She is keeping score and not hiding it.',neutral:'She is reserving judgement.',friendly:'She has decided you are worth the trouble.',loyal:'She would follow you into the next room and complain about it.'};
 return `${band.label}. ${flavour[band.key]}`;}
export const COMPANIONS={
 mara:{name:'Mara',role:'Mobile support fighter',
  likes:['clever solutions','kept promises','helping allies','protecting the vulnerable','avoiding a fight','sharing supplies'],
  dislikes:['pointless cruelty','broken promises','reckless danger','robbing friends','abandoning people'],
  quest:{id:'locket',title:'The Sable Locket',
   opening:'Mara: “There was a woman in intake with me. Dell. She went east before I did. If you find anything of hers, I want to know.”',
   discovery:'Mara: “That is her locket. I gave it to her the day the doors shut.”'}}
};
export function blankCompanion(id){return {approval:0,recruited:false,separated:false,left:false,hostile:false,memories:{},quest:{id:COMPANIONS[id]?.quest?.id||null,stage:'unknown',outcome:null},equipped:{weapon:null,armor:null,accessory:null},gear:[]};}
export function companionOf(s,id){return s.companions?.[id]||null;}
export function isCompanion(s,id){return !!companionOf(s,id);}
export function clampApproval(value){return Math.max(APPROVAL_MIN,Math.min(APPROVAL_MAX,value));}
// Approval moves are logged quietly, and only loud events get a line in the
// log. Big ones also earn a short, human remark.
export function approvalReaction(delta){if(delta>=20)return 'Mara strongly approves.';if(delta>=10)return 'Mara approves.';
 if(delta<=-20)return 'Mara strongly disapproves.';if(delta<=-10)return 'Mara disapproves.';return null;}
export function remember(companion,key,value=true){if(value===false)delete companion.memories[key];else companion.memories[key]=true;}
export function adjustApproval(s,id,delta,reason){const companion=companionOf(s,id);if(!companion||companion.left)return 0;
 const before=companion.approval;companion.approval=clampApproval(before+delta);
 const moved=companion.approval-before;const reaction=approvalReaction(moved);
 return {moved,reaction,before,after:companion.approval,band:bandFor(companion.approval),reason};}
export function reactionLine(companion){const band=bandFor(companion.approval);
 if(companion.memories.attacked)return 'Mara: “Keep your distance. I remember what you did.”';
 if(companion.memories.killedFriend)return 'Mara: “You killed someone I knew. Do not expect me to forget it.”';
 if(band.key==='loyal')return 'Mara: “I am still here, which is the closest thing to a compliment this place allows.”';
 if(band.key==='friendly')return 'Mara: “You are less of a liability than I expected.”';
 if(band.key==='resentful')return 'Mara: “I will follow the plan. Not you.”';
 if(band.key==='hostile')return 'Mara: “Say what you need and then leave me alone.”';
 return 'Mara: “Keep it short. I am counting supplies.”';}
// Conversations unlock in order, so her history arrives in pieces.
export function conversationFor(s,id){const companion=companionOf(s,id);if(!companion)return null;
 const band=bandFor(companion.approval).key;
 if(band==='hostile'||band==='resentful')return {key:'cold',line:'Mara: “I am not in the mood for a fireside chat. Go do something useful.”'};
 if(!companion.memories.talked1)return {key:'talked1',line:'Mara: “I ran a laundry before this. Sorting other people’s things, fixing what could be fixed. Turns out that is the whole job down here too.”'};
 if(band==='friendly'||band==='loyal'){
  if(!companion.memories.talked2)return {key:'talked2',line:'Mara: “I was intake staff, briefly. I know which doors they stopped locking. Ask me before you walk into a room that smells like a trap.”'};
  if(companion.quest.stage==='unknown')return {key:'quest',line:COMPANIONS.mara.quest.opening};
  if(companion.quest.stage==='found')return {key:'found',line:'Mara: “You found something of Dell’s. I saw it in your pack. Say what you are going to do with it.”'};
  if(companion.quest.outcome==='returned')return {key:'returned',line:'Mara: “I have the locket. That is more of her than I expected to get.”'};
  if(companion.quest.outcome==='kept')return {key:'kept',line:'Mara: “You kept it. I know. I am still deciding what that means.”'};
  if(companion.quest.outcome==='lied')return {key:'lied',line:'Mara: “You said there was nothing on that pipe. I checked.”'};}
 return {key:'small',line:'Mara: “Supplies are short. People are shorter.”'};}

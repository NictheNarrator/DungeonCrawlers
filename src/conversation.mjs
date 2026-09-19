// Conversation presentation. The engine still owns every consequence: each line
// below is a spoken version of an action the engine already understands, so the
// player reads dialogue instead of a menu and nothing about the rules changes.
import { NPCS } from './npcs.mjs';
import { DIALOGUE } from './dialogue.mjs';
import { actions } from './engine.mjs';

// Which verbs belong in a conversation rather than in the world menu. Everything
// else - Inspect, Pickpocket, Rob, Attack - stays on the NPC you tapped.
export const SPOKEN = ['Help','Befriend','Recruit','Threaten','Lie','Ask about the survivors','Hear his plan','Ask about the badge','Clear the barricade','Bandage her wound','Help her out','Let Vex take his pick','Keep it all'];

const LINES = {
 mara:{
  Help:{text:'Let me look at that. I have a bandage and no better plans.',skill:null},
  Befriend:{text:'We are both stuck down here. We will probably live longer if we stick together.'},
  Recruit:{text:'Walk with me. Two pairs of eyes beat one.',skill:'Persuasion'},
  Threaten:{text:'Tell me what you know before I lose my patience.',skill:'Intimidation'},
  Lie:{text:'Emergency services are on the way. They told me so themselves.',skill:'Deception'},
  'Ask about the survivors':{text:'Who else came down here with you? I will look for them.',skill:'Insight'}
 },
 skrit:{
  'Help with the machine':{text:'Hold still, ratman. I will get the panel off and you can keep your fingers.',skill:null},
  Befriend:{text:'You are bleeding and I am not. Today that is the whole difference.',skill:null},
  Recruit:{text:'Come along, then. Quiet feet, no biting.',skill:'Persuasion'},
  Threaten:{text:'Keep your teeth where I can see them or I will take them.',skill:'Intimidation'},
  Lie:{text:'The custodian sent me. He says you are allowed to share.',skill:'Deception'}
 },
 tobin:{
  Help:{text:'Give me the repair kit. I will make it worth your while.',skill:null},
  Befriend:{text:'You have junk, I have nowhere to be. We could be useful to each other.',skill:null},
  Recruit:{text:'Bring your pile and follow me. You can count it in the safe room.',skill:'Persuasion'},
  Threaten:{text:'Open the bag or I open it for you.',skill:'Intimidation'},
  Lie:{text:'Nobody else has been through here. The corridor is empty.',skill:'Deception'},
  'Ask about the badge':{text:'Where did you get that badge, and what do you want for it?',skill:'Persuasion'}
 },
 vex:{
  Help:{text:'You look like a man with a plan and no help. What do you need?',skill:null},
  Befriend:{text:'You are dangerous and useful. I can work with both.',skill:null},
  Recruit:{text:'Travel with me. You keep what you kill and you pick first.',skill:'Persuasion'},
  Threaten:{text:'I do not need you to like me. I need you to move.',skill:'Intimidation'},
  Lie:{text:'I read the memo. Everything in it checks out.',skill:'Deception'},
  'Hear his plan':{text:'Draw me the loop. Tell me what you want out of it before I agree.',skill:'Insight'},
  'Let Vex take his pick':{text:'You drew the loop. Pick first - I said you could.',skill:null},
  'Keep it all':{text:'I looked at the cache first, and I am looking at it now.',skill:null}
 },
 eli:{
  Help:{text:'Stand back. I will shift the barricade from this side.',skill:'Athletics'},
  Befriend:{text:'You barricaded yourself in and lived. That is better than most people managed.',skill:null},
  Recruit:{text:'Come with me. The blue room is safe and it has a kettle.',skill:'Persuasion'},
  Threaten:{text:'Move away from the door. I am not asking twice.',skill:'Intimidation'},
  Lie:{text:'The corridors are clear. Nothing out there wants your keys.',skill:'Deception'},
  'Clear the barricade':{text:'Put your weight on it with me. On three.',skill:'Athletics'}
 },
 june:{
  Help:{text:'Let me see the wound. I have cloth and clean water.',skill:null},
  Befriend:{text:'You held on this long. That was the hard part.',skill:null},
  Recruit:{text:'Lean on me as far as the corridor, then walk. I am not leaving you here.',skill:'Persuasion'},
  Threaten:{text:'Give me the medical kit and I will decide what happens next.',skill:'Intimidation'},
  Lie:{text:'The rats are gone. I cleared the store myself.',skill:'Deception'},
  'Bandage her wound':{text:'Hold still. This will hurt and then it will stop hurting.',skill:'Medicine'},
  'Help her out':{text:'Up. The blue room, slowly, and you do not have to talk.',skill:null}
 }
};

// The NPC's line when nothing else is open. Short, state-aware, and never a menu.
export function greeting(s,id){const n=s.npcs[id],m=n.memory,d=NPCS[id];
 if(n.condition==='dead')return 'Nothing here is listening any more.';
 if(n.condition==='unconscious')return 'Out cold. Whatever you have to say can wait.';
 if(n.attitude==='hostile')return `${d.name} is not interested in talking. Whatever is left of it is a fight.`;
 if(id==='mara'){if(m.fled)return 'Mara checks the corridor twice before she looks at you. “You came back.”';
  if(m.befriended)return 'Mara: “Still here. Still alive. Say something useful.”';
  return 'Mara watches you the way people watch weather. “Did you see what happened up there?”';}
 if(id==='skrit')return m.revealedName?'Skrit: “Tall one. Still not taking machine.”':'He freezes with one paw on the machine. “You… tall. You not take machine. Machine mine.”';
 if(id==='tobin')return n.inventory.badge?'Tobin keeps one hand on a lanyard he thinks you have not noticed. “What.”':'Tobin: “I am counting. You are making that difficult.”';
 if(id==='vex')return s.quests.vexDeal==='agreed'?'Vex: “The loop is in the electrical room. Do not improvise.”':'Vex: “You are the fourth person down here today. The others were less careful.”';
 if(id==='eli')return m.rescued?'Eli: “I am not going back for anything else. Ask.”':'A voice from behind the barricade: “I am armed and I am not opening this door.”';
 if(id==='june')return m.rescued?'June: “I am upright. That is the whole update.”':'June: “Quiet. Please. Something in the store is still eating.”';
 return `${d.name} looks at you.`;}

// The scene: who you are talking to, what they just said, and the lines you can
// actually say back. Node options win, because a choice already in progress is
// the conversation.
export function conversationFor(s,id){
 const npc=s.npcs[id],lines=LINES[id]||{},replies=[];
 if(s.pendingDialogue&&s.pendingDialogue.id===id){
  const node=DIALOGUE[id]?.[s.pendingDialogue.key];
  if(node){(node.options||[]).forEach((option,index)=>{
   replies.push({text:option.label,skill:option.lie?'Deception':option.intent==='insight'?'Insight':option.dc?'Persuasion':null,dialogue:index});});
   return {name:NPCS[id].name,line:node.prompt,replies,relationship:relationship(s,id)};}}
 for(const action of SPOKEN){const line=lines[action];if(!line)continue;if(!available(s,id,action))continue;
  replies.push({text:line.text,skill:line.skill,action});}
 return {name:NPCS[id].name,line:greeting(s,id),replies,relationship:relationship(s,id)};}

// Each NPC only says the things they have a reason to say right now. This mirrors
// the engine's own action list, minus the world verbs that stay in the menu.
// A line is only offered when the engine itself offers the action behind it, so
// the conversation can never drift away from what the game can actually do.
function available(s,id,action){return actions(s,id).includes(action);}

export function relationship(s,id){const n=s.npcs[id];
 if(n.condition==='dead')return 'dead';
 if(n.condition==='unconscious')return 'unconscious';
 return n.attitude;}

export const CONVERSATION_VERBS=SPOKEN;

import {check,modifier,proficiencyBonus} from './rules.mjs';
export function pickpocketDC(id){const d=NPCS[id];return 10+modifier(d.abilities.wisdom)+((d.skills||[]).includes('perception')?proficiencyBonus(d.level||1):0);}
// Who is travelling with the player: permanent party members plus temporary
// allies that still have encounters left on their agreement.
export const RECRUIT={mara:{dc:12,encounters:0},tobin:{dc:14,encounters:2},vex:{dc:16,encounters:0}};
export function withPlayer(s){return [...(s.party||[]),...Object.keys(s.allies||{}).filter(id=>s.allies[id]>0)];}
export function isWith(s,id){return (s.party||[]).includes(id)||(s.allies?.[id]||0)>0;}
export const PEOPLE = ['mara','tobin','vex'];
export const ATTITUDES = ['friendly','neutral','suspicious','hostile'];
export const CONDITIONS = ['conscious','unconscious','dead'];
export const ITEM_KEYS = ['bandages','repairKits','smokeBombs','whetstones'];
export const STOCK_KEYS = ['gold','potions','key',...ITEM_KEYS];
export const NPCS = {
 mara:{name:'Mara',role:'Cautious survivor',hp:20,damage:[4,6],attitude:'neutral',trade:'potions',price:3,pick:'key',help:'1 bandage or potion',stock:{gold:3,potions:2,key:1},abilities:{strength:14,dexterity:12,constitution:14,intelligence:12,wisdom:15,charisma:13},skills:['medicine','insight'],saves:['wisdom','constitution']},
 tobin:{name:'Tobin',role:'Suspicious scavenger',hp:16,damage:[2,4],attitude:'suspicious',trade:'smokeBombs',price:4,pick:'smokeBombs',help:'1 repair kit or 2 coins',stock:{gold:6,potions:2,smokeBombs:2},abilities:{strength:11,dexterity:15,constitution:12,intelligence:14,wisdom:13,charisma:12},skills:['sleight of hand','stealth','investigation'],saves:['dexterity','intelligence']},
 vex:{name:'Vex',role:'Dangerous rival',hp:28,damage:[5,7],attitude:'neutral',trade:'whetstones',price:4,pick:'whetstones',help:'Read the memo, or give 1 potion',stock:{gold:5,potions:1,whetstones:1},abilities:{strength:17,dexterity:16,constitution:15,intelligence:11,wisdom:12,charisma:14},skills:['athletics','intimidation','perception'],saves:['strength','constitution']},
 rat:{name:'Ratman custodian',role:'Unpaid sanitation',hp:12,damage:[2,3],attitude:'neutral',stock:{gold:2},abilities:{strength:8,dexterity:14,constitution:10,intelligence:8,wisdom:12,charisma:6},skills:['stealth','perception'],saves:['dexterity']}
};
export const itemName={gold:'coins',potions:'healing potion',key:'exit key',bandages:'bandage',repairKits:'repair kit',smokeBombs:'smoke bomb',whetstones:'whetstone'};
export function makeNPC(id){const d=NPCS[id];return {hp:d.hp,attitude:d.attitude,condition:'conscious',memory:{},inventory:Object.fromEntries(STOCK_KEYS.map(k=>[k,d.stock[k]||0]))};}
export function memoryText(n){const names={helped:'helped',befriended:'befriended',recruited:'joined you',abandoned:'left the party',returned:'got their goods back',threatened:'threatened',lied:'lied to',lieExposed:'lie exposed',stolen:'pickpocketed',theftDetected:'theft discovered',robbed:'robbed',robberyAttempt:'robbery attempted',attacked:'attacked',knockedOut:'knocked unconscious',killed:'killed',looted:'looted',betrayed:'betrayed',woken:'woken up',sawAttack:'saw an attack',sawKill:'saw a killing',sawRob:'saw a robbery',sawTheft:'saw a theft',sawHelp:'saw you help someone',sawRescue:'saw you rescue someone'};return Object.entries(names).filter(([key])=>n.memory[key]).map(([,label])=>label).join(', ')||'No shared history yet';}
export function stockText(n){return STOCK_KEYS.filter(k=>n.inventory[k]>0).map(k=>`${n.inventory[k]} ${itemName[k]}`).join(', ')||'nothing left';}
export function tradePrice(s,id){const n=s.npcs[id];return Math.max(1,NPCS[id].price+(n.attitude==='suspicious'?1:0)-(n.attitude==='friendly'?1:0)-(n.memory.distracted?1:0));}
export function describeNPC(s,id){const n=s.npcs[id],d=NPCS[id];return `${d.name} · ${n.attitude} · ${n.condition} · ${n.hp}/${d.hp} HP. Damage ${d.damage.join('–')}. Carries: ${stockText(n)}. Remembers: ${memoryText(n)}.`;}
export function npcActions(s,id){const n=s.npcs[id];if(n.condition==='dead')return ['Inspect','Loot'];if(n.condition==='unconscious')return ['Inspect','Loot','Wake up','Kill'];const owed=Object.keys(s.stolen||{}).some(key=>s.stolen[key]===id);return ['Inspect','Talk','Help','Befriend',...(RECRUIT[id]&&!isWith(s,id)?['Recruit']:[]),'Threaten','Lie','Trade','Pickpocket','Rob openly',...(owed?['Hand it back']:[]),'Attack','Knock unconscious','Kill'];}
function transfer(s,n,key,count){const amount=Math.min(n.inventory[key],count);if(!amount)return 0;n.inventory[key]-=amount;if(key==='key')s.key=true;else if(ITEM_KEYS.includes(key))s.items[key]+=amount;else s[key]+=amount;return amount;}
function takeAll(s,n,id){const got=[];for(const key of STOCK_KEYS){const amount=transfer(s,n,key,n.inventory[key]);if(amount){got.push(`${amount} ${itemName[key]}`);if(id)s.stolen[key]=id;}}return got.join(', ')||'nothing';}
function betray(n){if(n.memory.helped||n.memory.befriended||n.attitude==='friendly')n.memory.betrayed=true;}
export function discoverThefts(s,ids,say){for(const id of ids){const n=s.npcs[id];if(!n||n.condition!=='conscious'||!n.memory.stolen||n.memory.theftDetected)continue;n.memory.theftDetected=true;n.memory.distracted=false;n.attitude='hostile';say(s,`${NPCS[id].name} notices the missing belongings as you leave. The theft is remembered.`);}}
// Witnessing. An NPC only learns about a major event by being in the room and
// close enough to see it, so an unwitnessed crime stays between the player and
// whoever it was done to.
export const WITNESS_EVENTS=['attack','kill','rob','theft','help','rescue'];
export const WITNESS_FLAGS={attack:'sawAttack',kill:'sawKill',rob:'sawRob',theft:'sawTheft',help:'sawHelp',rescue:'sawRescue'};
export const WITNESS_RANGE=3;
const WITNESS_MARKS={attack:'attacked',kill:'killed',rob:'robbed',theft:'stolen',help:'helped',rescue:'helped'};
export function witnessedEvents(n){return WITNESS_EVENTS.filter(event=>n.memory[WITNESS_FLAGS[event]]);}
function witnessTarget(s,event,witness){const mark=WITNESS_MARKS[event];return Object.keys(NPCS).find(id=>id!==witness&&s.npcs[id]?.memory[mark]);}
function witnessLine(s,id,event){const found=witnessTarget(s,event,id),who=NPCS[id].name,them=found?NPCS[found].name:'someone';
 if(event==='kill')return id==='vex'?`Vex: “The ceiling called ${them}’s death a retention event. They had a name. Keep your hands where I can see them.” Vex refuses trade and friendship.`:`${who}: “I watched you kill ${them}. I saw it happen, not heard about it later.”`;
 if(event==='rob')return id==='vex'?`Vex: “I watched you take ${them}’s supplies. A rival I can respect. A mugger gets no training.”`:`${who}: “I watched you rob ${them}. Try that near me and find out.”`;
 if(event==='attack')return `${who}: “I saw you start that fight. I will be watching your hands.”`;
 if(event==='theft')return `${who}: “I saw you take that. Do not bother denying it.”`;
 if(event==='rescue')return `${who}: “You pulled ${them} back from the edge. I will remember that.”`;
 return `${who}: “I saw you help ${them}. That counts for something in here.”`;
}
function witnessReaction(n,event){if(event==='kill'||event==='rob')n.attitude='hostile';else if(event==='attack'||event==='theft'){if(n.attitude!=='hostile')n.attitude='suspicious';}else n.attitude=n.attitude==='hostile'?'suspicious':'friendly';}
export function recordWitness(s,ids,event,say){const flag=WITNESS_FLAGS[event];if(!flag)return [];const seen=[];
 for(const id of ids){const n=s.npcs[id];if(!n||n.condition!=='conscious'||n.memory[flag])continue;n.memory[flag]=true;witnessReaction(n,event);seen.push(id);say(s,witnessLine(s,id,event));}
 return seen;}
function talk(s,id,say){const n=s.npcs[id],m=n.memory;m.met=true;
 if(m.lied&&!m.lieExposed){m.lieExposed=true;m.distracted=false;betray(n);n.attitude='hostile';say(s,`${NPCS[id].name}: “I checked your story. No rescue team. No sponsor. Just you, shopping for someone stupid.” Your lie is exposed.`);return;}
 const seen=witnessedEvents(n);
 if(seen.length){const worst=seen.includes('kill')?'kill':seen.includes('rob')?'rob':seen.includes('attack')?'attack':seen.includes('theft')?'theft':seen.includes('rescue')?'rescue':'help';say(s,witnessLine(s,id,worst));return;}
 if(m.betrayed){say(s,`${NPCS[id].name}: “I let you close because I thought we were helping each other. That mistake is staying with me.”`);return;}
 if(m.robbed||m.theftDetected){say(s,`${NPCS[id].name}: “You have my things. You don’t get my trust as a complimentary extra.”`);return;}
 if(m.attacked){say(s,`${NPCS[id].name}: “Last time we spoke, you used a weapon. I remember the punctuation.”`);return;}
 if(m.threatened){say(s,`${NPCS[id].name}: “I remember the threat. Lowering your voice doesn’t erase it.”`);return;}
 const lines={
  mara:m.befriended?'Mara: “I used to mend school uniforms. Now I patch contestants while a ceiling asks us to bleed more clearly. You helped anyway. That matters.”':m.helped?'Mara flexes her newly wrapped hand. “It hurts less. The room still smells like an electrical fire in a butcher’s shop, but it hurts less. Thank you.”':'Mara: “Don’t step closer yet. My hand’s cut, not my judgment. A bandage would help. The locker has a spare exit key, so nobody needs to die over mine.”',
  tobin:m.befriended?'Tobin: “That loose pipe in Pest Control? My spare cache is behind it. Take the extra coins. We can call it a dividend and upset the cameras.”':m.helped?'Tobin tests the repaired strap. “You fixed something without charging rent on it. I’m suspicious of how much I appreciate that.”':'Tobin hugs a bulging satchel. “I sell things left behind by people the broadcast calls ‘previous inventory.’ My strap is shot. Bring a repair kit, or two coins for parts. Then we can talk trust.”',
  vex:m.befriended?'Vex: “I wanted a rival. The producers wanted a corpse. Stay alive and we both get to disappoint somebody.”':m.helped?'Vex: “Useful information beats loud confidence. You brought something useful. That puts you ahead of most of this room.”':'Vex rests a blade across one knee. “Don’t mistake a shared exit for a team. Read the maintenance memo in Lost Property and tell me what it says. Or spare a potion. Then we’ll see.”'
 };say(s,lines[id]);
}
export function actNPC(s,id,action,{say,award,startCombat,witness=()=>[],rng=Math.random}){const n=s.npcs[id],m=n.memory,d=NPCS[id];
 if(action==='Inspect'){say(s,describeNPC(s,id));return true;}
 if(action==='Loot'){const got=takeAll(s,n,id);m.looted=true;if(got!=='nothing'&&n.condition==='unconscious'){betray(n);m.robbed=true;n.attitude='hostile';}say(s,got==='nothing'?`${d.name} has nothing left. Possessions do not respawn.`:`You take ${got} from ${d.name}. ${n.condition==='unconscious'?'They remain alive and unconscious.':'They remain dead.'}`);return true;}
 if(action==='Wake up'){n.condition='conscious';n.hp=Math.max(1,Math.ceil(d.hp/4));m.woken=true;n.attitude='hostile';say(s,`${d.name} wakes at ${n.hp} HP. They remember the attack${m.looted?' and the missing possessions':''}. Waking them does not restore their inventory or trust.`);return true;}
  if(action==='Kill'&&n.condition==='unconscious'){betray(n);n.condition='dead';n.hp=0;m.killed=true;n.attitude='hostile';say(s,`${d.name} is dead. Their remaining possessions can be looted. ANNEX: “One fewer unresolved relationship.”`);witness('kill',id);return true;}
 if(action==='Talk'){talk(s,id,say);return true;}
 if(action==='Hand it back'){
  const owed=Object.keys(s.stolen||{}).filter(key=>s.stolen[key]===id),returned=[];
  for(const key of owed){const held=key==='gold'?Math.min(s.gold,3):key==='key'?(s.key?1:0):ITEM_KEYS.includes(key)?s.items[key]:(s[key]||0);
   if(held){returned.push(`${held} ${itemName[key]}`);if(key==='gold')s.gold-=held;else if(key==='key')s.key=false;else if(ITEM_KEYS.includes(key))s.items[key]-=held;else s[key]-=held;n.inventory[key]=(n.inventory[key]||0)+held;}
   delete s.stolen[key];}
  m.returned=true;if(n.attitude==='hostile')n.attitude='suspicious';
  say(s,returned.length?`You hand back ${returned.join(', ')}. ${d.name} counts it in front of you, slowly.`:`You have nothing left to return, and ${d.name} knows it.`);
  return true;
 }
 if(action==='Help'){
  if(m.helped){say(s,`${d.name} remembers your help. There is no second reward for repeating it.`);return true;}
  let cost='';if(id==='mara'){if(s.items.bandages){s.items.bandages--;cost='a bandage';}else if(s.potions){s.potions--;cost='a healing potion';}}
  if(id==='tobin'){if(s.items.repairKits){s.items.repairKits--;cost='a repair kit';}else if(s.gold>=2){s.gold-=2;cost='2 coins for repairs';}}
  if(id==='vex'){if(s.flags.memo)cost='the maintenance memo’s warning';else if(s.potions){s.potions--;cost='a healing potion';}}
  if(!cost){say(s,`To help ${d.name}, you need ${d.help.toLowerCase()}.`);return true;}
  m.helped=true;if(n.attitude!=='hostile'&&!m.betrayed)n.attitude=id==='mara'?'friendly':'neutral';say(s,`You give ${d.name} ${cost}. ${n.attitude==='hostile'?'They accept the help, but do not forgive what happened.':'They remember the help. Talk, then Befriend to build an alliance.'}`);witness(n.hp<=Math.ceil(d.hp/4)?'rescue':'help',id);return true;
 }
 if(action==='Befriend'){
   if(n.attitude==='hostile'||m.betrayed||m.lieExposed){say(s,`${d.name} refuses. Help does not erase betrayal or violence.`);return true;}
  if(!m.met||!m.helped){say(s,`${d.name} is not ready to trust you. Talk and help them first.`);return true;}
  n.attitude='friendly';if(m.befriended){say(s,`${d.name} is already your ally.`);return true;}m.befriended=true;
  if(id==='mara'){transfer(s,n,'key',1);s.flags.maraAdvice=true;say(s,'Mara shares her exit key and marks the free healing station on your notes. “Live long enough to owe me a conversation.”');}
  if(id==='tobin'){const got=transfer(s,n,'smokeBombs',1);s.flags.tobinCache=true;say(s,`Tobin reveals extra coins behind the loose pipe in Pest Control${got?' and gives you a smoke bomb':''}. Smoke allows escape without a retaliatory hit.`);}
  if(id==='vex'){s.flags.vexTraining=true;say(s,'Vex shows you how to put your weight behind a strike. Permanent +1 attack damage. “We can be rivals after we get out.”');}
  award(s,id==='mara'?'People person':id==='tobin'?'Mutual inventory':'Worthy rival');return true;
 }
 if(action==='Lie'){
  if(m.lied||n.attitude==='hostile'){m.lied=true;m.lieExposed=true;m.distracted=false;betray(n);n.attitude='hostile';say(s,`${d.name} catches the lie. Future trade and friendship are refused.`);return true;}
  m.lied=true;if(!m.met||(!s.flags.memo&&n.attitude!=='friendly')){m.lieExposed=true;n.attitude='suspicious';say(s,`${d.name}: “Sponsor rescue team? You don’t even know their slogan.” Read the memo before trying a cover story. The lie is remembered.`);return true;}
  m.distracted=true;say(s,`You claim a sponsor rescue team is coming and quote the memo’s slogan. ${d.name} checks the radio: one pickpocket opportunity and a 1-coin trade discount. Talking again will expose the lie.`);return true;
 }
 if(action==='Recruit'){recruit(s,id,say,rng);return true;}
 if(action==='Trade'){
  if(n.attitude==='hostile'||m.lieExposed){say(s,`${d.name} refuses to trade with you.`);return true;}
  const key=d.trade,price=tradePrice(s,id);if(!n.inventory[key]){say(s,`${d.name} is out of ${itemName[key]}s. Stock is finite.`);return true;}
  if(s.gold<price){say(s,`${d.name} offers 1 ${itemName[key]} for ${price} coins. You cannot afford it.`);return true;}
  s.gold-=price;n.inventory.gold+=price;transfer(s,n,key,1);m.traded=true;say(s,`Bought 1 ${itemName[key]} from ${d.name} for ${price} coins. ${n.inventory[key]} remain in their stock.`);return true;
 }
 if(action==='Pickpocket'){
  if(m.stolen){say(s,`${d.name} guards what remains. No second pickpocket opportunity.`);return true;}
  // A distracted or friendly target is easier; an alert one is harder. The
  // roll is the central d20 check, so the result line shows its working.
  const alert=!m.distracted&&n.attitude!=='friendly',dc=pickpocketDC(id);
  const result=check({actor:s,skill:'sleight of hand',dc,advantage:!alert,disadvantage:alert,rng});
  const odds=result.advantage?' with advantage':result.disadvantage?' with disadvantage':'';
  const spread=result.rolls.length>1?` from ${result.rolls.join(' and ')}`:'';
  const line=`Sleight of hand ${result.total} (d20 ${result.rawRoll}${spread} + ${result.abilityModifier} dexterity${result.proficiency?` + ${result.proficiencyBonus} proficiency`:''}${odds}) against DC ${dc}. ${result.success?'Success.':'Failure.'}`;
  if(!result.success){betray(n);m.theftAttempt=true;n.attitude='hostile';say(s,`${line} ${d.name} catches your hand. They are now hostile.`);witness('theft',id);return true;}
  const key=[d.pick,'potions','gold',...ITEM_KEYS,'key'].find(k=>n.inventory[k]>0);if(!key){say(s,`${d.name} has nothing to steal.`);return true;}
  const got=transfer(s,n,key,key==='gold'?2:1);s.stolen[key]=id;betray(n);m.stolen=true;m.distracted=false;say(s,`${line} You quietly take ${got} ${itemName[key]} from ${d.name}. They will discover the theft when you leave this room. It will not be forgotten.`);witness('theft',id);return true;
 }
 if(action==='Threaten'){
  betray(n);m.threatened=true;n.attitude=n.attitude==='friendly'?'suspicious':'hostile';say(s,`${d.name} remembers your threat. ${id==='vex'?'Vex draws a weapon rather than backing down.':'They pull their belongings close. Open robbery would take them, but end any chance of trust.'}`);if(id==='vex')startCombat(s,id,'lethal');return true;
 }
 if(action==='Rob openly'){
  betray(n);m.robberyAttempt=true;n.attitude='hostile';if(id==='vex'){say(s,'Vex: “You have badly misread the room.” Vex fights back; defeat them before looting.');startCombat(s,id,'lethal');return true;}
  leaveParty(s,id,say,'was robbed by you');m.robbed=true;say(s,`${d.name} surrenders ${takeAll(s,n,id)} rather than die. They remain alive, hostile, and remember the robbery. ${id==='tobin'?'Tobin reaches for a radio.':''}`);witness('rob',id);return true;
 }
 if(['Attack','Knock unconscious','Kill'].includes(action)){startCombat(s,id,action==='Knock unconscious'?'nonlethal':'lethal');return true;}
 return false;
}
// Being caught taking something. How the owner reacts depends on who they are:
// Vex attacks, Mara and Tobin demand it back, and everyone remembers.
export function confront(s,id,say,startCombat){const n=s.npcs[id],d=NPCS[id];leaveParty(s,id,say,'was stolen from by you');n.memory.stolen=true;n.memory.theftDetected=true;n.memory.demanded=true;n.attitude='hostile';
 if(id==='vex'){say(s,'Vex: “Put it down. You can keep the memory, not the whetstone.” Vex draws a weapon.');startCombat(s,id,'lethal');return;}
 if(id==='mara'){say(s,'Mara: “That is mine. Put it back and we can both pretend this stayed civil.”');return;}
 if(id==='tobin'){say(s,'Tobin: “I counted those twice. You will hand them back.”');return;}
 say(s,`${d.name} demands their belongings back.`);}
// Recruitment. The relationship has to justify it: a finished request opens
// the conversation, a friendly attitude or a shared enemy makes it easier,
// and a Persuasion check decides the answer.
export function recruit(s,id,say,rng=Math.random){const n=s.npcs[id],m=n.memory,d=NPCS[id],terms=RECRUIT[id];
 if(!terms){say(s,`${d.name} has no interest in travelling with you.`);return false;}
 if(isWith(s,id)){say(s,`${d.name} is already with you.`);return false;}
 if(m.betrayed||m.lieExposed||m.robbed||m.theftDetected||m.attacked||m.sawKill){n.attitude='suspicious';say(s,`${d.name} refuses. They have seen what you do to people who trust you.`);return false;}
 const sharedEnemy=Object.keys(NPCS).some(other=>other!==id&&s.npcs[other].attitude==='hostile'&&(s.npcs[other].memory.attacked||s.npcs[other].memory.killed));
 const asked=id==='vex'?!!m.befriended||sharedEnemy:terms.encounters?!!m.helped:!!m.befriended;
 if(!asked){say(s,id==='tobin'?`${d.name} refuses until you have done something for them first.`:`${d.name}: “I do not travel with strangers. Help me first, then ask.”`);return false;}
 const result=check({actor:s,skill:'persuasion',dc:terms.dc,advantage:sharedEnemy||n.attitude==='friendly',disadvantage:n.attitude==='suspicious',modifiers:m.befriended?2:m.helped?1:0,rng});
 const line=`Persuasion ${result.total} (d20 ${result.rawRoll}${result.rolls.length>1?` from ${result.rolls.join(' and ')}`:''} + ${result.abilityModifier} charisma${result.proficiency?` + ${result.proficiencyBonus} proficiency`:''}${m.befriended?' +2 finished request':m.helped?' +1 helped':''}${result.advantage?' with advantage':result.disadvantage?' with disadvantage':''}) against DC ${terms.dc}. ${result.success?'Success.':'Failure.'}`;
 if(!result.success){n.attitude='suspicious';say(s,`${line} ${d.name} turns you down.`);return false;}
 m.recruited=true;n.attitude='friendly';
 if(terms.encounters){s.allies[id]=terms.encounters;say(s,`${line} ${d.name} agrees to help for ${terms.encounters} fights, then goes their own way.`);}
 else{s.party=[...(s.party||[]),id];say(s,`${line} ${d.name} joins you.`);}
 return true;}
export function leaveParty(s,id,say,reason){if(!isWith(s,id))return false;
 if((s.party||[]).includes(id))s.party=s.party.filter(member=>member!==id);else delete s.allies[id];
 s.npcs[id].memory.abandoned=true;s.npcs[id].attitude='hostile';
 say(s,`${NPCS[id].name} ${reason} and is no longer with you.`);return true;}

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
export const ITEM_KEYS = ['bandages','repairKits','smokeBombs','whetstones','badge'];
export const STOCK_KEYS = ['gold','potions','key',...ITEM_KEYS];
export const NPCS = {
 mara:{name:'Mara',role:'Cautious survivor',hp:20,damage:[4,6],attitude:'neutral',trade:'potions',price:3,pick:'key',help:'1 bandage or potion',stock:{gold:3,potions:2,key:1},equipped:['bandages'],refuse:['key'],onHit:'bleeding',home:0,routine:'shelter',route:[0],abilities:{strength:14,dexterity:12,constitution:14,intelligence:12,wisdom:15,charisma:13},skills:['medicine','insight'],saves:['wisdom','constitution']},
 tobin:{name:'Tobin',role:'Suspicious scavenger',hp:16,damage:[2,4],attitude:'suspicious',trade:'smokeBombs',price:4,pick:'smokeBombs',help:'1 repair kit or 2 coins',stock:{gold:6,potions:2,smokeBombs:2,badge:1},equipped:['repairKits'],refuse:[],onHit:'bleeding',home:1,routine:'scavenge',route:[1,0],abilities:{strength:11,dexterity:15,constitution:12,intelligence:14,wisdom:13,charisma:12},skills:['sleight of hand','stealth','investigation'],saves:['dexterity','intelligence']},
 vex:{name:'Vex',role:'Dangerous rival',hp:28,damage:[5,7],attitude:'neutral',trade:'whetstones',price:4,pick:'whetstones',help:'Read the memo, or give 1 potion',stock:{gold:5,potions:1,whetstones:1},equipped:[],refuse:['potions'],onHit:'bleeding',home:1,routine:'patrol',route:[1,0],abilities:{strength:17,dexterity:16,constitution:15,intelligence:11,wisdom:12,charisma:14},skills:['athletics','intimidation','perception'],saves:['strength','constitution']},
 skrit:{name:'Skrit',role:'Injured ratman',hp:9,damage:[1,2],attitude:'neutral',stock:{gold:2,cheese:1},equipped:[],refuse:[],home:0,routine:'guard',route:[0],archetype:'coward',pack:'ratmen',onHit:'bleeding',abilities:{strength:7,dexterity:13,constitution:9,intelligence:9,wisdom:11,charisma:8},skills:['stealth','perception'],saves:['dexterity']},
 rat:{name:'Ratman scrapper',archetype:'scrapper',pack:'ratmen',role:'Unpaid sanitation',hp:12,damage:[2,3],attitude:'neutral',stock:{gold:2},equipped:[],refuse:['gold'],onHit:'poisoned',xp:30,home:3,routine:'guard',route:[3],abilities:{strength:8,dexterity:14,constitution:10,intelligence:8,wisdom:12,charisma:6},skills:['stealth','perception'],saves:['dexterity']}
 ,skulker:{name:'Ratman skulker',archetype:'skulker',pack:'ratmen',role:'Thrown-object specialist',hp:10,damage:[1,2],thrown:[2,4],attitude:'neutral',stock:{gold:3,smokeBombs:1},equipped:[],refuse:['smokeBombs'],onHit:'bleeding',xp:35,home:9,routine:'guard',route:[9],abilities:{strength:8,dexterity:16,constitution:10,intelligence:11,wisdom:13,charisma:7},skills:['stealth','perception'],saves:['dexterity']}
 ,brute:{name:'Ratman brute',archetype:'brute',pack:'ratmen',role:'Slow and heavy',hp:24,damage:[5,7],attitude:'neutral',stock:{gold:4,potions:1},equipped:[],refuse:['potions'],onHit:'bleeding',xp:80,home:10,routine:'guard',route:[10],abilities:{strength:17,dexterity:9,constitution:16,intelligence:6,wisdom:9,charisma:5},skills:['athletics','intimidation'],saves:['strength','constitution']}
 // The two Mara is looking for. Eli has barricaded himself into Records; June is
 // hurt and hiding in the food store, where the ratmen keep their scraps.
 ,eli:{name:'Eli',role:'Barricaded clerk',hp:14,damage:[1,2],attitude:'neutral',stock:{gold:4,bandages:1},equipped:[],refuse:[],help:'Help him shift the barricade',home:2,routine:'shelter',route:[2],abilities:{strength:12,dexterity:11,constitution:13,intelligence:13,wisdom:14,charisma:10},skills:['investigation','history'],saves:['wisdom']}
 ,june:{name:'June',role:'Wounded straggler',hp:6,damage:[1,2],attitude:'neutral',stock:{gold:2,potions:1},equipped:[],refuse:['potions'],help:'A bandage would do it',home:10,routine:'shelter',route:[10],abilities:{strength:9,dexterity:13,constitution:8,intelligence:12,wisdom:13,charisma:12},skills:['medicine','perception'],saves:['constitution']}

};
export const itemName={gold:'coins',potions:'healing potion',key:'exit key',bandages:'bandage',repairKits:'repair kit',smokeBombs:'smoke bomb',whetstones:'whetstone',badge:'maintenance badge'};
// Tobin lifted the badge off the ratmen. It is one object in one place: whoever
// is carrying it has it, and the moment it moves it leaves the other inventory.
export const BADGE_PRICE=12,BADGE_ASK_DC=13,BADGE_LIFT_DC=4;
export function makeNPC(id){const d=NPCS[id];return {hp:d.hp,attitude:d.attitude,condition:'conscious',memory:{},inventory:Object.fromEntries(STOCK_KEYS.map(k=>[k,d.stock[k]||0]))};}
export function memoryText(n){const names={helped:'helped',befriended:'befriended',recruited:'joined you',abandoned:'left the party',returned:'got their goods back',threatened:'threatened',lied:'lied to',lieExposed:'lie exposed',stolen:'pickpocketed',theftDetected:'theft discovered',robbed:'robbed',robberyAttempt:'robbery attempted',attacked:'attacked',knockedOut:'knocked unconscious',killed:'killed',looted:'looted',betrayed:'betrayed',woken:'woken up',sawAttack:'saw an attack',sawKill:'saw a killing',sawRob:'saw a robbery',sawTheft:'saw a theft',fled:'fled danger',sawBody:'found a body',heardViolence:'heard violence',sawHelp:'saw you help someone',sawRescue:'saw you rescue someone'};return Object.entries(names).filter(([key])=>n.memory[key]).map(([,label])=>label).join(', ')||'No shared history yet';}
export function stockText(n){return STOCK_KEYS.filter(k=>n.inventory[k]>0).map(k=>`${n.inventory[k]} ${itemName[k]}`).join(', ')||'nothing left';}
// Prices are per item. An NPC's headline good uses their own price; anything
// else uses the shared table. Friendly sellers knock a coin off, suspicious
// ones add one, and a distracted seller is easier to bargain with.
export const PRICES={potions:5,bandages:3,repairKits:4,smokeBombs:5,whetstones:5,key:8};
export function priceOf(s,id,key){const n=s.npcs[id],d=NPCS[id];const base=key===d.trade?d.price:PRICES[key]||6;return Math.max(1,base+(n.attitude==='suspicious'?1:0)-(n.attitude==='friendly'?1:0)-(n.memory.distracted?1:0));}
export function sellPriceOf(s,id,key){return Math.max(1,Math.floor(priceOf(s,id,key)/2)+(s.npcs[id].attitude==='friendly'?1:0));}
export function tradePrice(s,id){return priceOf(s,id,NPCS[id].trade);}
function kept(d,key){return (d.equipped||[]).includes(key)||(d.refuse||[]).includes(key);}
export function sellableGoods(s,id){const n=s.npcs[id],d=NPCS[id];return STOCK_KEYS.filter(key=>key!=='gold'&&n.inventory[key]>0&&!(d.equipped||[]).includes(key)&&!(d.refuse||[]).includes(key));}
export function wantedGoods(s,id){const d=NPCS[id];return STOCK_KEYS.filter(key=>key!=='gold'&&key!=='key'&&!(d.equipped||[]).includes(key)&&!(d.refuse||[]).includes(key));}
export function goodsText(s,id){const n=s.npcs[id],d=NPCS[id];
 const sells=sellableGoods(s,id).map(key=>`${itemName[key]} for ${priceOf(s,id,key)} coins`);
 const buys=wantedGoods(s,id).map(key=>`${itemName[key]} for ${sellPriceOf(s,id,key)} coins`);
 const keeps=[...(d.equipped||[]),...(d.refuse||[])].filter(key=>n.inventory[key]>0).map(key=>itemName[key]);
 return `${d.name} sells: ${sells.join(', ')||'nothing right now'}. ${d.name} buys: ${buys.join(', ')}. ${keeps.length?`Never traded: ${keeps.join(', ')}.`:''}`;}
// What the player can actually see. Someone you have barely met is a person,
// not a stat block: numbers and possessions only once you have traded blows or
// goods with them.
export function profileKnown(n){const m=n.memory||{};return !!(m.traded||m.attacked||m.knockedOut||m.killed||m.robbed||m.stolen||m.looted||m.helped||m.fed);}
export function describeNPC(s,id){const n=s.npcs[id],d=NPCS[id];
 if(!profileKnown(n))return `${d.name} · ${n.condition}. You do not know much else about them yet.`;
 return `${d.name} · ${n.attitude} · ${n.condition} · ${n.hp}/${d.hp} HP. Damage ${d.damage.join('–')}. Carries: ${stockText(n)}. Remembers: ${memoryText(n)}.`;}
export function npcActions(s,id){const n=s.npcs[id];if(n.condition==='dead')return ['Inspect','Loot'];if(n.condition==='unconscious')return ['Inspect','Loot','Wake up','Kill'];const owed=Object.keys(s.stolen||{}).some(key=>s.stolen[key]===id);
 const trade=n.attitude==='hostile'?[]:['Ask about goods','Trade','Offer a fair swap',...wantedGoods(s,id).filter(key=>held(s,key)).slice(0,3).map(key=>`Sell 1 ${itemName[key]}`)];
 return ['Inspect','Talk','Help','Befriend',...(RECRUIT[id]&&!isWith(s,id)?['Recruit']:[]),...badgeOffers(s,id),...vexOffers(s,id),...maraOffers(s,id),'Threaten','Lie',...trade,'Pickpocket','Rob openly',...(owed?['Hand it back']:[]),'Attack','Knock unconscious','Kill'];}
// The badge on offer: he can be talked out of it, bought out of it, or relieved
// of it. Everything else - robbery, a knockout, a killing - runs through the
// ordinary loot and robbery paths, which already empty whatever he is carrying.
function badgeOffers(s,id){const n=s.npcs[id];
 if(id!=='tobin'||!n.inventory.badge||n.attitude==='hostile')return [];
 return ['Ask about the badge',...(s.gold>=BADGE_PRICE?[`Buy the badge (${BADGE_PRICE} coins)`]:[]),'Lift the badge'];}
// Vex wants first pick of the security cache, and he is the only one here who
// understands the electrical room. Once the cache is open, honour it or don't.
// Mara came down here with two other people and has not seen either since.
function maraOffers(s,id){if(id!=="mara"||s.flags.maraAsked)return [];return ["Ask about the survivors"];}
function vexOffers(s,id){if(id!=='vex')return [];const n=s.npcs[id],deal=s.quests.vexDeal;
 const offers=[];
 if(deal==='open')offers.push('Hear his plan');
 if(s.flags.vaultOpen&&deal==='agreed')offers.push('Let Vex take his pick','Keep it all');
 return offers;}
function held(s,key){return (key==='gold'?s.gold:ITEM_KEYS.includes(key)?s.items[key]:s[key]||0)>0;}
function refusesTrade(s,id){const n=s.npcs[id];return n.attitude==='hostile'||!!n.memory.lieExposed;}
function transfer(s,n,key,count){const amount=Math.min(n.inventory[key],count);if(!amount)return 0;n.inventory[key]-=amount;if(key==='key')s.key=true;else if(ITEM_KEYS.includes(key))s.items[key]+=amount;else s[key]+=amount;return amount;}
function takeAll(s,n,id){const got=[];for(const key of STOCK_KEYS){if(NPCS[id]?.equipped?.includes(key))continue;const amount=transfer(s,n,key,n.inventory[key]);if(amount){got.push(`${amount} ${itemName[key]}`);if(id)s.stolen[key]=id;}}return got.join(', ')||'nothing';}
function betray(n){if(n.memory.helped||n.memory.befriended||n.attitude==='friendly')n.memory.betrayed=true;}
export function discoverThefts(s,ids,say,award=()=>{}){for(const id of ids){const n=s.npcs[id];if(!n||n.condition!=='conscious'||!n.memory.stolen||n.memory.theftDetected)continue;n.memory.theftDetected=true;n.memory.distracted=false;n.attitude='hostile';award(s,'Sticky Fingers');say(s,`${NPCS[id].name} notices the missing belongings as you leave. The theft is remembered.`);}}
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
export function actNPC(s,id,action,{say,award,startCombat,witness=()=>[],deed=()=>{},bonus=()=>0,note=()=>'',standing=()=>{},approve=()=>{},rng=Math.random}){const n=s.npcs[id],m=n.memory,d=NPCS[id];
 if(action==='Inspect'){const note=note(id);say(s,describeNPC(s,id)+(note?' '+note:''));return true;}
 if(action==='Loot'){const got=takeAll(s,n,id);m.looted=true;if(got!=='nothing'&&n.condition==='unconscious'){betray(n);m.robbed=true;n.attitude='hostile';}say(s,got==='nothing'?`${d.name} has nothing left. Possessions do not respawn.`:`You take ${got} from ${d.name}. ${n.condition==='unconscious'?'They remain alive and unconscious.':'They remain dead.'}`);return true;}
 // The maintenance badge: Tobin will not give up something that opens doors
 if(action==='Ask about the survivors'){s.flags.maraAsked=true;n.memory.askedSurvivors=true;
  say(s,'Mara counts them off on her fingers. Eli went into Records for the keys and never came back out, and June was hurt near the food store when the rats came through. “They matter more than the supplies. If you find either of them, they are still people.”');return true;}
 if(action==='Hear his plan'){s.quests.vexDeal='agreed';n.memory.vexDeal=true;
  s.allies[id]=Math.max(1,s.allies[id]||0);
  say(s,'Vex draws the loop on the back of a ticket: the security feed runs through the Electrical Control Room, and a feed is only an opinion. Cut it there and the gate stops asking questions. He wants first pick of whatever is in the security cache, and he says so before you agree.');return true;}
 if(action==='Let Vex take his pick'){
  s.quests.vexDeal='settled';n.memory.honouredDeal=true;
  const signet=(s.gear||[]).indexOf('Iron signet')>=0,slot=Object.keys(s.equipped||{}).find(key=>s.equipped[key]==='Iron signet');
  if(slot){s.equipped[slot]=null;say(s,'Vex takes the iron signet off you and pockets it without ceremony.');}
  else if(signet){s.gear=s.gear.filter(item=>item!=='Iron signet');say(s,'Vex picks the iron signet out of your hands and pockets it without ceremony.');}
  else{const paid=Math.min(5,s.gold);s.gold-=paid;n.inventory.gold+=paid;say(s,`The signet is already gone, so Vex takes ${paid} coins instead and does not pretend to be pleased.`);}
  standing(id,-1,'you honoured your deal with Vex');approve(id,10,'you honoured the deal');
  say(s,'He nods once, which from Vex is a standing ovation.');return true;}
 if(action==='Keep it all'){
  s.quests.vexDeal='betrayed';n.memory.betrayed=true;
  const left=leaveParty(s,id,say,'you kept what you promised him');deed('betrayal');
  standing(id,2,'you kept what you promised him');approve(id,-25,'you betrayed Vex over the cache');
  say(s,left?'Vex looks at the cache, then at you, and stops being on your side in the space of one breath.':'Vex looks at the cache, then at you. “I drew you the loop,” he says, and files it away.');
  return true;}
 // without a reason, and he remembers being asked either way.
 if(action==='Ask about the badge'){
  const result=check({actor:s,skill:'persuasion',dc:BADGE_ASK_DC,advantage:!!m.helped,disadvantage:!!m.lieExposed,modifiers:bonus('checks'),rng});
  if(!result.success){m.badgeRefused=true;say(s,`Persuasion ${result.total} against DC ${BADGE_ASK_DC}. Failure. ${d.name} closes his hand around it. “Mine.”`);return true;}
  transfer(s,n,'badge',1);s.flags.badgeKnown=true;m.sharedBadge=true;approve(id,8,'you talked Tobin out of the badge');
  say(s,`Persuasion ${result.total} against DC ${BADGE_ASK_DC}. Success. ${d.name} hands over the maintenance badge and watches your face the whole time.`);return true;}
 if(action.startsWith('Buy the badge')){
  if(s.gold<BADGE_PRICE){say(s,`${d.name} wants ${BADGE_PRICE} coins for it. You have ${s.gold}.`);return true;}
  s.gold-=BADGE_PRICE;n.inventory.gold+=BADGE_PRICE;transfer(s,n,'badge',1);s.flags.badgeKnown=true;m.traded=true;m.soldBadge=true;
  say(s,`You pay ${d.name} ${BADGE_PRICE} coins for the maintenance badge. He counts them twice and does not look at you.`);return true;}
 if(action==='Lift the badge'){
  const alert=!m.distracted&&n.attitude!=='friendly',dc=pickpocketDC(id)+BADGE_LIFT_DC;
  const result=check({actor:s,skill:'sleight of hand',dc,advantage:!alert,disadvantage:alert,modifiers:bonus('checks'),rng});
  if(!result.success){betray(n);m.theftAttempt=true;n.attitude='hostile';say(s,`Sleight of hand ${result.total} against DC ${dc}. Failure. ${d.name} feels the tug on the lanyard and turns round. He is now hostile.`);witness('theft',id);return true;}
  transfer(s,n,'badge',1);s.stolen.badge=id;s.flags.badgeKnown=true;deed('theft');standing(id,2,'you stole from one of them');approve(id,-15,'you stole from someone');
  award(s,'Five-Finger Discount');m.stolen=true;m.distracted=false;
  say(s,`Sleight of hand ${result.total} against DC ${dc}. Success. The badge comes away with the lanyard still on it and ${d.name} notices nothing.`);return true;}
 if(action==='Wake up'){n.condition='conscious';n.hp=Math.max(1,Math.ceil(d.hp/4));m.woken=true;n.attitude='hostile';say(s,`${d.name} wakes at ${n.hp} HP. They remember the attack${m.looted?' and the missing possessions':''}. Waking them does not restore their inventory or trust.`);return true;}
  if(action==='Kill'&&n.condition==='unconscious'){approve(id,-25,'you killed someone who could not fight back');betray(n);n.condition='dead';n.hp=0;m.killed=true;n.attitude='hostile';say(s,`${d.name} is dead. Their remaining possessions can be looted. ANNEX: “One fewer unresolved relationship.”`);witness('kill',id);return true;}
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
  deed('help');standing(id,-1,'you helped one of them');approve(id,8,'you helped someone');m.helped=true;if(n.attitude!=='hostile'&&!m.betrayed)n.attitude=id==='mara'?'friendly':'neutral';say(s,`You give ${d.name} ${cost}. ${n.attitude==='hostile'?'They accept the help, but do not forgive what happened.':'They remember the help. Talk, then Befriend to build an alliance.'}`);witness(n.hp<=Math.ceil(d.hp/4)?'rescue':'help',id);return true;
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
 if(action==='Recruit'){recruit(s,id,say,rng,deed,bonus);return true;}
 if(action==='Ask about goods'){if(refusesTrade(s,id)){say(s,`${d.name} will not discuss goods with you.`);return true;}say(s,goodsText(s,id));return true;}
 if(action.startsWith('Sell 1 ')){
  if(refusesTrade(s,id)){say(s,`${d.name} will not trade with you.`);return true;}
  const key=Object.keys(itemName).find(name=>`Sell 1 ${itemName[name]}`===action);
  if(!key||!held(s,key)){say(s,'You have nothing like that to sell.');return true;}
  if(!wantedGoods(s,id).includes(key)){say(s,`${d.name} has no use for your ${itemName[key]}.`);return true;}
  const price=sellPriceOf(s,id,key);
  if(n.inventory.gold<price){say(s,`${d.name} cannot cover ${price} coins for it.`);return true;}
  if(key==='key')s.key=false;else if(ITEM_KEYS.includes(key))s.items[key]-=1;else s[key]-=1;
  n.inventory[key]+=1;n.inventory.gold-=price;s.gold+=price;m.traded=true;
  say(s,`Sold 1 ${itemName[key]} to ${d.name} for ${price} coins. It is part of their stock now, not yours.`);
  return true;
 }
 if(action==='Offer a fair swap'){
  if(refusesTrade(s,id)){say(s,`${d.name} will not trade with you.`);return true;}
  if(n.attitude==='suspicious'){say(s,`${d.name} is not interested in swaps while they are suspicious of you.`);return true;}
  const key=d.trade,ask=priceOf(s,id,key);
  if(!n.inventory[key]){say(s,`${d.name} has nothing to swap.`);return true;}
  const offer=wantedGoods(s,id).filter(candidate=>candidate!==key&&held(s,candidate)).sort((a,b)=>(PRICES[b]||0)-(PRICES[a]||0))[0];
  if(!offer){say(s,`You are carrying nothing ${d.name} wants.`);return true;}
  if((PRICES[offer]||0)<ask){say(s,`${d.name} values the ${itemName[key]} at ${ask} coins. Your ${itemName[offer]} is not enough.`);return true;}
  if(ITEM_KEYS.includes(offer))s.items[offer]-=1;else s[offer]-=1;
  transfer(s,n,key,1);n.inventory[offer]+=1;m.traded=true;
  say(s,`Swapped your ${itemName[offer]} for ${d.name}’s ${itemName[key]}. Both sides counted twice.`);
  return true;
 }
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
  const result=check({actor:s,skill:'sleight of hand',dc,advantage:!alert,disadvantage:alert,modifiers:bonus('checks'),rng});
  const odds=result.advantage?' with advantage':result.disadvantage?' with disadvantage':'';
  const spread=result.rolls.length>1?` from ${result.rolls.join(' and ')}`:'';
  const line=`Sleight of hand ${result.total} (d20 ${result.rawRoll}${spread} + ${result.abilityModifier} dexterity${result.proficiency?` + ${result.proficiencyBonus} proficiency`:''}${odds}) against DC ${dc}. ${result.success?'Success.':'Failure.'}`;
  if(!result.success){award(s,'Sticky Fingers');betray(n);m.theftAttempt=true;n.attitude='hostile';say(s,`${line} ${d.name} catches your hand. They are now hostile.`);witness('theft',id);return true;}
  const key=[d.pick,'potions','gold',...ITEM_KEYS,'key'].find(k=>n.inventory[k]>0&&!(d.equipped||[]).includes(k));if(!key){say(s,`${d.name} has nothing to steal.`);return true;}
  const got=transfer(s,n,key,key==='gold'?2:1);s.stolen[key]=id;deed('theft');standing(id,2,'you stole from one of them');approve(id,-15,'you robbed someone');award(s,'Five-Finger Discount');betray(n);m.stolen=true;m.distracted=false;say(s,`${line} You quietly take ${got} ${itemName[key]} from ${d.name}. They will discover the theft when you leave this room. It will not be forgotten.`);witness('theft',id);return true;
 }
 if(action==='Threaten'){
  deed('intimidation');betray(n);m.threatened=true;n.attitude=n.attitude==='friendly'?'suspicious':'hostile';say(s,`${d.name} remembers your threat. ${id==='vex'?'Vex draws a weapon rather than backing down.':'They pull their belongings close. Open robbery would take them, but end any chance of trust.'}`);if(id==='vex')startCombat(s,id,'lethal');return true;
 }
 if(action==='Rob openly'){
  betray(n);m.robberyAttempt=true;n.attitude='hostile';if(id==='vex'){say(s,'Vex: “You have badly misread the room.” Vex fights back; defeat them before looting.');startCombat(s,id,'lethal');return true;}
  if(leaveParty(s,id,say,'was robbed by you'))award(s,'Severance Package');deed('theft');standing(id,2,'you robbed one of them');approve(id,-15,'you robbed someone who could fight back');m.robbed=true;say(s,`${d.name} surrenders ${takeAll(s,n,id)} rather than die. They remain alive, hostile, and remember the robbery. ${id==='tobin'?'Tobin reaches for a radio.':''}`);witness('rob',id);return true;
 }
 if(['Attack','Knock unconscious','Kill'].includes(action)){startCombat(s,id,action==='Knock unconscious'?'nonlethal':'lethal');return true;}
 return false;
}
// Being caught taking something. How the owner reacts depends on who they are:
// Vex attacks, Mara and Tobin demand it back, and everyone remembers.
export function confront(s,id,say,startCombat){const n=s.npcs[id],d=NPCS[id];if(leaveParty(s,id,say,'was stolen from by you'))award(s,'Severance Package');n.memory.stolen=true;n.memory.theftDetected=true;n.memory.demanded=true;n.attitude='hostile';
 if(id==='vex'){say(s,'Vex: “Put it down. You can keep the memory, not the whetstone.” Vex draws a weapon.');startCombat(s,id,'lethal');return;}
 if(id==='mara'){say(s,'Mara: “That is mine. Put it back and we can both pretend this stayed civil.”');return;}
 if(id==='tobin'){say(s,'Tobin: “I counted those twice. You will hand them back.”');return;}
 say(s,`${d.name} demands their belongings back.`);}
// Recruitment. The relationship has to justify it: a finished request opens
// the conversation, a friendly attitude or a shared enemy makes it easier,
// and a Persuasion check decides the answer.
export function recruit(s,id,say,rng=Math.random,deed=()=>{},bonus=()=>0){const n=s.npcs[id],m=n.memory,d=NPCS[id],terms=RECRUIT[id];
 if(!terms){say(s,`${d.name} has no interest in travelling with you.`);return false;}
 if(isWith(s,id)){say(s,`${d.name} is already with you.`);return false;}
 if(m.betrayed||m.lieExposed||m.robbed||m.theftDetected||m.attacked||m.sawKill){n.attitude='suspicious';say(s,`${d.name} refuses. They have seen what you do to people who trust you.`);return false;}
 const sharedEnemy=Object.keys(NPCS).some(other=>other!==id&&s.npcs[other].attitude==='hostile'&&(s.npcs[other].memory.attacked||s.npcs[other].memory.killed));
 const asked=id==='vex'?!!m.befriended||sharedEnemy:terms.encounters?!!m.helped:!!m.befriended;
 if(!asked){say(s,id==='tobin'?`${d.name} refuses until you have done something for them first.`:`${d.name}: “I do not travel with strangers. Help me first, then ask.”`);return false;}
 const result=check({actor:s,skill:'persuasion',dc:terms.dc,advantage:sharedEnemy||n.attitude==='friendly',disadvantage:n.attitude==='suspicious',modifiers:(m.befriended?2:m.helped?1:0)+bonus('persuasion'),rng});
 const line=`Persuasion ${result.total} (d20 ${result.rawRoll}${result.rolls.length>1?` from ${result.rolls.join(' and ')}`:''} + ${result.abilityModifier} charisma${result.proficiency?` + ${result.proficiencyBonus} proficiency`:''}${m.befriended?' +2 finished request':m.helped?' +1 helped':''}${result.advantage?' with advantage':result.disadvantage?' with disadvantage':''}) against DC ${terms.dc}. ${result.success?'Success.':'Failure.'}`;
 if(!result.success){n.attitude='suspicious';say(s,`${line} ${d.name} turns you down.`);return false;}
 m.recruited=true;n.attitude='friendly';deed('persuasion');deed('recruit');
 if(terms.encounters){s.allies[id]=terms.encounters;say(s,`${line} ${d.name} agrees to help for ${terms.encounters} fights, then goes their own way.`);}
 else{s.party=[...(s.party||[]),id];say(s,`${line} ${d.name} joins you.`);}
 return true;}
export function leaveParty(s,id,say,reason){if(!isWith(s,id))return false;
 if((s.party||[]).includes(id))s.party=s.party.filter(member=>member!==id);else delete s.allies[id];
 s.npcs[id].memory.abandoned=true;s.npcs[id].attitude='hostile';
 say(s,`${NPCS[id].name} ${reason} and is no longer with you.`);return true;}

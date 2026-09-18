import {PEOPLE,ATTITUDES,CONDITIONS,ITEM_KEYS,STOCK_KEYS,NPCS,makeNPC,npcActions,actNPC,describeNPC,discoverThefts,memoryText,WITNESS_RANGE,recordWitness,confront,withPlayer,isWith,leaveParty} from './npcs.mjs';
import {ABILITIES,STARTING_ABILITIES,STARTING_SKILLS,STARTING_SAVES,modifier,proficiencyBonus,check as d20} from './rules.mjs';
import {blankCompanion,companionOf,isCompanion,adjustApproval,bandFor,relationshipText,conversationFor,remember,reactionLine,COMPANIONS,clampApproval} from './companions.mjs';
export const rooms=['Intake','Lost Property','The Holdout','Pest Control','Departures'];
export const props=[
 [{id:'fountain',name:'Recovery station',x:4,y:3},{id:'terminal',name:'Welcome terminal',x:8,y:3}],
 [{id:'chest',name:'Abandoned chest',x:4,y:3},{id:'crate',name:'Cracked crate',x:8,y:6},{id:'note',name:'Folded memo',x:8,y:3},{id:'tobin',name:'Tobin, scavenger',x:6,y:6},{id:'satchel',name:'Tobin’s satchel',x:5,y:5,owner:'tobin'},{id:'skulker',name:'Ratman skulker',x:10,y:2}],
 [{id:'mara',name:'Mara, survivor',x:6,y:4},{id:'locker',name:'Emergency locker',x:9,y:3},{id:'brute',name:'Ratman brute',x:2,y:6}],
 [{id:'rat',name:'Ratman scrapper',x:7,y:4},{id:'pipe',name:'Loose pipe',x:4,y:6},{id:'brazier',name:'Burning brazier',x:10,y:6,hazard:true}],
 [{id:'stairs',name:'Exit stairs',x:9,y:4},{id:'plaque',name:'Departure plaque',x:5,y:3},{id:'vex',name:'Vex, rival crawler',x:5,y:5},{id:'whetstone',name:'Vex’s sharpening kit',x:8,y:6,owner:'vex'}]
];
export function fresh(){return {version:2,room:0,x:3,y:5,places:startingPlaces(),conditions:{},hp:30,maxHp:30,xp:0,pending:0,race:"human",class:"crawler",classOffered:false,deeds:Object.fromEntries(DEEDS.map(deed=>[deed,0])),potions:2,gold:0,cheese:0,key:false,weapon:0,stolen:{},party:[],allies:{},level:1,abilities:{...STARTING_ABILITIES},skills:[...STARTING_SKILLS],saves:[...STARTING_SAVES],items:{bandages:1,repairKits:0,smokeBombs:0,whetstones:0},flags:{},achievements:[],boxes:{bronze:0,silver:0,gold:0},gear:[],equipped:emptyEquipped(),standing:Object.fromEntries(Object.keys(NPCS).map(id=>[id,'neutral'])),companions:{mara:blankCompanion('mara')},factionGifts:{survivors:false,ratmen:false},factions:{survivors:'neutral',ratmen:'neutral'},quests:{supplies:'open',carried:false,promised:null},npcs:Object.fromEntries(Object.keys(NPCS).map(id=>[id,makeNPC(id)])),combat:null,dead:false,complete:false,logSerial:1,log:['ANNEX: “Welcome to Probation. Three other survivors, one exit. Please resolve your differences where the cameras can see.” A bandage and two potions are in your pack.']};}
export function say(s,text){s.log.push(text);s.log=s.log.slice(-60);s.logSerial++;}
export function award(s,id){if(s.achievements.includes(id))return;s.achievements.push(id);
 const entry=ACHIEVEMENTS[id]||{description:'',condition:'',reward:'box',message:'Logged. The dungeon saw that.'};
 if(entry.reward==='box')s.boxes[entry.tier||'bronze']++;
 else if(entry.reward==='xp')awardXp(s,50,`achievement: ${id}`);
 say(s,`NEW ACHIEVEMENT: ${id}. ${entry.message}`);
 awardXp(s,40,`achievement: ${id}`);
 return entry;}
export function achievementFor(id){return ACHIEVEMENTS[id]||null;}
export function blocked(s,x,y){if(x<1||x>11||y<1||y>7)return true;
 if(props[s.room].some(p=>p.x===x&&p.y===y&&!NPCS[p.id]))return true;
 return Object.keys(NPCS).filter(id=>!isWith(s,id)).some(id=>{const place=placeOf(s,id);return place.room===s.room&&place.x===x&&place.y===y;});}
// Where a character is right now. Recruited characters are wherever the player
// is; everyone else stands where they last moved to, saved in s.places.
export function placeOf(s,id){if(isWith(s,id))return {room:s.room,x:s.x,y:s.y};return s.places[id]||{room:NPCS[id].home,x:0,y:0};}
export function roomOf(s,id){return placeOf(s,id).room;}
export function setPlace(s,id,room,x,y){s.places[id]={room,x,y};}
export function startingPlaces(){const places={};for(const room of props)for(const prop of room)if(NPCS[prop.id])places[prop.id]={room:props.indexOf(room),x:prop.x,y:prop.y};return places;}
function normalisePlaces(places){const defaults=startingPlaces(),out={};
 for(const id of Object.keys(defaults)){const place=dictionary(places)?places[id]:null;
  const ok=dictionary(place)&&Number.isInteger(place.room)&&place.room>=0&&place.room<=4&&Number.isInteger(place.x)&&place.x>=1&&place.x<=11&&Number.isInteger(place.y)&&place.y>=1&&place.y<=7;
  out[id]=ok?{room:place.room,x:place.x,y:place.y}:{...defaults[id]};}
 return out;}
function normaliseConditions(table){const out={};if(!dictionary(table))return out;
 for(const [id,entry] of Object.entries(table)){if(id!=='player'&&!NPCS[id])continue;if(!dictionary(entry))continue;const row={};
  for(const [name,rounds] of Object.entries(entry))if(COMBAT_CONDITIONS.includes(name)&&Number.isInteger(rounds)&&rounds>0&&rounds<=9)row[name]=rounds;
  if(Object.keys(row).length)out[id]=row;}
 return out;}
// Recruited characters travel with the player, so they stand beside them in
// whichever room the player is in rather than staying where they were found.
export function roomProps(s){const followers=withPlayer(s).filter(id=>s.npcs[id]?.condition==='conscious');
 const list=props[s.room].filter(p=>!NPCS[p.id]),used=new Set(list.map(p=>p.x+','+p.y));
 for(const id of Object.keys(NPCS)){if(followers.includes(id))continue;const place=placeOf(s,id);
  if(place.room===s.room){used.add(place.x+','+place.y);list.push({id,name:NPCS[id].name,x:place.x,y:place.y,npc:true});}}
 for(const id of followers){const spots=[[s.x+1,s.y],[s.x-1,s.y],[s.x,s.y+1],[s.x,s.y-1],[s.x,s.y]];
  const spot=spots.find(([x,y])=>x>=1&&x<=11&&y>=1&&y<=7&&!blocked(s,x,y)&&!used.has(x+','+y))||[s.x,s.y];
  used.add(spot[0]+','+spot[1]);list.push({id,name:NPCS[id].name,x:spot[0],y:spot[1],follower:true});}
 return list;}
// A world turn: characters act when the player changes room or violence breaks
// out. Nobody walks into the room the player is standing in, which keeps the
// world deterministic and stops bystanders drifting into the player's fights.
function moveTo(s,id,room,say){const from=roomOf(s,id);if(room===from||room<0||room>4||room===s.room)return false;
 setPlace(s,id,room,room<from?10:2,4);
 if(s.room===from||s.room===room)say(s,`${NPCS[id].name} ${room<from?'slips west into':'moves east into'} ${rooms[room]}.`);
 return true;}
function bodyIn(s,room,except){return Object.keys(NPCS).some(id=>id!==except&&roomOf(s,id)===room&&s.npcs[id].condition!=='conscious');}
function awayFromPlayer(s,room){return [room-1,room+1].filter(candidate=>candidate>=0&&candidate<=4&&candidate!==s.room).sort((a,b)=>Math.abs(b-s.room)-Math.abs(a-s.room))[0];}
export function worldTurn(s){for(const id of Object.keys(NPCS)){const n=s.npcs[id];if(n.condition!=='conscious'||isWith(s,id)||s.combat?.enemy===id)continue;const d=NPCS[id],room=roomOf(s,id);
 const fighting=!!s.combat&&s.room===room,noise=!!s.combat&&Math.abs(room-s.room)<=2,body=bodyIn(s,room,id),wounded=n.hp<=Math.ceil(d.hp/3);
 if(body&&!n.memory.sawBody){n.memory.sawBody=true;say(s,`${NPCS[id].name} finds a body in ${rooms[room]} and keeps clear of it.`);}
 const nervous=d.routine==='shelter'||d.routine==='scavenge';
 if(((fighting||wounded)&&nervous)||(body&&d.routine==='shelter')){const away=awayFromPlayer(s,room);if(away!==undefined&&moveTo(s,id,away,say))n.memory.fled=true;continue;}
 if(noise)n.memory.heardViolence=true;
 if(s.room===room)continue;   // they hold still while the player is in the room
 if(d.routine==='shelter'&&noise){const away=awayFromPlayer(s,room);if(away!==undefined)moveTo(s,id,away,say);continue;}
 if(d.routine==='patrol'){if(noise||n.attitude==='hostile')moveTo(s,id,room+Math.sign(s.room-room),say);else moveTo(s,id,d.route[(d.route.indexOf(room)+1)%d.route.length],say);continue;}
 if(d.routine==='scavenge')moveTo(s,id,d.route[(d.route.indexOf(room)+1)%d.route.length],say);}}
export function move(s,dx,dy){if(s.combat||s.dead||s.complete||!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)return false;const x=s.x+dx,y=s.y+dy;
 const exit=y===4&&((x===12&&s.room<4)||(x===0&&s.room>0));
 if(exit){discoverThefts(s,PEOPLE.filter(id=>roomOf(s,id)===s.room),say,award);s.room+=x===12?1:-1;s.x=x===12?1:11;s.y=4;say(s,`Entered ${rooms[s.room]}.`);
  const seen='seen'+s.room;if(!s.flags[seen]){s.flags[seen]=true;awardXp(s,20,`finding ${rooms[s.room]}`);}
  worldTurn(s);return true;}
 if(blocked(s,x,y))return false;s.x=x;s.y=y;return true;
}
export function nearby(s){return roomProps(s).filter(p=>Math.abs(p.x-s.x)+Math.abs(p.y-s.y)<=1);}
function baseActions(s,id){if(s.dead||s.complete||s.combat)return [];if(PEOPLE.includes(id)||s.npcs[id]?.condition!=='conscious'&&s.npcs[id])return npcActions(s,id);
 if(NPCS[id]?.archetype&&id!=='rat')return ['Inspect','Fight',...(s.cheese?['Offer cheese']:[])];
 switch(id){
 case 'fountain':return ['Inspect','Heal'];case 'terminal':return ['Inspect'];
 case 'chest':return ['Inspect',...(s.flags.chest?[]:['Open']),...(questCarried(s)&&questOpen(s)?['Keep the supplies']:[])];case 'crate':return ['Inspect',...(s.flags.crate?[]:['Break'])];
 case 'note':return ['Inspect','Read'];case 'locker':return ['Inspect',...(s.flags.locker?[]:['Open'])];
 case 'rat':return ['Inspect','Talk','Offer cheese','Sneak past','Fight'];
 case 'pipe':return ['Inspect','Search'];
 case 'satchel':return ['Inspect',...(s.flags.satchel?[]:['Open'])];
 case 'whetstone':return ['Inspect',...(s.flags.whetstone?[]:['Take'])];
 case 'stairs':return ['Inspect','Unlock exit'];default:return ['Inspect'];}}
// Taking what belongs to someone else. The owner notices if they are standing
// close enough, and anyone else in range becomes a witness.
export function noticedBy(s,owner){const p=roomProps(s).find(x=>x.id===owner);return !!p&&s.npcs[owner].condition==='conscious'&&Math.abs(p.x-s.x)+Math.abs(p.y-s.y)<=WITNESS_RANGE;}
export function ownedTake(s,id,text,keys){const prop=props[s.room].find(p=>p.id===id),owner=prop.owner;
 for(const key of keys)s.stolen[key]=owner;
 const seer=noticedBy(s,owner),watchers=witnesses(s,owner);
 say(s,`You take ${text} from ${prop.name}.`);
 if(!seer&&!watchers.length){say(s,'Nobody is watching.');return;}
 if(seer)confront(s,owner,say,startCombat);
 recordWitness(s,watchers,'theft',say);}
function startCombat(s,id,intent='lethal'){const n=s.npcs[id];if(n.condition!=='conscious')return;n.memory.betrayed=!!(n.memory.betrayed||n.memory.helped||n.memory.befriended||n.attitude==='friendly');n.memory.attacked=true;n.memory.distracted=false;n.attitude='hostile';if(leaveParty(s,id,say,'was attacked by you')){recordDeed(s,'betrayal');award(s,'Severance Package');}witnessedApproval(s,'betray',id,-25,'you betrayed an ally');if(companionOf(s,id)){const c=companionOf(s,id);c.hostile=true;remember(c,'attacked');c.approval=Math.min(c.approval,-60);say(s,'Mara strongly disapproves.');leaveCompanion(s,id,'you attacked her');}shiftMember(s,id,2,'you attacked them');s.combat={enemy:id,enemies:[id],turn:'player',intent,range:1,cover:{},round:0,used:{}};
 say(s,`${NPCS[id].name} fights back. ${intent==='nonlethal'?'Nonlethal strikes will knock them unconscious.':'Lethal attacks can kill them.'} You can change intent during combat.`);
 const pack=NPCS[id].pack;
 if(pack)for(const other of Object.keys(NPCS)){if(other===id||NPCS[other].pack!==pack||s.npcs[other].condition!=='conscious')continue;if(placeOf(s,other).room!==placeOf(s,id).room)continue;s.combat.enemies.push(other);say(s,`${NPCS[other].name} joins the fight.`);}
 // Friends of a faction you have won over step in while you fight.
 for(const friend of Object.keys(NPCS)){if(friend===id)continue;const faction=factionOf(friend);
  if(!faction||standingOf(s,faction)!=='friendly'||memberStanding(s,friend)!=='friendly')continue;
  if(s.npcs[friend].condition!=='conscious'||(s.allies[friend]||0)>0)continue;
  if(placeOf(s,friend).room!==placeOf(s,id).room)continue;
  s.allies[friend]=1;say(s,`${NPCS[friend].name} steps in on your side.`);}
 witnessed(s,'attack',id);worldTurn(s);}
// A recruited character fights in their own body with their own damage, and a
// temporary ally spends one encounter of their agreement each time combat ends.
function closeCombat(s){if(!s.combat)return;
 if(!s.dead&&s.hp<=Math.ceil(s.maxHp*0.25)){recordDeed(s,'survival');award(s,'Terminal Optimism');}
 if(!s.dead&&s.combat.defeated&&!s.combat.attackUsed)award(s,'Hands Off');
 s.combat=null;s.conditions={};for(const id of Object.keys(s.allies||{})){s.allies[id]-=1;if(s.allies[id]<=0){delete s.allies[id];say(s,`${NPCS[id].name} has done what they promised and steps away. The temporary alliance is over.`);}}}
function allyStrike(s,roll,rng){const enemy=s.combat?.enemy;if(!enemy)return false;const n=s.npcs[enemy],d=NPCS[enemy];
 for(const id of withPlayer(s)){const ally=s.npcs[id];if(ally.condition!=='conscious'||id===enemy)continue;if(companionOf(s,id))continue;const damage=roll(...NPCS[id].damage);n.hp=Math.max(0,n.hp-damage);say(s,`${NPCS[id].name} hits ${d.name} for ${damage}. ${n.hp} HP remain.`);
  if(n.hp===0){const nonlethal=s.combat.intent==='nonlethal';n.condition=nonlethal?'unconscious':'dead';n.memory[nonlethal?'knockedOut':'killed']=true;say(s,`${d.name} is ${nonlethal?"unconscious":"dead"}. Your ally finished it.`);defeated(s,enemy);awardXp(s,NPCS[enemy].xp||20,`defeating ${NPCS[enemy].name}`);closeCombat(s);return true;}}
 return false;}
// Who can see what happens where the player is standing: the same room, close
// enough, conscious, and not the person the event happened to.
export function witnesses(s,targetId){return roomProps(s).filter(p=>NPCS[p.id]&&p.id!==targetId&&s.npcs[p.id]?.condition==='conscious'&&Math.abs(p.x-s.x)+Math.abs(p.y-s.y)<=WITNESS_RANGE).map(p=>p.id);}
export function witnessed(s,event,targetId){return recordWitness(s,witnesses(s,targetId),event,say);}
export function interact(s,id,action,rng=Math.random){if(!nearby(s).some(p=>p.id===id)||!actions(s,id).includes(action))return false;
  if(action==='Promise the supplies'||action==='Hand over the supplies')return questAction(s,id,action);
  if(companionOf(s,id)&&companionAction(s,id,action))return true;
  if(action==='Keep the supplies')return keepSupplies(s);
  if(PEOPLE.includes(id)||s.npcs[id]?.condition!=='conscious'&&s.npcs[id]){const handled=actNPC(s,id,action,{say,award,startCombat,witness:(event,target)=>witnessed(s,event,target),deed:(name)=>recordDeed(s,name),bonus:(kind)=>gearBonus(s,kind),note:(who)=>factionOf(who)?factionLine(s,who):'',standing:(who,steps,reason)=>shiftMember(s,who,steps,reason),approve:(who,delta,reason)=>witnessedApproval(s,'act',who,delta,reason),rng});if(action==='Recruit'&&handled&&s.party.includes(id)&&companionOf(s,id)&&!companionOf(s,id).recruited){companionOf(s,id).recruited=true;say(s,`name is travelling with you now.`);}return handled;}
 if(action==='Inspect'){say(s,s.npcs[id]?describeNPC(s,id)+(factionOf(id)?' '+factionLine(s,id):''):({fountain:'Free full healing. The plaque says “A healthy contestant is a renewable resource.”',terminal:'ANNEX: “The exit requires a key, not a body count.” Tobin scavenges in Lost Property; Mara shelters in The Holdout; Vex waits in Departures. Mara’s locker has a free spare key. Talk, help, deceive, steal, or fight. People remember.',chest:'An abandoned chest. Coins, medical supplies, and something useful for a broken satchel.',crate:'The label says “artisan survival accompaniment.” It smells like cheese committing a crime.',note:'A sponsor memo. Its slogan could support a convincing lie; its safety warning would interest Vex.',locker:'An emergency exit key. Accessible even if every other survivor dies.',pipe:'A loose pipe hides a cache. Tobin may know more.',brazier:'A barrel of burning fuel. Kick it over and something will catch fire.',satchel:'Tobin’s satchel, packed and counted. He watches it the way other people watch doors.',whetstone:'Vex’s whetstone, left within reach. Taking it is a statement.',stairs:'The exit accepts any exit key. No NPC is required to finish.',plaque:'ANNEX: “No exit survey today. Your behavior was the survey.”'}[id]||id));return true;}
 if(id==='fountain'){s.hp=s.maxHp;say(s,'Fully healed. The station bills someone else. Enjoy the novelty.');}
 if(id==='chest'){s.flags.chest=true;s.gold+=6;s.potions++;s.items.repairKits++;s.quests.carried=true;say(s,'Found 6 coins, a potion, and a repair kit. The survivors want this cache; so do the ratmen. Neither knows you have it yet.');}
 if(id==='crate'){s.flags.crate=true;s.cheese++;say(s,'Found pungent cheese. A diplomatic instrument, probably.');}
 if(id==='note'){s.flags.memo=true;say(s,'Memo: “Sponsor slogan: WE KEEP YOU IN THE PICTURE. Beware faulty exit machinery. Tell the crawler by the stairs. Custodian accepts cheese; Mara’s locker holds a spare key.” You can share this information with Vex or quote it in a lie.');}
 if(id==='locker'){s.flags.locker=true;s.key=true;say(s,'You take the emergency spare key. It belongs to the building, not Mara.');}
 if(id==='pipe'){let found=false;for(const who of Object.keys(s.companions)){const mate=companionOf(s,who);if(mate.quest.id!=='locket'||mate.quest.stage!=='searching')continue;mate.quest.stage='found';grantedItem(s,'Sable locket');found=true;say(s,'Wedged behind the pipe: a sable locket on a broken chain. Dell. Mara will want to know.');}if(!s.flags.secret){s.flags.secret=true;s.gold+=4;award(s,'Pipe dream');say(s,'A hidden cache contains 4 coins.');found=true;}if(s.flags.tobinCache&&!s.flags.tobinCacheTaken){s.flags.tobinCacheTaken=true;s.gold+=3;say(s,'Tobin’s tip reveals a second compartment: 3 extra coins. Information can be worth more than pockets.');found=true;}if(!found)say(s,'The cache is empty.');}
 if(id==='satchel'){s.flags.satchel=true;s.gold+=3;s.items.smokeBombs++;ownedTake(s,'satchel','3 coins and a smoke bomb',['gold','smokeBombs']);}
 if(id==='whetstone'){s.flags.whetstone=true;s.items.whetstones++;ownedTake(s,'whetstone','1 whetstone',['whetstones']);}
 if(NPCS[id]?.archetype&&id!=='rat'){if(action==='Fight')startCombat(s,id);
  else if(action==='Offer cheese'){if(!s.cheese){say(s,'You have no cheese. Try the crate in Lost Property.');return true;}
   s.cheese--;shiftMember(s,id,-2,'you paid the cheese tribute');s.npcs[id].attitude='friendly';
   say(s,`${NPCS[id].name} accepts the tribute. The Ratmen file you under “useful”.`);}
  return true;}
 if(id==='rat'){
  if(action==='Talk')say(s,'Ratman: “Cheese tax. Or go around. I am paid neither way.”');
  if(action==='Offer cheese'){if(memberStanding(s,'rat')==='friendly')say(s,'The custodian has already accepted your tribute.');else if(!s.cheese)say(s,'You have no cheese. Try the crate in Lost Property.');else{s.cheese--;s.npcs.rat.attitude='friendly';s.npcs.rat.memory.helped=true;recordDeed(s,'persuasion');partyApproval(s,8,'you talked your way past a problem');shiftMember(s,'rat',-2,'you paid the cheese tribute');award(s,'Cheese diplomacy');say(s,'The ratman accepts. The only honest transaction in the building.');}}
  if(action==="Sneak past"){s.flags.sneaked=true;recordDeed(s,"stealth");partyApproval(s,8,'you avoided a fight');award(s,"Quiet quitting");say(s,'You slip along the wall. The custodian pretends not to see.');awardXp(s,30,'resolving the custodian without a fight');}
  if(action==='Fight')startCombat(s,'rat');
 }
 if(id==='stairs'){if(!s.key)say(s,'Locked. Take the free key from the locker in The Holdout, or obtain Mara’s.');else{s.complete=true;say(s,'The exit opens. ANNEX: “You may leave. Your reputation has already gone ahead.”');}}
 return true;
}
// Public action list: the base actions plus whatever the supply quest adds.
export function actions(s,id){const list=baseActions(s,id);for(const extra of [...questActionFor(s,id),...companionActionsFor(s,id)])if(!list.includes(extra))list.push(extra);return list;}
// What you can do for, with, or to a companion standing in front of you.
export function companionActionsFor(s,id){const companion=companionOf(s,id);if(!companion||!companion.recruited||companion.left)return [];
 const list=[],n=s.npcs[id];
 if(n.condition==='unconscious'&&(s.items.bandages>0||s.potions>0))list.push('Tend to her wounds');
 if(n.condition==='conscious'){
  if(isSafeRoom(s)&&!s.combat)list.push('Check in with her');
  if(s.items.bandages>0)list.push('Give her a bandage');
  if(s.potions>0)list.push('Give her a potion');
  if(n.inventory.bandages>0)list.push('Ask for a bandage back');
  if(companion.gear.length&&bandFor(companion.approval).key!=='hostile'&&bandFor(companion.approval).key!=='resentful')list.push('Take back her spare gear');
  for(const name of s.gear.slice(0,2))list.push('Give her '+name);
  if(companion.quest.stage==='found')list.push('Give her the locket','Keep the locket','Lie about the locket');}
 return list;}
export function attackRange(s){const bonus=s.weapon+(s.flags.vexTraining?1:0)+classBonus(s)+gearBonus(s,'damage');return [5+bonus,7+bonus];}
export function classBonus(s){return s.class==='bruiser'?2:0;}
// Levelling. XP comes from fights, discoveries, peaceful resolutions and
// achievements; each level adds max HP and one stat increase to spend.
export const XP_PER_LEVEL=100;
// Races and classes. Humans are the only race in this build; the class event
// reads what the player actually did and offers the paths that fit.
export const RACES={human:{name:'Human',description:'Adaptable, unremarkable, and still breathing.',primary:'charisma',passive:'Adaptable: +2 on saving throws.'}};
// Achievements carry their own Dungeon AI line. Rewards are a loot box, bonus
// XP, or nothing but the memory.
export const ACHIEVEMENTS={
 'First Blood':{description:'Defeat your first crawler.',condition:'Win any fight.',reward:'box',tier:'bronze',message:'Someone had to go first. It was not you. Statistically, that is a win.'},
 'Occupational Hazard':{description:'Finish someone with fire or blood loss.',condition:'Kill an enemy with burning or bleeding.',reward:'box',tier:'silver',message:'You shoved a Ratman into a fire. Congratulations on your exciting new career in workplace safety.'},
 'Hands Off':{description:'Win a fight without a normal attack.',condition:'Win without using Attack.',reward:'xp',message:'You won without swinging properly. Filed under interpretive dance.'},
 'Terminal Optimism':{description:'Win a fight at death’s door.',condition:'Survive a fight at a quarter health or less.',reward:'box',tier:'gold',message:'Held together by adrenaline and poor decisions. Management is impressed. Management is also concerned.'},
 'Five-Finger Discount':{description:'Steal something successfully.',condition:'Pick a pocket or rob someone without being caught.',reward:'xp',message:'Property is a social construct. So is trust, and you just deleted both.'},
 'Sticky Fingers':{description:'Get caught stealing.',condition:'Be caught picking a pocket, or have a theft discovered.',reward:'none',message:'You reached for something and found consequences instead. Fascinating.'},
 'Severance Package':{description:'Betray someone who trusted you.',condition:'Attack, rob or loot a recruited ally.',reward:'none',message:'They trusted you. You have chosen a different retirement plan. Yours.'},
 'Pack Tactics':{description:'Beat two enemies in one fight.',condition:'Defeat two or more enemies in a single fight.',reward:'box',tier:'gold',message:'Two against one, and you still won. The dungeon suggests you stop while the odds look like that.'},
 'Cheese diplomacy':{description:'Pay the custodian in cheese.',condition:'Offer the ratman cheese.',reward:'box',tier:'bronze',message:'You bribed a civil servant with dairy. That is how the building works. You are learning.'},
 'Quiet quitting':{description:'Slip past a problem.',condition:'Sneak past the ratman.',reward:'box',tier:'bronze',message:'You avoided a fight by walking quietly. Your performance review notes “technically employed”.'},
 'Pipe dream':{description:'Find a hidden cache.',condition:'Search the loose pipe.',reward:'box',tier:'bronze',message:'Hidden coins behind a pipe. Inspirational. Send a postcard from your retirement.'},
 'People person':{description:'Make a friend in the dungeon.',condition:'Befriend a survivor.',reward:'box',tier:'silver',message:'You made a friend. In here. Adorable. Try not to outlive them.'},
 'Mutual inventory':{description:'Earn a scavenger’s trust.',condition:'Befriend Tobin.',reward:'box',tier:'silver',message:'Tobin likes you now. He has a strange way of showing it, involving assets and dividends.'},
 'Worthy rival':{description:'Earn a rival’s respect.',condition:'Befriend Vex.',reward:'box',tier:'silver',message:'Vex respects you. That is not friendship, it is a future grievance with better posture.'}
};
// Reward boxes. They only open in a safe room, and each tier rolls on its own
// table. Every entry carries its own Dungeon AI line.
export const BOX_TIERS=['bronze','silver','gold'];
export const SAFE_ROOMS=[0];
export function isSafeRoom(s){return SAFE_ROOMS.includes(s.room);}
// Item catalogue. Every item carries its rarity, type, description, stat
// effects and an optional special trait the engine knows how to run.
export const RARITIES=['common','uncommon','rare','epic'];
export const ITEMS={
 'Bandage roll':{rarity:'common',type:'consumable',description:'Cloth and hope.',effects:{},trait:null},
 'Healing potion':{rarity:'common',type:'consumable',description:'Tastes like a decision you already regret.',effects:{},trait:null},
 'Pungent cheese':{rarity:'common',type:'consumable',description:'Technically food.',effects:{},trait:null},
 'Whetstone':{rarity:'common',type:'tool',description:'Sharpens what you already have.',effects:{damage:1},trait:null},
 'Ratfang Shiv':{rarity:'uncommon',type:'weapon',description:'A tooth with ambitions.',effects:{damage:1},trait:'wounded',traitName:'Fang Point',traitText:'+1 to attack rolls against wounded enemies.'},
 'Lucky charm':{rarity:'uncommon',type:'accessory',description:'Somebody else’s good fortune, repurposed.',effects:{checks:1},trait:null,traitName:null,traitText:null},
 'Sewer Saint Medal':{rarity:'rare',type:'accessory',description:'Blessed by a committee of rats.',effects:{checks:1,wisdom:1},trait:'poisonward',traitName:'Sewer Blessing',traitText:'+1 to saving throws against poison, and +1 Wisdom.'},
 'Last Laugh Boots':{rarity:'rare',type:'armor',description:'Sturdy, and slightly disappointed in you.',effects:{},trait:'lastlaugh',traitName:'Second Wind',traitText:'When damage leaves you below 20% HP, gain a temporary movement bonus.'},
 'Iron signet':{rarity:'rare',type:'accessory',description:'Heavy, official, and entirely self-issued.',effects:{damage:1},trait:null,traitName:null,traitText:null},
 'Improviser’s Grip':{rarity:'epic',type:'accessory',description:'A strap for people who fight with furniture.',effects:{},trait:'improviser',traitName:'Makeshift Artillery',traitText:'Thrown objects deal +2 damage.'}
 ,'Sable locket':{rarity:'rare',type:'accessory',description:'Dell’s locket, scratched from a lot of waiting.',effects:{checks:1},trait:'keepsake',traitName:'Keepsake',traitText:'+1 on every check, while you are the one carrying it.'}
};
export const SLOTS=['weapon','armor','accessory'];
// Two factions, one contested cache of supplies.
export const FACTIONS={
 survivors:{name:'Survivors',members:['mara','tobin','vex'],leader:'mara'},
 ratmen:{name:'Ratmen',members:['rat','skulker','brute'],leader:'rat'}
};
export const STANDING=['friendly','neutral','suspicious','hostile'];
export function factionOf(id){return Object.keys(FACTIONS).find(name=>FACTIONS[name].members.includes(id))||null;}
export function factionMembers(faction){return FACTIONS[faction]?.members||[];}
// Standing is kept per person. A faction's standing is what its members think
// on average, so one grudge colours the group without owning it.
export function memberStanding(s,id){return s.standing[id]||'neutral';}
export function standingOf(s,faction){return s.factions[faction]||'neutral';}
function clamp(index){return Math.max(0,Math.min(3,index));}
function refreshFaction(s,faction){const members=factionMembers(faction);if(!members.length)return;
 const total=members.reduce((sum,id)=>sum+STANDING.indexOf(memberStanding(s,id)),0);
 s.factions[faction]=STANDING[clamp(Math.round(total/members.length))];
 if(standingOf(s,faction)==='friendly'&&!s.factionGifts?.[faction])grantFactionGift(s,faction);}
function grantFactionGift(s,faction){s.factionGifts=s.factionGifts||{};if(s.factionGifts[faction])return false;
 s.factionGifts[faction]=true;
 if(faction==='survivors'){s.boxes.silver++;s.potions+=2;say(s,'The Survivors share what they have: two potions and a silver box.');}
 else{s.boxes.bronze++;s.items.smokeBombs+=2;s.gold+=5;say(s,'The Ratmen leave a tribute where you will find it: a bronze box, two smoke bombs and five coins.');}
 awardXp(s,30,`the ${FACTIONS[faction].name} trust you`);return true;}
export function shiftMember(s,id,steps,reason){if(!NPCS[id])return memberStanding(s,id);
 const from=STANDING.indexOf(memberStanding(s,id)),to=clamp(from+steps);
 if(to===from)return memberStanding(s,id);
 s.standing[id]=STANDING[to];
 const faction=factionOf(id);if(faction)refreshFaction(s,faction);
 say(s,`${NPCS[id].name} is ${s.standing[id]} of you${reason?`: ${reason}`:''}.${faction?` The ${FACTIONS[faction].name} overall: ${standingOf(s,faction)}.`:''}`);
 return s.standing[id];}
function shiftFaction(s,faction,steps,reason){if(!FACTIONS[faction])return null;
 for(const id of factionMembers(faction))shiftMember(s,id,steps,reason);
 refreshFaction(s,faction);return standingOf(s,faction);}
export function improveStanding(s,faction,steps=1,reason=''){return shiftFaction(s,faction,-steps,reason);}
export function worsenStanding(s,faction,steps=1,reason=''){return shiftFaction(s,faction,steps,reason);}
// Attitude is the person's mood right now; standing is what the organisation
// thinks. Quests move both, but a witnessed robbery can sour a mood alone.
export function shiftAttitude(s,id,steps){const n=s.npcs[id];if(!n||n.attitude==='dead')return;
 const from=STANDING.indexOf(n.attitude),to=clamp(from+steps);if(to!==from)n.attitude=STANDING[to];}
export function questState(s){return s.quests.supplies;}
// Companions: approval moves quietly, and only loud events get a line.
export function approvalEffect(s,id,delta,reason){const companion=companionOf(s,id);if(!companion)return null;
 if(!companion.recruited&&!companion.separated)return null;
 const result=adjustApproval(s,id,delta,reason);
 if(result.moved&&result.reaction)say(s,result.reaction);
 if(result.moved&&Math.abs(delta)>=20){remember(companion,delta<0?'betrayed':'impressed');say(s,reactionLine(companion));}
 if(companion.approval<=-60&&!companion.left)leaveCompanion(s,id,'she has had enough of your decisions');
 return result;}
export function witnessedApproval(s,event,targetId,delta,reason){const seen=witnesses(s,targetId).filter(id=>companionOf(s,id));
 for(const id of seen)approvalEffect(s,id,delta,reason);return seen;}
export function partyApproval(s,delta,reason){for(const id of Object.keys(s.companions))if(s.companions[id].recruited||s.companions[id].separated)approvalEffect(s,id,delta,reason);}
export function leaveCompanion(s,id,reason){const companion=companionOf(s,id);if(!companion||companion.left)return false;
 companion.left=true;companion.recruited=false;companion.separated=false;
 s.party=(s.party||[]).filter(member=>member!==id);if(s.allies)delete s.allies[id];
 say(s,`${NPCS[id].name} leaves the party: ${reason}. She keeps everything she is carrying.`);return true;}
export function relationshipOf(s,id){const companion=companionOf(s,id);return companion?relationshipText(companion):'';}
// Everything the player can do with a companion who is standing in front of
// them: talk, patch up, share supplies, hand over gear, settle her locket.
export function companionAction(s,id,action){const companion=companionOf(s,id);if(!companion)return false;
 const band=bandFor(companion.approval).key,cold=band==='hostile'||band==='resentful';
 if(action==='Check in with her'){const talk=conversationFor(s,id);if(!talk)return false;
  if(talk.key==='talked1')remember(companion,'talked1');
  else if(talk.key==='talked2')remember(companion,'talked2');
  else if(talk.key==='quest')companion.quest.stage='searching';
  say(s,talk.line);return true;}
 if(action==='Tend to her wounds'){const bandage=s.items.bandages>0;if(bandage)s.items.bandages--;else s.potions--;
  s.npcs[id].condition='conscious';s.npcs[id].hp=Math.max(1,Math.ceil(NPCS[id].hp/2));
  remember(companion,'savedMe');approvalEffect(s,id,25,'you patched her up');
  say(s,`You patch Mara up with a ${bandage?'bandage':'potion'}. She is upright again at ${s.npcs[id].hp} HP.`);return true;}
 if(action==='Give her a bandage'||action==='Give her a potion'){const key=action.endsWith('bandage')?'bandages':'potions';
  if(key==='bandages')s.items.bandages--;else s.potions--;
  s.npcs[id].inventory[key]=(s.npcs[id].inventory[key]||0)+1;remember(companion,'sharedLoot');
  approvalEffect(s,id,6,'you shared supplies');say(s,`You hand Mara a ${key==='bandages'?'bandage':'potion'}. She stows it without a speech.`);return true;}
 if(action==='Ask for a bandage back'){if(cold){(approvalEffect(s,id,-4,'you pushed your luck'));say(s,'Mara: “No.”');return true;}
  s.npcs[id].inventory.bandages--;s.items.bandages++;say(s,'Mara hands over a bandage with a look that says she is counting.');return true;}
 if(action.startsWith('Give her ')&&itemOf(action.slice(9))){const name=action.slice(9);if(!s.gear.includes(name))return false;
  s.gear=s.gear.filter(item=>item!==name);const slot=itemSlot(name);
  if(slot&&!companion.equipped[slot]){companion.equipped[slot]=name;say(s,`Mara equips ${name} (${rarityOf(name)}).`);}
  else companion.gear.push(name);
  remember(companion,'sharedLoot');approvalEffect(s,id,6,'you shared gear');return true;}
 if(action==='Take back her spare gear'){const name=companion.gear[0];if(!name||cold)return false;
  companion.gear=companion.gear.filter(item=>item!==name);s.gear.push(name);say(s,`You take back ${name}. Mara does not object.`);return true;}
 if(action==='Give her the locket'){const has=s.gear.includes('Sable locket')||Object.values(s.equipped).includes('Sable locket');
  if(!has)return false;s.gear=s.gear.filter(item=>item!=='Sable locket');
  for(const slot of SLOTS)if(s.equipped[slot]==='Sable locket')s.equipped[slot]=null;
  companion.gear.push('Sable locket');companion.equipped.accessory=companion.equipped.accessory||'Sable locket';
  if(companion.equipped.accessory==='Sable locket')companion.gear=companion.gear.filter(item=>item!=='Sable locket');
  companion.quest.outcome='returned';remember(companion,'questHelped');remember(companion,'sharedLoot');
  approvalEffect(s,id,25,'you gave her back the locket');
  say(s,'Mara takes the locket and holds it a moment longer than she needs to. “Thank you. That is all I am going to say about it.”');return true;}
 if(action==='Keep the locket'){companion.quest.outcome='kept';remember(companion,'questRefused');
  approvalEffect(s,id,-15,'you kept what she asked for');
  say(s,'Mara watches you pocket the locket. “Right. Noted.”');return true;}
 if(action==='Lie about the locket'){companion.quest.outcome='lied';remember(companion,'lied');remember(companion,'questRefused');
  approvalEffect(s,id,-10,'you lied about the locket');
  say(s,'You tell Mara the pipe was empty. She nods slowly, the way people do when they are deciding whether to believe you.');return true;}
 return false;}
export function factionLine(s,id){const faction=factionOf(id);if(!faction)return '';
 return `${NPCS[id].name} is ${memberStanding(s,id)} of you. The ${FACTIONS[faction].name} overall: ${standingOf(s,faction)}.`;}
export function questOpen(s){return s.quests.supplies==='open';}
export function questCarried(s){return !!s.quests.carried;}
export function questActionFor(s,id){if(s.npcs[id]?.condition!=='conscious')return [];if(id!==FACTIONS.survivors.leader&&id!==FACTIONS.ratmen.leader)return [];
 const faction=factionOf(id);if(!faction||standingOf(s,faction)==='hostile')return [];
 if(!questOpen(s))return [];
 return questCarried(s)?['Hand over the supplies']:['Promise the supplies'];}
// Resolving the supply quest with whoever is standing in front of you.
export function questAction(s,id,action){const faction=factionOf(id),quest=s.quests,other=faction==='survivors'?'ratmen':faction==='ratmen'?'survivors':null;
 if(!faction||!questOpen(s))return false;
 if(action==='Promise the supplies'){quest.promised=faction;improveStanding(s,faction,1,'you promised them the supplies');shiftAttitude(s,id,-1);
  say(s,`${NPCS[id].name} takes your word for it. The supplies are still out there.`);return true;}
 if(action==='Hand over the supplies'&&quest.carried){quest.carried=false;quest.supplies=faction;
  improveStanding(s,faction,1,'the supplies were delivered');worsenStanding(s,other,1,'the supplies went to the other side');shiftAttitude(s,id,-1);
  const betrayed=quest.promised&&quest.promised!==faction?quest.promised:null;
  if(betrayed){worsenStanding(s,betrayed,2,'you broke your word');
   for(const member of factionMembers(betrayed)){s.npcs[member].memory.lied=true;shiftAttitude(s,member,1);}
   say(s,`The ${FACTIONS[betrayed].name} find out where the supplies went. That is remembered.`);}
 if(faction==='survivors'){s.potions+=2;s.items.bandages++;awardXp(s,40,'supplies delivered to the survivors');partyApproval(s,10,'you gave the cache to the survivors');say(s,'Mara divides the cache and hands you the surplus. She counts it twice, then stops pretending.');}
  else{s.gold+=15;s.items.smokeBombs++;awardXp(s,40,'supplies delivered to the ratmen');partyApproval(s,-10,'you gave the survivors’ cache to the ratmen');say(s,'The ratmen drag the cache into the dark and pay you in the only currency they keep.');}
  return true;}
 return false;}
export function keepSupplies(s){const quest=s.quests;if(!questOpen(s)||!quest.carried)return false;
 quest.carried=false;quest.supplies='kept';
 worsenStanding(s,'survivors',2,'you kept the cache for yourself');worsenStanding(s,'ratmen',2,'you kept what they were owed');
 for(const faction of Object.keys(FACTIONS))for(const member of factionMembers(faction))shiftAttitude(s,member,1);
 say(s,'You keep the supplies. Both sides notice. Neither side is pleased.');
 awardXp(s,30,'keeping the supplies');return true;}
export function itemSlot(name){const type=ITEMS[name]?.type;return SLOTS.includes(type)?type:null;}
export function equippedItems(s){return SLOTS.map(slot=>s.equipped[slot]).filter(Boolean);}
export function emptyEquipped(){return {weapon:null,armor:null,accessory:null};}
export function itemOf(name){return ITEMS[name]||null;}
export function rarityOf(name){return ITEMS[name]?.rarity||'common';}
export function itemEffects(s,key){return equippedItems(s).reduce((total,name)=>total+(ITEMS[name]?.effects?.[key]||0),0);}
export function traitOf(s,name){return equippedItems(s).some(item=>ITEMS[item]?.trait===name);}
export function abilityBonus(s,ability){return equippedItems(s).reduce((total,name)=>total+(ITEMS[name]?.effects?.[ability]||0),0);}
export function owned(name){return ITEMS[name]||null;}
// Three slots, one item each. Swapping sends the old piece back to the pack.
export function equipItem(s,name){const slot=itemSlot(name);
 if(!ITEMS[name]||!slot||!s.gear.includes(name))return false;
 const replaced=s.equipped[slot];
 if(replaced&&!s.gear.includes(replaced))s.gear.push(replaced);
 s.gear=s.gear.filter(item=>item!==name);s.equipped[slot]=name;
 const trait=ITEMS[name].traitName?` Trait ${ITEMS[name].traitName}: ${ITEMS[name].traitText}`:'';
 say(s,`Equipped ${name} (${ITEMS[name].rarity}, ${slot}).${trait}${replaced?` ${replaced} returns to your pack.`:''}`);return true;}
export function unequipItem(s,name){const slot=itemSlot(name);
 if(!slot||s.equipped[slot]!==name)return false;
 s.equipped[slot]=null;if(!s.gear.includes(name))s.gear.push(name);
 say(s,`Stowed ${name}. Its bonus no longer applies.`);return true;}
export function grantedItem(s,name,silent){if(!ITEMS[name])return false;
 if(!s.gear.includes(name)&&!equippedItems(s).includes(name))s.gear.push(name);
 if(!silent)say(s,`${ITEMS[name].rarity} item: ${name}.${ITEMS[name].traitName?` Trait ${ITEMS[name].traitName}: ${ITEMS[name].traitText}`:` ${ITEMS[name].description}`}`);
 return true;}
export const BOX_LOOT={
 bronze:[
  {weight:3,rarity:'common',text:'Bandage',message:'A bandage. Planning ahead for another terrible decision?',apply:s=>{s.items.bandages++;}},
  {weight:3,rarity:'common',text:'Healing potion',message:'A healing potion. Optimism in a bottle.',apply:s=>{s.potions++;}},
  {weight:2,rarity:'common',text:'Cheese',message:'Food. It is cheese. Try not to think about where it has been.',apply:s=>{s.cheese++;}},
  {weight:2,rarity:'common',text:'20 XP',message:'Twenty experience points. Barely a rounding error, and you earned every one.',apply:s=>awardXp(s,20,'a bronze box')},
  {weight:2,rarity:'common',text:'Whetstone',message:'A basic weapon upgrade. The dungeon is impressed by your standards. It is not.',apply:s=>{s.items.whetstones++;}},
  {weight:1,item:'Ratfang Shiv',message:'An uncommon shiv. Proof that you will pick up anything with a point on it.',apply:s=>grantedItem(s,'Ratfang Shiv',true)},
 ],
 silver:[
  {weight:3,item:'Ratfang Shiv',message:'Another Ratfang Shiv. Collect the set.',apply:s=>grantedItem(s,'Ratfang Shiv',true)},
  {weight:3,item:'Lucky charm',message:'Lucky charm acquired. Finally, a strategy.',apply:s=>grantedItem(s,'Lucky charm',true)},
  {weight:3,rarity:'uncommon',text:'Field kit',message:'Useful consumables. Now you can be reckless with a budget.',apply:s=>{s.potions+=2;s.items.smokeBombs++;}},
  {weight:2,rarity:'uncommon',text:'60 XP',message:'Sixty experience points. Try to spend them somewhere less fatal.',apply:s=>awardXp(s,60,'a silver box')},
  {weight:2,item:'Sewer Saint Medal',message:'A rare medal. Blessed by rats, which is still technically a blessing.',apply:s=>grantedItem(s,'Sewer Saint Medal',true)},
  {weight:2,item:'Last Laugh Boots',message:'Rare boots. Pants with armor. Civilization has peaked.',apply:s=>grantedItem(s,'Last Laugh Boots',true)}
 ],
 gold:[
  {weight:3,item:'Iron signet',message:'A rare accessory. It does nothing visible and everything quietly.',apply:s=>grantedItem(s,'Iron signet',true)},
  {weight:3,item:'Sewer Saint Medal',message:'A rare medal, again. Sanctity is cheap this deep down.',apply:s=>grantedItem(s,'Sewer Saint Medal',true)},
  {weight:3,rarity:'rare',text:'150 XP',message:'A large pile of experience. Statistically, you have survived more of the building than most.',apply:s=>awardXp(s,150,'a gold box')},
  {weight:2,rarity:'rare',text:'Sponsor parcel',message:'A special delivery from a sponsor who has not read your file.',apply:s=>{s.gold+=25;s.potions+=2;s.items.repairKits++;}},
  {weight:2,rarity:'rare',text:'Training token',message:'A class-related token. Somebody believes in you. That must be exhausting.',apply:s=>{s.pending=(s.pending||0)+1;}},
  {weight:1,item:'Improviser’s Grip',message:'An epic grip. Everything in this room is now ammunition.',apply:s=>grantedItem(s,'Improviser’s Grip',true)}
 ]
};
export const CLASSES={
 bruiser:{name:'Bruiser',description:'You solve rooms the direct way.',primary:'strength',passive:'Heavy hands: +2 melee damage.',active:'Cleave',deeds:['melee','environment']},
 rogue:{name:'Rogue',description:'You take what you want and leave quietly.',primary:'dexterity',passive:'Light fingers: +2 on stealth and sleight of hand checks.',active:'Backstab',deeds:['stealth','theft','ranged']},
 trapper:{name:'Trapper',description:'You let the room do the work.',primary:'intelligence',passive:'Improviser: advantage when shoving or grappling.',active:'Snare',deeds:['fire','environment']},
 warden:{name:'Warden',description:'You keep other people alive.',primary:'wisdom',passive:'Steady: +5 maximum HP.',active:'Rally',deeds:['help','recruit','persuasion']},
 warlord:{name:'Warlord',description:'You make refusing you expensive.',primary:'charisma',passive:'Dread: +2 on Charisma checks.',active:'Terrify',deeds:['intimidation','betrayal']}
};
export const DEEDS=['melee','ranged','stealth','theft','persuasion','intimidation','help','betrayal','environment','fire','survival','explore','recruit'];
export function recordDeed(s,deed,times=1){if(!DEEDS.includes(deed))return;s.deeds[deed]=(s.deeds[deed]||0)+times;}
export function totalDeeds(s){return DEEDS.reduce((total,deed)=>total+(s.deeds[deed]||0),0);}
export function classScore(s,id){return CLASSES[id].deeds.reduce((total,deed)=>total+(s.deeds[deed]||0),0);}
export function classOptions(s){const ranked=Object.keys(CLASSES).sort((a,b)=>classScore(s,b)-classScore(s,a));
 const chosen=ranked.filter(id=>classScore(s,id)>0).slice(0,3);
 for(const id of ranked)if(chosen.length<3&&!chosen.includes(id))chosen.push(id);
 return chosen;}
export function classReady(s){return s.race==='human'&&s.class==='crawler'&&!s.classOffered&&totalDeeds(s)>=6;}
export function classPassive(s){return CLASSES[s.class]||null;}
export function skillBonus(s,skill){const name=String(skill||'').toLowerCase();
 if(s.class==='rogue'&&(name==='stealth'||name==='sleight of hand'))return 2;
 if(s.class==='warlord'&&(name==='intimidation'||name==='persuasion'))return 2;
 return 0;}
export function activeAbility(s){const entry=CLASSES[s.class];return entry?entry.active:null;}
export function abilityReady(s){const active=activeAbility(s);return !!active&&!!s.combat&&!s.combat.used?.[active];}
export function chooseClass(s,id){if(!CLASSES[id]||s.class!=='crawler')return false;
 s.class=id;s.classOffered=true;
 if(s.class==='warden'){s.maxHp+=5;s.hp=Math.min(s.maxHp,s.hp+5);}
 say(s,`${CLASSES[id].name}: ${CLASSES[id].description} ${CLASSES[id].passive} Active ability: ${CLASSES[id].active}.`);return true;}
export function chooseRace(s,id){if(!RACES[id]||s.race!=='human')return false;s.race=id;say(s,`You are ${RACES[id].name}. ${RACES[id].passive}`);return true;}
export function xpForNext(level){return XP_PER_LEVEL*level;}
export function awardXp(s,amount,reason){if(amount<=0)return 0;s.xp+=amount;const gained=amount;say(s,`${gained} XP: ${reason}.`);
 let levelled=0;
 while(s.xp>=xpForNext(s.level)&&s.level<20){s.level++;s.pending=(s.pending||0)+1;s.maxHp+=5;s.hp=Math.min(s.maxHp,s.hp+5);levelled++;
  say(s,`Level ${s.level}. Maximum HP is now ${s.maxHp}. Choose one ability increase.`);}
 return levelled;}
export function chooseStat(s,ability){const name=String(ability).toLowerCase();if(!ABILITIES.includes(name))return false;
 if(!(s.pending>0))return false;s.abilities[name]++;s.pending--;say(s,`${name} is now ${s.abilities[name]}. Your checks use it immediately.`);return true;}
// Combat conditions. Each one has a duration in rounds, ticks down at the end
// of a round, and clears when the fight ends.
export const COMBAT_CONDITIONS=['prone','stunned','poisoned','burning','bleeding','grappled'];
export const CONDITION_TEXT={prone:'prone',stunned:'stunned',poisoned:'poisoned',burning:'burning',bleeding:'bleeding',grappled:'grappled'};
export function conditionsOf(s,id='player'){return s.conditions[id]||{};}
export function hasCondition(s,id,name){return (conditionsOf(s,id)[name]||0)>0;}
export function conditionText(s,id){const table=conditionsOf(s,id);return Object.keys(table).filter(name=>table[name]>0).map(name=>CONDITION_TEXT[name]).join(', ');}
export function applyCondition(s,id,name,rounds,say){if(!COMBAT_CONDITIONS.includes(name))return false;const table=s.conditions[id]=s.conditions[id]||{};
 table[name]=Math.max(table[name]||0,rounds);say(s,`${id==='player'?'You are':`${NPCS[id].name} is`} ${CONDITION_TEXT[name]}.`);return true;}
export function clearCondition(s,id,name,say){const table=s.conditions[id];if(!table)return false;const was=table[name]>0;delete table[name];
 if(was&&say)say(s,`${id==='player'?'You are':`${NPCS[id].name} is`} no longer ${CONDITION_TEXT[name]}.`);return was;}
function clearConditions(s,id){if(s.conditions[id])delete s.conditions[id];}
function damageRoll(roll,range,mode){if(mode==='none')return roll(...range);const first=roll(...range),second=roll(...range);return mode==='advantage'?Math.max(first,second):Math.min(first,second);}
function defeated(s,id){if(s.combat){s.combat.defeated=true;s.combat.kills=(s.combat.kills||0)+1;if(s.combat.kills>=2)award(s,'Pack Tactics');}shiftMember(s,id,2,'you killed them');worsenStanding(s,factionOf(id),2,'one of them was killed');award(s,'First Blood');}
function hurt(s,id,damage,say,cause){if(id==='player'){s.hp=Math.max(0,s.hp-damage);say(s,`You take ${damage}. ${s.hp} HP remain.`);if(s.hp===0){s.dead=true;s.combat=null;say(s,'ANNEX: “Your final performance was briefly sufficient.”');}return;}
 const n=s.npcs[id];n.hp=Math.max(0,n.hp-damage);say(s,`${NPCS[id].name} takes ${damage}. ${n.hp} HP remain.`);
 if(n.hp===0){const nonlethal=s.combat?.intent==='nonlethal';n.condition=nonlethal?'unconscious':'dead';n.memory[nonlethal?'knockedOut':'killed']=true;say(s,`${NPCS[id].name} is ${nonlethal?'unconscious':'dead'}.`);if(cause)recordDeed(s,cause);if(cause==='environment')award(s,'Occupational Hazard');awardXp(s,NPCS[id].xp||20,`defeating ${NPCS[id].name}`);defeated(s,id);closeCombat(s);}}
function tickConditions(s,say){for(const id of ['player',...Object.keys(NPCS)]){const table=s.conditions[id];if(!table)continue;
 if(table.burning>0)hurt(s,id,2,say,'environment');
 if(table.bleeding>0)hurt(s,id,1,say,'environment');
 if(!s.combat)break;   // a death ends the fight before the rest of the tick
 for(const name of Object.keys(table)){table[name]-=1;if(table[name]<=0)delete table[name];}
 if(!Object.keys(table).length)delete s.conditions[id];}}
// Secondary actions sit behind a disclosure in the dock so the common loop
// stays three taps deep. The core is whatever is left.
export const SECONDARY_ACTIONS=['Shove','Grapple','Switch to nonlethal','Switch to lethal','Smoke bomb','Tip the brazier','Flee','Switch target','Throw a rock','Cleave','Backstab','Snare','Rally','Terrify'];
export const ARCHETYPE_RULES={scrapper:{speed:2,rush:true,shoves:true},skulker:{speed:2,thrown:[2,4],cover:true,fleesAt:0.35},brute:{speed:1,grapple:true,shoves:true}};
function actorOf(d){return {name:d.name,level:1,abilities:d.abilities,skills:d.skills||[],saves:d.saves||[]};}
function playerDC(s){return 10+modifier(s.abilities.strength)+(s.skills.includes('athletics')?proficiencyBonus(s.level):0);}
export function hazardNear(s,id){const place=placeOf(s,id);return props[place.room].some(prop=>prop.hazard&&Math.abs(prop.x-place.x)+Math.abs(prop.y-place.y)<=1);}
export function playerNearHazard(s){return props[s.room].some(prop=>prop.hazard&&Math.abs(prop.x-s.x)+Math.abs(prop.y-s.y)<=1);}
export function coverNear(s,id){const place=placeOf(s,id);return props[place.room].some(prop=>!NPCS[prop.id]&&!prop.hazard&&Math.abs(prop.x-place.x)+Math.abs(prop.y-place.y)<=1);}
function dropEnemy(s,id){s.combat.enemies=s.combat.enemies.filter(enemy=>enemy!==id);
 if(s.combat.enemy===id){const next=s.combat.enemies.find(enemy=>s.npcs[enemy].condition==='conscious');if(next)s.combat.enemy=next;}
 if(!s.combat.enemies.some(enemy=>s.npcs[enemy].condition==='conscious'))closeCombat(s);}
export function combatActions(s){if(!s.combat)return [];
 if(s.combat.pendingCompanion){const who=NPCS[s.combat.pendingCompanion].name;
  return [`${who}: Strike`,`${who}: Finish the wounded`,`${who}: Cover`,`${who}: Bandage you`,`${who}: Hold`];}
 const id=s.combat.enemy,table=conditionsOf(s,'player');
 if(table.stunned>0)return ['Shake it off'];   // a stunned crawler can only clear their head
 const move=s.combat.range>1?['Close in']:['Back off'];
 const stance=['Attack','Defend','Use potion',...move];
 const targets=s.combat.enemies.filter(enemy=>s.npcs[enemy].condition==='conscious').length>1?['Switch target']:[];
 const free=table.grappled>0?[]:['Flee','Smoke bomb'];
 const fix=table.grappled>0?['Break free']:table.burning>0?['Pat out flames']:table.bleeding>0?['Treat bleeding']:['Shove','Grapple'];
 const extra=[...(table.prone>0?['Stand up']:[]),'Throw a rock'];
 const fire=!s.flags.brazier&&props[s.room].some(prop=>prop.id==='brazier')?['Tip the brazier']:[];
 const power=abilityReady(s)?[activeAbility(s)]:[];
 return [...stance,s.combat.intent==='lethal'?'Switch to nonlethal':'Switch to lethal',...free,...fix,...extra,...fire,...power,...targets];}
// Landing a blow on the crawler, whoever ends up wearing it. Kept separate so
// every archetype attacks through exactly the same rules.
function hitPlayer(s,id,damage,roll,rng,playerAction,d){const me=conditionsOf(s,'player');let total=damage;
 if(playerAction==='Defend'){total=Math.floor(total/2);say(s,'You defend: incoming damage is halved, rounded down.');}
 if(damage===d.damage[1]&&d.onHit&&!me[d.onHit]){const save=d20({actor:s,ability:'constitution',save:true,dc:11,modifiers:(s.race==='human'?2:0)+gearBonus(s,'checks')+(d.onHit==='poisoned'&&traitOf(s,'poisonward')?1:0),rng});say(s,`Constitution save ${save.total} against DC 11. ${save.success?'Success.':'Failure.'}`);if(!save.success)applyCondition(s,'player',d.onHit,3,say);}
 const guard=withPlayer(s).filter(member=>member!==id&&s.npcs[member].condition==='conscious').sort((a,b)=>s.npcs[a].hp-s.npcs[b].hp)[0];
 if(total>0&&guard){s.npcs[guard].hp=Math.max(0,s.npcs[guard].hp-total);say(s,`${d.name} hits ${NPCS[guard].name} for ${total}. ${s.npcs[guard].hp} HP remain.`);
  if(s.npcs[guard].hp===0){s.npcs[guard].condition='unconscious';say(s,`${NPCS[guard].name} is knocked out and can no longer help.`);}}
 else if(total>0){s.hp=Math.max(0,s.hp-total);say(s,`${d.name} hits for ${total}.`);
  if(s.hp>0&&traitOf(s,'lastlaugh')&&s.hp<=Math.ceil(s.maxHp*0.2)&&!s.flags.lastLaugh){s.flags.lastLaugh=true;say(s,'Last Laugh Boots: the near miss gives you somewhere to be.');}}
 if(s.hp===0){s.dead=true;s.conditions={};say(s,'ANNEX: “Your final performance was brief but legally sufficient.”');closeCombat(s);}}
// One enemy's turn. Each archetype follows a short, readable list of priorities
// and is deliberately imperfect: the skulker spends turns repositioning and the
// brute alternates between grabbing, shoving and swinging.
function enemyTurn(s,id,roll,rng,playerAction){const d=NPCS[id],n=s.npcs[id],rules=ARCHETYPE_RULES[d.archetype||'scrapper'],cond=conditionsOf(s,id),me=conditionsOf(s,'player');
 if(cond.stunned>0){say(s,`${d.name} is stunned and cannot answer.`);return;}
 // Standing up costs the turn, so a knocked-down enemy either loses its action
 // or swings awkwardly from the floor. It is not always the smart choice.
 if(cond.prone>0&&s.combat.round%2===0){clearCondition(s,id,'prone',()=>{});say(s,`${d.name} scrambles back onto its feet.`);return;}
 if(cond.prone>0)say(s,`${d.name} swings at you from the floor.`);
 if(cond.grappled>0){const result=d20({actor:actorOf(d),skill:'athletics',dc:playerDC(s),rng});
  if(result.success){clearCondition(s,id,'grappled',()=>{});say(s,`${d.name} wrenches free of your grip.`);}else say(s,`${d.name} struggles but stays held.`);return;}
 if(rules.fleesAt&&n.hp<=Math.ceil(d.hp*rules.fleesAt)){n.memory.fled=true;const away=awayFromPlayer(s,placeOf(s,id).room);if(away!==undefined)moveTo(s,id,away,say);say(s,`${d.name} is badly hurt and breaks off.`);dropEnemy(s,id);return;}
 if(rules.rush&&s.combat.range>1){s.combat.range=Math.max(1,s.combat.range-rules.speed);say(s,`${d.name} rushes in.`);return;}
 if(rules.thrown&&s.combat.range>=2){hitPlayer(s,id,damageRoll(roll,rules.thrown,me.prone>0?'advantage':'none'),roll,rng,playerAction,d);say(s,`${d.name} throws something from the dark.`);return;}
 if(rules.cover&&!s.combat.cover[id]&&!(me.prone>0)&&coverNear(s,id)){s.combat.cover[id]=true;say(s,`${d.name} ducks behind cover.`);return;}
 if(rules.cover&&s.combat.range<3){s.combat.range=Math.min(3,s.combat.range+rules.speed);say(s,`${d.name} gives ground.`);return;}
 if(s.combat.range>1){s.combat.range=Math.max(1,s.combat.range-(rules.speed||1));say(s,`${d.name} closes the distance.`);return;}
 const healthy=n.hp>Math.ceil(d.hp/3);
 if((rules.grapple||rules.shoves)&&healthy&&!me.grappled&&!me.prone){
  const action=rules.grapple?(s.combat.round%2?'Grapple':'Shove'):'Shove';
  if(action==='Grapple'||playerNearHazard(s)){const result=d20({actor:actorOf(d),skill:'athletics',dc:playerDC(s),advantage:false,rng});
   if(result.success){if(action==='Grapple'){applyCondition(s,'player','grappled',3,say);say(s,`${d.name} seizes hold of you.`);}else{applyCondition(s,'player','prone',2,say);say(s,`${d.name} shoves you off your feet.`);}}
   else say(s,`${d.name} tries to ${action==='Grapple'?'grab':'shove'} you and fails.`);
   return;}}
 hitPlayer(s,id,damageRoll(roll,d.damage,me.prone>0?'advantage':(cond.poisoned>0||cond.prone>0)?'disadvantage':'none'),roll,rng,playerAction,d);}
export function fight(s,action,rng=Math.random){if(!s.combat||s.dead||s.combat.turn!=='player'||!combatActions(s).includes(action))return false;const id=s.combat.enemy,n=s.npcs[id],d=NPCS[id];const roll=(a,b)=>a+Math.floor(Math.min(.999999,Math.max(0,rng()))*(b-a+1));
 // A recruited companion takes her turn when the player calls it.
 if(s.combat.pendingCompanion&&action.startsWith(NPCS[s.combat.pendingCompanion].name+': ')){
  const mate=s.combat.pendingCompanion,name=NPCS[mate].name,what=action.slice(name.length+2);
  const gear=(s.companions[mate]?.equipped?Object.values(s.companions[mate].equipped):[]).filter(Boolean).reduce((sum,item)=>sum+(ITEMS[item]?.effects?.damage||0),0);
  s.combat.companionActed={...s.combat.companionActed,[mate]:true};delete s.combat.pendingCompanion;
  if(what==='Strike'||what==='Finish the wounded'){const wounded=n.hp*2<=d.hp;
   if(what==='Finish the wounded'&&!wounded)say(s,`${name} looks for an opening that is not there.`);
   const base=NPCS[mate].damage,raw=damageRoll(roll,base,what==='Finish the wounded'&&wounded?'advantage':'none')+gear;
   n.hp=Math.max(0,n.hp-raw);say(s,`${name} hits ${d.name} for ${raw}. ${n.hp} HP remain.`);
   if(n.hp===0){const nonlethal=s.combat.intent==='nonlethal';n.condition=nonlethal?'unconscious':'dead';n.memory[nonlethal?'knockedOut':'killed']=true;
    say(s,`${d.name} is ${nonlethal?'unconscious':'dead'}. ${name} finished it.`);defeated(s,id);dropEnemy(s,id);if(!s.combat)return true;}}
  else if(what==='Cover'){s.combat.cover[mate]=true;say(s,`${name} takes cover and waits.`);}
  else if(what==='Bandage you'){const bandage=s.npcs[mate].inventory.bandages>0,potion=s.npcs[mate].inventory.potions>0;
   if(!bandage&&!potion){say(s,`${name} has nothing to patch you with. She covers instead.`);s.combat.cover[mate]=true;}
   else{const heal=bandage?6:10;if(bandage)s.npcs[mate].inventory.bandages--;else s.npcs[mate].inventory.potions--;
    s.hp=Math.min(s.maxHp,s.hp+heal);say(s,`${name} patches you up. ${s.hp} HP.`);approvalEffect(s,mate,4,'she helped you in a fight');}}
  else{s.combat.cover[mate]=true;say(s,`${name} holds position.`);}
 }
 const me=(name)=>conditionsOf(s,'player')[name]>0,theirs=(name)=>conditionsOf(s,id)[name]>0;
 const dc=10+modifier(d.abilities.strength)+((d.skills||[]).includes('athletics')?proficiencyBonus(d.level||1):0);
 if(action.startsWith('Switch to')){s.combat.intent=action==='Switch to nonlethal'?'nonlethal':'lethal';say(s,s.combat.intent==='nonlethal'?'Nonlethal mode: attacks deal 1 less damage and knock out instead of killing. Switching intent does not consume a turn.':'Lethal mode: a finishing attack kills. Switching intent does not consume a turn.');return true;}
 if(action==='Switch target'){const list=s.combat.enemies.filter(enemy=>s.npcs[enemy].condition==='conscious');s.combat.enemy=list[(list.indexOf(s.combat.enemy)+1)%list.length];say(s,`You turn on ${NPCS[s.combat.enemy].name}.`);return true;}
 if(action==='Close in'){const step=s.flags.lastLaugh?2:1;delete s.flags.lastLaugh;s.combat.range=Math.max(1,s.combat.range-step);say(s,`You close to range ${s.combat.range}.`);}
 if(action==='Back off'){const step=s.flags.lastLaugh?2:1;delete s.flags.lastLaugh;s.combat.range=Math.min(3,s.combat.range+step);say(s,`You fall back to range ${s.combat.range}.`);}
 if(action==='Stand up'){clearCondition(s,'player','prone',say);say(s,'You push yourself upright. That cost you the moment.');}
 if(action==='Shake it off'){clearCondition(s,'player','stunned',say);say(s,'You clear your head.');}
 if(action==='Pat out flames'){clearCondition(s,'player','burning',say);say(s,'You smother the flames.');}
 if(action==='Treat bleeding'){if(!s.items.bandages){say(s,'No bandages. The wound keeps bleeding.');return false;}s.items.bandages--;clearCondition(s,'player','bleeding',say);say(s,'You bind the wound. It stops, for now.');}
 if(action==='Tip the brazier'){s.flags.brazier=true;recordDeed(s,'fire');recordDeed(s,'environment');applyCondition(s,id,'burning',3,say);say(s,'You kick the brazier over. Burning fuel spreads across the floor.');}
 if(action==='Shove'||action==='Grapple'||action==='Break free'){const result=d20({actor:s,skill:'athletics',dc,disadvantage:me('poisoned'),advantage:s.class==='trapper',modifiers:skillBonus(s,'athletics')+gearBonus(s,'checks'),rng});
  const line=`Athletics ${result.total} (d20 ${result.rawRoll}${result.rolls.length>1?` from ${result.rolls.join(' and ')}`:''} + ${result.abilityModifier}${result.proficiency?` + ${result.proficiencyBonus} proficiency`:''}) against DC ${dc}. ${result.success?'Success.':'Failure.'}`;
  if(action!=='Break free')recordDeed(s,'environment');
  if(action==='Break free'){if(result.success){clearCondition(s,'player','grappled',say);say(s,`${line} You tear free.`);}else say(s,`${line} You are still held.`);}
  else if(!result.success)say(s,`${line} ${d.name} keeps their footing.`);
  else if(action==='Grapple'){applyCondition(s,id,'grappled',3,say);say(s,`${line} You have hold of them.`);}
  else if(theirs('prone')){applyCondition(s,id,'stunned',2,say);say(s,`${line} Their head cracks against the floor.`);}
  else{applyCondition(s,id,'prone',2,say);say(s,`${line} They go down.`);}}
 if(action==='Use potion'&&(!s.potions||s.hp===s.maxHp)){say(s,!s.potions?'No potions. Choose another action.':'Already at full health.');return false;}
  if(action==='Smoke bomb'){if(!s.items.smokeBombs){say(s,'No smoke bombs. Tobin carries them.');return false;}s.items.smokeBombs--;s.x=1;s.y=4;say(s,'Smoke fills the room. You escape without a retaliatory hit. Your opponent keeps their injuries and memories.');closeCombat(s);return true;}
 s.combat.turn='enemy';
   if(action==='Rally'){s.combat.used[action]=true;s.hp=Math.min(s.maxHp,s.hp+8);say(s,`You rally. ${s.hp} HP.`);recordDeed(s,'help');}
   if(action==='Terrify'){s.combat.used[action]=true;applyCondition(s,id,'stunned',2,say);say(s,'Your reputation does the talking. It works.');recordDeed(s,'intimidation');}
   if(action==='Attack'||action==='Throw a rock'||action==='Cleave'||action==='Backstab'||action==='Snare'){const [lo,hi]=attackRange(s);let mode=theirs('prone')?'advantage':me('poisoned')||s.combat.range>1||s.combat.cover[id]?'disadvantage':'none';let raw=0;
    if(action==='Throw a rock'){raw=damageRoll(roll,[2,4],me('poisoned')?'disadvantage':'none')+(traitOf(s,'improviser')?2:0);recordDeed(s,'ranged');}
    else if(action==='Cleave'){raw=damageRoll(roll,[lo+4,hi+4],mode);recordDeed(s,'melee');}
    else if(action==='Backstab'){raw=damageRoll(roll,[lo+2,hi+2],'advantage');recordDeed(s,'melee');}
    else if(action==='Snare'){raw=3;recordDeed(s,'environment');applyCondition(s,id,'prone',2,say);}
    else{raw=damageRoll(roll,[lo,hi],mode);recordDeed(s,'melee');}
    if(action==='Attack')s.combat.attackUsed=true;else s.combat.used[action]=true;
    const damage=raw-(s.combat.intent==='nonlethal'?1:0);n.hp=Math.max(0,n.hp-damage);say(s,`You hit ${d.name} for ${damage}. ${n.hp} HP remain.`);
   if(action==="Attack"&&raw===hi&&!theirs("bleeding")&&n.hp>0)applyCondition(s,id,"bleeding",3,say);
   if(action==='Attack'&&traitOf(s,'wounded')&&n.hp*2<=NPCS[id].hp){raw+=1;say(s,'Ratfang Shiv: the wound makes the opening.');}
   if(n.hp===0){const nonlethal=s.combat.intent==='nonlethal';n.condition=nonlethal?'unconscious':'dead';n.memory[nonlethal?'knockedOut':'killed']=true;if(id==='rat'){s.gold+=n.inventory.gold;n.inventory.gold=0;}say(s,nonlethal?`${d.name} is unconscious, not dead. You can loot, wake, or kill them. They do not wake automatically.`:`${d.name} is dead and will stay dead. Loot their remaining possessions if you choose.`);defeated(s,id);awardXp(s,NPCS[id].xp||20,"defeating "+NPCS[id].name);if(!nonlethal)witnessed(s,'kill',id);dropEnemy(s,id);if(!s.combat)return true;}if(s.combat&&allyStrike(s,roll,rng))return true;}
 if(action==='Use potion'){s.potions--;const old=s.hp;s.hp=Math.min(s.maxHp,s.hp+10);say(s,`Potion restored ${s.hp-old} HP.`);}
   // Companions get a called turn before the enemies answer.
   const mate=Object.keys(s.companions).find(who=>s.companions[who].recruited&&s.npcs[who].condition==='conscious'&&!(s.combat.companionActed||{})[who]&&!s.combat.enemies.includes(who));
   if(mate&&!s.dead){s.combat.pendingCompanion=mate;s.combat.turn='player';say(s,`${NPCS[mate].name} is waiting on your call.`);return true;}
   s.combat.companionActed={};
   s.combat.round++;
   for(const enemyId of [...s.combat.enemies]){if(!s.combat)break;if(s.npcs[enemyId].condition!=='conscious')continue;enemyTurn(s,enemyId,roll,rng,action);}
   if(!s.combat)return true;
   if(action==='Flee'){s.x=1;s.y=4;say(s,'You escape to the entrance after taking one hit. Your opponent remembers.');closeCombat(s);}
   else{s.combat.turn='player';tickConditions(s,say);if(s.combat)say(s,'Your turn.');}return true;
}
export function usePotion(s){if(s.dead||s.complete||s.combat||s.hp>=s.maxHp||!s.potions)return false;s.potions--;const old=s.hp;s.hp=Math.min(s.maxHp,s.hp+10);say(s,`Recovered ${s.hp-old} HP.`);return true;}
export function useBandage(s){if(s.dead||s.complete||s.combat||s.hp>=s.maxHp||!s.items.bandages)return false;s.items.bandages--;const old=s.hp;s.hp=Math.min(s.maxHp,s.hp+6);say(s,`Bandage restored ${s.hp-old} HP. It can also be given to Mara.`);return true;}
export function useWhetstone(s){if(s.dead||s.complete||s.combat||!s.items.whetstones)return false;s.items.whetstones--;s.weapon++;say(s,'Sharpened your weapon: permanent +1 attack damage.');return true;}
// Opening a reward box. Only in a safe room, only one at a time, and the box
// is gone whether you like the roll or not.
export function openRewardBox(s,tier,rng=Math.random){if(!BOX_TIERS.includes(tier))return {ok:false,reason:'unknown'};
 if(s.combat||s.dead||s.complete)return {ok:false,reason:'busy'};
 if(!isSafeRoom(s))return {ok:false,reason:'unsafe'};
 if(!(s.boxes[tier]>0))return {ok:false,reason:'empty'};
 s.boxes[tier]--;
 const table=BOX_LOOT[tier],total=table.reduce((sum,entry)=>sum+entry.weight,0);
 let pick=rng()*total,entry=table[table.length-1];
 for(const row of table){pick-=row.weight;if(pick<=0){entry=row;break;}}
 entry.apply(s);
 const label=entry.item||entry.text,rarity=entry.rarity||(entry.item?rarityOf(entry.item):null);
 const item=entry.item?ITEMS[entry.item]:null,trait=item&&item.traitName?` Trait ${item.traitName}: ${item.traitText}`:'';
 say(s,`${tier} box: ${rarity?rarity+' ':''}${label}. ${entry.message}${trait}`);
 return {ok:true,tier,reward:label,rarity,traitName:item?item.traitName||null:null,traitText:item?item.traitText||null:null,message:entry.message};}
export function gearBonus(s,kind){return itemEffects(s,kind);}
export function outcome(s){return PEOPLE.map(id=>{const n=s.npcs[id];return `${NPCS[id].name}: ${n.condition}, ${n.attitude}. ${memoryText(n)}.`;}).join('\n');}
export function encode(s){if(s.dead||s.combat)return null;return JSON.stringify(s);}
// The bridge between a saved character and the d20 rules: pass the result as
// check({actor:character(s), skill:'stealth', dc:12}).
export function character(s,id='player'){if(id==='player'){const abilities={};for(const key of ABILITIES)abilities[key]=s.abilities[key]+abilityBonus(s,key);return {name:'Crawler 01',level:s.level,abilities,skills:s.skills,saves:s.saves};}const d=NPCS[id];return {name:d.name,level:d.level||1,abilities:d.abilities,skills:d.skills||[],saves:d.saves||[]};}
function withCharacter(s){s.abilities=dictionary(s.abilities)?s.abilities:{...STARTING_ABILITIES};for(const ability of ABILITIES)if(!Number.isInteger(s.abilities[ability]))s.abilities[ability]=STARTING_ABILITIES[ability];if(!Array.isArray(s.skills))s.skills=[...STARTING_SKILLS];if(!Array.isArray(s.saves))s.saves=[...STARTING_SAVES];if(!dictionary(s.stolen))s.stolen={};s.places=normalisePlaces(s.places);s.conditions=normaliseConditions(s.conditions);if(!Array.isArray(s.party))s.party=[];if(!dictionary(s.allies))s.allies={};if(!Number.isInteger(s.level))s.level=1;if(!Number.isInteger(s.maxHp)||s.maxHp<30)s.maxHp=30;if(!Number.isInteger(s.xp)||s.xp<0)s.xp=0;s.deeds=dictionary(s.deeds)?s.deeds:{};if(typeof s.boxes==='number')s.boxes={bronze:Math.max(0,s.boxes),silver:0,gold:0};if(!dictionary(s.boxes))s.boxes={bronze:0,silver:0,gold:0};for(const tier of BOX_TIERS)if(!Number.isInteger(s.boxes[tier])||s.boxes[tier]<0)s.boxes[tier]=0;s.gear=Array.isArray(s.gear)?s.gear.filter(name=>!!ITEMS[name]):[];
 const legacy=Array.isArray(s.accessories)?s.accessories.filter(name=>!!ITEMS[name]):[];
 s.equipped=dictionary(s.equipped)?s.equipped:emptyEquipped();
 for(const slot of SLOTS){const name=s.equipped[slot];if(!ITEMS[name]){s.equipped[slot]=null;continue;}if(itemSlot(name)!==slot){s.equipped[slot]=null;if(!s.gear.includes(name))s.gear.push(name);}}
 for(const name of legacy){const slot=itemSlot(name);if(slot&&!s.equipped[slot])s.equipped[slot]=name;else if(!s.gear.includes(name))s.gear.push(name);}
 delete s.accessories;
 s.standing=dictionary(s.standing)?s.standing:{};for(const id of Object.keys(NPCS))if(!STANDING.includes(s.standing[id]))s.standing[id]='neutral';
 s.companions=dictionary(s.companions)?s.companions:{};
 for(const id of Object.keys(s.companions)){const base=blankCompanion(id),held=s.companions[id];
  if(!dictionary(held)){s.companions[id]=base;continue;}
  s.companions[id]={...base,...held,approval:Number.isFinite(held.approval)?clampApproval(Math.round(held.approval)):0,memories:dictionary(held.memories)?held.memories:{},quest:dictionary(held.quest)?{...base.quest,...held.quest}:base.quest,equipped:dictionary(held.equipped)?{...base.equipped,...held.equipped}:base.equipped,gear:Array.isArray(held.gear)?held.gear.filter(name=>!!ITEMS[name]):[]};}
 if(!s.companions.mara)s.companions.mara=blankCompanion('mara');
 s.factionGifts=dictionary(s.factionGifts)?s.factionGifts:{survivors:false,ratmen:false};for(const faction of Object.keys(FACTIONS))s.factionGifts[faction]=!!s.factionGifts[faction];
 s.factions=dictionary(s.factions)?s.factions:{survivors:'neutral',ratmen:'neutral'};
 for(const faction of Object.keys(FACTIONS)){refreshFaction(s,faction);if(!STANDING.includes(s.factions[faction]))s.factions[faction]='neutral';}
 s.quests=dictionary(s.quests)?s.quests:{supplies:'open',carried:false,promised:null};
 if(!['open','survivors','ratmen','kept'].includes(s.quests.supplies))s.quests.supplies='open';
 s.quests.carried=!!s.quests.carried;
 if(![null,'survivors','ratmen'].includes(s.quests.promised))s.quests.promised=null;for(const deed of DEEDS)if(!Number.isInteger(s.deeds[deed])||s.deeds[deed]<0)s.deeds[deed]=0;if(!RACES[s.race])s.race="human";if(s.class!=="crawler"&&!CLASSES[s.class])s.class="crawler";if(typeof s.classOffered!=="boolean")s.classOffered=false;if(!Number.isInteger(s.pending)||s.pending<0)s.pending=0;return s;}
function dictionary(v){return v&&typeof v==='object'&&!Array.isArray(v);}
function bools(v){return dictionary(v)&&Object.values(v).every(x=>typeof x==='boolean');}
function count(v){return Number.isInteger(v)&&v>=0&&v<=100000;}
function migrate(s){const old=s.npcs;for(const id of ['mara','rat']){const n=old?.[id];if(!n||!Number.isInteger(n.hp)||n.hp<0||n.hp>NPCS[id].hp||!['neutral','friendly','hostile','dead'].includes(n.state)||(n.state==='dead')!==(n.hp===0))return null;}
 s.npcs=Object.fromEntries(Object.keys(NPCS).map(id=>[id,makeNPC(id)]));for(const id of ['mara','rat']){const n=s.npcs[id],o=old[id];n.hp=o.hp;n.condition=o.state==='dead'?'dead':'conscious';n.attitude=o.state==='dead'?'hostile':o.state;if(n.condition==='dead')n.memory.killed=true;if(n.attitude==='hostile')n.memory.attacked=true;}
 const m=s.npcs.mara;if(m.attitude==='friendly'){m.memory.helped=true;m.memory.befriended=true;}if(s.flags.talked)m.memory.met=true;if(s.flags.stolen){m.memory.stolen=true;m.memory.theftDetected=true;m.inventory.gold=0;m.inventory.key=0;}if(s.flags.traded){m.memory.traded=true;m.inventory.potions=Math.max(0,m.inventory.potions-1);m.inventory.key=0;}if(s.flags.looted){m.memory.looted=true;m.inventory.gold=0;m.inventory.key=0;}if(s.key)m.inventory.key=0;if(s.npcs.rat.condition==='dead')s.npcs.rat.inventory.gold=0;
 s.version=2;s.items={bandages:1,repairKits:0,smokeBombs:0,whetstones:0};s.logSerial=s.log.length;
 if(blocked(s,s.x,s.y)){const candidates=[];for(let y=1;y<=7;y++)for(let x=1;x<=11;x++)if(!blocked(s,x,y))candidates.push({x,y,d:Math.abs(x-s.x)+Math.abs(y-s.y)});candidates.sort((a,b)=>a.d-b.d);s.x=candidates[0].x;s.y=candidates[0].y;}return s;
}
export function decode(raw){try{let s=JSON.parse(raw);if(!dictionary(s)||![1,2].includes(s.version)||!Number.isInteger(s.room)||s.room<0||s.room>4||!Number.isInteger(s.x)||!Number.isInteger(s.y)||s.x<1||s.x>11||s.y<1||s.y>7||!Number.isInteger(s.maxHp)||s.maxHp<30||s.maxHp>200||!Number.isInteger(s.hp)||s.hp<1||s.hp>s.maxHp||s.combat!==null||s.dead!==false||typeof s.complete!=='boolean')return null;
 for(const key of ['potions','gold','cheese','weapon'])if(!count(s[key]))return null;
 if(!count(s.xp)||!Number.isInteger(s.pending)||s.pending<0||s.pending>9)return null;
 if(typeof s.key!=='boolean'||!bools(s.flags)||!Array.isArray(s.achievements)||s.achievements.some(x=>typeof x!=='string')||!Array.isArray(s.log)||s.log.some(x=>typeof x!=='string'))return null;
 if(s.version===1){s=migrate(s);if(!s)return null;}
 s=withCharacter(s);
 if(!dictionary(s.boxes)||BOX_TIERS.some(tier=>!count(s.boxes[tier])))return null;
 if(!RACES[s.race]||(s.class!=='crawler'&&!CLASSES[s.class])||typeof s.classOffered!=='boolean')return null;
 if(!dictionary(s.deeds)||DEEDS.some(deed=>!count(s.deeds[deed])))return null;
 if(!dictionary(s.items)||ITEM_KEYS.some(k=>!count(s.items[k]))||!Number.isSafeInteger(s.logSerial)||s.logSerial<0)return null;
 for(const id of Object.keys(NPCS)){const n=s.npcs?.[id];if(!dictionary(n)||!Number.isInteger(n.hp)||n.hp<0||n.hp>NPCS[id].hp||!ATTITUDES.includes(n.attitude)||!CONDITIONS.includes(n.condition)||(n.condition==='conscious')!==(n.hp>0)||!bools(n.memory)||!dictionary(n.inventory)||STOCK_KEYS.some(k=>!count(n.inventory[k])))return null;}
 if(!ABILITIES.every(ability=>Number.isInteger(s.abilities[ability])&&s.abilities[ability]>=1&&s.abilities[ability]<=30)||!Number.isInteger(s.level)||s.level<1||s.level>20||s.skills.some(x=>typeof x!=='string')||s.saves.some(x=>typeof x!=='string')||Object.values(s.stolen).some(owner=>typeof owner!=='string'||!NPCS[owner]))return null;
 if(s.party.some(id=>!NPCS[id])||new Set(s.party).size!==s.party.length||Object.entries(s.allies).some(([id,left])=>!NPCS[id]||!Number.isInteger(left)||left<0||left>99))return null;
 if(blocked(s,s.x,s.y))return null;return s;
 }catch{return null;}}

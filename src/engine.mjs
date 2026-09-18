import {PEOPLE,ATTITUDES,CONDITIONS,ITEM_KEYS,STOCK_KEYS,NPCS,makeNPC,npcActions,actNPC,describeNPC,discoverThefts,memoryText,WITNESS_RANGE,recordWitness,confront,withPlayer,isWith,leaveParty} from './npcs.mjs';
import {ABILITIES,STARTING_ABILITIES,STARTING_SKILLS,STARTING_SAVES,modifier,proficiencyBonus,check as d20} from './rules.mjs';
export const rooms=['Intake','Lost Property','The Holdout','Pest Control','Departures'];
export const props=[
 [{id:'fountain',name:'Recovery station',x:4,y:3},{id:'terminal',name:'Welcome terminal',x:8,y:3}],
 [{id:'chest',name:'Abandoned chest',x:4,y:3},{id:'crate',name:'Cracked crate',x:8,y:6},{id:'note',name:'Folded memo',x:8,y:3},{id:'tobin',name:'Tobin, scavenger',x:6,y:6},{id:'satchel',name:'Tobin’s satchel',x:5,y:5,owner:'tobin'},{id:'skulker',name:'Ratman skulker',x:10,y:2}],
 [{id:'mara',name:'Mara, survivor',x:6,y:4},{id:'locker',name:'Emergency locker',x:9,y:3},{id:'brute',name:'Ratman brute',x:2,y:6}],
 [{id:'rat',name:'Ratman scrapper',x:7,y:4},{id:'pipe',name:'Loose pipe',x:4,y:6},{id:'brazier',name:'Burning brazier',x:10,y:6,hazard:true}],
 [{id:'stairs',name:'Exit stairs',x:9,y:4},{id:'plaque',name:'Departure plaque',x:5,y:3},{id:'vex',name:'Vex, rival crawler',x:5,y:5},{id:'whetstone',name:'Vex’s sharpening kit',x:8,y:6,owner:'vex'}]
];
export function fresh(){return {version:2,room:0,x:3,y:5,places:startingPlaces(),conditions:{},hp:30,maxHp:30,xp:0,pending:0,potions:2,gold:0,cheese:0,key:false,weapon:0,stolen:{},party:[],allies:{},level:1,abilities:{...STARTING_ABILITIES},skills:[...STARTING_SKILLS],saves:[...STARTING_SAVES],items:{bandages:1,repairKits:0,smokeBombs:0,whetstones:0},flags:{},achievements:[],boxes:0,npcs:Object.fromEntries(Object.keys(NPCS).map(id=>[id,makeNPC(id)])),combat:null,dead:false,complete:false,logSerial:1,log:['ANNEX: “Welcome to Probation. Three other survivors, one exit. Please resolve your differences where the cameras can see.” A bandage and two potions are in your pack.']};}
export function say(s,text){s.log.push(text);s.log=s.log.slice(-60);s.logSerial++;}
export function award(s,id){if(s.achievements.includes(id))return;s.achievements.push(id);s.boxes++;say(s,`Achievement: ${id}. One loot box added to your pack.`);awardXp(s,40,`achievement: ${id}`);}
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
 if(exit){discoverThefts(s,PEOPLE.filter(id=>roomOf(s,id)===s.room),say);s.room+=x===12?1:-1;s.x=x===12?1:11;s.y=4;say(s,`Entered ${rooms[s.room]}.`);
  const seen='seen'+s.room;if(!s.flags[seen]){s.flags[seen]=true;awardXp(s,20,`finding ${rooms[s.room]}`);}
  worldTurn(s);return true;}
 if(blocked(s,x,y))return false;s.x=x;s.y=y;return true;
}
export function nearby(s){return roomProps(s).filter(p=>Math.abs(p.x-s.x)+Math.abs(p.y-s.y)<=1);}
export function actions(s,id){if(s.dead||s.complete||s.combat)return [];if(PEOPLE.includes(id)||s.npcs[id]?.condition!=='conscious'&&s.npcs[id])return npcActions(s,id);
 if(NPCS[id]?.archetype&&id!=='rat')return ['Inspect','Fight'];
 switch(id){
 case 'fountain':return ['Inspect','Heal'];case 'terminal':return ['Inspect'];
 case 'chest':return ['Inspect',...(s.flags.chest?[]:['Open'])];case 'crate':return ['Inspect',...(s.flags.crate?[]:['Break'])];
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
function startCombat(s,id,intent='lethal'){const n=s.npcs[id];if(n.condition!=='conscious')return;n.memory.betrayed=!!(n.memory.betrayed||n.memory.helped||n.memory.befriended||n.attitude==='friendly');n.memory.attacked=true;n.memory.distracted=false;n.attitude='hostile';leaveParty(s,id,say,'was attacked by you');s.combat={enemy:id,enemies:[id],turn:'player',intent,range:1,cover:{},round:0};
 say(s,`${NPCS[id].name} fights back. ${intent==='nonlethal'?'Nonlethal strikes will knock them unconscious.':'Lethal attacks can kill them.'} You can change intent during combat.`);
 const pack=NPCS[id].pack;
 if(pack)for(const other of Object.keys(NPCS)){if(other===id||NPCS[other].pack!==pack||s.npcs[other].condition!=='conscious')continue;if(placeOf(s,other).room!==placeOf(s,id).room)continue;s.combat.enemies.push(other);say(s,`${NPCS[other].name} joins the fight.`);}
 witnessed(s,'attack',id);worldTurn(s);}
// A recruited character fights in their own body with their own damage, and a
// temporary ally spends one encounter of their agreement each time combat ends.
function closeCombat(s){if(!s.combat)return;s.combat=null;s.conditions={};for(const id of Object.keys(s.allies||{})){s.allies[id]-=1;if(s.allies[id]<=0){delete s.allies[id];say(s,`${NPCS[id].name} has done what they promised and steps away. The temporary alliance is over.`);}}}
function allyStrike(s,roll,rng){const enemy=s.combat?.enemy;if(!enemy)return false;const n=s.npcs[enemy],d=NPCS[enemy];
 for(const id of withPlayer(s)){const ally=s.npcs[id];if(ally.condition!=='conscious'||id===enemy)continue;const damage=roll(...NPCS[id].damage);n.hp=Math.max(0,n.hp-damage);say(s,`${NPCS[id].name} hits ${d.name} for ${damage}. ${n.hp} HP remain.`);
  if(n.hp===0){const nonlethal=s.combat.intent==='nonlethal';n.condition=nonlethal?'unconscious':'dead';n.memory[nonlethal?'knockedOut':'killed']=true;say(s,`${d.name} is ${nonlethal?'unconscious':'dead'}. Your ally finished it.`);awardXp(s,NPCS[enemy].xp||20,`defeating ${NPCS[enemy].name}`);closeCombat(s);return true;}}
 return false;}
// Who can see what happens where the player is standing: the same room, close
// enough, conscious, and not the person the event happened to.
export function witnesses(s,targetId){return roomProps(s).filter(p=>NPCS[p.id]&&p.id!==targetId&&s.npcs[p.id]?.condition==='conscious'&&Math.abs(p.x-s.x)+Math.abs(p.y-s.y)<=WITNESS_RANGE).map(p=>p.id);}
export function witnessed(s,event,targetId){return recordWitness(s,witnesses(s,targetId),event,say);}
export function interact(s,id,action,rng=Math.random){if(!nearby(s).some(p=>p.id===id)||!actions(s,id).includes(action))return false;
  if(PEOPLE.includes(id)||s.npcs[id]?.condition!=='conscious'&&s.npcs[id])return actNPC(s,id,action,{say,award,startCombat,witness:(event,target)=>witnessed(s,event,target),rng});
 if(action==='Inspect'){say(s,s.npcs[id]?describeNPC(s,id):({fountain:'Free full healing. The plaque says “A healthy contestant is a renewable resource.”',terminal:'ANNEX: “The exit requires a key, not a body count.” Tobin scavenges in Lost Property; Mara shelters in The Holdout; Vex waits in Departures. Mara’s locker has a free spare key. Talk, help, deceive, steal, or fight. People remember.',chest:'An abandoned chest. Coins, medical supplies, and something useful for a broken satchel.',crate:'The label says “artisan survival accompaniment.” It smells like cheese committing a crime.',note:'A sponsor memo. Its slogan could support a convincing lie; its safety warning would interest Vex.',locker:'An emergency exit key. Accessible even if every other survivor dies.',pipe:'A loose pipe hides a cache. Tobin may know more.',brazier:'A barrel of burning fuel. Kick it over and something will catch fire.',satchel:'Tobin’s satchel, packed and counted. He watches it the way other people watch doors.',whetstone:'Vex’s whetstone, left within reach. Taking it is a statement.',stairs:'The exit accepts any exit key. No NPC is required to finish.',plaque:'ANNEX: “No exit survey today. Your behavior was the survey.”'}[id]||id));return true;}
 if(id==='fountain'){s.hp=s.maxHp;say(s,'Fully healed. The station bills someone else. Enjoy the novelty.');}
 if(id==='chest'){s.flags.chest=true;s.gold+=6;s.potions++;s.items.repairKits++;say(s,'Found 6 coins, a potion, and a repair kit. Tobin could use the kit.');}
 if(id==='crate'){s.flags.crate=true;s.cheese++;say(s,'Found pungent cheese. A diplomatic instrument, probably.');}
 if(id==='note'){s.flags.memo=true;say(s,'Memo: “Sponsor slogan: WE KEEP YOU IN THE PICTURE. Beware faulty exit machinery. Tell the crawler by the stairs. Custodian accepts cheese; Mara’s locker holds a spare key.” You can share this information with Vex or quote it in a lie.');}
 if(id==='locker'){s.flags.locker=true;s.key=true;say(s,'You take the emergency spare key. It belongs to the building, not Mara.');}
 if(id==='pipe'){let found=false;if(!s.flags.secret){s.flags.secret=true;s.gold+=4;award(s,'Pipe dream');say(s,'A hidden cache contains 4 coins.');found=true;}if(s.flags.tobinCache&&!s.flags.tobinCacheTaken){s.flags.tobinCacheTaken=true;s.gold+=3;say(s,'Tobin’s tip reveals a second compartment: 3 extra coins. Information can be worth more than pockets.');found=true;}if(!found)say(s,'The cache is empty.');}
 if(id==='satchel'){s.flags.satchel=true;s.gold+=3;s.items.smokeBombs++;ownedTake(s,'satchel','3 coins and a smoke bomb',['gold','smokeBombs']);}
 if(id==='whetstone'){s.flags.whetstone=true;s.items.whetstones++;ownedTake(s,'whetstone','1 whetstone',['whetstones']);}
 if(NPCS[id]?.archetype&&id!=='rat'){if(action==='Fight')startCombat(s,id);return true;}
 if(id==='rat'){
  if(action==='Talk')say(s,'Ratman: “Cheese tax. Or go around. I am paid neither way.”');
  if(action==='Offer cheese'){if(s.npcs.rat.attitude==='friendly')say(s,'The custodian has already accepted your tribute.');else if(!s.cheese)say(s,'You have no cheese. Try the crate in Lost Property.');else{s.cheese--;s.npcs.rat.attitude='friendly';s.npcs.rat.memory.helped=true;award(s,'Cheese diplomacy');say(s,'The ratman accepts. The only honest transaction in the building.');}}
  if(action==='Sneak past'){s.flags.sneaked=true;award(s,'Quiet quitting');say(s,'You slip along the wall. The custodian pretends not to see.');awardXp(s,30,'resolving the custodian without a fight');}
  if(action==='Fight')startCombat(s,'rat');
 }
 if(id==='stairs'){if(!s.key)say(s,'Locked. Take the free key from the locker in The Holdout, or obtain Mara’s.');else{s.complete=true;say(s,'The exit opens. ANNEX: “You may leave. Your reputation has already gone ahead.”');}}
 return true;
}
export function attackRange(s){const bonus=s.weapon+(s.flags.vexTraining?1:0);return [5+bonus,7+bonus];}
// Levelling. XP comes from fights, discoveries, peaceful resolutions and
// achievements; each level adds max HP and one stat increase to spend.
export const XP_PER_LEVEL=100;
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
function hurt(s,id,damage,say){if(id==='player'){s.hp=Math.max(0,s.hp-damage);say(s,`You take ${damage}. ${s.hp} HP remain.`);if(s.hp===0){s.dead=true;s.combat=null;say(s,'ANNEX: “Your final performance was briefly sufficient.”');}return;}
 const n=s.npcs[id];n.hp=Math.max(0,n.hp-damage);say(s,`${NPCS[id].name} takes ${damage}. ${n.hp} HP remain.`);
 if(n.hp===0){const nonlethal=s.combat?.intent==='nonlethal';n.condition=nonlethal?'unconscious':'dead';n.memory[nonlethal?'knockedOut':'killed']=true;say(s,`${NPCS[id].name} is ${nonlethal?'unconscious':'dead'}.`);awardXp(s,NPCS[id].xp||20,`defeating ${NPCS[id].name}`);closeCombat(s);}}
function tickConditions(s,say){for(const id of ['player',...Object.keys(NPCS)]){const table=s.conditions[id];if(!table)continue;
 if(table.burning>0)hurt(s,id,2,say);
 if(table.bleeding>0)hurt(s,id,1,say);
 if(!s.combat)break;   // a death ends the fight before the rest of the tick
 for(const name of Object.keys(table)){table[name]-=1;if(table[name]<=0)delete table[name];}
 if(!Object.keys(table).length)delete s.conditions[id];}}
// Secondary actions sit behind a disclosure in the dock so the common loop
// stays three taps deep. The core is whatever is left.
export const SECONDARY_ACTIONS=['Shove','Grapple','Switch to nonlethal','Switch to lethal','Smoke bomb','Tip the brazier','Flee','Switch target'];
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
 const id=s.combat.enemy,table=conditionsOf(s,'player');
 if(table.stunned>0)return ['Shake it off'];   // a stunned crawler can only clear their head
 const move=s.combat.range>1?['Close in']:['Back off'];
 const stance=['Attack','Defend','Use potion',...move];
 const targets=s.combat.enemies.filter(enemy=>s.npcs[enemy].condition==='conscious').length>1?['Switch target']:[];
 const free=table.grappled>0?[]:['Flee','Smoke bomb'];
 const fix=table.grappled>0?['Break free']:table.burning>0?['Pat out flames']:table.bleeding>0?['Treat bleeding']:['Shove','Grapple'];
 const extra=table.prone>0?['Stand up']:[];
 const fire=!s.flags.brazier&&props[s.room].some(prop=>prop.id==='brazier')?['Tip the brazier']:[];
 return [...stance,s.combat.intent==='lethal'?'Switch to nonlethal':'Switch to lethal',...free,...fix,...extra,...fire,...targets];}
// Landing a blow on the crawler, whoever ends up wearing it. Kept separate so
// every archetype attacks through exactly the same rules.
function hitPlayer(s,id,damage,roll,rng,playerAction,d){const me=conditionsOf(s,'player');let total=damage;
 if(playerAction==='Defend'){total=Math.floor(total/2);say(s,'You defend: incoming damage is halved, rounded down.');}
 if(damage===d.damage[1]&&d.onHit&&!me[d.onHit]){const save=d20({actor:s,ability:'constitution',save:true,dc:11,rng});say(s,`Constitution save ${save.total} against DC 11. ${save.success?'Success.':'Failure.'}`);if(!save.success)applyCondition(s,'player',d.onHit,3,say);}
 const guard=withPlayer(s).filter(member=>member!==id&&s.npcs[member].condition==='conscious').sort((a,b)=>s.npcs[a].hp-s.npcs[b].hp)[0];
 if(total>0&&guard){s.npcs[guard].hp=Math.max(0,s.npcs[guard].hp-total);say(s,`${d.name} hits ${NPCS[guard].name} for ${total}. ${s.npcs[guard].hp} HP remain.`);
  if(s.npcs[guard].hp===0){s.npcs[guard].condition='unconscious';say(s,`${NPCS[guard].name} is knocked out and can no longer help.`);}}
 else if(total>0){s.hp=Math.max(0,s.hp-total);say(s,`${d.name} hits for ${total}.`);}
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
 const me=(name)=>conditionsOf(s,'player')[name]>0,theirs=(name)=>conditionsOf(s,id)[name]>0;
 const dc=10+modifier(d.abilities.strength)+((d.skills||[]).includes('athletics')?proficiencyBonus(d.level||1):0);
 if(action.startsWith('Switch to')){s.combat.intent=action==='Switch to nonlethal'?'nonlethal':'lethal';say(s,s.combat.intent==='nonlethal'?'Nonlethal mode: attacks deal 1 less damage and knock out instead of killing. Switching intent does not consume a turn.':'Lethal mode: a finishing attack kills. Switching intent does not consume a turn.');return true;}
 if(action==='Switch target'){const list=s.combat.enemies.filter(enemy=>s.npcs[enemy].condition==='conscious');s.combat.enemy=list[(list.indexOf(s.combat.enemy)+1)%list.length];say(s,`You turn on ${NPCS[s.combat.enemy].name}.`);return true;}
 if(action==='Close in'){s.combat.range=Math.max(1,s.combat.range-1);say(s,`You close to range ${s.combat.range}.`);}
 if(action==='Back off'){s.combat.range=Math.min(3,s.combat.range+1);say(s,`You fall back to range ${s.combat.range}.`);}
 if(action==='Stand up'){clearCondition(s,'player','prone',say);say(s,'You push yourself upright. That cost you the moment.');}
 if(action==='Shake it off'){clearCondition(s,'player','stunned',say);say(s,'You clear your head.');}
 if(action==='Pat out flames'){clearCondition(s,'player','burning',say);say(s,'You smother the flames.');}
 if(action==='Treat bleeding'){if(!s.items.bandages){say(s,'No bandages. The wound keeps bleeding.');return false;}s.items.bandages--;clearCondition(s,'player','bleeding',say);say(s,'You bind the wound. It stops, for now.');}
 if(action==='Tip the brazier'){s.flags.brazier=true;applyCondition(s,id,'burning',3,say);say(s,'You kick the brazier over. Burning fuel spreads across the floor.');}
 if(action==='Shove'||action==='Grapple'||action==='Break free'){const result=d20({actor:s,skill:'athletics',dc,disadvantage:me('poisoned'),rng});
  const line=`Athletics ${result.total} (d20 ${result.rawRoll}${result.rolls.length>1?` from ${result.rolls.join(' and ')}`:''} + ${result.abilityModifier}${result.proficiency?` + ${result.proficiencyBonus} proficiency`:''}) against DC ${dc}. ${result.success?'Success.':'Failure.'}`;
  if(action==='Break free'){if(result.success){clearCondition(s,'player','grappled',say);say(s,`${line} You tear free.`);}else say(s,`${line} You are still held.`);}
  else if(!result.success)say(s,`${line} ${d.name} keeps their footing.`);
  else if(action==='Grapple'){applyCondition(s,id,'grappled',3,say);say(s,`${line} You have hold of them.`);}
  else if(theirs('prone')){applyCondition(s,id,'stunned',2,say);say(s,`${line} Their head cracks against the floor.`);}
  else{applyCondition(s,id,'prone',2,say);say(s,`${line} They go down.`);}}
 if(action==='Use potion'&&(!s.potions||s.hp===s.maxHp)){say(s,!s.potions?'No potions. Choose another action.':'Already at full health.');return false;}
  if(action==='Smoke bomb'){if(!s.items.smokeBombs){say(s,'No smoke bombs. Tobin carries them.');return false;}s.items.smokeBombs--;s.x=1;s.y=4;say(s,'Smoke fills the room. You escape without a retaliatory hit. Your opponent keeps their injuries and memories.');closeCombat(s);return true;}
 s.combat.turn='enemy';
   if(action==='Attack'){const [lo,hi]=attackRange(s);const mode=theirs('prone')?'advantage':me('poisoned')||s.combat.range>1||s.combat.cover[id]?'disadvantage':'none';const raw=damageRoll(roll,[lo,hi],mode);const damage=raw-(s.combat.intent==='nonlethal'?1:0);n.hp=Math.max(0,n.hp-damage);say(s,`You hit ${d.name} for ${damage}. ${n.hp} HP remain.`);
   if(raw===hi&&!theirs('bleeding')&&n.hp>0&&!theirs('undead'))applyCondition(s,id,'bleeding',3,say);
   if(n.hp===0){const nonlethal=s.combat.intent==='nonlethal';n.condition=nonlethal?'unconscious':'dead';n.memory[nonlethal?'knockedOut':'killed']=true;if(id==='rat'){s.gold+=n.inventory.gold;n.inventory.gold=0;}say(s,nonlethal?`${d.name} is unconscious, not dead. You can loot, wake, or kill them. They do not wake automatically.`:`${d.name} is dead and will stay dead. Loot their remaining possessions if you choose.`);awardXp(s,NPCS[id].xp||20,"defeating "+NPCS[id].name);if(!nonlethal)witnessed(s,'kill',id);dropEnemy(s,id);if(!s.combat)return true;}if(s.combat&&allyStrike(s,roll,rng))return true;}
 if(action==='Use potion'){s.potions--;const old=s.hp;s.hp=Math.min(s.maxHp,s.hp+10);say(s,`Potion restored ${s.hp-old} HP.`);}
   s.combat.round++;
   for(const enemyId of [...s.combat.enemies]){if(!s.combat)break;if(s.npcs[enemyId].condition!=='conscious')continue;enemyTurn(s,enemyId,roll,rng,action);}
   if(!s.combat)return true;
   if(action==='Flee'){s.x=1;s.y=4;say(s,'You escape to the entrance after taking one hit. Your opponent remembers.');closeCombat(s);}
   else{s.combat.turn='player';tickConditions(s,say);if(s.combat)say(s,'Your turn.');}return true;
}
export function usePotion(s){if(s.dead||s.complete||s.combat||s.hp>=s.maxHp||!s.potions)return false;s.potions--;const old=s.hp;s.hp=Math.min(s.maxHp,s.hp+10);say(s,`Recovered ${s.hp-old} HP.`);return true;}
export function useBandage(s){if(s.dead||s.complete||s.combat||s.hp>=s.maxHp||!s.items.bandages)return false;s.items.bandages--;const old=s.hp;s.hp=Math.min(s.maxHp,s.hp+6);say(s,`Bandage restored ${s.hp-old} HP. It can also be given to Mara.`);return true;}
export function useWhetstone(s){if(s.dead||s.complete||s.combat||!s.items.whetstones)return false;s.items.whetstones--;s.weapon++;say(s,'Sharpened your weapon: permanent +1 attack damage.');return true;}
export function openBox(s){if(s.combat||s.dead||s.complete||!s.boxes)return false;s.boxes--;s.potions++;say(s,'Loot box: one healing potion. Corporate generosity, measured with a pipette.');return true;}
export function outcome(s){return PEOPLE.map(id=>{const n=s.npcs[id];return `${NPCS[id].name}: ${n.condition}, ${n.attitude}. ${memoryText(n)}.`;}).join('\n');}
export function encode(s){if(s.dead||s.combat)return null;return JSON.stringify(s);}
// The bridge between a saved character and the d20 rules: pass the result as
// check({actor:character(s), skill:'stealth', dc:12}).
export function character(s,id='player'){if(id==='player')return {name:'Crawler 01',level:s.level,abilities:s.abilities,skills:s.skills,saves:s.saves};const d=NPCS[id];return {name:d.name,level:d.level||1,abilities:d.abilities,skills:d.skills||[],saves:d.saves||[]};}
function withCharacter(s){s.abilities=dictionary(s.abilities)?s.abilities:{...STARTING_ABILITIES};for(const ability of ABILITIES)if(!Number.isInteger(s.abilities[ability]))s.abilities[ability]=STARTING_ABILITIES[ability];if(!Array.isArray(s.skills))s.skills=[...STARTING_SKILLS];if(!Array.isArray(s.saves))s.saves=[...STARTING_SAVES];if(!dictionary(s.stolen))s.stolen={};s.places=normalisePlaces(s.places);s.conditions=normaliseConditions(s.conditions);if(!Array.isArray(s.party))s.party=[];if(!dictionary(s.allies))s.allies={};if(!Number.isInteger(s.level))s.level=1;if(!Number.isInteger(s.maxHp)||s.maxHp<30)s.maxHp=30;if(!Number.isInteger(s.xp)||s.xp<0)s.xp=0;if(!Number.isInteger(s.pending)||s.pending<0)s.pending=0;return s;}
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
 for(const key of ['potions','gold','cheese','boxes','weapon'])if(!count(s[key]))return null;
 if(!count(s.xp)||!Number.isInteger(s.pending)||s.pending<0||s.pending>9)return null;
 if(typeof s.key!=='boolean'||!bools(s.flags)||!Array.isArray(s.achievements)||s.achievements.some(x=>typeof x!=='string')||!Array.isArray(s.log)||s.log.some(x=>typeof x!=='string'))return null;
 if(s.version===1){s=migrate(s);if(!s)return null;}
 s=withCharacter(s);
 if(!dictionary(s.items)||ITEM_KEYS.some(k=>!count(s.items[k]))||!Number.isSafeInteger(s.logSerial)||s.logSerial<0)return null;
 for(const id of Object.keys(NPCS)){const n=s.npcs?.[id];if(!dictionary(n)||!Number.isInteger(n.hp)||n.hp<0||n.hp>NPCS[id].hp||!ATTITUDES.includes(n.attitude)||!CONDITIONS.includes(n.condition)||(n.condition==='conscious')!==(n.hp>0)||!bools(n.memory)||!dictionary(n.inventory)||STOCK_KEYS.some(k=>!count(n.inventory[k])))return null;}
 if(!ABILITIES.every(ability=>Number.isInteger(s.abilities[ability])&&s.abilities[ability]>=1&&s.abilities[ability]<=30)||!Number.isInteger(s.level)||s.level<1||s.level>20||s.skills.some(x=>typeof x!=='string')||s.saves.some(x=>typeof x!=='string')||Object.values(s.stolen).some(owner=>typeof owner!=='string'||!NPCS[owner]))return null;
 if(s.party.some(id=>!NPCS[id])||new Set(s.party).size!==s.party.length||Object.entries(s.allies).some(([id,left])=>!NPCS[id]||!Number.isInteger(left)||left<0||left>99))return null;
 if(blocked(s,s.x,s.y))return null;return s;
 }catch{return null;}}

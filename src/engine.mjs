import {PEOPLE,ATTITUDES,CONDITIONS,ITEM_KEYS,STOCK_KEYS,NPCS,makeNPC,npcActions,actNPC,describeNPC,discoverThefts,memoryText} from './npcs.mjs';
export const rooms=['Intake','Lost Property','The Holdout','Pest Control','Departures'];
export const props=[
 [{id:'fountain',name:'Recovery station',x:4,y:3},{id:'terminal',name:'Welcome terminal',x:8,y:3}],
 [{id:'chest',name:'Abandoned chest',x:4,y:3},{id:'crate',name:'Cracked crate',x:8,y:6},{id:'note',name:'Folded memo',x:8,y:3},{id:'tobin',name:'Tobin, scavenger',x:6,y:6}],
 [{id:'mara',name:'Mara, survivor',x:6,y:4},{id:'locker',name:'Emergency locker',x:9,y:3}],
 [{id:'rat',name:'Ratman custodian',x:7,y:4},{id:'pipe',name:'Loose pipe',x:4,y:6}],
 [{id:'stairs',name:'Exit stairs',x:9,y:4},{id:'plaque',name:'Departure plaque',x:5,y:3},{id:'vex',name:'Vex, rival crawler',x:5,y:5}]
];
export function fresh(){return {version:2,room:0,x:3,y:5,hp:30,maxHp:30,potions:2,gold:0,cheese:0,key:false,weapon:0,items:{bandages:1,repairKits:0,smokeBombs:0,whetstones:0},flags:{},achievements:[],boxes:0,npcs:Object.fromEntries(Object.keys(NPCS).map(id=>[id,makeNPC(id)])),combat:null,dead:false,complete:false,logSerial:1,log:['ANNEX: “Welcome to Probation. Three other survivors, one exit. Please resolve your differences where the cameras can see.” A bandage and two potions are in your pack.']};}
export function say(s,text){s.log.push(text);s.log=s.log.slice(-60);s.logSerial++;}
export function award(s,id){if(s.achievements.includes(id))return;s.achievements.push(id);s.boxes++;say(s,`Achievement: ${id}. One loot box added to your pack.`);}
export function blocked(s,x,y){return x<1||x>11||y<1||y>7||props[s.room].some(p=>p.x===x&&p.y===y);}
export function move(s,dx,dy){if(s.combat||s.dead||s.complete||!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)return false;const x=s.x+dx,y=s.y+dy;
 const exit=y===4&&((x===12&&s.room<4)||(x===0&&s.room>0));
 if(exit){discoverThefts(s,props[s.room].filter(p=>PEOPLE.includes(p.id)).map(p=>p.id),say);s.room+=x===12?1:-1;s.x=x===12?1:11;s.y=4;say(s,`Entered ${rooms[s.room]}.`);return true;}
 if(blocked(s,x,y))return false;s.x=x;s.y=y;return true;
}
export function nearby(s){return props[s.room].filter(p=>Math.abs(p.x-s.x)+Math.abs(p.y-s.y)<=1);}
export function actions(s,id){if(s.dead||s.complete||s.combat)return [];if(PEOPLE.includes(id)||s.npcs[id]?.condition!=='conscious'&&s.npcs[id])return npcActions(s,id);switch(id){
 case 'fountain':return ['Inspect','Heal'];case 'terminal':return ['Inspect'];
 case 'chest':return ['Inspect',...(s.flags.chest?[]:['Open'])];case 'crate':return ['Inspect',...(s.flags.crate?[]:['Break'])];
 case 'note':return ['Inspect','Read'];case 'locker':return ['Inspect',...(s.flags.locker?[]:['Open'])];
 case 'rat':return ['Inspect','Talk','Offer cheese','Sneak past','Fight'];
 case 'pipe':return ['Inspect','Search'];case 'stairs':return ['Inspect','Unlock exit'];default:return ['Inspect'];}}
function startCombat(s,id,intent='lethal'){const n=s.npcs[id];if(n.condition!=='conscious')return;n.memory.betrayed=!!(n.memory.betrayed||n.memory.helped||n.memory.befriended||n.attitude==='friendly');n.memory.attacked=true;n.memory.distracted=false;n.attitude='hostile';s.combat={enemy:id,turn:'player',intent};say(s,`${NPCS[id].name} fights back. ${intent==='nonlethal'?'Nonlethal strikes will knock them unconscious.':'Lethal attacks can kill them.'} You can change intent during combat.`);}
export function interact(s,id,action){if(!nearby(s).some(p=>p.id===id)||!actions(s,id).includes(action))return false;
 if(PEOPLE.includes(id)||s.npcs[id]?.condition!=='conscious'&&s.npcs[id])return actNPC(s,id,action,{say,award,startCombat});
 if(action==='Inspect'){say(s,s.npcs[id]?describeNPC(s,id):({fountain:'Free full healing. The plaque says “A healthy contestant is a renewable resource.”',terminal:'ANNEX: “The exit requires a key, not a body count.” Tobin scavenges in Lost Property; Mara shelters in The Holdout; Vex waits in Departures. Mara’s locker has a free spare key. Talk, help, deceive, steal, or fight. People remember.',chest:'An abandoned chest. Coins, medical supplies, and something useful for a broken satchel.',crate:'The label says “artisan survival accompaniment.” It smells like cheese committing a crime.',note:'A sponsor memo. Its slogan could support a convincing lie; its safety warning would interest Vex.',locker:'An emergency exit key. Accessible even if every other survivor dies.',pipe:'A loose pipe hides a cache. Tobin may know more.',stairs:'The exit accepts any exit key. No NPC is required to finish.',plaque:'ANNEX: “No exit survey today. Your behavior was the survey.”'}[id]||id));return true;}
 if(id==='fountain'){s.hp=30;say(s,'Fully healed. The station bills someone else. Enjoy the novelty.');}
 if(id==='chest'){s.flags.chest=true;s.gold+=6;s.potions++;s.items.repairKits++;say(s,'Found 6 coins, a potion, and a repair kit. Tobin could use the kit.');}
 if(id==='crate'){s.flags.crate=true;s.cheese++;say(s,'Found pungent cheese. A diplomatic instrument, probably.');}
 if(id==='note'){s.flags.memo=true;say(s,'Memo: “Sponsor slogan: WE KEEP YOU IN THE PICTURE. Beware faulty exit machinery. Tell the crawler by the stairs. Custodian accepts cheese; Mara’s locker holds a spare key.” You can share this information with Vex or quote it in a lie.');}
 if(id==='locker'){s.flags.locker=true;s.key=true;say(s,'You take the emergency spare key. It belongs to the building, not Mara.');}
 if(id==='pipe'){let found=false;if(!s.flags.secret){s.flags.secret=true;s.gold+=4;award(s,'Pipe dream');say(s,'A hidden cache contains 4 coins.');found=true;}if(s.flags.tobinCache&&!s.flags.tobinCacheTaken){s.flags.tobinCacheTaken=true;s.gold+=3;say(s,'Tobin’s tip reveals a second compartment: 3 extra coins. Information can be worth more than pockets.');found=true;}if(!found)say(s,'The cache is empty.');}
 if(id==='rat'){
  if(action==='Talk')say(s,'Ratman: “Cheese tax. Or go around. I am paid neither way.”');
  if(action==='Offer cheese'){if(s.npcs.rat.attitude==='friendly')say(s,'The custodian has already accepted your tribute.');else if(!s.cheese)say(s,'You have no cheese. Try the crate in Lost Property.');else{s.cheese--;s.npcs.rat.attitude='friendly';s.npcs.rat.memory.helped=true;award(s,'Cheese diplomacy');say(s,'The ratman accepts. The only honest transaction in the building.');}}
  if(action==='Sneak past'){s.flags.sneaked=true;award(s,'Quiet quitting');say(s,'You slip along the wall. The custodian pretends not to see.');}
  if(action==='Fight')startCombat(s,'rat');
 }
 if(id==='stairs'){if(!s.key)say(s,'Locked. Take the free key from the locker in The Holdout, or obtain Mara’s.');else{s.complete=true;say(s,'The exit opens. ANNEX: “You may leave. Your reputation has already gone ahead.”');}}
 return true;
}
export function attackRange(s){const bonus=s.weapon+(s.flags.vexTraining?1:0);return [5+bonus,7+bonus];}
export function combatActions(s){if(!s.combat)return [];return ['Attack','Defend','Use potion','Flee',s.combat.intent==='lethal'?'Switch to nonlethal':'Switch to lethal','Smoke bomb'];}
export function fight(s,action,rng=Math.random){if(!s.combat||s.dead||s.combat.turn!=='player'||!combatActions(s).includes(action))return false;const id=s.combat.enemy,n=s.npcs[id],d=NPCS[id];const roll=(a,b)=>a+Math.floor(Math.min(.999999,Math.max(0,rng()))*(b-a+1));
 if(action.startsWith('Switch to')){s.combat.intent=action==='Switch to nonlethal'?'nonlethal':'lethal';say(s,s.combat.intent==='nonlethal'?'Nonlethal mode: attacks deal 1 less damage and knock out instead of killing. Switching intent does not consume a turn.':'Lethal mode: a finishing attack kills. Switching intent does not consume a turn.');return true;}
 if(action==='Use potion'&&(!s.potions||s.hp===30)){say(s,!s.potions?'No potions. Choose another action.':'Already at full health.');return false;}
 if(action==='Smoke bomb'){if(!s.items.smokeBombs){say(s,'No smoke bombs. Tobin carries them.');return false;}s.items.smokeBombs--;s.combat=null;s.x=1;s.y=4;say(s,'Smoke fills the room. You escape without a retaliatory hit. Your opponent keeps their injuries and memories.');return true;}
 s.combat.turn='enemy';
 if(action==='Attack'){const [lo,hi]=attackRange(s);const damage=roll(lo,hi)-(s.combat.intent==='nonlethal'?1:0);n.hp=Math.max(0,n.hp-damage);say(s,`You hit ${d.name} for ${damage}. ${n.hp} HP remain.`);if(n.hp===0){const nonlethal=s.combat.intent==='nonlethal';n.condition=nonlethal?'unconscious':'dead';n.memory[nonlethal?'knockedOut':'killed']=true;s.combat=null;if(id==='rat'){s.gold+=n.inventory.gold;n.inventory.gold=0;}say(s,nonlethal?`${d.name} is unconscious, not dead. You can loot, wake, or kill them. They do not wake automatically.`:`${d.name} is dead and will stay dead. Loot their remaining possessions if you choose.`);return true;}}
 if(action==='Use potion'){s.potions--;const old=s.hp;s.hp=Math.min(30,s.hp+10);say(s,`Potion restored ${s.hp-old} HP.`);}
 let damage=roll(...d.damage);if(action==='Defend'){damage=Math.floor(damage/2);say(s,'You defend: incoming damage is halved, rounded down.');}s.hp=Math.max(0,s.hp-damage);say(s,`${d.name} hits for ${damage}.`);
 if(s.hp===0){s.dead=true;s.combat=null;say(s,'ANNEX: “Your final performance was brief but legally sufficient.”');return true;}
 if(action==='Flee'){s.combat=null;s.x=1;s.y=4;say(s,'You escape to the entrance after taking one hit. Your opponent remembers.');}else{s.combat.turn='player';say(s,'Your turn.');}return true;
}
export function usePotion(s){if(s.dead||s.complete||s.combat||s.hp>=30||!s.potions)return false;s.potions--;const old=s.hp;s.hp=Math.min(30,s.hp+10);say(s,`Recovered ${s.hp-old} HP.`);return true;}
export function useBandage(s){if(s.dead||s.complete||s.combat||s.hp>=30||!s.items.bandages)return false;s.items.bandages--;const old=s.hp;s.hp=Math.min(30,s.hp+6);say(s,`Bandage restored ${s.hp-old} HP. It can also be given to Mara.`);return true;}
export function useWhetstone(s){if(s.dead||s.complete||s.combat||!s.items.whetstones)return false;s.items.whetstones--;s.weapon++;say(s,'Sharpened your weapon: permanent +1 attack damage.');return true;}
export function openBox(s){if(s.combat||s.dead||s.complete||!s.boxes)return false;s.boxes--;s.potions++;say(s,'Loot box: one healing potion. Corporate generosity, measured with a pipette.');return true;}
export function outcome(s){return PEOPLE.map(id=>{const n=s.npcs[id];return `${NPCS[id].name}: ${n.condition}, ${n.attitude}. ${memoryText(n)}.`;}).join('\n');}
export function encode(s){if(s.dead||s.combat)return null;return JSON.stringify(s);}
function dictionary(v){return v&&typeof v==='object'&&!Array.isArray(v);}
function bools(v){return dictionary(v)&&Object.values(v).every(x=>typeof x==='boolean');}
function count(v){return Number.isInteger(v)&&v>=0&&v<=100000;}
function migrate(s){const old=s.npcs;for(const id of ['mara','rat']){const n=old?.[id];if(!n||!Number.isInteger(n.hp)||n.hp<0||n.hp>NPCS[id].hp||!['neutral','friendly','hostile','dead'].includes(n.state)||(n.state==='dead')!==(n.hp===0))return null;}
 s.npcs=Object.fromEntries(Object.keys(NPCS).map(id=>[id,makeNPC(id)]));for(const id of ['mara','rat']){const n=s.npcs[id],o=old[id];n.hp=o.hp;n.condition=o.state==='dead'?'dead':'conscious';n.attitude=o.state==='dead'?'hostile':o.state;if(n.condition==='dead')n.memory.killed=true;if(n.attitude==='hostile')n.memory.attacked=true;}
 const m=s.npcs.mara;if(m.attitude==='friendly'){m.memory.helped=true;m.memory.befriended=true;}if(s.flags.talked)m.memory.met=true;if(s.flags.stolen){m.memory.stolen=true;m.memory.theftDetected=true;m.inventory.gold=0;m.inventory.key=0;}if(s.flags.traded){m.memory.traded=true;m.inventory.potions=Math.max(0,m.inventory.potions-1);m.inventory.key=0;}if(s.flags.looted){m.memory.looted=true;m.inventory.gold=0;m.inventory.key=0;}if(s.key)m.inventory.key=0;if(s.npcs.rat.condition==='dead')s.npcs.rat.inventory.gold=0;
 s.version=2;s.items={bandages:1,repairKits:0,smokeBombs:0,whetstones:0};s.logSerial=s.log.length;
 if(blocked(s,s.x,s.y)){const candidates=[];for(let y=1;y<=7;y++)for(let x=1;x<=11;x++)if(!blocked(s,x,y))candidates.push({x,y,d:Math.abs(x-s.x)+Math.abs(y-s.y)});candidates.sort((a,b)=>a.d-b.d);s.x=candidates[0].x;s.y=candidates[0].y;}return s;
}
export function decode(raw){try{let s=JSON.parse(raw);if(!dictionary(s)||![1,2].includes(s.version)||!Number.isInteger(s.room)||s.room<0||s.room>4||!Number.isInteger(s.x)||!Number.isInteger(s.y)||s.x<1||s.x>11||s.y<1||s.y>7||s.maxHp!==30||!Number.isInteger(s.hp)||s.hp<1||s.hp>30||s.combat!==null||s.dead!==false||typeof s.complete!=='boolean')return null;
 for(const key of ['potions','gold','cheese','boxes','weapon'])if(!count(s[key]))return null;
 if(typeof s.key!=='boolean'||!bools(s.flags)||!Array.isArray(s.achievements)||s.achievements.some(x=>typeof x!=='string')||!Array.isArray(s.log)||s.log.some(x=>typeof x!=='string'))return null;
 if(s.version===1){s=migrate(s);if(!s)return null;}
 if(!dictionary(s.items)||ITEM_KEYS.some(k=>!count(s.items[k]))||!Number.isSafeInteger(s.logSerial)||s.logSerial<0)return null;
 for(const id of Object.keys(NPCS)){const n=s.npcs?.[id];if(!dictionary(n)||!Number.isInteger(n.hp)||n.hp<0||n.hp>NPCS[id].hp||!ATTITUDES.includes(n.attitude)||!CONDITIONS.includes(n.condition)||(n.condition==='conscious')!==(n.hp>0)||!bools(n.memory)||!dictionary(n.inventory)||STOCK_KEYS.some(k=>!count(n.inventory[k])))return null;}
 if(blocked(s,s.x,s.y))return null;return s;
 }catch{return null;}}

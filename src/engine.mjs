export const rooms = ['Intake', 'Lost Property', 'The Holdout', 'Pest Control', 'Departures'];
export const props = [
  [{id:'fountain',name:'Recovery station',x:4,y:3},{id:'terminal',name:'Welcome terminal',x:8,y:3}],
  [{id:'chest',name:'Abandoned chest',x:4,y:3},{id:'crate',name:'Cracked crate',x:8,y:6},{id:'note',name:'Folded memo',x:8,y:3}],
  [{id:'mara',name:'Mara, another crawler',x:6,y:4},{id:'locker',name:'Emergency locker',x:9,y:3}],
  [{id:'rat',name:'Ratman custodian',x:7,y:4},{id:'pipe',name:'Loose pipe',x:4,y:6}],
  [{id:'stairs',name:'Exit stairs',x:9,y:4},{id:'plaque',name:'Departure plaque',x:5,y:3}]
];
export function fresh(){return {version:1,room:0,x:3,y:5,hp:30,maxHp:30,potions:2,gold:0,cheese:0,key:false,weapon:0,flags:{},achievements:[],boxes:0,npcs:{mara:{hp:20,state:'neutral'},rat:{hp:12,state:'neutral'}},combat:null,dead:false,complete:false,log:['Welcome, crawler. Find an exit key and reach Departures. Your survival is optional to management.']};}
export function say(s,t){s.log.push(t);s.log=s.log.slice(-30);}
export function award(s,id){if(s.achievements.includes(id))return;s.achievements.push(id);s.boxes++;say(s,`Achievement: ${id}. A loot box was added to your pack.`);}
export function blocked(s,x,y){if(x<1||x>11||y<1||y>7)return true;return props[s.room].some(p=>p.x===x&&p.y===y);}
export function move(s,dx,dy){if(s.combat||s.dead||s.complete)return false;let x=s.x+dx,y=s.y+dy;
  if(y===4&&x===12&&s.room<4){s.room++;s.x=1;s.y=4;say(s,`Entered ${rooms[s.room]}.`);return true;}
  if(y===4&&x===0&&s.room>0){s.room--;s.x=11;s.y=4;say(s,`Entered ${rooms[s.room]}.`);return true;}
  if(blocked(s,x,y))return false;s.x=x;s.y=y;return true;
}
export function nearby(s){return props[s.room].filter(p=>Math.abs(p.x-s.x)+Math.abs(p.y-s.y)<=1);}
export function actions(s,id){if(s.dead||s.complete||s.combat)return [];switch(id){
case 'fountain':return ['Inspect','Heal'];case 'terminal':return ['Inspect'];
case 'chest':return ['Inspect',...(s.flags.chest?[]:['Open'])];case 'crate':return ['Inspect',...(s.flags.crate?[]:['Break'])];
case 'note':return ['Inspect','Read'];case 'locker':return ['Inspect',...(s.flags.locker?[]:['Open'])];
case 'mara':return s.npcs.mara.state==='dead'?['Inspect','Loot']:['Inspect','Talk','Trade','Befriend','Threaten','Steal','Fight'];
case 'rat':return s.npcs.rat.state==='dead'?['Inspect']:['Inspect','Talk','Offer cheese','Sneak past','Fight'];
case 'pipe':return ['Inspect','Search'];case 'stairs':return ['Inspect','Unlock exit'];default:return ['Inspect'];}}
function startCombat(s,id){s.npcs[id].state='hostile';s.combat={enemy:id,turn:'player'};say(s,`Combat: ${id==='rat'?'Ratman':'Mara'}. Your turn. Attack 5–7; defend halves the next hit; flee always succeeds but costs one enemy attack.`);}
export function interact(s,id,action){if(!nearby(s).some(p=>p.id===id)||!actions(s,id).includes(action))return false;
 const name=props[s.room].find(p=>p.id===id).name;
 if(action==='Inspect'){const n=s.npcs[id];say(s,n?`${name}: ${n.hp} HP; ${n.state}. Damage ${id==='rat'?'2–3':'4–6'}.`:({fountain:'A suspiciously generous station. Restores all HP, unlimited.',terminal:'Find a key, head east through five rooms, and use the stairs. Mara carries a key; an emergency spare is in her locker.',chest:'Someone forgot to lock this. Management will be furious.',crate:'A cracked crate. Something edible rattles inside.',note:'A maintenance memo with a hastily pencilled warning.',locker:'Emergency exit key. No purchase or violence required.',pipe:'A loose pipe conceals a dark gap.',stairs:'Exit stairs. Requires an exit key.',plaque:'DEPARTURES: Thank you for choosing involuntary adventure.'}[id]||name));return true;}
 if(id==='fountain'){s.hp=s.maxHp;say(s,'Fully healed. Checkpoint reached.');}
 if(id==='chest'){s.flags.chest=true;s.gold+=6;s.potions++;say(s,'Found 6 coins and a healing potion.');}
 if(id==='crate'){s.flags.crate=true;s.cheese++;say(s,'Found pungent cheese. A diplomatic instrument, probably.');}
 if(id==='note'){s.flags.memo=true;say(s,'Memo: “Custodian responds to cheese. Emergency spare key: Mara’s locker. Do NOT drink pipe water.”');}
 if(id==='locker'){s.flags.locker=true;s.key=true;say(s,'You take the emergency spare key. No one objects.');}
 if(id==='pipe'){if(!s.flags.secret){s.flags.secret=true;s.gold+=4;award(s,'Pipe dream');say(s,'Behind the pipe: 4 coins and a secret cache.');}else say(s,'The secret cache is empty.');}
 if(id==='mara'){
  if(action==='Talk'){s.flags.talked=true;say(s,'Mara: “I’m saving up for a door that opens from the inside. Take the spare key from the locker, or trade with me. Your call.”');}
  if(action==='Trade'){if(s.flags.traded)say(s,'Mara: “We already made a deal.”');else if(s.gold<3)say(s,'Mara offers a key and potion for 3 coins. You need more coins.');else{s.gold-=3;s.key=true;s.potions++;s.flags.traded=true;say(s,'Bought an exit key and a potion for 3 coins.');}}
  if(action==='Befriend'){if(!s.flags.talked)say(s,'Try talking to Mara first.');else{s.npcs.mara.state='friendly';s.key=true;award(s,'People person');say(s,'Mara shares her key. “Come back alive. I need someone to complain to.”');}}
  if(action==='Threaten'){if(s.npcs.mara.state==='friendly'){s.npcs.mara.state='neutral';say(s,'Mara recoils. Your friendship is broken.');}else{s.key=true;say(s,'Mara throws you her key, then draws a blade.');startCombat(s,'mara');}}
  if(action==='Steal'){s.key=true;if(!s.flags.stolen){s.flags.stolen=true;s.gold+=3;}say(s,'You grab her key. Mara notices immediately.');startCombat(s,'mara');}
  if(action==='Fight')startCombat(s,'mara');
  if(action==='Loot'){s.key=true;if(!s.flags.looted){s.flags.looted=true;s.gold+=3;say(s,'Recovered Mara’s key and 3 coins.');}else say(s,'You already searched Mara’s belongings.');}
 }
 if(id==='rat'){
  if(action==='Talk')say(s,'Ratman: “Cheese tax. Or go around. I am paid neither way.”');
  if(action==='Offer cheese'){if(!s.cheese)say(s,'You have no cheese. Try the crate in Lost Property.');else{s.cheese--;s.npcs.rat.state='friendly';award(s,'Cheese diplomacy');say(s,'The ratman accepts your tribute. No combat necessary.');}}
  if(action==='Sneak past'){s.flags.sneaked=true;say(s,'You slip along the wall. The custodian pretends not to see. The eastern doorway is clear.');award(s,'Quiet quitting');}
  if(action==='Fight')startCombat(s,'rat');
 }
 if(id==='stairs'){if(!s.key)say(s,'Locked. Mara or the emergency locker in The Holdout can provide a key.');else{s.complete=true;say(s,'Exit unlocked. You survived floor one. Management regrets the inconvenience.');}}
 return true;
}
export function usePotion(s){if(s.dead||s.complete||s.combat)return false;if(s.hp>=s.maxHp){say(s,'Already at full health.');return false;}if(!s.potions){say(s,'No potions left.');return false;}s.potions--;const old=s.hp;s.hp=Math.min(s.maxHp,s.hp+10);say(s,`Recovered ${s.hp-old} HP.`);return true;}
export function openBox(s){if(s.combat||s.dead||s.complete||!s.boxes)return false;s.boxes--;s.potions++;say(s,'Loot box opened: one healing potion. A rare moment of corporate generosity.');return true;}
export function fight(s,action,rng=Math.random){if(!s.combat||s.dead||s.combat.turn!=='player'||!['Attack','Defend','Use potion','Flee'].includes(action))return false;
 const id=s.combat.enemy,n=s.npcs[id];const roll=(a,b)=>a+Math.floor(Math.min(.999999,Math.max(0,rng()))*(b-a+1));
 if(action==='Use potion'&&(!s.potions||s.hp===s.maxHp)){say(s,!s.potions?'No potions. Choose another action.':'Already at full health. Choose another action.');return false;}
 s.combat.turn='enemy';
 if(action==='Attack'){const damage=roll(5,7)+s.weapon;n.hp=Math.max(0,n.hp-damage);say(s,`You hit for ${damage}. ${id==='rat'?'Ratman':'Mara'}: ${n.hp} HP.`);if(n.hp===0){n.state='dead';s.combat=null;if(id==='mara')s.key=true;s.gold+=2;say(s,'Victory. Gained 2 coins. The defeated enemy cannot retaliate.');return true;}}
 if(action==='Use potion'){s.potions--;const old=s.hp;s.hp=Math.min(s.maxHp,s.hp+10);say(s,`Potion restored ${s.hp-old} HP.`);}
 let damage=id==='rat'?roll(2,3):roll(4,6);if(action==='Defend'){damage=Math.floor(damage/2);say(s,'You defend. Incoming damage halved, rounded down.');}
 s.hp=Math.max(0,s.hp-damage);say(s,`${id==='rat'?'Ratman':'Mara'} hits for ${damage}.`);
 if(s.hp===0){s.dead=true;s.combat=null;say(s,'Congratulations. You have discovered what zero hit points means.');return true;}
 if(action==='Flee'){s.combat=null;s.x=1;s.y=4;say(s,'You escape to the room entrance.');}else{s.combat.turn='player';say(s,'Your turn.');}return true;
}
export function encode(s){if(s.dead||s.combat||s.complete)return null;return JSON.stringify(s);}
export function decode(raw){try{let s=JSON.parse(raw);if(!s||s.version!==1||!Number.isInteger(s.room)||s.room<0||s.room>4||!Number.isInteger(s.x)||!Number.isInteger(s.y)||s.x<1||s.x>11||s.y<1||s.y>7||s.maxHp!==30||!Number.isInteger(s.hp)||s.hp<1||s.hp>30||s.combat||s.dead||s.complete)return null;
 for(const k of ['potions','gold','cheese','boxes','weapon'])if(!Number.isInteger(s[k])||s[k]<0||s[k]>100000)return null;
 if(typeof s.key!=='boolean'||!s.flags||typeof s.flags!=='object'||Array.isArray(s.flags)||Object.values(s.flags).some(v=>typeof v!=='boolean')||!Array.isArray(s.achievements)||s.achievements.some(x=>typeof x!=='string')||!Array.isArray(s.log)||s.log.some(x=>typeof x!=='string'))return null;
 for(const id of ['mara','rat']){const n=s.npcs?.[id];if(!n||!Number.isInteger(n.hp)||n.hp<0||n.hp>(id==='rat'?12:20)||!['neutral','friendly','hostile','dead'].includes(n.state)||(n.state==='dead')!==(n.hp===0))return null;}
 if(blocked(s,s.x,s.y))return null;return s;
 }catch{return null;}}

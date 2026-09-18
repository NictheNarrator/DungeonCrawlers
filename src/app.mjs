import {fresh,rooms,props,move,nearby,roomProps,actions,interact,fight,usePotion,useBandage,useWhetstone,openRewardBox,isSafeRoom,BOX_TIERS,encode,decode,say,attackRange,combatActions,outcome,conditionText,chooseStat,xpForNext,classReady,classOptions,chooseClass,CLASSES,RACES,achievementFor,itemOf,equipItem,unequipItem,rarityOf,SLOTS,FACTIONS,standingOf,memberStanding,questState,questCarried,relationshipOf,prologue,register,advanceClock,clockText,dialogueOptions,dialoguePrompt,chooseDialogue,journalUnlocked,knownPeople,knowsFaction,knowsSupplies} from './engine.mjs?v=npc1';
import {COMPANIONS,companionOf} from './companions.mjs';
import {PEOPLE,NPCS,tradePrice,itemName,memoryText,stockText,withPlayer,profileKnown} from './npcs.mjs';
import {bindHoldControls} from './controls.mjs';
const $=id=>document.getElementById(id),canvas=$('game'),screen=canvas.getContext('2d'),world=document.createElement('canvas');world.width=832;world.height=576;const ctx=world.getContext('2d'),STORAGE='dungeoncrawlers.floor1.v1';
let state=fresh(),busyWatch=null,wasRegistered=true,target=null,busy=false,lastKey=0,actionOpen=false,toastTimer,bannerTimer,controls=null,feedback='',npcTab='social',camera={x:0,y:0,scale:1},visual={x:3,y:5},motion=null,frame=0;
const SAFE_KEY='dungeoncrawlers.safe.v1';
// The floor clock only advances while the player is actually playing.
function clockRunning(){return document.visibilityState==='visible'&&!anyDialog()&&!state.dead&&!state.complete&&!state.collapsed;}
function snapshotSafeRoom(){if(!state.registered||state.combat||state.dead)return;if(!isSafeRoom(state))return;const raw=encode(state);if(raw)try{localStorage.setItem(SAFE_KEY,raw);}catch{}}
function loadSafeRoom(){let raw=null;try{raw=localStorage.getItem(SAFE_KEY);}catch{}const saved=raw?decode(raw):null;
 if(!saved){modal('No safe room on file','You have not reached a Safe Room yet.',[['Back',()=>{}]]);return;}
 state=saved;resetView();render();toast('Back at the last Safe Room.');}
function registerFlow(){save();render();modal('CRAWLER REGISTERED','Human. Alive. Mostly intact. Excellent start.\n\nFLOOR COLLAPSE: '+clockText(state.timer)+'\n\nNobody explains the number.',[['Down we go',()=>{}]]);}
function collapseFlow(){save();render();modal('FLOOR COLLAPSE','The Concourse folds in on itself. Anyone still inside is inventory now.\n\nThe timer read 00:00:00.',[['Reload latest save',load],['Last Safe Room',loadSafeRoom],['New game',()=>{state=prologue();resetView();save();render();}]]);}
const dialogs=['modal','pack-modal','menu-modal','journal-modal'];
function anyDialog(){return dialogs.some(id=>$(id).open);}
function stopHold(){controls?.stop();}
function openPanel(id){stopHold();dialogs.forEach(d=>{if($(d).open)$(d).close();});$(id).showModal();}
function saved(){try{return decode(localStorage.getItem(STORAGE));}catch{return null;}}
function save(){const raw=encode(state);if(!raw)return false;try{localStorage.setItem(STORAGE,raw);$('savestatus').textContent='Saved on this device. Saves do not sync between browsers.';return true;}catch{$('savestatus').textContent='Saving is unavailable. Keep this game open to preserve your progress.';return false;}}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),5000);}
// The Dungeon AI line for a freshly opened box.
function aiSay(message){$('toast').textContent='DUNGEON AI: '+message;$('toast').classList.add('show','achievement');clearTimeout(awardTimer);awardTimer=setTimeout(()=>$('toast').classList.remove('show','achievement'),5000);}
// Mara's own screen: who she is to you, what she is carrying, what she remembers.
// Her name and HP ride along in the HUD badge while she is in the fight, so the
// main screen stays uncluttered when she is just walking behind you.
function companionBadge(){if(!state.combat)return '';
 const who=Object.keys(COMPANIONS).find(id=>{const mate=companionOf(state,id);return mate&&mate.recruited&&!mate.left&&state.npcs[id].condition==='conscious';});
 return who?' · '+NPCS[who].name.toUpperCase()+' '+state.npcs[who].hp+'/'+NPCS[who].hp+' HP':'';}
function renderCompanion(){const who=Object.keys(COMPANIONS)[0],mate=companionOf(state,who),npc=state.npcs[who];
 $('companion-name').textContent=NPCS[who].name;
 const rows=[];
 rows.push(article(NPCS[who].name+' · '+npc.condition+' · '+npc.hp+'/'+NPCS[who].hp+' HP',relationshipOf(state,who)));
 const worn=Object.entries(mate.equipped).map(([slot,item])=>item?`${slot}: ${item} (${rarityOf(item)})`:`${slot}: empty`).join('. ');
 rows.push(article('Equipment',worn+'.'));
 if(mate.gear.length)rows.push(article('Spare gear',mate.gear.map(name=>`${name} (${rarityOf(name)})`).join(', ')+'.'));
 const memories=Object.keys(mate.memories).filter(key=>mate.memories[key]);
 rows.push(article('She remembers',memories.length?memories.join(', ')+'.':'Nothing worth holding against you yet.'));
 rows.push(article('Her errand',mate.quest.outcome?`${COMPANIONS[who].quest.title}: ${mate.quest.outcome}.`:`${COMPANIONS[who].quest.title}: ${mate.quest.stage}.`));
 const inCombat=!!state.combat;
 const buttons=[];
 if(mate.separated&&npc.condition==='conscious'&&!inCombat)buttons.push(['Ask her to rejoin',()=>{actOn(who,'Ask her to rejoin');}]);
 if(mate.recruited&&npc.condition==='conscious'&&!inCombat&&isSafeRoom(state))buttons.push(['Check in with her',()=>{actOn(who,'Check in with her');}]);
 if(mate.gear.length&&!inCombat&&!['hostile','resentful'].includes(bandFor(mate.approval).key))buttons.push(['Take back her spare gear',()=>{actOn(who,'Take back her spare gear');}]);
 if(buttons.length){const card=article('Actions','');const wrap=document.createElement('div');wrap.className='actiongrid';
  for(const [label,fn] of buttons){const b=document.createElement('button');b.textContent=label;b.onclick=fn;wrap.append(b);}card.append(wrap);rows.push(card);}
 $('companion-body').replaceChildren(...rows);}
function article(title,text){const card=document.createElement('article'),h=document.createElement('strong'),p=document.createElement('p');h.textContent=title;p.textContent=text;card.append(h,p);return card;}
function actOn(who,action){$('companion-modal').close();interact(state,who,action);save();render();renderCompanion();$('companion-modal').showModal();}
// Opening a box rolls its table, consumes it and answers with the AI line.
function openBox(tier){const result=openRewardBox(state,tier);
 if(!result.ok){$('pack-feedback').textContent=result.reason==='unsafe'?'That box only opens in a safe room.':result.reason==='empty'?'That box is already empty.':'Not now.';return;}
 save();render();
 $('pack-feedback').replaceChildren(rewardLine(`${tier} box: ${result.rarity?result.rarity+' ':''}${result.reward}`+(result.traitName?` — Trait ${result.traitName}: ${result.traitText}`:'')));
 aiSay(result.message+(result.traitName?` Trait ${result.traitName}: ${result.traitText}`:''));}
// The Dungeon AI popup. Several unlocks can land at once, so they queue and
// each gets its own moment in the banner.
let awardQueue=[],awardTimer=null;
function showAward(){if(!awardQueue.length){$('toast').classList.remove('show','achievement');return;}
 const name=awardQueue.shift(),entry=achievementFor(name);
 $('toast').textContent=`NEW ACHIEVEMENT ${awardQueue.length?`(${awardQueue.length} more)`:''}: ${name}\n“${entry?entry.message:'Logged. The dungeon saw that.'}”`;
 $('toast').classList.add('show','achievement');clearTimeout(awardTimer);
 awardTimer=setTimeout(showAward,4500);}
function announce(from){const won=state.achievements.slice(from);if(!won.length)return;
 awardQueue.push(...won);clearTimeout(awardTimer);showAward();}
function modal(title,text,buttons){$('modaltitle').textContent=title;$('modaltext').textContent=text;$('modalbuttons').replaceChildren();for(const [label,fn] of buttons){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{$('modal').close();fn();};$('modalbuttons').append(b);}openPanel('modal');}
function resetView(){awardQueue.length=0;clearTimeout(awardTimer);target=null;npcTab='social';actionOpen=false;feedback='';motion=null;visual={x:state.x,y:state.y};dialogs.forEach(d=>$(d).close());stopHold();}
function load(){const s=saved();if(!s){modal('No living save found','Your save is missing or damaged.',[['Back',()=>{}],['New game',newGame]]);return;}state=s;resetView();render();if(state.complete)endScreen();else toast("Welcome back, crawler.");promptEvents();}
function newGame(){state=prologue();resetView();save();render();toast('Something is wrong with the skyline.');}
function restart(){modal('Start a new shift?','This replaces your saved progress on this device.',[['Keep playing',()=>{if(state.dead||state.complete)endScreen();}],['Start new game',newGame]]);}
function endScreen(){if(state.dead)modal('Employment terminated.','Congratulations. You have discovered what zero hit points means. Your last living save is safe.',[['Load save',load],['New game',restart]]);if(state.complete)modal('You clocked out alive.','ANNEX: “You escaped. Your reputation went ahead.”\n\n'+outcome(state)+'\n\nAchievements: '+(state.achievements.join(', ')||'None this time'),[['Load save',load],['New game',restart]]);}
function changed(){if(!state.dead&&!state.combat)save();snapshotSafeRoom();render();endScreen();promptEvents();dialogueFlow();}
// The level-up screen: +5 maximum HP is already applied, then one ability point.
function pickStat(ability){chooseStat(state,ability);save();render();toast(ability+' increased.');promptLevel();}
function promptLevel(){if(state.combat||state.dead||state.complete||!(state.pending>0)||anyDialog())return;
 modal(`Level ${state.level}`,`Maximum HP is now ${state.maxHp}. Choose one ability to increase.`,[['Strength',()=>pickStat('strength')],['Dexterity',()=>pickStat('dexterity')],['Constitution',()=>pickStat('constitution')],['Intelligence',()=>pickStat('intelligence')],['Wisdom',()=>pickStat('wisdom')],['Charisma',()=>pickStat('charisma')]]);}
// The class event fires once the crawler's habits are clear enough to read.
function takeClass(id){chooseClass(state,id);save();render();toast(CLASSES[id].name+' chosen.');promptEvents();}
function promptClass(){if(state.combat||state.dead||state.complete||!classReady(state)||anyDialog())return;
 const options=classOptions(state);
 modal('Choose a path',`You have survived long enough to specialise. Your habits point at ${options.map(id=>CLASSES[id].name).join(', ')}.`,options.map(id=>[CLASSES[id].name,()=>takeClass(id)]));}
function promptEvents(){promptLevel();promptClass();}
function step(dx,dy){if(busy||anyDialog()||actionOpen)return;const oldRoom=state.room,oldSerial=state.logSerial;const from={...visual};if(move(state,dx,dy)){target=null;feedback='';if(state.room!==oldRoom){motion=null;visual={x:state.x,y:state.y};$('room-banner').textContent=rooms[state.room].toUpperCase();$('room-banner').classList.add('show');clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>$('room-banner').classList.remove('show'),1600);const news=state.log.slice(-(state.logSerial-oldSerial)).filter(line=>!line.startsWith('Entered '));if(news.length)toast(news.join(' '));}else if(matchMedia('(prefers-reduced-motion: reduce)').matches){motion=null;visual={x:state.x,y:state.y};}else motion={from,to:{x:state.x,y:state.y},start:performance.now()};changed();}}
function select(){if(state.combat||state.dead||state.complete||anyDialog())return;stopHold();const near=nearby(state);if(!near.length){toast('Move beside an object or character.');return;}target=near.length===1?near[0].id:null;actionOpen=true;npcTab='social';feedback='';render();}
function action(label,confirmed=false){if(busy||anyDialog())return;if(label==='Kill'&&!confirmed){modal('Kill '+NPCS[target].name+'?',state.npcs[target].condition==='unconscious'?'They are unconscious and cannot fight back. This kills them permanently in this playthrough.':NPCS[target].name+' will fight back. This starts lethal combat.',[['Cancel',()=>{}],['Kill',()=>action(label,true)]]);return;}stopHold();busy=true;clearTimeout(busyWatch);busyWatch=setTimeout(()=>{busy=false;},2500);const wasRegistered=state.registered,wasCombat=!!state.combat,oldSerial=state.logSerial,oldPosition={x:state.x,y:state.y},oldAwards=state.achievements.length;if(state.combat)fight(state,label);else interact(state,target,label);feedback=state.log.slice(-(state.logSerial-oldSerial||0)).filter((_,i)=>state.logSerial!==oldSerial).join(' ');if(state.x!==oldPosition.x||state.y!==oldPosition.y){motion=null;visual={x:state.x,y:state.y};}if(wasCombat&&!state.combat){actionOpen=false;toast(feedback);}else actionOpen=true;changed();announce(oldAwards);if(!wasRegistered&&state.registered)registerFlow();if(state.collapsed&&!wasCombat)collapseFlow();clearTimeout(busyWatch);setTimeout(()=>{busy=false;render();},350);}
function button(label,fn){const b=document.createElement('button');b.textContent=label;b.disabled=busy;b.onclick=fn;return b;}
function render(){
 $('rooms').replaceChildren(...rooms.map((r,i)=>{const el=document.createElement('span');el.className=i===state.room?'active':'';el.setAttribute('aria-label',r);if(i===state.room)el.setAttribute('aria-current','step');return el;}));
 $('roomtitle').textContent=rooms[state.room];$('mode').textContent=(state.combat?'YOUR TURN':'EXPLORING')+(conditionText(state,'player')?' · '+conditionText(state,'player'):'');$('hp').textContent=`${state.hp} / ${state.maxHp}`;$('healthbar').style.width=(100*state.hp/state.maxHp)+'%';$('healthbar').style.background=state.hp<10?'#e08e73':'var(--lime)';$('gold').textContent=state.gold;$('objective').textContent=(state.registered?clockText(state.timer)+' · ':'')+(state.class!=='crawler'?CLASSES[state.class].name+' · ':'')+`Lv ${state.level} · ${state.xp}/${xpForNext(state.level)} XP`+(state.pending>0?' · LEVEL UP':(state.key?' · Key acquired · Head east':' · Find an exit key'));
 $('mode').textContent+=companionBadge();
 $('journal').hidden=!journalUnlocked(state);
 $('companion').hidden=!state.npcs.mara.memory.met;
 document.body.classList.toggle('pre-dungeon',!state.registered);
 $('inventory').replaceChildren(...[`${state.potions} × Healing potion`,`${state.cheese} × Cheese`,`${state.boxes.bronze} × Bronze box`,`${state.boxes.silver} × Silver box`,`${state.boxes.gold} × Gold box`,state.key?'1 × Exit key':'No exit key yet',...Object.entries(state.items).map(([key,n])=>`${n} × ${itemName[key]}`),`Attack: ${attackRange(state).join('–')}`,...(state.accessories||[]).map(name=>`${rarityOf(name)} ${name}`)].map(t=>{const el=document.createElement('span'),chip=itemIcon(t),label=document.createElement('b');if(chip)el.append(chip);label.textContent=t;el.append(label);return el;}));
 // One line per achievement so a long list stays readable and scrollable.
 $('achievements').replaceChildren(...(state.achievements.length?state.achievements.map(name=>{const entry=achievementFor(name),row=document.createElement('article'),title=document.createElement('strong'),line=document.createElement('p');
  title.textContent='◇ '+name;line.textContent=(entry?entry.description:'Logged by the dungeon.')+(entry?` (${entry.reward})`:'');row.append(title,line);return row;}):[Object.assign(document.createElement('p'),{textContent:'Nothing yet. Try doing something regrettable.'})]));
 $('packcount').textContent=state.potions+state.cheese+BOX_TIERS.reduce((sum,tier)=>sum+state.boxes[tier],0)+Object.values(state.items).reduce((a,b)=>a+b,0);
 // Equipment: three named slots, then the pack. Traits are spelled out.
 function gearRow(name,worn,slot){const item=itemOf(name)||{rarity:'common',description:'',traitName:null},row=document.createElement('article'),title=document.createElement('strong'),line=document.createElement('p');
  title.textContent=`${worn?'◈':'◇'} ${slot?slot.toUpperCase()+': ':''}${name} · ${item.rarity}`;
  line.textContent=item.traitName?`Trait ${item.traitName}: ${item.traitText}`:item.description;
  const button=document.createElement('button');button.textContent=worn?'Stow':'Equip';button.onclick=()=>{worn?unequipItem(state,name):equipItem(state,name);save();render();};
  const chip=itemIcon(name);row.append(...(chip?[chip]:[]),title,line,button);return row;}
 $('gear').replaceChildren(...SLOTS.map(slot=>{const name=state.equipped[slot];return name?gearRow(name,true,slot):Object.assign(document.createElement('article'),{textContent:`${slot.toUpperCase()}: empty`});}),...(state.gear||[]).map(name=>gearRow(name,false,null)));
 const stopped=!!(state.combat||state.dead||state.complete);$('potion').disabled=stopped||!state.potions||state.hp===state.maxHp;$('bandage').disabled=stopped||!state.items.bandages||state.hp===state.maxHp;$('sharpen').disabled=stopped||!state.items.whetstones;$('save').disabled=stopped;$('load').disabled=!saved();document.querySelectorAll('[data-move]').forEach(b=>b.disabled=stopped);
 const safe=isSafeRoom(state)&&!stopped;
 $('boxes').replaceChildren(...BOX_TIERS.map(tier=>{const b=document.createElement('button');b.textContent=`Open ${tier} box`;b.disabled=!safe||!state.boxes[tier];b.onclick=()=>openBox(tier);return b;}));
 if(!safe)$('boxes').append(Object.assign(document.createElement('small'),{textContent:'Reward boxes only open in a safe room.'}));
 else if(!BOX_TIERS.some(tier=>state.boxes[tier]>0))$('boxes').append(Object.assign(document.createElement('small'),{textContent:'No unopened boxes.'}));
 $('relationships').replaceChildren(...[...(knowsFaction(state,'survivors')||knowsFaction(state,'ratmen')?[factionCard()]:[]),...(knowsSupplies(state)?[questCard()]:[]),companionCard(),...knownPeople(state).map(id=>{const n=state.npcs[id],card=document.createElement('article');const h=document.createElement('strong');h.textContent=NPCS[id].name+' · '+n.attitude+' · '+n.condition+' · '+memberStanding(state,id);const p=document.createElement('p');p.textContent=memoryText(n)+(profileKnown(n)?'. Carrying: '+stockText(n):'')+'.';card.append(h,p);return card;})]);
 function factionCard(){const card=document.createElement('article'),h=document.createElement('strong'),p=document.createElement('p');
  h.textContent='FACTIONS';p.textContent=Object.keys(FACTIONS).filter(name=>knowsFaction(state,name)).map(name=>`${FACTIONS[name].name}: ${standingOf(state,name)}`).join(' · ');card.append(h,p);return card;}
 function companionCard(){const who=Object.keys(COMPANIONS)[0],mate=companionOf(state,who),npc=state.npcs[who];
  const card=document.createElement('article'),h=document.createElement('strong'),p=document.createElement('p');
  h.textContent=NPCS[who].name.toUpperCase()+' · '+npc.hp+'/'+NPCS[who].hp+' HP'+(mate.recruited?' · travelling with you':mate.left?' · gone':'');
  const worn=Object.entries(mate.equipped).filter(([,item])=>item).map(([slot,item])=>slot+': '+item).join(', ')||'nothing equipped';
  p.textContent=relationshipOf(state,who)+' Carrying: '+worn+'. Quest: '+(mate.quest.outcome||mate.quest.stage)+'.';
  card.append(h,p);return card;}
 function questCard(){const card=document.createElement('article'),h=document.createElement('strong'),p=document.createElement('p');
  const done=questState(state),live=done==='open';h.textContent='THE SUPPLY CACHE';
  p.textContent=live?(questCarried(state)?'You are carrying the cache. Two factions expect it.':'The abandoned chest in Lost Property is still untouched.'):done==='kept'?'You kept the cache. Both sides noticed.':`Delivered to the ${FACTIONS[done].name}.`;
  card.append(h,p);return card;}
 $('log').replaceChildren(...state.log.map(t=>{const el=document.createElement('li');el.textContent=t;return el;}));
 const near=nearby(state);if(!near.some(p=>p.id===target))target=null;if(!target&&near.length===1)target=near[0].id;
 $('interact').disabled=stopped||!near.length;
 {const label=document.createElement('b');label.textContent=near.length?near.map(p=>p.name).join(' / '):'Explore the room';
  const chips=near.map(p=>markerIcon(markerOf(state,p.id))).filter(Boolean);$('nearby-label').replaceChildren(...chips,label);}
 $('shell').classList.toggle('combat',!!state.combat);document.querySelector('.west').hidden=state.room===0;document.querySelector('.east').hidden=state.room===4;
 if(state.combat)actionOpen=true;const showing=actionOpen&&!state.dead&&!state.complete;$('actioncard').hidden=!showing;document.querySelector('.explore-controls').hidden=showing&&!!state.combat;$('close-actions').hidden=!!state.combat;$('action-label').textContent=state.combat?(state.combat.pendingCompanion?NPCS[state.combat.pendingCompanion].name.toUpperCase()+'’S TURN':'COMBAT · YOUR TURN'):'WITHIN REACH';$('actioncard').classList.toggle('companion-turn',!!state.combat?.pendingCompanion);$('action-feedback').textContent=feedback;
 const person=target&&PEOPLE.includes(target)&&state.npcs[target].condition==='conscious'&&!state.combat;$('npc-tabs').hidden=!person;document.querySelectorAll('[data-npc-tab]').forEach(b=>{const on=b.dataset.npcTab===npcTab;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
 $('actions').replaceChildren();if(state.combat){const id=state.combat.enemy,d=NPCS[id],nonlethal=state.combat.intent==='nonlethal';$('target').textContent=d.name+' · '+state.npcs[id].hp+' HP'+(state.combat.enemies.length>1?' · '+state.combat.enemies.length+' ENEMIES':'')+' · RANGE '+state.combat.range;$('targethint').textContent=(nonlethal?'NONLETHAL':'LETHAL')+' · Your damage '+attackRange(state).map(n=>n-(nonlethal?1:0)).join('–')+' · Enemy '+d.damage.join('–')+(conditionText(state,id)?' · '+conditionText(state,id).toUpperCase():'');for(const a of combatActions(state)){const b=button(a,()=>action(a));if(a==='Use potion')b.disabled=busy||!state.potions||state.hp===30;if(a==='Smoke bomb')b.disabled=busy||!state.items.smokeBombs;$('actions').append(b);}}
 else if(target){const n=state.npcs[target];$('target').textContent=(roomProps(state).find(p=>p.id===target)||{}).name||target;let hint=n?n.attitude.toUpperCase()+' · '+n.condition+' · '+n.hp+'/'+NPCS[target].hp+' HP'+((state.party||[]).includes(target)?' · IN YOUR PARTY':(state.allies?.[target]>0?` · ALLY (${state.allies[target]})`:'')):'Choose what happens next.';if(person)hint+=npcTab==='social'?' · Help: '+NPCS[target].help:npcTab==='supplies'?' · Trade: 1 '+itemName[NPCS[target].trade]+' / '+tradePrice(state,target)+' coins':' · Attack/Kill are lethal. Knock unconscious starts nonlethal combat.';$('targethint').textContent=hint;let available=actions(state,target);if(person){const groups={social:['Inspect','Talk','Help','Befriend','Recruit','Lie','Hand it back'],supplies:['Trade','Ask about goods','Offer a fair swap','Pickpocket','Rob openly','Inspect'],conflict:['Threaten','Attack','Knock unconscious','Kill']};available=available.filter(a=>groups[npcTab].includes(a)||(npcTab==='supplies'&&a.startsWith('Sell 1 ')));}for(const a of available)$('actions').append(button(a,()=>action(a)));}
 else{$('target').textContent='Choose an object';$('targethint').textContent='These are within reach.';for(const p of near)$('actions').append(button(p.name,()=>{target=p.id;npcTab='social';feedback='';render();}));}

 {const who=state.combat?state.combat.enemy:target,chip=who?markerIcon(markerOf(state,who)):null;
  if(chip){const label=document.createElement('b');label.textContent=$('target').textContent;$('target').replaceChildren(chip,label);}
  const pips=$('rooms').children;if(pips)for(let i=0;i<pips.length;i++)pips[i].classList?.toggle('safe',i===state.room&&isSafeRoom(state));}
 scheduleDraw();
}
// The world keeps breathing while the player stands still: characters bob, the
// brazier flickers, the stairwell sign pulses. Idle frames are throttled to a
// slow tick instead of running at screen rate, the loop rests whenever a dialog
// is open, and the browser stops requestAnimationFrame on its own when the tab
// is hidden, so nothing animates off-screen.
let tick=0,lastPaint=0;
function lively(){return !document.hidden&&!anyDialog()&&!state.dead&&!state.complete;}
function scheduleDraw(){if(!frame)frame=requestAnimationFrame(t=>{frame=0;if(motion){const p=Math.min(1,(t-motion.start)/140),e=1-(1-p)*(1-p);visual.x=motion.from.x+(motion.to.x-motion.from.x)*e;visual.y=motion.from.y+(motion.to.y-motion.from.y)*e;if(p===1)motion=null;}
 if(motion||t-lastPaint>140){lastPaint=t;tick++;draw();}
 if(motion||lively())scheduleDraw();});}
function present(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const scale=Math.max(r.width/832,r.height/576,.82);const x=Math.max(0,Math.min(832-r.width/scale,visual.x*64+32-r.width/scale/2)),y=Math.max(0,Math.min(576-r.height/scale,visual.y*64+32-r.height/scale/2));camera={x,y,scale};screen.setTransform(dpr,0,0,dpr,0,0);screen.imageSmoothingEnabled=false;screen.clearRect(0,0,r.width,r.height);screen.drawImage(world,x,y,r.width/scale,r.height/scale,0,0,r.width,r.height);}
// One palette per room: the corridor, then the street above it, then the break
// room. A missing entry always falls back to the first so a new area can never
// break the render loop again.
const palettes=[['#2b2f31','#3a3f3d','#6f7a4a'],['#2d2622','#3b322a','#8a5a34'],['#2b2d2e','#3a3c3d','#6d6a62'],['#232d2c','#2c3a37','#5d7f7a'],['#262a33','#333a49','#3c4a63'],['#26292b','#33373a','#6d6a62'],['#1e2a33','#26384a','#4b8fd0']];
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
// Characters. One light direction (top-left highlight, bottom-right shade),
// hard short shadows, and a silhouette that reads at phone size. Guide palette:
// AUTODIRECTION.md, art/floor1-style-guide.png.
// Props. Each interactable gets its own readable silhouette — the guide forbids
// reusing one generic icon for unrelated objects. Light stays top-left.
function propSprite(px,py,type){
 if(type==='vending'||type==='machines'){const live=type==='vending';
  rect(px+12,py+8,40,52,'#3c4a63');rect(px+12,py+8,40,5,'#4f5f7d');rect(px+15,py+16,34,26,'#1b1f21');
  if(live){rect(px+18,py+20,28,4,'#4fc4d8');rect(px+18,py+27,18,3,'#4fc4d8');}else rect(px+18,py+22,20,4,'#8a5a34');
  rect(px+34,py+48,14,6,'#b0a184');return;}
 if(type==='tickets'){rect(px+14,py+14,36,46,'#6d6a62');rect(px+14,py+14,36,5,'#8b877c');
  rect(px+19,py+22,26,14,'#4fc4d8');rect(px+23,py+44,18,4,'#b0a184');rect(px+23,py+51,10,4,'#26292b');return;}
 if(type==='bin'){rect(px+17,py+26,30,34,'#4a453f');rect(px+14,py+21,36,7,'#6d6a62');rect(px+20,py+34,6,20,'#8a5a34');return;}
 if(type==='bag'){rect(px+20,py+32,24,26,'#8a5a34');rect(px+20,py+32,24,4,'#a06a3c');rect(px+26,py+24,12,8,'#1b1f21');return;}
 if(type==='cart'){rect(px+8,py+34,48,12,'#6d6a62');rect(px+8,py+34,48,3,'#8b877c');rect(px+13,py+46,6,10,'#26292b');rect(px+45,py+46,6,10,'#26292b');rect(px+26,py+24,14,10,'#4a453f');return;}
 if(type==='sofa'){rect(px+8,py+26,48,26,'#5d7f7a');rect(px+8,py+26,48,5,'#7d9a94');rect(px+14,py+32,16,14,'#6f7a4a');rect(px+34,py+32,16,14,'#6f7a4a');return;}
 if(type==='kettle'){rect(px+20,py+32,24,20,'#b0a184');rect(px+20,py+32,24,4,'#c8bb9c');rect(px+44,py+36,7,10,'#b0a184');rect(px+27,py+27,10,5,'#6d6a62');return;}
 if(type==='brazier'){const flame=tick%4===0?2:0;rect(px+18,py+34,28,26,'#8a5a34');rect(px+18,py+34,28,4,'#a06a3c');rect(px+24,py+22-flame,16,12+flame,'#d97a34');rect(px+28,py+16-flame,8,8+flame,'#e8c14a');return;}
 if(type==='satchel'){rect(px+16,py+28,32,28,'#8a5a34');rect(px+16,py+28,32,5,'#a06a3c');rect(px+22,py+20,20,9,'#b0a184');rect(px+28,py+36,8,8,'#e8c14a');return;}
 if(type==='locker'){rect(px+16,py+8,32,52,'#3c4a63');rect(px+16,py+8,32,5,'#4f5f7d');rect(px+20,py+16,24,3,'#26292b');rect(px+42,py+30,5,5,'#e8c14a');return;}
 if(type==='plaque'){rect(px+12,py+24,40,22,'#b0a184');rect(px+12,py+24,40,4,'#c8bb9c');rect(px+18,py+33,28,3,'#6d6a62');rect(px+18,py+39,18,3,'#6d6a62');return;}
 if(type==='sign'){rect(px+6,py+12,52,28,'#b0a184');rect(px+6,py+12,52,4,'#c8bb9c');rect(px+12,py+20,20,4,'#3c4a63');rect(px+12,py+29,30,4,'#3c4a63');rect(px+40,py+26,12,8,'#a8332e');return;}
 if(type==='service'||type==='breakdoor'||type==='staffdoor'||type==='exitdoor'){const band=type==='breakdoor'?'#4b8fd0':(type==='exitdoor'?'#6f7a4a':(type==='staffdoor'?'#a8332e':'#e8c14a'));
  rect(px+16,py+4,32,56,'#6d6a62');rect(px+16,py+4,32,5,'#8b877c');rect(px+40,py+30,6,6,'#b0a184');
  rect(px+18,py+46,28,7,band);rect(px+18,py+46,4,7,'#26292b');
  if(type==='exitdoor'){rect(px+20,py+18,24,9,'#b0a184');rect(px+27,py+20,4,5,'#26292b');rect(px+33,py+20,3,3,'#26292b');}
  return;}
 if(type==='stairwell'){const pulse=tick%2?'#4fc4d8':'#8fe3f0';rect(px+6,py+10,52,48,'#1b1f21');for(let i=0;i<5;i++)rect(px+8+i*4,py+50-i*9,48-i*7,8,'#2a2f33');
  rect(px+4,py+4,56,12,'#26292b');rect(px+8,py+8,48,4,pulse);rect(px+8,py+15,22,3,pulse);return;}
 if(type==='map'){rect(px+10,py+12,44,42,'#b0a184');rect(px+10,py+12,44,4,'#c8bb9c');rect(px+15,py+22,16,3,'#3c4a63');rect(px+15,py+29,24,3,'#3c4a63');rect(px+15,py+36,12,3,'#3c4a63');rect(px+40,py+30,9,9,'#4fc4d8');return;}
 if(type==='help'){rect(px+22,py+14,20,48,'#4b8fd0');rect(px+22,py+14,20,5,'#6ba3dd');rect(px+26,py+22,12,14,'#e6e2d6');rect(px+26,py+42,12,4,'#e6e2d6');return;}
 if(type==='wreck'){rect(px+4,py+30,56,20,'#8a5a34');rect(px+14,py+20,30,12,'#6d6a62');rect(px+18,py+22,12,8,'#3c4a63');rect(px+8,py+50,10,6,'#26292b');rect(px+46,py+50,10,6,'#26292b');return;}
 if(type==='awning'){rect(px+6,py+32,52,20,'#3c4a63');rect(px+6,py+32,52,4,'#4f5f7d');for(let i=0;i<4;i++)rect(px+10+i*12,py+38,6,12,'#b0a184');return;}
 if(type==='debris'){rect(px+14,py+44,14,7,'#6d6a62');rect(px+32,py+40,16,10,'#4a453f');rect(px+22,py+34,10,6,'#8a5a34');return;}
 if(type==='terminal'){rect(px+14,py+11,37,44,'#687b76');rect(px+18,py+15,29,29,'#283e35');rect(px+22,py+20,20,3,'#4fc4d8');rect(px+22,py+27,13,3,'#4fc4d8');rect(px+17,py+53,7,5,'#172725');rect(px+43,py+53,7,5,'#172725');return;}
 rect(px+14,py+11,37,44,'#687b76');rect(px+18,py+15,29,29,'#424f4a');rect(px+39,py+32,4,7,'#b0a184');rect(px+17,py+53,7,5,'#172725');rect(px+43,py+53,7,5,'#172725');}
// Item icons. Same palette and top-left light as the world sprites, shrunk to a
// 32px chip: rarity is the frame, item type is the silhouette, so the pack, the
// equipment slots and a reward result all read the same way at phone size.
const RARITY_FRAME={common:'#6d6a62',uncommon:'#5d7f7a',rare:'#4fc4d8',epic:'#a457c4'};
const BOX_FRAME={bronze:'#8a5a34',silver:'#b0a184',gold:'#d9a63f'};
function iconKind(label){const item=itemOf(label);
 if(/bronze box/i.test(label))return 'bronze';if(/silver box/i.test(label))return 'silver';if(/gold box/i.test(label))return 'gold';
 if(/potion/i.test(label))return 'potion';if(/cheese/i.test(label))return 'cheese';if(/bandage/i.test(label))return 'bandage';
 if(/whetstone/i.test(label))return 'whetstone';if(/bomb/i.test(label))return 'bomb';if(/repair kit/i.test(label))return 'repair kit';
 if(/exit key/i.test(label))return 'key';if(/attack/i.test(label))return null;
 return item?item.type:null;}
export function itemIcon(label){const kind=iconKind(label);if(!kind)return null;
 const chip=document.createElement('canvas');chip.width=chip.height=32;chip.className='item-chip';chip.setAttribute('aria-hidden','true');
 const g=chip.getContext('2d');if(!g)return chip;
 const paint=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
 const item=itemOf(label),frame=BOX_FRAME[kind]||RARITY_FRAME[item?.rarity||'common'];
 paint(1,1,30,30,frame);paint(3,3,26,26,'#152724');
 if(kind==='potion'||kind==='bronze'||kind==='silver'||kind==='gold'||kind==='bomb'){
  if(kind==='potion'){paint(12,14,8,12,'#a8332e');paint(13,15,3,9,'#d4544c');paint(13,10,6,4,'#e6e2d6');paint(14,11,2,2,'#8a5a34');}
  else if(kind==='bomb'){paint(10,15,12,12,'#4a453f');paint(11,16,4,5,'#6d6a62');paint(15,10,3,5,'#8a5a34');paint(17,8,3,3,'#e8c14a');}
  else{paint(8,12,16,14,BOX_FRAME[kind]);paint(8,12,16,3,'#e6e2d6');paint(14,8,4,5,'#26292b');paint(11,16,10,6,'#26292b');paint(13,18,6,2,BOX_FRAME[kind]);}
 }else if(kind==='cheese'){paint(8,14,16,11,'#e8c14a');paint(8,14,16,3,'#f3d97c');paint(11,18,3,3,'#8a5a34');paint(17,21,3,2,'#8a5a34');}
 else if(kind==='bandage'||kind==='repair kit'){paint(8,14,16,11,'#e6e2d6');paint(8,14,16,3,'#f4f1e8');paint(10,11,3,6,'#a8332e');paint(19,11,3,6,'#a8332e');if(kind==='repair kit')paint(14,17,4,5,'#6d6a62');}
 else if(kind==='whetstone'){paint(7,19,18,6,'#6d6a62');paint(7,19,18,2,'#8b877c');paint(10,14,12,5,'#b0a184');}
 else if(kind==='key'){paint(12,11,8,8,'#e8c14a');paint(14,13,4,4,'#152724');paint(15,19,3,8,'#e8c14a');paint(18,21,4,2,'#e8c14a');}
 else if(kind==='weapon'){paint(9,21,14,4,'#8a5a34');paint(14,8,4,14,'#cfd6d2');paint(12,10,9,3,'#cfd6d2');}
 else if(kind==='armor'){paint(10,10,12,14,'#5d7f7a');paint(10,10,12,3,'#7d9a94');paint(7,13,4,7,'#5d7f7a');paint(21,13,4,7,'#5d7f7a');}
 else{paint(14,10,4,4,'#b0a184');paint(10,15,12,8,'#b0a184');paint(12,16,3,6,'#c8bb9c');}
 return chip;}
// Interaction icon in the world: colour-coded corner brackets around whatever is
// within reach, so an object reads by category without hiding its own sprite.
// Chunky filled arms, not strokes: everything else here is a fill, and a stroked
// path would blur when the canvas is scaled up on a phone.
function brackets(x,y,color){const t=3,arm=13,w=57;
 rect(x,y,arm,t,color);rect(x,y,t,arm,color);
 rect(x+w-arm,y,arm,t,color);rect(x+w-t,y,t,arm,color);
 rect(x,y+w-t,arm,t,color);rect(x,y+w-arm,t,arm,color);
 rect(x+w-arm,y+w-t,arm,t,color);rect(x+w-t,y+w-arm,t,arm,color);}
// A one-line result with its icon, used wherever a reward is announced.
function rewardLine(text){const wrap=document.createElement('span'),chip=itemIcon(text),label=document.createElement('b');if(chip)wrap.append(chip);label.textContent=text;wrap.append(label);return wrap;}
// One simplified marker language for everything that is not an item: a category,
// not an identity. The guide wants a handful of shapes that stay legible at 16px
// — loot, person, enemy, door, safe room, stairs, objective — so a new prop
// never needs its own marker.
const MARKERS={person:'#b0a184',enemy:'#a8332e',loot:'#d9a63f',door:'#e8c14a',safe:'#4b8fd0',stairs:'#4fc4d8',objective:'#d97a34',prop:'#6d6a62'};
const LOOT_IDS=['chest','crate','satchel','bag','note','locker','pipe','bin','whetstone'];
const DOOR_IDS=['service','staffdoor','exitdoor'];
export function markerOf(s,id){
 if(id==='stairs'||id==='stairwell')return 'stairs';
 if(id==='breakdoor')return 'safe';
 if(DOOR_IDS.includes(id))return 'door';
 const n=s.npcs[id];
 if(n&&PEOPLE.includes(id))return n.condition!=='conscious'||n.attitude==='hostile'?'enemy':'person';
 if(id==='chest'&&questState(s)==='open')return 'objective';
 return LOOT_IDS.includes(id)?'loot':'prop';}
export function markerIcon(category){const tint=MARKERS[category];if(!tint)return null;
 const chip=document.createElement('canvas');chip.width=chip.height=16;chip.className='marker-chip';chip.setAttribute('aria-hidden','true');
 const g=chip.getContext('2d');if(!g)return chip;
 const paint=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
 paint(0,0,16,16,'#101b1c');paint(1,1,14,14,'#152724');
 if(category==='person'){paint(6,3,4,4,tint);paint(4,7,8,5,tint);}
 else if(category==='enemy'){paint(4,4,3,6,tint);paint(9,4,3,6,tint);paint(4,10,8,2,tint);paint(5,12,2,2,tint);paint(9,12,2,2,tint);}
 else if(category==='loot'){paint(6,3,4,2,tint);paint(4,5,8,3,tint);paint(5,8,6,5,tint);}
 else if(category==='door'){paint(4,3,8,10,tint);paint(5,4,6,8,'#152724');paint(9,8,2,2,tint);}
 else if(category==='safe'){paint(2,3,12,3,tint);paint(3,6,10,3,tint);paint(5,9,6,2,tint);paint(7,11,2,2,tint);}
 else if(category==='stairs'){paint(3,4,4,2,tint);paint(4,7,6,2,tint);paint(5,10,8,2,tint);}
 else if(category==='objective'){paint(5,5,6,6,tint);paint(7,7,2,2,'#152724');paint(7,2,2,2,tint);paint(7,12,2,2,tint);paint(2,7,2,2,tint);paint(12,7,2,2,tint);}
 else{paint(4,4,8,8,tint);paint(6,6,4,4,'#152724');}
 return chip;}
const look={
 player:{skin:'#b0a184',coat:'#6f7a4a',trim:'#b6c187',head:'#3c4a63'},
 mara:{skin:'#b0a184',coat:'#8a5a34',trim:'#b0a184',pack:'#3c4a63'},
 tobin:{skin:'#b0a184',coat:'#6f7a4a',trim:'#8a5a34',hat:'#8a5a34'},
 vex:{skin:'#b0a184',coat:'#3c4a63',trim:'#b0a184',blade:'#cfd6d2'},
skrit:{fur:'#5d7f7a',skin:'#5d7f7a',coat:'#5d7f7a',trim:'#b0a184',bandage:'#e6e2d6'},
rat:{fur:'#6d6a62',skin:'#6d6a62',coat:'#5d7f7a',trim:'#b0a184'},
 skulker:{fur:'#7d8a74',coat:'#3c4a63',trim:'#b0a184',sling:'#8a5a34'},
 brute:{fur:'#6b6b58',coat:'#8a5a34',trim:'#b0a184',plate:'#4a453f'},
 stranger1:{skin:'#b0a184',coat:'#6d6a62',trim:'#9a978c'},
 stranger2:{skin:'#b0a184',coat:'#8a5a34',trim:'#9a978c'}
};
// Special locations get a marked floor: a colour-coded band at the base of the
// tile, so a recovery station, the exit stairs, a safe-room threshold and the
// stairwell entrance read as places rather than just props. Drawn first, so it
// always sits under the sprite.
const FLOOR_MARKS={fountain:['#8ba79d','#a8d3c4'],stairs:['#e8c14a','#8a5a34'],breakdoor:['#4b8fd0','#8fc4ef'],stairwell:['#4fc4d8','#2a6f7d']};
function floorMark(id,x,y){const band=FLOOR_MARKS[id];if(!band)return;const px=x*64,py=y*64;
 rect(px+5,py+55,54,6,band[0]);
 if(id==='stairs'){for(let i=0;i<4;i++)rect(px+9+i*13,py+55,6,6,band[1]);}
 else rect(px+13,py+56,38,4,band[1]);}
// Living things breathe: a one-pixel dip, offset per tile so a crowd never moves
// in lockstep. Scenery stands perfectly still.
function breathing(x,y,type,condition){return condition==='conscious'&&look[type]&&(tick+(x*3+y*5)%5)%8<4?-1:0;}
function sprite(x,y,type,condition='conscious'){const px=x*64,py=y*64+breathing(x,y,type,condition);
 floorMark(type,x,y);
 rect(px+13,py+47,40,8,'#1b1f21');
 if(condition==='dead'||condition==='unconscious'){rect(px+14,py+38,38,13,'#4a453f');rect(px+17,py+40,32,5,'#6d6a62');rect(px+44,py+34,11,9,'#b0a184');
  ctx.font='13px monospace';ctx.fillStyle=condition==='dead'?'#a8332e':'#4fc4d8';ctx.fillText(condition==='dead'?'×':'Zz',px+24,py+26);return;}
 const c=look[type];
 if(c&&!['rat','skrit','skulker','brute'].includes(type)){const coat=c.coat;
  rect(px+22,py+12,20,17,c.skin);
  rect(px+22,py+12,20,4,'#c8bb9c');rect(px+37,py+25,5,4,'#8d8168');
  rect(px+31,py+19,3,4,'#26292b');rect(px+39,py+19,3,4,'#26292b');
  rect(px+21,py+29,22,19,coat);rect(px+21,py+29,22,4,c.trim);rect(px+37,py+44,6,4,'#26292b');
  rect(px+17,py+31,5,15,coat);rect(px+42,py+31,5,15,coat);
  rect(px+21,py+48,8,8,'#26292b');rect(px+35,py+48,8,8,'#26292b');
  if(type==='player'){rect(px+20,py+7,24,7,c.head);rect(px+17,py+12,30,4,c.head);rect(px+20,py+31,3,17,c.trim);}
  if(type==='mara'){rect(px+44,py+33,10,12,c.pack);rect(px+19,py+33,3,16,'#e6e2d6');}
  if(type==='tobin'){rect(px+13,py+32,12,18,c.trim);rect(px+19,py+9,26,6,c.hat);rect(px+18,py+14,28,3,c.hat);}
  if(type==='vex'){rect(px+49,py+12,3,34,c.blade);rect(px+45,py+42,11,4,'#b0a184');}
  if(type.startsWith('stranger')){rect(px+24,py+18,14,3,'#a8332e');}
  return;}
 if(type==='rat'||type==='skrit'||type==='skulker'||type==='brute'){const fur=c.fur,coat=c.coat;
  if(type==='brute'){rect(px+15,py+28,8,20,fur);rect(px+43,py+28,8,20,fur);rect(px+18,py+8,8,8,fur);rect(px+40,py+8,8,8,fur);}
  rect(px+21,py+14,21,17,fur);rect(px+21,py+14,21,4,'#7d9a94');
  rect(px+15,py+8,9,10,fur);rect(px+39,py+8,9,10,fur);
  rect(px+30,py+20,3,3,'#a8332e');rect(px+39,py+20,3,3,'#a8332e');
  rect(px+26,py+26,11,4,'#e6e2d6');
  rect(px+20,py+30,23,18,coat);rect(px+20,py+30,23,4,'#7d9a94');rect(px+37,py+44,6,4,'#26292b');
  rect(px+16,py+32,5,14,coat);rect(px+42,py+32,5,14,coat);
  rect(px+21,py+48,8,8,'#26292b');rect(px+35,py+48,8,8,'#26292b');
  rect(px+45,py+34,4,20,fur);
  if(type==='skrit'){rect(px+35,py+44,9,6,c.bandage,'#a8332e');}
  if(type==='brute'){rect(px+19,py+29,28,7,c.plate);rect(px+19,py+29,28,3,'#5f6355');}
  if(type==='skulker'){rect(px+14,py+30,5,18,c.coat);rect(px+47,py+22,3,20,c.sling);rect(px+23,py+9,17,5,c.coat);}
  return;}
 if(type==='chest'||type==='crate'){rect(px+12,py+24,42,29,'#665036');rect(px+12,py+18,42,13,'#a6804e');rect(px+15,py+23,36,3,'#bc9963');rect(px+16,py+33,34,3,'#493b2c');rect(px+30,py+28,7,12,'#dfc782');if(type==='crate'){rect(px+17,py+20,5,33,'#bb9461');rect(px+45,py+20,5,33,'#bb9461');}return;}
 if(type==='fountain'){rect(px+9,py+27,47,25,'#697d76');rect(px+14,py+22,37,24,'#92a599');rect(px+19,py+27,27,13,'#6bc1b0');rect(px+23,py+30,10,3,'#a4e2c7');rect(px+27,py+10,10,16,'#8ba79d');return;}
 if(type==='stairs'){for(let i=0;i<5;i++){rect(px+5+i*5,py+51-i*9,53-i*7,8,i%2?'#abb6a1':'#849483');}return;}
 if(type==='pipe'){rect(px+9,py+22,45,12,'#70867d');rect(px+40,py+22,12,28,'#70867d');rect(px+15,py+19,5,18,'#a0aba0');rect(px+38,py+40,16,5,'#a0aba0');return;}
 if(type==='note'){rect(px+19,py+21,28,33,'#cabd8d');for(let i=0;i<4;i++)rect(px+24,py+28+i*5,16,2,'#786c4c');return;}
 if(type==='whetstone'){rect(px+13,py+41,38,12,'#6d6a62');rect(px+13,py+41,38,3,'#8b877c');rect(px+19,py+35,26,8,'#b0a184');rect(px+19,py+35,26,3,'#c8bb9c');rect(px+44,py+45,9,4,'#4a453f');return;}
 propSprite(px,py,type);}
// Environment tiles: clean, dirty, cracked, bloodstained, grate, hazard stripe
// and sludge, layered deterministically so a room reads the same every visit.
// Walls get damaged chunks and a subway band; the base palette stays dirty and
// each accent means something.
function tileDetail(x,y,solid){const h=((x*73856093)^(y*19349663)^((state.room+1)*83492791))>>>0,px=x*64,py=y*64;
 if(solid){if(h%3===0)rect(px+38,py+30,18,16,'#20272a');if(h%5===0)rect(px+22,py+34,20,2,'#b0a184');if(h%7===0)rect(px+18,py+8,26,9,'#3c4a63');return;}
 if(h%6===0){rect(px+12,py+18,6,2,'#1b1f21');rect(px+18,py+22,8,2,'#1b1f21');}
 if(h%9===0)rect(px+10,py+40,26,10,'#4a453f');
 if(h%13===0)for(let i=0;i<4;i++)rect(px+16+i*8,py+26,4,14,'#1b1f21');
 if(h%17===0)rect(px+34,py+12,18,10,'#a8332e');
 if(state.room===3&&h%4===0)rect(px+8,py+44,44,8,'#3b4a45');
 if(state.room===4&&h%8===0)rect(px+8,py+14,48,3,'#e8c14a');
 if(state.room===5&&h%5===0)rect(px+14,py+30,20,9,'#6d6a62');}
function draw(){const [a,b,wall]=palettes[state.room]||palettes[0];ctx.clearRect(0,0,832,576);rect(0,0,832,576,'#111b1c');for(let y=0;y<9;y++)for(let x=0;x<13;x++){const edge=x===0||x===12||y===0||y===8;const door=y===4&&((x===0&&state.room>0)||(x===12&&state.room<4));rect(x*64+1,y*64+1,62,62,edge&&!door?'#28312f':(x+y)%2?a:b);tileDetail(x,y,edge&&!door);if(edge&&!door){rect(x*64+2,y*64+4,60,11,wall);rect(x*64+3,y*64+20,58,3,'#151f1d');rect(x*64+31,y*64+4,3,16,'#222e2b');}else{rect(x*64+6,y*64+58,52,2,'#1b292644');if((x*7+y*11)%6===0)rect(x*64+13,y*64+21,8,3,'#6a766033');if(door){ctx.fillStyle='#d8e69c';ctx.font='24px monospace';ctx.fillText(x===0?'←':'→',x*64+21,y*64+39);}}}
 for(const p of roomProps(state)){const near=nearby(state).some(n=>n.id===p.id);if(near)brackets(p.x*64+5,p.y*64+4,p.id===target?'#e6e2d6':MARKERS[markerOf(state,p.id)]);sprite(p.x,p.y,p.id,state.npcs[p.id]?.condition||'conscious');if((p.id==='chest'&&state.flags.chest)||(p.id==='crate'&&state.flags.crate)){rect(p.x*64+8,p.y*64+28,49,4,'#1b2420');}if(state.npcs[p.id]?.attitude==='friendly'&&state.npcs[p.id]?.condition==='conscious'){ctx.fillStyle='#d9ec9b';ctx.font='13px monospace';ctx.fillText('♥',p.x*64+28,p.y*64+5);}}
 for(const p of roomProps(state).filter(p=>PEOPLE.includes(p.id))){ctx.font='11px monospace';ctx.textAlign='center';ctx.fillStyle=({friendly:'#d6ef9b',neutral:'#e5dcc3',suspicious:'#e4ba75',hostile:'#e8988d'})[state.npcs[p.id].attitude];ctx.fillText(withPlayer(state).includes(p.id)?NPCS[p.id].name+' ✦':NPCS[p.id].name,p.x*64+32,p.y*64+3);ctx.textAlign='left';}
 ctx.strokeStyle='#cce59e55';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(visual.x*64+33,visual.y*64+53,24,8,0,0,Math.PI*2);ctx.stroke();sprite(visual.x,visual.y,'player',state.dead?'dead':'conscious');
 ctx.fillStyle='#cbd8bb';ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText('YOU',visual.x*64+33,visual.y*64+3);ctx.textAlign='left';present();
}
controls=bindHoldControls(document.querySelectorAll('[data-move]'),{move:step,canMove:()=>!busy&&!anyDialog()&&!actionOpen&&!state.combat&&!state.dead&&!state.complete});
window.addEventListener('blur',stopHold);document.addEventListener('visibilitychange',()=>{stopHold();if(document.hidden)save();});
document.addEventListener('keydown',e=>{if(anyDialog())return;const dirs={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};const key=e.key.length===1?e.key.toLowerCase():e.key;if(dirs[key]){e.preventDefault();if(Date.now()-lastKey>105){step(...dirs[key]);lastKey=Date.now();}}if(key==='e'&&!e.repeat)select();if(key==='Escape'&&!state.combat){actionOpen=false;render();}});
canvas.addEventListener('click',e=>{if(anyDialog()||state.combat)return;if(actionOpen){actionOpen=false;render();return;}const r=canvas.getBoundingClientRect(),x=Math.floor((camera.x+(e.clientX-r.left)/camera.scale)/64),y=Math.floor((camera.y+(e.clientY-r.top)/camera.scale)/64),p=nearby(state).find(p=>p.x===x&&p.y===y);if(p){target=p.id;npcTab='social';actionOpen=true;feedback='';render();}else if(Math.abs(x-state.x)+Math.abs(y-state.y)===1)step(x-state.x,y-state.y);});
document.querySelectorAll('[data-npc-tab]').forEach(b=>b.onclick=()=>{npcTab=b.dataset.npcTab;render();});
$('bandage').onclick=()=>{if(useBandage(state)){changed();$('pack-feedback').textContent=state.log.at(-1);}};$('sharpen').onclick=()=>{if(useWhetstone(state)){changed();$('pack-feedback').textContent=state.log.at(-1);}};
$('interact').onclick=select;$('close-actions').onclick=()=>{actionOpen=false;feedback='';render();};$('menu').onclick=()=>openPanel('menu-modal');$('pack').onclick=()=>{$('pack-feedback').textContent='';openPanel('pack-modal');};$('journal').onclick=()=>openPanel('journal-modal');document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('potion').onclick=()=>{if(usePotion(state)){changed();$('pack-feedback').textContent=state.log.at(-1);}};$('save').onclick=()=>{if(save())$('savestatus').textContent='Saved. You can return to this browser to continue.';};$('load').onclick=()=>modal('Load your last save?','Return to your latest living checkpoint.',[['Cancel',()=>{}],['Load save',load]]);$('new').onclick=restart;
$('help').onclick=()=>modal('Your first shift','Hold a direction to move. The camera follows you. Doorways are halfway along the east and west walls.\nStand beside a character or object, then tap Interact.\nFind an exit key from Mara or her locker, then reach the stairs. Fighting is optional.\nNPC approaches are grouped into Social, Supplies, and Conflict. Their attitudes, injuries, possessions, and memories persist. Pickpocketed NPCs notice on room exit. Field notes show relationship history.\nIn combat, use nonlethal mode to knock out or lethal mode to kill. Switching intent is free. Smoke escapes without a hit. Potions heal 10 HP; defend halves the next hit.\nProgress saves on this device outside combat. Open the menu to save, load, or restart.',[['Let’s go',()=>{}]]);
$('modal').addEventListener('cancel',e=>{if(state.dead||state.complete)e.preventDefault();});new ResizeObserver(scheduleDraw).observe($('viewport'));
if(!saved())state=prologue();render();const prior=saved();if(prior)modal('Back for another shift?','Your last living checkpoint is ready.',[['Continue',load],['New game',restart]]);else{save();render();toast('Something is wrong with the skyline.');}
// Offline play: the service worker precaches the game shell so a Home Screen
// launch works without a connection. Registration is silent and harmless
// where the API or a secure context is missing.
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
$('companion').onclick=()=>{renderCompanion();openPanel('companion-modal');};
// The floor clock: one second of active play at a time, never wall-clock time.
setInterval(()=>{if(!clockRunning())return;const wasRegistered=state.registered,wasDead=state.dead;
 advanceClock(state,1);
 if(!wasRegistered&&state.registered){registerFlow();return;}
 if(state.dead&&!wasDead){collapseFlow();return;}
 render();},1000);
// Any pending player-choice conversation opens as a modal with one button per
// reply. The engine owns what each reply does; this only presents them.
function dialogueFlow(){if(!state.pendingDialogue||anyDialog())return;const options=dialogueOptions(state);if(!options.length)return;
 const who=state.pendingDialogue.id;
 modal(NPCS[who].name,dialoguePrompt(state),options.map((option,index)=>[option.label,()=>{
  chooseDialogue(state,index);save();render();toast(state.log.at(-1));promptEvents();}]));}

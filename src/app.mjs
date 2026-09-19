import {conversationFor} from './conversation.mjs';
import {portraitFor,PORTRAIT_SIZE} from './portraits.mjs';
import {PALETTE as P,shade} from './palette.mjs';
import {fresh,rooms,props,move,nearby,roomProps,actions,interact,fight,usePotion,useBandage,useWhetstone,openRewardBox,isSafeRoom,BOX_TIERS,encode,decode,say,attackRange,combatActions,outcome,conditionText,chooseStat,xpForNext,classReady,classOptions,chooseClass,CLASSES,RACES,achievementFor,itemOf,equipItem,unequipItem,rarityOf,SLOTS,FACTIONS,standingOf,memberStanding,questState,questCarried,relationshipOf,prologue,register,advanceClock,clockText,dialogueOptions,dialoguePrompt,chooseDialogue,journalUnlocked,knownPeople,knowsFaction,knowsSupplies,exitAt,EXITS} from './engine.mjs?v=wp1';
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
const dialogs=['modal','pack-modal','menu-modal','journal-modal','talk-modal'];
const leaveTalk=()=>closeTalk();
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
// The conversation scene: a portrait, what they just said, and the lines you
// can actually say back. The engine still runs every consequence.
let talkPage=0;
function openTalk(id){target=id;talkPage=0;$('actioncard').hidden=true;openPanel('talk-modal');renderTalk();}
function closeTalk(){$('talk-modal').close();render();}
// A character can have an illustrated portrait file; if that file loads it wins,
// and until it does (or if it never exists) the drawn portrait is used. The world
// sprite is the last resort, so this can never render an empty frame.
const portraitCache=new Map();
function portraitImage(src){if(!src||typeof Image==='undefined')return null;
 if(portraitCache.has(src)){const held=portraitCache.get(src);return held==='loading'?null:held;}
 portraitCache.set(src,'loading');
 const img=new Image();img.onload=()=>{portraitCache.set(src,img);if(target)renderTalk();};
 img.onerror=()=>portraitCache.set(src,null);img.src=src;return null;}
function drawPortrait(id,condition){const canvas=$('talk-portrait'),g=canvas.getContext('2d');if(!g)return;
 g.setTransform(1,0,0,1,0,0);const entry=portraitFor(id),drawn=entry&&entry.draw;
 const picture=portraitImage(entry&&entry.variants&&entry.variants[condition])||portraitImage(entry&&entry.file);
 if(picture){g.imageSmoothingEnabled=false;g.drawImage(picture,0,0,canvas.width,canvas.height);return;}
 if(drawn){const scale=canvas.width/PORTRAIT_SIZE.w;g.setTransform(scale,0,0,scale,0,0);drawn(g);g.setTransform(1,0,0,1,0,0);return;}
 // somebody with no portrait at all: their world sprite, enlarged
 g.fillStyle='#0b2a5f';g.fillRect(0,0,canvas.width,canvas.height);
 g.fillStyle='#1d3a33';g.fillRect(6,6,canvas.width-12,canvas.height-12);
 g.setTransform(3,0,0,3,-8,-24);paint=g;sprite(1,1,id,condition||'conscious');paint=ctx;g.setTransform(1,0,0,1,0,0);}
function renderTalk(){const id=target;if(!id||!state.npcs[id])return;
 const scene=conversationFor(state,id);
 $('talk-name').textContent=scene.name;$('talk-rel').textContent=scene.relationship;
 drawPortrait(id,state.npcs[id].condition);
 $('talk-line').textContent=scene.line;
 const perPage=4,all=scene.replies,pages=Math.max(1,Math.ceil(all.length/perPage));if(talkPage>=pages)talkPage=0;
 const replies=all.slice(talkPage*perPage,talkPage*perPage+perPage),list=$('talk-replies');list.replaceChildren();
 for(const reply of replies){const b=document.createElement('button');b.className='talk-reply';
  if(reply.skill){const tag=document.createElement('span');tag.className='talk-skill';tag.textContent='['+reply.skill+']';b.append(tag);}
  const said=document.createElement('span');said.textContent=reply.text;b.append(said);
  b.onclick=()=>{const who=id;$('talk-modal').close();
   if(reply.dialogue!==undefined){const picked=dialogueOptions(state)[reply.dialogue];chooseDialogue(state,reply.dialogue);state.pendingDialogue=null;save();}
   else action(reply.action);
   promptEvents();if(state.combat||state.dead||state.complete){render();return;}openTalk(who);};
  list.append(b);}
 const more=$('talk-more');if(more)more.hidden=pages<2;
 $('talk-leave').textContent='End the conversation';}
export function openConversation(id){openTalk(id);}
function resetView(){awardQueue.length=0;clearTimeout(awardTimer);target=null;npcTab='social';actionOpen=false;feedback='';motion=null;visual={x:state.x,y:state.y};dialogs.forEach(d=>$(d).close());stopHold();}
function load(){const s=saved();if(!s){modal('No living save found','Your save is missing or damaged.',[['Back',()=>{}],['New game',newGame]]);return;}state=s;resetView();render();if(state.complete)endScreen();else toast("Welcome back, crawler.");promptEvents();}
function newGame(){state=prologue();resetView();save();render();toast('Something is wrong with the skyline.');}
function restart(){modal('Start a new shift?','This replaces your saved progress on this device.',[['Keep playing',()=>{if(state.dead||state.complete)endScreen();}],['Start new game',newGame]]);}
function endScreen(){if(state.dead)modal('Employment terminated.','Congratulations. You have discovered what zero hit points means. Your last living save is safe.',[['Load save',load],['New game',restart]]);if(state.complete)modal('FLOOR ONE COMPLETE','ANNEX: “You may leave. Your reputation has already gone ahead.”\n\nThe next floor is not part of this build yet. Your crawler is saved here, exactly as they are.\n\n'+outcome(state),[['Load save',load],['New game',restart]]);}
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
 $('rooms').replaceChildren(...rooms.map((r,i)=>{const el=document.createElement('span');el.className=(i===state.room?'active ':'')+(i===state.room||state.flags['seen'+i]?'':'unseen');el.setAttribute('aria-label',r);if(i===state.room)el.setAttribute('aria-current','step');return el;}));
 $('roomtitle').textContent=rooms[state.room];$('mode').textContent=(state.combat?'YOUR TURN':'EXPLORING')+(conditionText(state,'player')?' · '+conditionText(state,'player'):'');$('hp').textContent=`${state.hp} / ${state.maxHp}`;$('healthbar').style.width=(100*state.hp/state.maxHp)+'%';$('healthbar').style.background=state.hp<10?'#e08e73':'var(--lime)';$('gold').textContent=state.gold;$('objective').textContent=(state.registered?clockText(state.timer)+' · ':'')+(state.class!=='crawler'?CLASSES[state.class].name+' · ':'')+`Lv ${state.level} · ${state.xp}/${xpForNext(state.level)} XP`+(state.pending>0?' · LEVEL UP':(state.key?' · Key acquired · Head east':' · Find an exit key'));
 $('mode').textContent+=companionBadge();
 $('journal').hidden=!journalUnlocked(state);
 $('companion').hidden=!state.npcs.mara.memory.met;
 document.body.classList.toggle('pre-dungeon',!state.registered);
 $('inventory').replaceChildren(...[`${state.potions} × Healing potion`,`${state.cheese} × Cheese`,`${state.boxes.bronze} × Bronze box`,`${state.boxes.silver} × Silver box`,`${state.boxes.gold} × Gold box`,state.key?'1 × Exit key':'No exit key yet',...Object.entries(state.items).filter(([key,n])=>n>0||key!=="badge"||state.flags.badgeKnown).map(([key,n])=>`${n} × ${itemName[key]}`),`Attack: ${attackRange(state).join('–')}`,...(state.accessories||[]).map(name=>`${rarityOf(name)} ${name}`)].map(t=>{const el=document.createElement('span'),chip=itemIcon(t),label=document.createElement('b');if(chip)el.append(chip);label.textContent=t;el.append(label);return el;}));
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
  p.textContent=live?(questCarried(state)?'You are carrying the cache. Two factions expect it.':'The abandoned chest in Food Storage is still untouched.'):done==='kept'?'You kept the cache. Both sides noticed.':`Delivered to the ${FACTIONS[done].name}.`;
  card.append(h,p);return card;}
 $('log').replaceChildren(...state.log.map(t=>{const el=document.createElement('li');el.textContent=t;return el;}));
 const near=nearby(state);if(!near.some(p=>p.id===target))target=null;if(!target&&near.length===1)target=near[0].id;
 $('interact').disabled=stopped||!near.length;
 {const label=document.createElement('b');label.textContent=near.length?near.map(p=>p.name).join(' / '):'Explore the room';
  const chips=near.map(p=>markerIcon(markerOf(state,p.id))).filter(Boolean);$('nearby-label').replaceChildren(...chips,label);}
 $('shell').classList.toggle('combat',!!state.combat);
 {const doors=EXITS[state.room]||[];document.querySelector('.west').hidden=!doors.some(d=>d.x===0);document.querySelector('.east').hidden=!doors.some(d=>d.x===12);}
 if(state.combat)actionOpen=true;const showing=actionOpen&&!state.dead&&!state.complete;$('actioncard').hidden=!showing;document.querySelector('.explore-controls').hidden=showing&&!!state.combat;$('close-actions').hidden=!!state.combat;$('action-label').textContent=state.combat?(state.combat.pendingCompanion?NPCS[state.combat.pendingCompanion].name.toUpperCase()+'’S TURN':'COMBAT · YOUR TURN'):'WITHIN REACH';$('actioncard').classList.toggle('companion-turn',!!state.combat?.pendingCompanion);$('action-feedback').textContent=feedback;
 const person=target&&PEOPLE.includes(target)&&state.npcs[target].condition==='conscious'&&!state.combat;$('npc-tabs').hidden=!person;document.querySelectorAll('[data-npc-tab]').forEach(b=>{const on=b.dataset.npcTab===npcTab;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
 $('actions').replaceChildren();if(state.combat){const id=state.combat.enemy,d=NPCS[id],nonlethal=state.combat.intent==='nonlethal';$('target').textContent=d.name+' · '+state.npcs[id].hp+' HP'+(state.combat.enemies.length>1?' · '+state.combat.enemies.length+' ENEMIES':'')+' · RANGE '+state.combat.range;$('targethint').textContent=(nonlethal?'NONLETHAL':'LETHAL')+' · Your damage '+attackRange(state).map(n=>n-(nonlethal?1:0)).join('–')+' · Enemy '+d.damage.join('–')+(conditionText(state,id)?' · '+conditionText(state,id).toUpperCase():'');for(const a of combatActions(state)){const b=button(a,()=>action(a));if(a==='Use potion')b.disabled=busy||!state.potions||state.hp===30;if(a==='Smoke bomb')b.disabled=busy||!state.items.smokeBombs;$('actions').append(b);}}
 else if(target){const n=state.npcs[target];$('target').textContent=(roomProps(state).find(p=>p.id===target)||{}).name||target;let hint=n?n.attitude.toUpperCase()+' · '+n.condition+' · '+n.hp+'/'+NPCS[target].hp+' HP'+((state.party||[]).includes(target)?' · IN YOUR PARTY':(state.allies?.[target]>0?` · ALLY (${state.allies[target]})`:'')):'Choose what happens next.';if(person)hint+=npcTab==='social'?' · Help: '+NPCS[target].help:npcTab==='supplies'?' · Trade: 1 '+itemName[NPCS[target].trade]+' / '+tradePrice(state,target)+' coins':' · Attack/Kill are lethal. Knock unconscious starts nonlethal combat.';$('targethint').textContent=hint;let available=actions(state,target);if(person){const groups={social:['Inspect','Talk','Leave him alone','Hand it back','Enter the break room'],supplies:['Trade','Ask about goods','Offer a fair swap','Pickpocket','Rob openly','Inspect'],conflict:['Attack','Knock unconscious','Kill','Fight','Force the checkpoint','Send the ratmen at it']};available=available.filter(a=>groups[npcTab].includes(a)||(npcTab==='supplies'&&a.startsWith('Sell 1 ')));}for(const a of available)$('actions').append(button(a,()=>{const who=target;action(a);if(a==='Talk'&&who&&!state.combat&&!anyDialog())openTalk(who);}));}
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
function present(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const raw=Math.max(r.width/832,r.height/576,.82);const scale=Math.max(.5,Math.round(raw*dpr)/dpr);const x=Math.max(0,Math.min(832-r.width/scale,visual.x*64+32-r.width/scale/2)),y=Math.max(0,Math.min(576-r.height/scale,visual.y*64+32-r.height/scale/2));camera={x,y,scale};screen.setTransform(dpr,0,0,dpr,0,0);screen.imageSmoothingEnabled=false;screen.clearRect(0,0,r.width,r.height);screen.drawImage(world,x,y,r.width/scale,r.height/scale,0,0,r.width,r.height);}
// One palette per room: the corridor, then the street above it, then the break
// room. A missing entry always falls back to the first so a new area can never
// break the render loop again.
// One palette per area of the floor, in room order: the contested concourse,
// the warm camp, the grey offices, the rust of the ratmen, the checkpoint's
// hazard yellow, the street, the blue safe room, and the cold way down.
const palettes=[
 ['#8c8e9e','#7c7e8e','#1d5193'],
 ['#eac999','#dab989','#7c9565'],
 ['#9091a0','#808190','#8c8e9e'],
 ['#8d725c','#7d624c','#c0393a'],
 ['#8c8e9e','#7c7e8e','#df8f44'],
 ['#9091a0','#808190','#7aafc3'],
 ['#7aafc3','#6a9fb3','#3279a4'],
 ['#9091a0','#808190','#eac999'],
 ['#8c8e9e','#7c7e8e','#7aafc3'],
 ['#604e4d','#503e3d','#8c8e9e'],
 ['#7c9565','#6c8555','#99ad7c'],
 ['#604e4d','#503e3d','#07265b']];
// Sprites paint through `paint` so the same art can be drawn to the map or to
// a portrait canvas in the dialogue scene.
let paint=ctx;
function rect(x,y,w,h,color){paint.fillStyle=color;paint.fillRect(x,y,w,h);}
// Characters. One light direction (top-left highlight, bottom-right shade),
// hard short shadows, and a silhouette that reads at phone size. Guide palette:
// AUTODIRECTION.md, art/floor1-style-guide.png.
// Props. Each interactable gets its own readable silhouette — the guide forbids
// reusing one generic icon for unrelated objects. Light stays top-left.
// props, palette-matched: same shapes, colours brought into the system
function propSprite(px,py,type){
 // batch 1: transit props, drawn on the palette
 if(type==='vending'||type==='machines'){const live=type==='vending';
  rect(px+12,py+8,40,52,live?P.brick:shade(P.slate,-30));rect(px+12,py+8,40,5,shade(live?P.brick:shade(P.slate,-30),18));
  rect(px+15,py+16,34,26,shade(P.ink,16));
  if(live){for(let r=0;r<3;r++)for(let c=0;c<4;c++)rect(px+18+c*8,py+20+r*8,5,5,(r+c)%3?P.sand:P.cream);
   rect(px+17,py+45,30,9,shade(P.ink,24));rect(px+19,py+47,12,5,P.cream);}
  else{rect(px+18,py+22,20,6,shade(P.slate,-10));rect(px+18,py+31,26,4,shade(P.slate,-14));}
  rect(px+14,py+60,6,5,P.ink);rect(px+44,py+60,6,5,P.ink);return;}
  if(type==='tickets'){
  rect(px+14,py+14,36,46,shade(P.slate,-22));rect(px+14,py+14,36,5,shade(P.slate,-6));
  rect(px+19,py+22,26,15,shade(P.ink,18));rect(px+22,py+25,20,3,P.sky);rect(px+22,py+31,13,3,P.sky);
  rect(px+19,py+42,26,10,P.cream);rect(px+22,py+45,14,3,shade(P.sand,-20));
  rect(px+17,py+55,30,4,shade(P.ink,10));rect(px+46,py+34,3,8,P.sand);return;}
  if(type==='bin'){
  rect(px+17,py+26,30,34,shade(P.slate,-24));rect(px+14,py+21,36,7,shade(P.slate,-8));
  rect(px+20,py+28,6,30,shade(P.slate,-34));
  rect(px+24,py+22,14,5,P.umber);rect(px+36,py+18,8,6,shade(P.umber,14));
  rect(px+22,py+40,14,3,P.sand);return;}
  if(type==='bag'){
  rect(px+20,py+34,24,24,P.sand);rect(px+20,py+34,24,4,shade(P.sand,16));
  rect(px+24,py+38,6,14,shade(P.sand,-20));rect(px+34,py+38,6,14,shade(P.sand,-20));
  rect(px+26,py+26,12,8,P.umber);rect(px+25,py+25,14,3,shade(P.umber,16));
  rect(px+30,py+44,5,5,P.brick);return;}
  if(type==='cart'){
  rect(px+8,py+34,48,11,shade(P.slate,-18));rect(px+8,py+34,48,3,shade(P.slate,4));
  rect(px+12,py+26,40,8,P.sand);rect(px+18,py+28,26,4,shade(P.sand,-24));
  rect(px+13,py+45,7,9,P.ink);rect(px+44,py+45,7,9,P.ink);
  rect(px+30,py+30,10,4,P.brick);return;}
 // batch 7: safe room, surface and loose props
 if(type==='sofa'){
  rect(px+8,py+26,48,26,P.olive);rect(px+8,py+26,48,5,shade(P.olive,20));rect(px+8,py+46,48,6,shade(P.olive,-24));
  rect(px+14,py+32,16,14,P.green);rect(px+34,py+32,16,14,P.green);
  rect(px+14,py+32,16,3,shade(P.green,18));rect(px+34,py+32,16,3,shade(P.green,18));
  rect(px+8,py+52,6,6,P.umber);rect(px+50,py+52,6,6,P.umber);return;}
  if(type==='kettle'){
  rect(px+20,py+32,24,20,shade(P.slate,-6));rect(px+20,py+32,24,4,shade(P.slate,20));
  rect(px+43,py+36,8,9,shade(P.slate,-6));rect(px+26,py+27,12,6,shade(P.ink,14));
  rect(px+22,py+42,20,3,P.cream);rect(px+30,py+24,4,4,P.sand);return;}
 if(type==='brazier'){const flame=tick%4===0?2:0;rect(px+18,py+34,28,26,'#cd7d32');rect(px+18,py+34,28,4,'#d7873c');rect(px+24,py+22-flame,16,12+flame,'#df8f44');rect(px+28,py+16-flame,8,8+flame,'#eac999');return;}
  if(type==='satchel'){
  rect(px+16,py+28,32,28,P.brown);rect(px+16,py+28,32,4,shade(P.brown,18));rect(px+16,py+52,32,4,shade(P.brown,-22));
  rect(px+20,py+22,24,8,P.sand);rect(px+20,py+22,24,3,shade(P.sand,20));
  rect(px+28,py+34,9,8,P.sand);rect(px+30,py+36,5,4,P.ink);
  rect(px+20,py+44,6,3,shade(P.ink,20));rect(px+38,py+44,6,3,shade(P.ink,20));return;}
  if(type==='locker'){
  rect(px+16,py+8,32,52,P.blue);rect(px+16,py+8,32,4,shade(P.blue,22));rect(px+16,py+56,32,4,shade(P.blue,-26));
  rect(px+20,py+14,24,3,P.ink);rect(px+20,py+19,24,3,P.ink);rect(px+20,py+24,24,3,P.ink);
  rect(px+21,py+34,22,16,shade(P.blue,-16));rect(px+40,py+38,5,6,P.sand);
  rect(px+24,py+30,16,3,P.cream);return;}
  if(type==='plaque'){
  rect(px+12,py+24,40,22,P.sand);rect(px+12,py+24,40,4,shade(P.sand,20));rect(px+12,py+42,40,4,shade(P.sand,-28));
  rect(px+18,py+31,28,3,shade(P.umber,10));rect(px+18,py+37,18,3,shade(P.umber,10));
  rect(px+48,py+26,3,3,P.cream);rect(px+12,py+26,3,3,P.cream);return;}
  if(type==='sign'){
  rect(px+14,py+40,4,22,P.umber);rect(px+46,py+40,4,22,P.umber);
  rect(px+6,py+10,52,32,P.blue);rect(px+6,py+10,52,4,shade(P.blue,22));rect(px+6,py+38,52,4,shade(P.blue,-24));
  rect(px+11,py+16,22,4,P.cream);rect(px+11,py+24,30,4,P.cream);rect(px+11,py+32,16,4,P.cream);
  rect(px+40,py+22,12,10,P.sand);rect(px+44,py+25,5,4,P.ink);return;}
  if(type==='service'||type==='breakdoor'||type==='staffdoor'||type==='exitdoor'){const band=type==='breakdoor'||type==='exitdoor'?P.teal:(type==='staffdoor'?P.brick:P.sand);
  rect(px+16,py+4,32,56,shade(P.slate,-18));rect(px+16,py+4,32,4,shade(P.slate,4));
  rect(px+20,py+12,24,20,shade(P.slate,-26));rect(px+40,py+30,6,6,P.sand);
  rect(px+18,py+46,28,7,band);rect(px+18,py+46,4,7,shade(P.ink,14));
  if(type==='exitdoor'){rect(px+21,py+36,22,8,P.cream);rect(px+27,py+38,4,4,P.ink);rect(px+34,py+38,3,3,P.ink);}
  if(type==='breakdoor'){rect(px+30,py+8,4,10,P.sky);}return;}
  if(type==='stairwell'){const pulse=tick%2?P.sky:shade(P.sky,30);
  rect(px+6,py+12,52,46,shade(P.ink,8));for(let i=0;i<5;i++)rect(px+8+i*4,py+50-i*9,48-i*7,8,shade(P.ink,16));
  rect(px+2,py+2,60,14,shade(P.ink,20));rect(px+6,py+6,52,5,P.cream);
  rect(px+8,py+13,22,3,pulse);rect(px+38,py+13,18,3,pulse);
  rect(px+8,py+50,48,6,P.sand);return;}
  if(type==='map'){
  rect(px+10,py+12,44,42,P.cream);rect(px+10,py+12,44,4,shade(P.cream,10));rect(px+10,py+50,44,4,shade(P.cream,-24));
  rect(px+15,py+20,16,4,P.blue);rect(px+15,py+28,26,4,P.blue);rect(px+15,py+36,14,4,P.blue);rect(px+33,py+36,10,4,P.brick);
  rect(px+38,py+22,10,10,P.sky);rect(px+41,py+25,4,4,P.cream);
  rect(px+14,py+44,8,3,shade(P.sand,-10));return;}
  if(type==='help'){
  rect(px+22,py+12,20,50,P.blue);rect(px+22,py+12,20,5,shade(P.blue,20));
  rect(px+25,py+18,14,12,P.cream);rect(px+27,py+21,10,3,P.ink);rect(px+27,py+26,6,3,P.ink);
  rect(px+40,py+24,8,10,shade(P.ink,14));rect(px+44,py+26,5,14,shade(P.ink,22));
  rect(px+25,py+38,14,12,shade(P.ink,10));rect(px+28,py+42,8,4,P.sand);return;}
  if(type==='wreck'){
  rect(px+4,py+30,56,20,P.orange);rect(px+4,py+30,56,4,shade(P.orange,20));rect(px+4,py+46,56,4,shade(P.orange,-30));
  rect(px+14,py+20,30,12,shade(P.slate,-6));rect(px+18,py+22,12,8,P.sky);rect(px+32,py+22,10,8,shade(P.sky,-16));
  rect(px+8,py+50,10,6,P.ink);rect(px+46,py+50,10,6,P.ink);
  rect(px+10,py+34,10,5,shade(P.brick,10));rect(px+44,py+34,10,5,shade(P.brick,10));return;}
  if(type==='awning'){
  rect(px+6,py+32,52,20,P.blue);rect(px+6,py+32,52,4,shade(P.blue,22));rect(px+6,py+48,52,4,shade(P.blue,-26));
  for(let i=0;i<4;i++)rect(px+10+i*12,py+38,7,12,P.cream);
  rect(px+8,py+24,6,10,shade(P.slate,-14));rect(px+50,py+26,6,8,shade(P.slate,-14));return;}
  if(type==='debris'){
  rect(px+14,py+44,14,7,shade(P.slate,-16));rect(px+16,py+42,10,4,shade(P.slate,4));
  rect(px+32,py+40,16,10,shade(P.slate,-26));rect(px+34,py+38,12,4,shade(P.slate,-6));
  rect(px+22,py+34,10,6,P.umber);rect(px+24,py+32,6,3,shade(P.umber,14));
  rect(px+40,py+48,10,5,P.cream);rect(px+12,py+50,12,4,shade(P.sand,-14));return;}
  if(type==='terminal'){
  rect(px+14,py+11,37,44,P.teal);rect(px+14,py+11,37,5,shade(P.teal,18));
  rect(px+18,py+16,29,27,shade(P.ink,20));
  rect(px+21,py+20,23,4,P.sky);rect(px+21,py+27,15,3,P.sky);rect(px+21,py+33,20,3,shade(P.sky,-16));
  rect(px+18,py+46,29,6,P.cream);rect(px+17,py+55,7,5,P.ink);rect(px+43,py+55,7,5,P.ink);return;}
 rect(px+14,py+11,37,44,'#3279a4');rect(px+18,py+15,29,29,'#7a7c8c');rect(px+39,py+32,4,7,'#eac999');rect(px+17,py+53,7,5,'#07265b');rect(px+43,py+53,7,5,'#07265b');}
// Item icons. Same palette and top-left light as the world sprites, shrunk to a
// 32px chip: rarity is the frame, item type is the silhouette, so the pack, the
// equipment slots and a reward result all read the same way at phone size.
const RARITY_FRAME={common:'#8c8e9e',uncommon:'#3279a4',rare:'#4fc4d8',epic:'#a457c4'};
const BOX_FRAME={bronze:'#cd7d32',silver:'#eac999',gold:'#eb9b50'};
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
 paint(1,1,30,30,frame);paint(3,3,26,26,'#07265b');
 if(kind==='potion'||kind==='bronze'||kind==='silver'||kind==='gold'||kind==='bomb'){
  if(kind==='potion'){paint(12,14,8,12,'#c0393a');paint(13,15,3,9,'#d24b4c');paint(13,10,6,4,'#fdefcb');paint(14,11,2,2,'#cd7d32');}
  else if(kind==='bomb'){paint(10,15,12,12,'#937862');paint(11,16,4,5,'#8c8e9e');paint(15,10,3,5,'#cd7d32');paint(17,8,3,3,'#eac999');}
  else{paint(8,12,16,14,BOX_FRAME[kind]);paint(8,12,16,3,'#fdefcb');paint(14,8,4,5,'#17366b');paint(11,16,10,6,'#17366b');paint(13,18,6,2,BOX_FRAME[kind]);}
 }else if(kind==='cheese'){paint(8,14,16,11,'#eac999');paint(8,14,16,3,'#ffdfaf');paint(11,18,3,3,'#cd7d32');paint(17,21,3,2,'#cd7d32');}
 else if(kind==='bandage'||kind==='repair kit'){paint(8,14,16,11,'#fdefcb');paint(8,14,16,3,'#fff5d1');paint(10,11,3,6,'#c0393a');paint(19,11,3,6,'#c0393a');if(kind==='repair kit')paint(14,17,4,5,'#8c8e9e');}
 else if(kind==='whetstone'){paint(7,19,18,6,'#8c8e9e');paint(7,19,18,2,'#989aaa');paint(10,14,12,5,'#eac999');}
 else if(kind==='key'){paint(12,11,8,8,'#eac999');paint(14,13,4,4,'#07265b');paint(15,19,3,8,'#eac999');paint(18,21,4,2,'#eac999');}
 else if(kind==='weapon'){paint(9,21,14,4,'#cd7d32');paint(14,8,4,14,'#b8baca');paint(12,10,9,3,'#b8baca');}
 else if(kind==='armor'){paint(10,10,12,14,'#3279a4');paint(10,10,12,3,'#a9abb8');paint(7,13,4,7,'#3279a4');paint(21,13,4,7,'#3279a4');}
 else{paint(14,10,4,4,'#eac999');paint(10,15,12,8,'#eac999');paint(12,16,3,6,'#f5c4bd');}
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
const MARKERS={person:'#eac999',enemy:'#c0393a',loot:'#eb9b50',door:'#eac999',safe:'#3165a7',stairs:'#4fc4d8',objective:'#df8f44',prop:'#8c8e9e'};
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
 paint(0,0,16,16,'#07265b');paint(1,1,14,14,'#07265b');
 if(category==='person'){paint(6,3,4,4,tint);paint(4,7,8,5,tint);}
 else if(category==='enemy'){paint(4,4,3,6,tint);paint(9,4,3,6,tint);paint(4,10,8,2,tint);paint(5,12,2,2,tint);paint(9,12,2,2,tint);}
 else if(category==='loot'){paint(6,3,4,2,tint);paint(4,5,8,3,tint);paint(5,8,6,5,tint);}
 else if(category==='door'){paint(4,3,8,10,tint);paint(5,4,6,8,'#07265b');paint(9,8,2,2,tint);}
 else if(category==='safe'){paint(2,3,12,3,tint);paint(3,6,10,3,tint);paint(5,9,6,2,tint);paint(7,11,2,2,tint);}
 else if(category==='stairs'){paint(3,4,4,2,tint);paint(4,7,6,2,tint);paint(5,10,8,2,tint);}
 else if(category==='objective'){paint(5,5,6,6,tint);paint(7,7,2,2,'#07265b');paint(7,2,2,2,tint);paint(7,12,2,2,tint);paint(2,7,2,2,tint);paint(12,7,2,2,tint);}
 else{paint(4,4,8,8,tint);paint(6,6,4,4,'#07265b');}
 return chip;}
const look={
 player:{skin:'#efbeb7',coat:'#1d5193',trim:'#7aafc3',head:'#795e48'},
 mara:{skin:'#efbeb7',coat:'#7c9565',trim:'#99ad7c',head:'#755a44',pack:'#1d5193'},
 tobin:{skin:'#efbeb7',coat:'#8d725c',trim:'#eac999',head:'#c17126',beard:'#d18136'},
 eli:{skin:'#efbeb7',coat:'#848696',trim:'#7aafc3',head:'#cd7d32',glass:'#fdefcb'},
 june:{skin:'#efbeb7',coat:'#7c9565',trim:'#eac999',head:'#fdefcb',hair:'#fdefcb'},
 vex:{skin:'#efbeb7',coat:'#5c7545',trim:'#b27579',head:'#033779',blade:'#fdefcb'},
 skrit:{fur:'#868898',skin:'#eac999',coat:'#3279a4',trim:'#eac999',bandage:'#fdefcb'},
 rat:{fur:'#876c56',skin:'#eac999',coat:'#3279a4',trim:'#eac999'},
 skulker:{fur:'#99ad7c',coat:'#1d5193',trim:'#eac999',sling:'#8d725c'},
 brute:{fur:'#604e4d',coat:'#c0393a',trim:'#eac999',plate:'#8c8e9e'},
 stranger1:{skin:'#efbeb7',coat:'#8c8e9e',trim:'#fdefcb'},
 stranger2:{skin:'#efbeb7',coat:'#df8f44',trim:'#fdefcb'}
};
const FLOOR_MARKS={fountain:['#3279a4','#7aafc3'],stairs:['#eac999','#df8f44'],breakdoor:['#1d5193','#7aafc3'],stairwell:['#7aafc3','#3279a4']};
function floorMark(id,x,y){const band=FLOOR_MARKS[id];if(!band)return;const px=x*64,py=y*64;
 rect(px+5,py+55,54,6,band[0]);
 if(id==='stairs'){for(let i=0;i<4;i++)rect(px+9+i*13,py+55,6,6,band[1]);}
 else rect(px+13,py+56,38,4,band[1]);}
// Living things breathe: a one-pixel dip, offset per tile so a crowd never moves
// in lockstep. Scenery stands perfectly still.
function breathing(x,y,type,condition){return condition==='conscious'&&look[type]&&(tick+(x*3+y*5)%5)%8<4?-1:0;}
function sprite(x,y,type,condition='conscious'){const px=x*64,py=y*64+breathing(x,y,type,condition);
 floorMark(type,x,y);
 rect(px+13,py+47,40,8,'#133267');
 if(condition==='dead'||condition==='unconscious'){rect(px+14,py+38,38,13,'#937862');rect(px+17,py+40,32,5,'#8c8e9e');rect(px+44,py+34,11,9,'#eac999');
  paint.font='13px monospace';paint.fillStyle=condition==='dead'?'#c0393a':'#4fc4d8';paint.fillText(condition==='dead'?'×':'Zz',px+24,py+26);return;}
 const c=look[type];
 if(c&&!['rat','skrit','skulker','brute'].includes(type)){const coat=c.coat;
  rect(px+22,py+12,20,17,c.skin);
  rect(px+22,py+12,20,4,'#f5c4bd');rect(px+37,py+25,5,4,'#c3928b');
  rect(px+31,py+19,3,4,'#17366b');rect(px+39,py+19,3,4,'#17366b');
  rect(px+21,py+29,22,19,coat);rect(px+21,py+29,22,4,c.trim);rect(px+37,py+44,6,4,'#17366b');
  rect(px+17,py+31,5,15,coat);rect(px+42,py+31,5,15,coat);
  rect(px+21,py+48,8,8,'#17366b');rect(px+35,py+48,8,8,'#17366b');
  if(type==='player'){rect(px+20,py+7,24,7,c.head);rect(px+17,py+12,30,4,c.head);rect(px+20,py+31,3,17,c.trim);}
  if(type==='mara'){rect(px+44,py+33,10,12,c.pack);rect(px+19,py+33,3,16,'#fdefcb');}
  if(type==='tobin'){rect(px+13,py+32,12,18,c.trim);rect(px+19,py+9,26,6,c.hat);rect(px+18,py+14,28,3,c.hat);}
  if(type==='vex'){rect(px+49,py+12,3,34,c.blade);rect(px+45,py+42,11,4,'#eac999');}
  if(type==='tobin'){rect(px+22,py+26,20,8,c.beard);rect(px+20,py+23,24,4,c.beard);}
  if(type==='vex'){rect(px+18,py+30,26,4,c.trim);rect(px+44,py+14,4,20,c.head);rect(px+16,py+12,4,18,c.head);}
  if(type==='june'){rect(px+26,py+6,14,7,c.hair);rect(px+30,py+3,6,4,c.hair);}
  if(type==='eli'){rect(px+24,py+18,14,2,c.glass);rect(px+26,py+20,3,3,'#07265b');rect(px+34,py+20,3,3,'#07265b');}
  if(type.startsWith('stranger')){rect(px+24,py+18,14,3,'#c0393a');}
  return;}
 if(type==='inspector'){// a big biomechanical officer: uniform plates on an insect frame
  rect(px+6,py+40,52,14,'#33373a');rect(px+6,py+40,52,4,'#937862');
  rect(px+14,py+20,36,24,'#1d5193');rect(px+14,py+20,36,5,'#2f63a5');rect(px+22,py+28,20,6,'#eac999');
  rect(px+10,py+24,6,18,'#937862');rect(px+48,py+24,6,18,'#937862');
  rect(px+22,py+10,20,12,'#2b2f31');rect(px+26,py+14,12,5,'#eac999');
  rect(px+18,py+6,5,8,'#5f6355');rect(px+41,py+6,5,8,'#5f6355');rect(px+34,py+44,6,10,'#c0393a');return;}
 if(type==='sumpmaw'){// a mound of a creature with a mouth where its face should be
  rect(px+4,py+34,56,22,'#2f4a35');rect(px+4,py+34,56,5,'#4a6b3f');
  rect(px+12,py+22,40,16,'#3d5a42');rect(px+12,py+22,40,4,'#5f8256');
  rect(px+18,py+40,28,10,'#16221b');for(let i=0;i<5;i++)rect(px+19+i*6,py+40,4,5,'#fdefcb');
  rect(px+22,py+26,7,5,'#eac999');rect(px+39,py+26,7,5,'#eac999');rect(px+26,py+33,6,3,'#c0393a');rect(px+36,py+33,6,3,'#c0393a');return;}
 if(type==='rat'||type==='skrit'||type==='skulker'||type==='brute'){const fur=c.fur,coat=c.coat;
  if(type==='brute'){rect(px+15,py+28,8,20,fur);rect(px+43,py+28,8,20,fur);rect(px+18,py+8,8,8,fur);rect(px+40,py+8,8,8,fur);}
  rect(px+21,py+14,21,17,fur);rect(px+21,py+14,21,4,'#a9abb8');
  rect(px+15,py+8,9,10,fur);rect(px+39,py+8,9,10,fur);
  rect(px+30,py+20,3,3,'#c0393a');rect(px+39,py+20,3,3,'#c0393a');
  rect(px+26,py+26,11,4,'#fdefcb');
  rect(px+20,py+30,23,18,coat);rect(px+20,py+30,23,4,'#a9abb8');rect(px+37,py+44,6,4,'#17366b');
  rect(px+16,py+32,5,14,coat);rect(px+42,py+32,5,14,coat);
  rect(px+21,py+48,8,8,'#17366b');rect(px+35,py+48,8,8,'#17366b');
  rect(px+45,py+34,4,20,fur);
  if(type==='skrit'){rect(px+35,py+44,9,6,c.bandage,'#c0393a');}
  if(type==='brute'){rect(px+19,py+29,28,7,c.plate);rect(px+19,py+29,28,3,'#5f6355');}
  if(type==='skulker'){rect(px+14,py+30,5,18,c.coat);rect(px+47,py+22,3,20,c.sling);rect(px+23,py+9,17,5,c.coat);}
  return;}
 // batch 6: ratmen and food store
 if(type==='chest'||type==='crate'){const cracked=type==='crate';
  rect(px+12,py+26,42,27,P.brown);rect(px+12,py+26,42,4,shade(P.brown,20));rect(px+12,py+49,42,4,shade(P.brown,-26));
  rect(px+12,py+18,42,12,shade(P.brown,10));rect(px+12,py+18,42,3,shade(P.brown,26));
  rect(px+17,py+18,4,35,shade(P.ink,20));rect(px+45,py+18,4,35,shade(P.ink,20));
  rect(px+29,py+30,8,9,P.sand);rect(px+31,py+32,4,5,P.ink);
  if(cracked){rect(px+24,py+20,3,30,shade(P.ink,26));rect(px+18,py+24,26,2,shade(P.ink,26));}
  else rect(px+20,py+38,26,3,P.cream);return;}
 // batch 2: fixtures and street furniture
 if(type==='fountain'){
  rect(px+8,py+30,48,24,shade(P.slate,-14));rect(px+8,py+30,48,4,shade(P.slate,6));
  rect(px+14,py+26,36,20,P.sky);rect(px+19,py+30,26,12,shade(P.sky,22));rect(px+24,py+32,8,3,P.cream);
  rect(px+28,py+12,8,16,P.slate);rect(px+24,py+10,16,5,shade(P.slate,10));
  rect(px+6,py+50,52,6,P.cream);rect(px+10,py+52,20,3,shade(P.sand,-18));return;}
  if(type==='stairs'){for(let i=0;i<5;i++){const tone=i%2?shade(P.slate,-4):shade(P.slate,-18);
  rect(px+5+i*5,py+51-i*9,53-i*7,8,tone);rect(px+5+i*5,py+51-i*9,53-i*7,3,shade(tone,20));}
  rect(px+4,py+8,56,4,P.sand);for(let i=0;i<4;i++)rect(px+30+i*12,py+8,7,4,P.brick);return;}
  if(type==='pipe'){
  rect(px+8,py+22,46,11,shade(P.slate,-6));rect(px+8,py+22,46,3,shade(P.slate,18));rect(px+8,py+30,46,3,shade(P.slate,-26));
  rect(px+40,py+22,12,26,shade(P.slate,-10));rect(px+40,py+22,12,3,shade(P.slate,14));
  rect(px+14,py+18,6,19,shade(P.slate,10));rect(px+37,py+38,18,6,shade(P.slate,6));
  rect(px+20,py+28,12,28,shade(P.slate,-14));rect(px+22,py+40,8,3,P.brick);
  rect(px+21,py+44,10,10,shade(P.slate,-24));rect(px+23,py+46,6,6,P.brick);return;}
  if(type==='note'){
  rect(px+19,py+21,28,33,P.cream);rect(px+19,py+21,28,3,shade(P.cream,12));
  for(let i=0;i<4;i++)rect(px+24,py+28+i*5,16,2,shade(P.ink,26));
  rect(px+38,py+44,6,6,P.brick);rect(px+22,py+48,10,3,shade(P.ink,30));return;}
// Faction and structure props. Same rules as everything else: one silhouette per
// object, top-left light, hard short shadow, accents used on purpose.
  if(type==='barricade'){
  rect(px+6,py+44,52,7,shade(P.brown,-10));rect(px+6,py+44,52,3,shade(P.brown,10));
  rect(px+10,py+30,44,6,P.brown);rect(px+16,py+37,32,6,shade(P.brown,8));
  rect(px+9,py+24,5,28,P.umber);rect(px+50,py+24,5,28,shade(P.umber,10));
  rect(px+15,py+46,6,9,P.ink);rect(px+43,py+46,6,9,P.ink);
  rect(px+12,py+27,3,3,P.orange);rect(px+49,py+40,3,3,P.orange);return;}
  if(type==='bedroll'){
  rect(px+12,py+38,40,13,P.olive);rect(px+12,py+38,40,4,shade(P.olive,18));rect(px+12,py+48,40,3,shade(P.olive,-24));
  rect(px+16,py+30,32,8,P.blue);rect(px+16,py+30,32,3,shade(P.blue,20));
  rect(px+22,py+36,5,16,P.sand);rect(px+38,py+36,5,16,P.sand);
  rect(px+46,py+33,8,8,P.cream);return;}
  if(type==='triage'){
  rect(px+8,py+33,48,12,P.sand);rect(px+8,py+33,48,4,shade(P.sand,18));rect(px+8,py+43,48,3,shade(P.sand,-26));
  rect(px+12,py+28,14,7,P.cream);rect(px+12,py+29,14,2,shade(P.cream,-24));
  rect(px+13,py+45,5,9,shade(P.slate,-14));rect(px+46,py+45,5,9,shade(P.slate,-14));
  rect(px+31,py+22,8,18,P.brick);rect(px+26,py+28,18,7,P.brick);
  rect(px+34,py+38,4,5,shade(P.ink,16));return;}
 // batch 3: camp kit
 if(type==='banner'){
  rect(px+28,py+6,4,52,P.umber);rect(px+26,py+6,8,4,shade(P.umber,18));
  rect(px+14,py+10,36,32,P.brick);rect(px+14,py+10,36,4,shade(P.brick,20));rect(px+14,py+38,36,5,shade(P.brick,-26));
  rect(px+24,py+18,16,4,P.cream);rect(px+27,py+22,10,10,P.cream);rect(px+30,py+25,4,4,P.brick);
  rect(px+12,py+9,4,4,P.sand);rect(px+48,py+9,4,4,P.sand);return;}
  if(type==='gate'){
  rect(px+8,py+14,48,40,shade(P.slate,-24));rect(px+8,py+8,48,7,shade(P.slate,-4));
  for(let i=0;i<5;i++)rect(px+13+i*9,py+20,5,28,shade(P.slate,10));
  rect(px+8,py+48,48,6,shade(P.slate,-34));
  rect(px+52,py+22,6,12,P.cream);rect(px+53,py+25,4,6,P.sky);
  rect(px+11,py+10,6,4,P.brick);return;}
 // batch 4: offices and security
 if(type==='desk'){
  rect(px+8,py+32,48,10,P.brown);rect(px+8,py+32,48,3,shade(P.brown,20));rect(px+8,py+40,48,3,shade(P.brown,-24));
  rect(px+12,py+43,6,13,shade(P.slate,-14));rect(px+46,py+43,6,13,shade(P.slate,-14));
  rect(px+22,py+18,18,13,shade(P.ink,18));rect(px+25,py+21,12,7,P.sky);rect(px+19,py+31,24,3,P.slate);
  rect(px+16,py+35,12,4,P.cream);rect(px+40,py+35,10,4,P.sand);return;}
  if(type==='cabinet'){
  rect(px+18,py+10,28,46,shade(P.slate,-20));rect(px+18,py+10,28,4,shade(P.slate,2));
  for(let i=0;i<3;i++){rect(px+21,py+16+i*13,22,10,shade(P.slate,-30));rect(px+36,py+20+i*13,5,2,P.sand);}
  rect(px+18,py+53,28,3,shade(P.ink,14));return;}
 // batch 5: maintenance and utility
 if(type==='panel'){
  rect(px+14,py+10,36,48,shade(P.slate,-24));rect(px+14,py+10,36,4,shade(P.slate,-4));
  rect(px+18,py+16,28,18,shade(P.ink,18));
  for(let r=0;r<2;r++)for(let c=0;c<3;c++)rect(px+21+c*9,py+20+r*7,5,3,P.sky);
  rect(px+18,py+38,28,5,P.sand);rect(px+21,py+45,22,4,shade(P.slate,-6));
  rect(px+30,py+50,4,4,P.orange);return;}
  if(type==='cables'){
  rect(px+6,py+24,52,7,shade(P.blue,-10));rect(px+6,py+24,52,2,shade(P.blue,16));
  rect(px+6,py+35,52,6,P.brick);rect(px+6,py+35,52,2,shade(P.brick,18));
  rect(px+6,py+45,52,5,shade(P.slate,-18));rect(px+6,py+45,52,2,shade(P.slate,8));
  rect(px+10,py+20,6,12,shade(P.slate,-30));rect(px+48,py+20,6,12,shade(P.slate,-30));
  rect(px+24,py+28,8,4,shade(P.ink,20));return;}
  if(type==='nest'){
  rect(px+11,py+36,42,16,P.umber);rect(px+11,py+36,42,4,shade(P.umber,18));rect(px+11,py+49,42,3,shade(P.umber,-20));
  rect(px+18,py+29,28,10,P.brown);rect(px+18,py+29,28,3,shade(P.brown,20));
  rect(px+24,py+23,16,7,P.blue);rect(px+24,py+23,16,2,shade(P.blue,20));
  rect(px+16,py+33,5,3,P.cream);rect(px+44,py+33,5,3,P.cream);return;}
  if(type==='scrap'){
  rect(px+8,py+42,48,12,shade(P.slate,-22));rect(px+8,py+42,48,3,shade(P.slate,2));
  rect(px+14,py+31,14,12,P.brown);rect(px+16,py+33,10,3,shade(P.brown,22));
  rect(px+31,py+28,16,15,shade(P.slate,-6));rect(px+34,py+30,10,3,shade(P.slate,18));
  rect(px+20,py+22,11,10,P.blue);rect(px+22,py+24,7,3,shade(P.blue,22));
  rect(px+40,py+20,7,9,P.sand);rect(px+12,py+38,5,4,P.orange);return;}
  if(type==='skullpost'){
  rect(px+29,py+14,6,46,P.umber);rect(px+28,py+14,8,4,shade(P.umber,20));
  rect(px+20,py+40,24,5,P.sand);rect(px+24,py+44,3,4,P.sand);rect(px+38,py+44,3,4,P.sand);
  rect(px+21,py+6,22,16,P.cream);rect(px+21,py+6,22,3,shade(P.cream,10));
  rect(px+25,py+12,6,5,shade(P.ink,18));rect(px+34,py+12,6,5,shade(P.ink,18));
  rect(px+28,py+20,9,3,shade(P.ink,18));rect(px+40,py+8,3,8,P.brick);return;}
  if(type==='pit'){
  rect(px+3,py+28,58,30,shade(P.ink,10));rect(px+7,py+32,50,23,shade(P.olive,-40));
  rect(px+13,py+37,16,7,P.olive);rect(px+37,py+39,14,7,shade(P.olive,10));
  rect(px+23,py+23,14,7,P.brick);rect(px+26,py+25,8,3,P.cream);
  rect(px+6,py+22,7,5,P.sand);rect(px+49,py+22,7,5,P.sand);
  rect(px+10,py+44,10,4,shade(P.green,10));rect(px+36,py+46,12,4,shade(P.green,-6));return;}
  if(type==='platform'){
  rect(px+4,py+18,56,11,shade(P.slate,-20));rect(px+4,py+18,56,3,shade(P.slate,2));
  rect(px+4,py+26,56,4,P.sand);for(let i=0;i<5;i++)rect(px+8+i*11,py+27,6,3,P.brick);
  rect(px+10,py+30,3,27,shade(P.slate,-32));rect(px+51,py+30,3,27,shade(P.slate,-32));
  rect(px+12,py+32,40,3,shade(P.slate,-38));
  rect(px+26,py+3,4,15,shade(P.ink,16));rect(px+33,py+3,4,15,shade(P.ink,16));rect(px+27,py+8,9,6,P.orange);return;}
  if(type==='barrier'){
  rect(px+10,py+30,6,30,shade(P.umber,10));rect(px+48,py+30,6,30,P.umber);
  rect(px+8,py+22,48,10,P.sand);rect(px+8,py+22,48,3,shade(P.sand,22));
  for(let i=0;i<4;i++)rect(px+12+i*12,py+23,7,8,P.brick);
  rect(px+27,py+8,10,15,shade(P.slate,-18));rect(px+29,py+11,6,5,P.sky);
  rect(px+8,py+58,48,4,shade(P.ink,10));return;}
  if(type==='vault'){
  rect(px+13,py+14,38,42,shade(P.ink,20));rect(px+13,py+14,38,4,shade(P.ink,34));rect(px+13,py+52,38,4,P.ink);
  rect(px+18,py+20,28,30,shade(P.slate,-28));
  rect(px+28,py+30,9,9,P.cream);rect(px+30,py+32,5,5,shade(P.ink,20));rect(px+39,py+33,6,3,P.sand);
  rect(px+16,py+22,3,26,shade(P.slate,-40));rect(px+46,py+24,3,3,P.brick);return;}
  if(type==='whetstone'){
  rect(px+13,py+41,38,12,shade(P.slate,-16));rect(px+13,py+41,38,3,shade(P.slate,8));
  rect(px+19,py+34,26,9,P.sand);rect(px+19,py+34,26,3,shade(P.sand,20));
  rect(px+44,py+45,9,5,P.brown);rect(px+20,py+37,10,2,shade(P.sand,-26));return;}
 propSprite(px,py,type);}
// Environment tiles: clean, dirty, cracked, bloodstained, grate, hazard stripe
// and sludge, layered deterministically so a room reads the same every visit.
// Walls get damaged chunks and a subway band; the base palette stays dirty and
// each accent means something.
// The concourse floor: big tiles, a blue tile band every third column, a cream
// platform lip along the far wall and hazard stripes at the platform edge. Drawn
// from the palette so it can never drift from the rest of the game.
// Floor and wall treatments by room. Each room is a place with its own surface:
// transit tile, floorboards, office lino, trampled earth, concrete slab, road,
// metal plate. Big colour masses, one seam, no noise.
const FLOOR_STYLE=[0,1,2,3,4,5,6,7,8,9,10,11].map(room=>['transit','boards','lino','earth','slab','road','lino','slab','metal','metal','earth','slab'][room]);
function roomFloor(room,x,y,a,b){const px=x*64,py=y*64,style=FLOOR_STYLE[room];
 if(style==='transit'){
  const accent=(x%5===2)&&(y%3===1),base=accent?shade(P.blue,-8):b;
  rect(px+1,py+1,62,62,base);rect(px+1,py+1,62,3,shade(base,18));rect(px+1,py+60,62,3,shade(base,-20));
  rect(px+62,py+1,2,62,shade(base,-26));rect(px+1,py+62,62,2,shade(base,-26));
  if(y===0)rect(px+1,py+13,62,4,P.sand);
  if(y===8){rect(px+1,py+45,62,6,P.sand);for(let i=0;i<5;i++)rect(px+4+i*13,py+46,7,4,P.ink);}
  if((x*5+y*3)%9===0)rect(px+10,py+38,10,3,shade(P.sand,-22));return;}
 if(style==='boards'){
  const base=(y%2?shade(a,6):a);
  rect(px+1,py+1,62,62,base);rect(px+1,py+1,62,2,shade(base,16));rect(px+1,py+30,62,2,shade(base,-26));
  rect(px+(x%2?20:44),py+2,2,60,shade(base,-22));
  if((x*3+y*7)%8===0)rect(px+8,py+36,16,3,shade(P.brown,-30));return;}
 if(style==='lino'){
  const base=(x+y)%2?shade(b,8):b;
  rect(px+1,py+1,62,62,base);rect(px+1,py+1,62,2,shade(base,12));
  if((x*7+y*5)%6===0)rect(px+20,py+24,22,3,shade(base,-18));return;}
 if(style==='earth'){
  const base=(x+y)%2?shade(a,-6):a;
  rect(px+1,py+1,62,62,base);rect(px+1,py+2,62,3,shade(base,12));
  if((x*11+y*5)%7===0)rect(px+12,py+42,14,4,shade(base,-24));
  if((x*5+y*13)%11===0){rect(px+30,py+20,6,3,shade(base,-30));rect(px+38,py+26,4,3,shade(base,-30));}return;}
 if(style==='road'){
  const base=(x+y)%2?shade(a,-10):shade(a,-4);
  rect(px+1,py+1,62,62,base);rect(px+1,py+2,62,2,shade(base,10));
  if(x===6&&y===4)rect(px+6,py+26,50,8,P.sand);
  if((x*13+y*7)%9===0)rect(px+16,py+38,18,3,shade(base,-20));return;}
 if(style==='metal'){
  const base=(x+y)%2?shade(a,-4):a;
  rect(px+1,py+1,62,62,base);rect(px+1,py+1,62,3,shade(base,18));rect(px+1,py+60,62,3,shade(base,-26));
  for(let i=0;i<4;i++)rect(px+6+i*16,py+30,10,2,shade(base,-30));
  if((x+y)%3===0)rect(px+8,py+8,4,4,shade(base,24));return;}
 // concrete slab, the fallback
 const base=(x+y)%2?shade(a,-8):a;
 rect(px+1,py+1,62,62,base);rect(px+1,py+1,62,3,shade(base,14));rect(px+1,py+60,62,3,shade(base,-22));
 rect(px+30,py+2,2,60,shade(base,-18));
 if((x*5+y*9)%7===0)rect(px+12,py+40,12,3,shade(base,-22));
 if(room===4||room===7){for(let i=0;i<4;i++)rect(px+4+i*16,py+56,9,4,shade(P.orange,-6));}
}
function wallFace(room,x,y,wall){const px=x*64,py=y*64;
 const lit=shade(wall,16),dark=shade(wall,-26);
 rect(px+2,py+4,60,11,wall);rect(px+2,py+4,60,3,lit);
 if(room===0){rect(px+2,py+6,60,3,P.cream);rect(px+4,py+13,56,2,shade(P.blue,-30));}
 else if(room===3){for(let i=0;i<4;i++){rect(px+2+i*15,py+4,13,7,shade(P.brick,-10));rect(px+9+i*15,py+11,13,4,P.brick);}}
 else if(room===1||room===10){rect(px+2,py+4,60,3,P.cream);rect(px+2,py+12,60,3,dark);}
 else if(room===4||room===7){for(let i=0;i<5;i++)rect(px+3+i*12,py+5,7,9,shade(P.sand,-10));}
 else if(room===8||room===9){for(let i=0;i<6;i++)rect(px+4+i*10,py+5,6,3,shade(wall,26));rect(px+2,py+13,60,2,dark);}
 else if(room===6){rect(px+2,py+6,60,2,P.sky);rect(px+2,py+13,60,2,dark);}
 else {rect(px+2,py+12,60,3,dark);}
 rect(px+3,py+20,58,3,shade(P.ink,4));
 rect(px+31,py+4,3,16,shade(wall,-6));
}
function tileDetail(x,y,solid){const h=((x*73856093)^(y*19349663)^((state.room+1)*83492791))>>>0,px=x*64,py=y*64;
 if(solid){if(h%3===0)rect(px+38,py+30,18,16,'#606272');if(h%5===0)rect(px+22,py+34,20,2,'#eac999');if(h%7===0)rect(px+18,py+8,26,9,'#1d5193');return;}
 if(h%6===0){rect(px+12,py+18,6,2,'#133267');rect(px+18,py+22,8,2,'#133267');}
 if(h%9===0)rect(px+10,py+40,26,10,'#937862');
 if(h%13===0)for(let i=0;i<4;i++)rect(px+16+i*8,py+26,4,14,'#133267');
 if(h%17===0)rect(px+34,py+12,18,10,'#c0393a');
 if(state.room===3&&h%4===0)rect(px+8,py+44,44,8,'#105782');
 if(state.room===4&&h%8===0)rect(px+8,py+14,48,3,'#eac999');
 if(state.room===5&&h%5===0)rect(px+14,py+30,20,9,'#8c8e9e');}
function draw(){const [a,b,wall]=palettes[state.room]||palettes[0];ctx.clearRect(0,0,832,576);rect(0,0,832,576,'#0b2a5f');for(let y=0;y<9;y++)for(let x=0;x<13;x++){const edge=x===0||x===12||y===0||y===8;const door=exitAt(state.room,x,y);if(!edge)roomFloor(state.room,x,y,a,b);else rect(x*64+1,y*64+1,62,62,edge&&!door?'#5e6070':(x+y)%2?a:b);tileDetail(x,y,edge&&!door);if(edge&&!door){wallFace(state.room,x,y,wall);rect(x*64+3,y*64+20,58,3,'#07265b');rect(x*64+31,y*64+4,3,16,'#747686');}else{if((x*7+y*11)%6===0)rect(x*64+13,y*64+21,8,3,'#fdefcb22');if(door){ctx.fillStyle='#fdefcb';ctx.font='24px monospace';ctx.fillText(x===0?'←':x===12?'→':y===0?'↑':'↓',x*64+21,y*64+39);}}}
 for(const p of roomProps(state)){const near=nearby(state).some(n=>n.id===p.id);if(near)brackets(p.x*64+5,p.y*64+4,p.id===target?'#fdefcb':MARKERS[markerOf(state,p.id)]);sprite(p.x,p.y,p.id,state.npcs[p.id]?.condition||'conscious');if((p.id==='chest'&&state.flags.chest)||(p.id==='crate'&&state.flags.crate)){rect(p.x*64+8,p.y*64+28,49,4,'#1b2420');}if(state.npcs[p.id]?.attitude==='friendly'&&state.npcs[p.id]?.condition==='conscious'){ctx.fillStyle='#d9ec9b';ctx.font='13px monospace';ctx.fillText('♥',p.x*64+28,p.y*64+5);}}
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
$('interact').onclick=select;$('close-actions').onclick=()=>{actionOpen=false;feedback='';render();};$('talk-leave').onclick=()=>closeTalk();$('talk-more').onclick=()=>{talkPage++;renderTalk();};$('menu').onclick=()=>openPanel('menu-modal');$('pack').onclick=()=>{$('pack-feedback').textContent='';openPanel('pack-modal');};$('journal').onclick=()=>openPanel('journal-modal');document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
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
// A pending choice is a conversation already in progress: show it in the scene.
function dialogueFlow(){if(!state.pendingDialogue||anyDialog())return;openTalk(state.pendingDialogue.id);}
// Any pending player-choice conversation opens as a modal with one button per
// reply. The engine owns what each reply does; this only presents them.

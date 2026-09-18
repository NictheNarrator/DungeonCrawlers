import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {bindHoldControls} from './src/controls.mjs';
import {fresh,rooms,props,move,blocked,interact,fight,actions,encode,decode,usePotion,useBandage,useWhetstone,openBox,attackRange,combatActions,outcome} from './src/engine.mjs';
import {PEOPLE,NPCS,STOCK_KEYS} from './src/npcs.mjs';
let passed=0;const pending=[];function test(name,fn){const result=fn();if(result&&typeof result.then==='function')pending.push(result.then(()=>{passed++;console.log('PASS '+name);}));else{passed++;console.log('PASS '+name);}}
function walk(s,tx,ty){const q=[[s.x,s.y,[]]],seen=new Set([s.x+','+s.y]);while(q.length){const [x,y,path]=q.shift();if(x===tx&&y===ty){for(const [dx,dy] of path)assert(move(s,dx,dy));return;}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(!seen.has(k)&&!blocked(s,nx,ny)){seen.add(k);q.push([nx,ny,[...path,[dx,dy]]]);}}}assert.fail(`No route in ${rooms[s.room]} to ${tx},${ty}`);}
function travel(s,room){while(s.room<room){walk(s,11,4);assert(move(s,1,0));}while(s.room>room){walk(s,1,4);assert(move(s,-1,0));}}
function approach(s,id){const room=props.findIndex(ps=>ps.some(p=>p.id===id));travel(s,room);const p=props[room].find(p=>p.id===id);const candidate=[[p.x-1,p.y],[p.x+1,p.y],[p.x,p.y-1],[p.x,p.y+1]].find(([x,y])=>!blocked(s,x,y));walk(s,...candidate);}
function act(s,id,action){approach(s,id);assert(actions(s,id).includes(action),`${id} cannot ${action}`);assert(interact(s,id,action));return s;}
function win(s,rng=()=>.5){let safety=0;while(s.combat&&!s.dead){assert(++safety<80);if(s.hp<=8&&s.potions)fight(s,'Use potion',rng);else fight(s,'Attack',rng);}assert(!s.dead,'Player unexpectedly died');}
function checkpoint(s){const raw=encode(s);assert(raw);const restored=decode(raw);assert(restored);assert.deepEqual(restored,s);return restored;}
function supplied(){const s=fresh();s.gold=30;s.potions=6;s.items.repairKits=1;s.flags.memo=true;return s;}
function getKey(s){act(s,'locker','Open');}
function finish(s){act(s,'stairs','Unlock exit');assert(s.complete);return checkpoint(s);}

test('Every prop is reachable and five-room movement still works',()=>{const s=fresh();assert.equal(move(s,3,0),false);for(const ps of props)for(const p of ps)approach(s,p.id);travel(s,0);s.x=1;s.y=1;assert(!move(s,-1,0));});
test('A peaceful player may ignore all NPCs and finish with the spare key',()=>{const s=fresh();getKey(s);finish(s);assert.equal(s.hp,30);for(const id of PEOPLE)assert.equal(s.npcs[id].condition,'conscious');});
test('The original rat encounter remains survivable with no dying retaliation',()=>{const s=fresh();act(s,'rat','Fight');let calls=0;win(s,()=>calls++%2?.999:0);assert(s.hp>=24);assert.equal(s.npcs.rat.condition,'dead');assert.equal(s.gold,2);});
test('Turn control, healing, defending, fleeing, and no turns on invalid actions',()=>{const s=fresh();act(s,'rat','Fight');assert(!fight(s,'Use potion'));assert.equal(s.hp,30);assert(!interact(s,'rat','Inspect'));assert(!move(s,1,0));fight(s,'Defend',()=>.999);assert.equal(s.hp,29);s.hp=10;fight(s,'Use potion',()=>0);assert.equal(s.hp,18);fight(s,'Flee',()=>0);assert.equal(s.hp,16);assert.equal(s.x,1);assert.equal(s.npcs.rat.attitude,'hostile');});
test('Death never overwrites a living checkpoint',()=>{const s=fresh(),raw=encode(s);act(s,'mara','Attack');s.hp=1;fight(s,'Defend',()=>0);assert(s.dead);assert.equal(encode(s),null);assert.equal(decode(raw).hp,30);});
for(const id of PEOPLE){
 test(`${id}: help, friendship, one-time rewards and remembered assistance`,()=>{let s=supplied();act(s,id,'Befriend');assert(!s.npcs[id].memory.befriended);act(s,id,'Talk');act(s,id,'Help');act(s,id,'Befriend');assert.equal(s.npcs[id].attitude,'friendly');assert(s.npcs[id].memory.helped);const boxes=s.boxes,items=JSON.stringify(s.items);act(s,id,'Help');act(s,id,'Befriend');assert.equal(s.boxes,boxes);assert.equal(JSON.stringify(s.items),items);s=checkpoint(s);act(s,id,'Talk');assert(s.npcs[id].memory.befriended);});
 test(`${id}: credible lie, pickpocket, discovery on exit, and no duplicate theft`,()=>{let s=supplied();act(s,id,'Talk');act(s,id,'Lie');assert(s.npcs[id].memory.distracted);const stock=JSON.stringify(s.npcs[id].inventory);act(s,id,'Pickpocket');assert.notEqual(JSON.stringify(s.npcs[id].inventory),stock);assert(s.npcs[id].memory.stolen);const after=JSON.stringify(s.npcs[id].inventory);act(s,id,'Pickpocket');assert.equal(JSON.stringify(s.npcs[id].inventory),after);travel(s,s.room===4?3:s.room+1);assert.equal(s.npcs[id].attitude,'hostile');assert(s.npcs[id].memory.theftDetected);s=checkpoint(s);assert(s.npcs[id].memory.lied);});
 test(`${id}: betrayal cannot be erased by helpful action spam`,()=>{const s=supplied();act(s,id,'Talk');act(s,id,'Help');act(s,id,'Befriend');act(s,id,'Pickpocket');travel(s,s.room===4?3:s.room+1);act(s,id,'Help');act(s,id,'Befriend');assert(s.npcs[id].memory.betrayed);assert.equal(s.npcs[id].attitude,'hostile');});
 test(`${id}: trade stock is finite and payments enter the NPC wallet`,()=>{const s=supplied(),n=s.npcs[id],item=NPCS[id].trade;act(s,id,'Trade');assert(n.memory.traded);assert(s.items[item]>0||s.potions>6);assert(n.inventory.gold>NPCS[id].stock.gold);while(n.inventory[item])act(s,id,'Trade');const before=s.gold;act(s,id,'Trade');assert.equal(s.gold,before);checkpoint(s);});
 test(`${id}: nonlethal defeat, loot, wake, permanent memories and no loot duplication`,()=>{let s=supplied();act(s,id,'Knock unconscious');assert.equal(s.combat.intent,'nonlethal');win(s,()=>.999);assert.equal(s.npcs[id].condition,'unconscious');assert(s.npcs[id].memory.knockedOut);s=checkpoint(s);act(s,id,'Loot');assert(STOCK_KEYS.every(k=>s.npcs[id].inventory[k]===0));const pack=JSON.stringify({items:s.items,gold:s.gold,potions:s.potions});act(s,id,'Loot');assert.equal(JSON.stringify({items:s.items,gold:s.gold,potions:s.potions}),pack);act(s,id,'Wake up');assert.equal(s.npcs[id].condition,'conscious');assert(s.npcs[id].hp>0);assert.equal(s.npcs[id].attitude,'hostile');assert(s.npcs[id].memory.looted);checkpoint(s);});
 test(`${id}: Kill on a conscious NPC starts combat, not instant death`,()=>{const s=supplied();act(s,id,'Kill');assert(s.combat);assert.equal(s.npcs[id].condition,'conscious');assert.equal(s.npcs[id].hp,NPCS[id].hp);win(s);assert.equal(s.npcs[id].condition,'dead');checkpoint(s);assert.deepEqual(actions(s,id),['Inspect','Loot']);});
 test(`${id}: downed execution persists and does not block the exit`,()=>{let s=supplied();act(s,id,'Knock unconscious');win(s,()=>.999);act(s,id,'Kill');assert.equal(s.npcs[id].condition,'dead');assert(s.npcs[id].memory.killed);s=checkpoint(s);getKey(s);finish(s);assert.equal(s.npcs[id].condition,'dead');});
}
test('Threats change attitudes and Vex fights back',()=>{for(const id of PEOPLE){const s=supplied();act(s,id,'Threaten');assert(s.npcs[id].memory.threatened);assert.equal(s.npcs[id].attitude,'hostile');assert.equal(!!s.combat,id==='vex');}});
test('Open robbery: Mara and Tobin surrender; Vex resists',()=>{for(const id of PEOPLE){const s=supplied(),before=s.gold;act(s,id,'Rob openly');assert.equal(s.npcs[id].attitude,'hostile');if(id==='vex'){assert(s.combat);assert(!s.npcs[id].memory.robbed);}else{assert(!s.combat);assert(s.gold>before);assert(s.npcs[id].memory.robbed);assert(STOCK_KEYS.every(k=>s.npcs[id].inventory[k]===0));const gold=s.gold;act(s,id,'Rob openly');assert.equal(s.gold,gold);}}});
test('Vex reacts to an earlier robbery of Tobin and refuses friendship',()=>{let s=supplied();act(s,'tobin','Rob openly');s=checkpoint(s);act(s,'vex','Talk');assert(s.log.at(-1).includes('Tobin’s radio'));assert(s.npcs.vex.memory.heardTobinRobbed);assert.equal(s.npcs.vex.attitude,'suspicious');act(s,'vex','Help');act(s,'vex','Befriend');assert(!s.npcs.vex.memory.befriended);});
test('Exposed lies, failed thefts and missing help supplies have real outcomes',()=>{for(const id of PEOPLE){let s=fresh();s.potions=0;s.gold=0;s.items.bandages=0;act(s,id,'Help');assert(!s.npcs[id].memory.helped);act(s,id,'Lie');assert(s.npcs[id].memory.lieExposed);act(s,id,'Pickpocket');assert.equal(s.npcs[id].attitude,'hostile');s=supplied();act(s,id,'Talk');act(s,id,'Lie');act(s,id,'Talk');assert(s.npcs[id].memory.lieExposed);assert.equal(s.npcs[id].attitude,'hostile');}});
test('Changing combat intent is free; smoke escapes without damage; injuries persist',()=>{let s=fresh();s.items.smokeBombs=1;act(s,'vex','Attack');const hp=s.hp;fight(s,'Switch to nonlethal');assert.equal(s.hp,hp);assert(combatActions(s).includes('Switch to lethal'));fight(s,'Attack',()=>.5);const before=s.hp,enemyHP=s.npcs.vex.hp;fight(s,'Smoke bomb');assert.equal(s.hp,before);assert.equal(s.items.smokeBombs,0);assert.equal(s.combat,null);s=checkpoint(s);assert.equal(s.npcs.vex.hp,enemyHP);assert(s.npcs.vex.memory.attacked);});
test('Looted items have actual uses and cannot be used twice',()=>{const s=fresh();s.hp=10;assert(useBandage(s));assert.equal(s.hp,16);assert(!useBandage(s));s.items.whetstones=1;assert(useWhetstone(s));assert.deepEqual(attackRange(s),[6,8]);assert(!useWhetstone(s));s.flags.vexTraining=true;assert.deepEqual(attackRange(s),[7,9]);});
test('Tobin information reveals a separate one-time cache reward',()=>{const s=supplied();act(s,'pipe','Search');const first=s.gold;act(s,'tobin','Talk');act(s,'tobin','Help');act(s,'tobin','Befriend');act(s,'pipe','Search');assert.equal(s.gold,first+3);const after=s.gold;act(s,'pipe','Search');assert.equal(s.gold,after);checkpoint(s);});
test('Old saves migrate attitudes, deaths and inventories without reviving anyone',()=>{let old={...fresh(),version:1,npcs:{mara:{hp:0,state:'dead'},rat:{hp:0,state:'dead'}},flags:{stolen:true,looted:true},key:true,room:1,x:6,y:6};delete old.items;delete old.logSerial;const s=decode(JSON.stringify(old));assert(s);assert.equal(s.version,2);assert.equal(s.npcs.mara.condition,'dead');assert.equal(s.npcs.rat.condition,'dead');assert(s.npcs.mara.memory.looted);assert.equal(s.npcs.mara.inventory.gold,0);assert(!blocked(s,s.x,s.y));assert.equal(s.npcs.tobin.attitude,'suspicious');});
test('Malformed saves fail safely; unconscious and completed saves round-trip',()=>{let s=fresh();for(const raw of ['nope','null','{}',JSON.stringify({...s,hp:0}),JSON.stringify({...s,npcs:null}),JSON.stringify({...s,x:4,y:3}),JSON.stringify({...s,items:null}),JSON.stringify({...s,npcs:{...s.npcs,vex:{...s.npcs.vex,condition:'dead'}}})])assert.equal(decode(raw),null);getKey(s);finish(s);assert(decode(encode(s)).complete);});

function summary(s){return {complete:s.complete,hp:s.hp,gold:s.gold,potions:s.potions,items:s.items,damage:attackRange(s),achievements:s.achievements,npcs:Object.fromEntries(PEOPLE.map(id=>[id,s.npcs[id]]))};}
function helpful(){let s=fresh();act(s,'chest','Open');act(s,'note','Read');for(const id of ['tobin','mara']){act(s,id,'Talk');act(s,id,'Help');act(s,id,'Befriend');act(s,id,'Trade');s=checkpoint(s);}act(s,'crate','Break');act(s,'rat','Offer cheese');act(s,'pipe','Search');act(s,'vex','Talk');act(s,'vex','Help');act(s,'vex','Befriend');act(s,'vex','Trade');useWhetstone(s);s=finish(s);for(const id of PEOPLE){assert.equal(s.npcs[id].attitude,'friendly');assert.equal(s.npcs[id].condition,'conscious');}assert.deepEqual(attackRange(s),[7,9]);return s;}
function thief(){let s=fresh();act(s,'chest','Open');act(s,'note','Read');act(s,'tobin','Talk');act(s,'tobin','Lie');act(s,'tobin','Trade');act(s,'tobin','Pickpocket');act(s,'mara','Talk');act(s,'mara','Help');act(s,'mara','Befriend');act(s,'mara','Lie');act(s,'mara','Pickpocket');s=checkpoint(s);act(s,'vex','Talk');assert(s.npcs.vex.memory.heardTobinRobbed);act(s,'vex','Lie');act(s,'vex','Pickpocket');travel(s,3);travel(s,4);useWhetstone(s);s=finish(s);for(const id of PEOPLE){assert.equal(s.npcs[id].attitude,'hostile');assert.equal(s.npcs[id].condition,'conscious');assert(s.npcs[id].memory.theftDetected);}assert(s.npcs.mara.memory.betrayed);return s;}
function violent(){let s=fresh();act(s,'chest','Open');act(s,'tobin','Rob openly');act(s,'tobin','Knock unconscious');win(s);act(s,'tobin','Loot');act(s,'tobin','Kill');s=checkpoint(s);for(const id of ['mara','vex']){act(s,'fountain','Heal');act(s,id,'Attack');win(s);act(s,id,'Loot');s=checkpoint(s);}useWhetstone(s);s=finish(s);for(const id of PEOPLE){assert.equal(s.npcs[id].condition,'dead');assert(s.npcs[id].memory.killed);assert(STOCK_KEYS.every(k=>s.npcs[id].inventory[k]===0));}assert(s.npcs.vex.memory.heardTobinKilled);return s;}
const report={};
test('Full helpful playthrough: three allies, information rewards and stronger attacks',()=>report.helpful=summary(helpful()));
test('Full manipulative playthrough: successful thefts, exposed reputation and betrayal',()=>report.thief=summary(thief()));
test('Full violent playthrough: all three dead, empty inventories, exit remains usable',()=>report.violent=summary(violent()));
test('The three completed saves produce noticeably different end states',()=>{assert.notDeepEqual(report.helpful,report.thief);assert.notDeepEqual(report.thief,report.violent);assert.notDeepEqual(report.helpful,report.violent);assert(report.helpful.damage[0]>report.thief.damage[0]);assert(report.violent.gold>report.helpful.gold);});
function holdHarness(){let pending=new Map(),id=0,steps=[],allowed=true;class Pad extends EventTarget{disabled=false;dataset={move:'1,0'};classList={add(){},remove(){}};setPointerCapture(){}}const button=new Pad(),other=new Pad();other.dataset.move='0,-1';const controls=bindHoldControls([button,other],{move:(...p)=>steps.push(p),canMove:()=>allowed,setTimer:(fn,delay)=>{pending.set(++id,{fn,delay});return id;},clearTimer:id=>pending.delete(id)});const fire=(type,props={},target=button)=>{const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:1,...props});target.dispatchEvent(e);};return {button,other,controls,steps,fire,pending,lock:()=>allowed=false,tick:()=>{const [id,{fn,delay}]=pending.entries().next().value;pending.delete(id);fn();return delay;}};}
test('Touch hold repeats and release stops; click does not double-step',()=>{const h=holdHarness();h.fire('pointerdown');assert.equal(h.steps.length,1);assert.equal(h.tick(),270);assert.equal(h.tick(),165);assert.equal(h.steps.length,3);h.fire('pointerup');h.fire('click',{detail:1});assert.equal(h.steps.length,3);assert.equal(h.pending.size,0);h.fire('click',{detail:0});assert.equal(h.steps.length,4);});
test('Cancelled touches and app pause stop held movement',()=>{const h=holdHarness();for(const type of ['pointercancel','lostpointercapture']){h.fire('pointerdown');h.fire(type);assert.equal(h.pending.size,0);}h.fire('pointerdown');h.controls.stop();assert.equal(h.pending.size,0);h.fire('pointerdown');h.lock();h.tick();assert.equal(h.pending.size,0);});
test('Only the active finger owns direction and disabled controls do not move',()=>{const h=holdHarness();h.fire('pointerdown');h.fire('pointerdown',{pointerId:2},h.other);h.fire('pointerup',{pointerId:1});h.tick();assert.deepEqual(h.steps.at(-1),[0,-1]);h.fire('pointerup',{pointerId:2},h.other);assert.equal(h.pending.size,0);h.button.disabled=true;const before=h.steps.length;h.fire('pointerdown');h.fire('click',{detail:0});assert.equal(h.steps.length,before);});

function quotedList(source,pattern){const block=source.match(pattern);assert(block,`Could not find a list to read: ${pattern}`);return block[1].split(',').map(part=>part.trim()).filter(part=>part.startsWith("'")).map(part=>part.slice(1,-1));}
const swSource=readFileSync('sw.js','utf8');
const buildSource=readFileSync('build.mjs','utf8');
const shipped=quotedList(buildSource,/for\(const file of \[([\s\S]*?)\]\)/);
const precached=quotedList(swSource,/const ASSETS = \[([\s\S]*?)\];/);
const normalise=path=>path.replace(/^\.\//,'');

test('The offline precache covers every file the build ships, and each one exists',()=>{
 assert(precached.includes('./'),'A directory launch must be precached for Home Screen starts');
 assert(existsSync('sw.js'));
 // sw.js is deliberately absent: the browser keeps its own copy of the worker.
 for(const file of shipped.filter(file=>file!=='sw.js'))assert(precached.map(normalise).includes(file),`${file} ships but is never precached`);
 for(const asset of precached.map(normalise).filter(Boolean))assert(existsSync(asset),`${asset} is precached but missing from the repository`);
});

test('The service worker is registered, served as JavaScript, and cache-versioned',()=>{
 assert(readFileSync('src/app.mjs','utf8').includes("register('sw.js')"),'The app must register the service worker');
 assert(/\.js'\s*:\s*'text\/javascript'/.test(readFileSync('server.mjs','utf8')),'The dev server must serve .js as JavaScript or browsers refuse the worker');
 assert(/CACHE = '[^']+'/.test(swSource),'The cache name must be versioned so releases can replace it');
 assert(swSource.includes('caches.delete'),'Old caches must be cleaned up on activation');
 assert(swSource.includes("request.mode === 'navigate'"),'Navigations need a shell fallback when the network is gone');
 assert(swSource.includes('request.method !== \'GET\''),'Only GET requests may be intercepted');
});

test('Offline play leaves gameplay and save rules untouched',()=>{const s=fresh();getKey(s);finish(s);assert.equal(s.hp,30);assert(decode(encode(fresh())).version,2);});

// The service worker is exercised directly, with a stubbed Cache API and
// fetch, so the offline path is tested rather than only inspected.
function workerHarness(){
 const base='http://localhost:4173/';
 const listeners={},stores=new Map();
 let online=true;
 const url=req=>new URL(typeof req==='string'?req:req.url,base).href;
 const response=href=>({url:href,ok:true,type:'basic',clone(){return this;}});
 const store=name=>{if(!stores.has(name))stores.set(name,new Map());return stores.get(name);};
 const caches={open:async name=>{const map=store(name);return{addAll:async urls=>{if(!online)throw new Error('offline');for(const item of urls)map.set(url(item),response(url(item)));},put:async(req,res)=>map.set(url(req),res),match:async req=>map.get(url(req))};},keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),match:async req=>{for(const map of stores.values()){const hit=map.get(url(req));if(hit)return hit;}return undefined;}};
 const selfStub={location:{origin:'http://localhost:4173'},claimed:false,skipWaiting:async()=>{},clients:{claim:async()=>{selfStub.claimed=true;}},addEventListener:(type,fn)=>{listeners[type]=fn;}};
 new Function('self','caches','fetch',readFileSync('sw.js','utf8'))(selfStub,caches,async req=>{if(!online)throw new Error('network down');return response(url(req));});
 return {selfStub,stores,store,response,url,listeners,setOnline:value=>{online=value;},async fire(type,event={}){const waits=[],responded=[];listeners[type]({...event,waitUntil:p=>waits.push(p),respondWith:p=>responded.push(p)});await Promise.all(waits);return {responded,settled:responded.length?Promise.all(responded):null};}};
}
const get=url=>({method:'GET',url,mode:'no-cors'});
const navigate=url=>({method:'GET',url,mode:'navigate'});

test('The worker precaches the whole shell, then clears stale caches and takes control',async()=>{
 const h=workerHarness();
 h.store('dungeoncrawlers-v0').set('http://localhost:4173/old.js',h.response('http://localhost:4173/old.js'));
 await h.fire('install');
 const cached=h.store('dungeoncrawlers-v1');
 for(const asset of precached){const href=h.url(asset);assert(cached.has(href),`install did not precache ${asset}`);assert.equal(cached.get(href).ok,true);}
 await h.fire('activate');
 assert.equal(h.stores.has('dungeoncrawlers-v0'),false,'the previous cache version must be removed');
 assert(h.selfStub.claimed,'the worker must claim open pages so the first visit becomes offline-capable');
});

test('Network-first serving falls back to the cache, then to the shell for navigations',async()=>{
 const h=workerHarness();
 await h.fire('install');
 const online=await h.fire('fetch',{request:get('http://localhost:4173/style.css')});
 assert.equal(online.responded.length,1,'a same-origin GET must be answered by the worker');
 const live=await online.responded[0];
 assert.equal(live.url,'http://localhost:4173/style.css');
 assert(h.store('dungeoncrawlers-v1').has('http://localhost:4173/style.css'),'a successful response must be cached for later');
 h.store('dungeoncrawlers-v1').set('http://localhost:4173/style.css',h.response('http://localhost:4173/style.css?cached'));
 h.setOnline(false);
 const offline=await h.fire('fetch',{request:get('http://localhost:4173/style.css')});
 assert.equal((await offline.responded[0]).url,'http://localhost:4173/style.css?cached','offline requests must be served from the cache');
 const deep=await h.fire('fetch',{request:navigate('http://localhost:4173/some/home/screen/start')});
 assert.equal((await deep.responded[0]).url,'http://localhost:4173/index.html','an uncached navigation must fall back to the game shell');
});

test('Non-GET and cross-origin requests are left alone',async()=>{
 const h=workerHarness();
 await h.fire('install');
 const post=await h.fire('fetch',{request:{method:'POST',url:'http://localhost:4173/save',mode:'no-cors'}});
 const font=await h.fire('fetch',{request:get('https://fonts.example.com/display.css')});
 assert.equal(post.responded.length,0);
 assert.equal(font.responded.length,0);
});

await Promise.all(pending);console.log(`\n${passed} checks passed.`);
const reportIndex=process.argv.indexOf("--report");if(reportIndex>=0)writeFileSync(process.argv[reportIndex+1],JSON.stringify(report,null,2));

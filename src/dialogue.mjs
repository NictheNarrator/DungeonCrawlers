// Player-choice dialogue. Nodes hold the NPC's line and a few labelled replies;
// each reply is a pure description of what it does, applied by the engine so
// this module never needs to reach into game systems.
export const DIALOGUE={
 mara:{
  first:{
   prompt:'“Did you see what happened up there?”',
   options:[
    {label:'“It came down all at once. I am sorry.”',approval:8,memory:'comforted',line:'Mara: “Right. Sorry. I keep asking people like they will say something different.”'},
    {label:'“Not my problem. Move.”',approval:-5,memory:'dismissed',line:'Mara: “Fine. Noted.” She steps back and stops asking you things.'},
    {label:'“Emergency services are on the way. They told me.”',lie:true,dc:12,memory:'lied',line:'Mara: “They told you. Right. Then we wait.”'},
    {label:'“What do you know? Start talking.”',approval:-2,memory:'questioned',line:'Mara: “I know three things. That is the whole list.”'},
    {label:'“Stay where I can see you, or I will make this worse.”',approval:-20,memory:'threatened',suspicious:true,line:'Mara: “Understood.” She keeps her hands where you can see them and her eyes on the exits.'}
   ]},
  knows:{
   prompt:'“There are creatures down here. Something talks through the speakers. And I found a room they would not follow me into. That is all I have.”',
   options:[
    {label:'“That is more than I had.”',approval:4,line:'Mara: “Then we are both guessing. We can guess together or separately.”'},
    {label:'“Where was the room?”',line:'Mara: “Further in. Blue lights. You will know it.”'},
    {label:'“You are lying to me.”',approval:-6,suspicious:true,line:'Mara: “I am not. You are just frightened, and it is making you unpleasant.”'}
   ]}
 },
 skrit:{
  first:{
   prompt:'He freezes with one paw still on the machine. “You… tall. You not take machine. Machine mine.”',
   options:[
    {label:'Hold up both hands and stay low.',memory:'greeted',line:'He looks at your hands, then at the doorway, then back at you. “Skrit. That me. Skrit is… name.” He says it like he is checking it still works.'},
    {label:'“I am not here to hurt you.”',memory:'greeted',revealName:true,line:'“Skrit,” he says, tapping his chest. “Leg bad. Machine stuck. You not help, you not stand so close.”'},
    {label:'“Back off, or this gets worse.”',intimidate:true,dc:10,memory:'threatened',line:'Skrit shrinks back against the machine, ears flat. “No. No, you keep. You keep all.”'},
    {label:'“What is this place?”',memory:'questioned',line:'Skrit blinks at you. “Place?” He gestures at the concourse like it explains itself. “Is place. Is home. You not from here.”'},
    {label:'Offer him something to eat.',needs:'cheese',consume:'cheese',memory:'fed',revealName:true,revealHome:true,friendlyMember:'skrit',line:'He takes the food with both paws and eats like he has been deciding for days whether to trust the floor. “Skrit,” he says, mouth full. “Others that way. All ratmen, that way. This place is ours. You walk soft, nobody bites.”'},
    {label:'Leave him to it.',memory:'ignored',line:'He watches you go the whole way, one paw still on the machine.'}
   ]}
 }
};
export function nodeFor(s,id,key){const tree=DIALOGUE[id];if(!tree)return null;const memory=s.npcs[id]?.memory||{};
 if(key==='first')return tree.first;
 if(key==='knows')return tree.knows;
 return tree[key]||null;}
export function startNodeFor(s,id){const tree=DIALOGUE[id];if(!tree)return null;const memory=s.npcs[id]?.memory||{};
 if(!memory.answeredFirst)return 'first';
 return null;}
export function optionsFor(node){return node?node.options:[];}

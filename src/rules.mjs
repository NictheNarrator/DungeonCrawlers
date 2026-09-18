// Central d20 rules. Ability checks, skill checks and saving throws all resolve
// through check(), so future gameplay never needs its own random success rule.
export const ABILITIES=['strength','dexterity','constitution','intelligence','wisdom','charisma'];
export const SKILLS={
 athletics:'strength',
 acrobatics:'dexterity','sleight of hand':'dexterity',stealth:'dexterity',
 arcana:'intelligence',history:'intelligence',investigation:'intelligence',nature:'intelligence',religion:'intelligence',
 'animal handling':'wisdom',insight:'wisdom',medicine:'wisdom',perception:'wisdom',survival:'wisdom',
 deception:'charisma',intimidation:'charisma',performance:'charisma',persuasion:'charisma'
};
export const STARTING_ABILITIES={strength:13,dexterity:16,constitution:14,intelligence:12,wisdom:13,charisma:15};
export const STARTING_SKILLS=['sleight of hand','stealth','perception','deception'];
export const STARTING_SAVES=['dexterity','wisdom'];

export function modifier(score){return Math.floor((score-10)/2);}
export function proficiencyBonus(level=1){return 2+Math.floor((Math.max(1,Math.min(20,Math.trunc(level)))-1)/4);}
export function skillAbility(skill){return SKILLS[String(skill).toLowerCase()]||null;}
function d20(rng){return 1+Math.floor(Math.min(0.999999,Math.max(0,rng()))*20);}
function sum(modifiers){const list=Array.isArray(modifiers)?modifiers:[modifiers];return list.reduce((total,value)=>total+(Number(value)||0),0);}

// check({actor, skill:'stealth', dc:12}) for a skill check,
// check({actor, ability:'dexterity', save:true, dc:13}) for a saving throw.
// `proficient` overrides what the actor is trained in either way.
export function check({actor=null,ability=null,skill=null,save=false,dc=10,score=null,proficient=null,modifiers=0,advantage=false,disadvantage=false,rng=Math.random}={}){
 const named=skill?skillAbility(skill):null;
 const used=(ability?String(ability):named||'').toLowerCase();
 if(!ABILITIES.includes(used))throw new Error(`Unknown ability or skill: ${ability||skill}`);
 const abilityScore=Number.isInteger(score)?score:(actor?.abilities?.[used]??10);
 const trained=proficient===null?(save?!!actor?.saves?.includes(used):skill?!!actor?.skills?.includes(String(skill).toLowerCase()):false):!!proficient;
 const bonus=proficiencyBonus(actor?.level??1);
 const otherModifiers=sum(modifiers);
 const twoDice=(!!advantage!==!!disadvantage);
 const rolls=twoDice?[d20(rng),d20(rng)]:[d20(rng)];
 const rawRoll=rolls.length===1?rolls[0]:(advantage?Math.max(...rolls):Math.min(...rolls));
 const abilityModifier=modifier(abilityScore);
 const total=rawRoll+abilityModifier+(trained?bonus:0)+otherModifiers;
 return {
  kind:save?'save':skill?'skill':'ability',
  ability:used,
  skill:skill?String(skill).toLowerCase():null,
  rawRoll,
  rolls,
  advantage:!!advantage&&!disadvantage,
  disadvantage:!!disadvantage&&!advantage,
  abilityScore,
  abilityModifier,
  proficiencyBonus:bonus,
  proficiency:trained,
  otherModifiers,
  total,
  dc,
  success:total>=dc
 };
}

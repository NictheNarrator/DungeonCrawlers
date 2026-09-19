// Dialogue portraits. One shared renderer and six sets of proportions, so the
// whole cast is unmistakably drawn by the same hand: same crop, same light from
// the upper left, same palette, same level of detail.
//
// A character can also point at an illustrated file (see art/portraits/README.md).
// If that file exists it is used; if it does not, the drawn portrait is used
// instead. Nothing ever renders blank.

import {PALETTE as P} from './palette.mjs';

export const PORTRAIT_SIZE = { w: 96, h: 114 };

// Everybody here is an adult, and nobody shares a face. Skull width, jaw, chin,
// eye spacing and colour, nose, mouth, hair and silhouette all differ.
const CAST = {
 mara:{
  // late twenties to early thirties: frightened, and refusing to show it.
  skin:'#e2b0a8',shade:'#b98d87',
  hair:{color:'#6b4a32',style:'long'},
  face:{width:18,jaw:15,chin:8},
  eyes:{color:'#3279a4',spacing:19,size:8,brow:'angled'},
  nose:{length:10,width:4},mouth:{width:13,curve:0},
  cloth:{base:'#7c9565',trim:'#99ad7c',collar:'#8d725c'},gear:'strap',
  expression:'guarded'
 },
 skrit:{
  // a person first and a monster second: wiry, wary, hungry.
  skin:'#8c8e9e',shade:'#747686',
  hair:{color:'#604e4d',style:'tuft'},
  face:{width:16,jaw:13,chin:9,muzzle:12},
  eyes:{color:'#c4403a',spacing:17,size:7,brow:'flat'},
  nose:{length:6,width:5},mouth:{width:12,curve:-1},
  cloth:{base:'#3279a4',trim:'#eac999',collar:'#604e4d'},gear:'fur',
  expression:'wary'
 },
 tobin:{
  // thin, patchy, mentally inventorying everything you are carrying.
  skin:'#e2b0a8',shade:'#b98d87',
  hair:{color:'#a8563a',style:'thick'},
  face:{width:20,jaw:18,chin:10},
  eyes:{color:'#5a4a34',spacing:18,size:8,brow:'worried'},
  nose:{length:12,width:4},mouth:{width:12,curve:-1},
  cloth:{base:'#8d725c',trim:'#eac999',collar:'#604e4d'},gear:'beard',
  expression:'nervous'
 },
 vex:{
  // attractive, composed, and entirely unreadable.
  skin:'#e2b0a8',shade:'#b98d87',
  hair:{color:'#17365e',style:'loose'},
  face:{width:19,jaw:16,chin:8},
  eyes:{color:'#3279a4',spacing:20,size:9,brow:'level'},
  nose:{length:11,width:4},mouth:{width:13,curve:1},
  cloth:{base:'#1d5193',trim:'#b27579',collar:'#07265b'},gear:'scarf',
  expression:'calm'
 },
 eli:{
  // an ordinary man pushed a long way past his comfort zone.
  skin:'#e2b0a8',shade:'#b98d87',
  hair:{color:'#8d725c',style:'thick'},
  face:{width:18,jaw:14,chin:9},
  eyes:{color:'#5c6470',spacing:18,size:8,brow:'raised'},
  nose:{length:11,width:5},mouth:{width:12,curve:-2},
  cloth:{base:'#8c8e9e',trim:'#1d5193',collar:'#604e4d'},gear:'glasses',
  expression:'frightened'
 },
 june:{
  // striking in a different key to Mara: softer structure, warmer, hurt.
  skin:'#e2b0a8',shade:'#b98d87',
  hair:{color:'#fdefcb',style:'bun'},
  face:{width:17,jaw:15,chin:6},
  eyes:{color:'#6a5a3f',spacing:20,size:9,brow:'soft'},
  nose:{length:9,width:4},mouth:{width:14,curve:0},
  cloth:{base:'#7c9565',trim:'#99ad7c',collar:'#eac999'},gear:'bandage',
  expression:'hurt'
 }
};

// The registry the game asks. `file` is where an illustrated portrait lives;
// `variants` is the seam for expression states later; `draw` is the fallback.
export const PORTRAITS = Object.fromEntries(Object.keys(CAST).map(id=>[id,{
 file:`art/portraits/${id}.png`,
 variants:{},
 fallbackFile:'art/portraits/default.png',
 draw:(g)=>drawPortrait(g,CAST[id])
}]));

export function portraitFor(id){return PORTRAITS[id]||null;}
export function portraitIds(){return Object.keys(PORTRAITS);}

// ---- the drawing -----------------------------------------------------------

function shade(hex,amount){const n=parseInt(hex.slice(1),16);
 const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
 return '#'+[clamp((n>>16)+amount),clamp(((n>>8)&255)+amount),clamp((n&255)+amount)]
  .map(v=>v.toString(16).padStart(2,'0')).join('');}

function drawPortrait(g,s){
 const W=PORTRAIT_SIZE.w,cx=W/2;
 const px=(x,y,w,h,c)=>{if(w<=0||h<=0)return;g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 // a stepped rounded rectangle: the whole portrait is built from these
 const soft=(x,y,w,h,r,c)=>{px(x+r,y,w-r*2,h,c);px(x,y+r,r,h-r*2,c);px(x+w-r,y+r,r,h-r*2,c);
  px(x+1,y+1,w-2,r,c);px(x+1,y+h-r-1,w-2,r,c);};
 const skin=s.skin,lit=shade(skin,16),dim=shade(skin,-22),deep=shade(skin,-42),hair=s.hair.color;
 const fw=s.face.width,fh=Math.round(fw*1.32),top=11;
 const eyeY=top+Math.round(fh*0.46),faceBottom=top+fh;

 // backdrop: cold wall, one seam, dark at the edges, nothing to read
 const sky=P.sky,skyLit=shade(sky,58),skyMid=shade(sky,36);
 px(0,0,W,PORTRAIT_SIZE.h,skyMid);
 px(0,0,W,42,skyLit);px(0,42,W,20,shade(sky,46));
 px(0,40,W,2,shade(sky,20));
 px(0,0,2,PORTRAIT_SIZE.h,shade(sky,-6));px(W-2,0,2,PORTRAIT_SIZE.h,shade(sky,-12));

 // hair mass, behind everything
 if(s.hair.style==='loose')soft(cx-fw-6,top-6,(fw+6)*2,fh+30,6,shade(hair,-22));
 else if(s.hair.style==='messy')soft(cx-fw-4,top-6,(fw+4)*2,fh+18,5,shade(hair,-18));
 else soft(cx-fw-2,top-5,(fw+2)*2,fh+10,5,shade(hair,-20));

 // shoulders: narrow at the neck, widening into the frame
 const shoulderY=faceBottom+18;
 for(let i=0;i<10;i++){const y=shoulderY+i*2,w=fw+16+i*5;px(cx-w/2,y,w,2,shade(s.cloth.base,-6));}
 px(cx-fw-6,shoulderY,12+fw*2,3,s.cloth.trim);
 // collar and whatever they carry
 if(s.gear==='highcollar'){px(cx-16,shoulderY-6,32,8,s.cloth.collar);px(cx-5,shoulderY-6,10,10,shade(s.cloth.collar,-14));}
 else if(s.gear==='scarf'){px(cx-16,shoulderY-4,32,7,'#8a5a34');px(cx-5,shoulderY-4,10,9,shade('#8a5a34',-18));}
 else px(cx-13,shoulderY-3,26,6,s.cloth.collar);
 if(s.gear==='strap'){px(cx-16,shoulderY+2,5,26,shade('#4a453f',6));px(cx-15,shoulderY+8,3,3,'#b0a184');}
 if(s.gear==='pouches'){px(cx-20,shoulderY+4,9,10,'#8a5a34');px(cx+11,shoulderY+8,8,8,shade('#8a5a34',-14));px(cx-8,shoulderY+3,4,18,shade('#4a453f',4));}
 if(s.gear==='beard'){px(cx-s.face.jaw-1,faceBottom-13,(s.face.jaw+1)*2,15,s.hair.color);px(cx-5,faceBottom,10,5,s.hair.color);px(cx-s.face.jaw,eyeY+s.nose.length,s.face.jaw*2,5,shade(s.hair.color,16));px(cx-3,faceBottom-14,6,3,shade(s.hair.color,20));}
 if(s.gear==='fur'){for(let i=0;i<7;i++)px(cx-fw-8+i*6,shoulderY-4,5,5,shade(s.skin,4));}
 if(s.gear==='bandage'){px(cx-18,shoulderY+1,8,14,'#e6e2d6');px(cx-18,shoulderY+6,8,2,shade('#e6e2d6',-40));}
 if(s.gear==='glasses'){px(cx-20,shoulderY+6,7,7,'#3c4a63');}

 // neck, with the jaw shadow on it
 px(cx-6,faceBottom-6,12,shoulderY-faceBottom+8,dim);
 px(cx-6,faceBottom-6,12,5,deep);

 // ears (a ratman gets tall ones, tucked under the hair mass)
 if(s.face.muzzle){px(cx-fw-9,top+2,7,13,shade(skin,-6));px(cx+fw+2,top+2,7,13,shade(skin,-10));
  px(cx-fw-8,top+4,5,8,shade(skin,-26));px(cx+fw+3,top+4,5,8,shade(skin,-30));}
 else {px(cx-fw-3,eyeY-2,4,11,dim);px(cx+fw-1,eyeY-2,4,11,dim);}

 // face: skull, tapered jaw, chin
 soft(cx-fw,top,fw*2,fh-9,5,skin);
 soft(cx-fw+2,faceBottom-10,fw*2-4,10,3,shade(skin,-4));
 px(cx-fw,top+3,fw*2,4,lit);
 px(cx-fw-1,faceBottom-9,4,9,dim);px(cx+fw-3,faceBottom-9,4,9,dim);
 px(cx-s.face.jaw,faceBottom-1,s.face.jaw*2,4,dim);
 px(cx-s.face.chin/2,faceBottom+3,s.face.chin,4,deep);
 if(s.face.muzzle){soft(cx-7,faceBottom-16,14,s.face.muzzle,5,shade(skin,10));
  px(cx-2,faceBottom-8,4,7,deep);px(cx-3,faceBottom-3,6,3,shade(skin,-30));}

 // brows: the expression lives here
 const bx=fw-1,e=s.eyes,half=e.spacing/2;
 const brow=(side)=>{const x=side<0?cx-half-e.size/2-2:cx+half-e.size/2;
  const lift=s.expression==='frightened'?2:s.expression==='hurt'?1:0;
  const inner=s.expression==='guarded'?1:s.expression==='wary'?1:0;
  px(x,eyeY-8-lift+inner,e.size+4,3,hair);
  px(x+(side<0?0:e.size),eyeY-7-lift,e.size/2-1,2,hair);};
 brow(-1);brow(1);

 // eyes: socket, white, iris, pupil, catchlight
 const eye=(side)=>{const x=side<0?cx-half-e.size/2:cx+half-e.size/2;
  px(x-1,eyeY-2,e.size+2,e.size*0.6+3,shade(skin,-30));
  soft(x,eyeY,e.size,Math.round(e.size*0.55),2,'#e6e2d6');
  px(x+Math.round(e.size*0.28),eyeY,Math.round(e.size*0.45),Math.round(e.size*0.55),e.color);
  px(x+Math.round(e.size*0.38),eyeY+1,Math.round(e.size*0.24),Math.round(e.size*0.34),'#1b1f21');
  px(x+Math.round(e.size*0.62),eyeY+1,1,1,'#ffffff');
  px(x,eyeY-1,e.size,1,shade(skin,-46));};
 eye(-1);eye(1);

 // nose
 px(cx-1,eyeY+3,2,s.nose.length,dim);
 px(cx-Math.round(s.nose.width/2),eyeY+2+s.nose.length,s.nose.width,2,dim);
 px(cx-1,eyeY+2+s.nose.length,2,1,lit);

 // mouth
 const mouthY=eyeY+5+s.nose.length,mw=s.mouth.width;
 px(cx-mw/2,mouthY-1,mw,1,shade(skin,-34));
 px(cx-mw/2,mouthY,mw,2,shade(skin,-58));
 px(cx-mw/2+1,mouthY+2,mw-2,1,shade(skin,12));
 if(s.mouth.curve>0){px(cx-mw/2-2,mouthY-2,2,3,shade(skin,-44));px(cx+mw/2,mouthY-2,2,3,shade(skin,-44));}
 if(s.mouth.curve<0){px(cx-2,mouthY+2,5,2,shade(skin,-58));}
 else px(cx-3,mouthY+2,mw-4,1,shade(skin,-38));

 // fringe last, so the hairline sits over the forehead and never the eyes
 if(s.hair.style==='messy'){px(cx-fw,top-2,fw*2,6,hair);px(cx-fw,top+3,12,7,shade(hair,-12));px(cx+fw-14,top+2,14,5,shade(hair,10));}
 if(s.hair.style==='loose'){px(cx-fw-1,top-4,fw*2+2,6,hair);px(cx-fw-1,top+2,11,8,shade(hair,-10));px(cx+fw-10,top+1,11,7,hair);}
 if(s.hair.style==='swept'){px(cx-fw,top-4,fw*2,6,hair);px(cx-fw,top+2,15,5,shade(hair,-16));px(cx+fw-12,top-1,12,4,shade(hair,14));}
 if(s.hair.style==='thinning'){px(cx-fw+3,top-3,fw*2-6,5,shade(hair,-12));px(cx-fw+5,top+2,6,5,hair);px(cx+fw-11,top+2,6,5,hair);}
 if(s.hair.style==='receding'){px(cx-fw+4,top-3,fw*2-8,4,shade(hair,-14));px(cx-fw+1,top+1,7,6,hair);px(cx+fw-8,top+1,7,6,hair);}
 if(s.hair.style==='long'){px(cx-fw-2,top-4,fw*2+4,7,hair);px(cx-fw-4,top+2,11,fh+16,shade(hair,-12));px(cx+fw-7,top+2,11,fh+16,hair);px(cx-fw,top+3,10,6,shade(hair,10));}
 if(s.hair.style==='thick'){px(cx-fw,top-5,fw*2,7,hair);px(cx-fw-1,top,14,6,shade(hair,-10));px(cx+fw-13,top-1,14,6,shade(hair,12));}
 if(s.hair.style==='bun'){px(cx-fw+1,top-3,fw*2-2,6,hair);px(cx+fw-16,top-12,13,12,shade(hair,-10));px(cx-fw,top+2,10,6,shade(hair,14));}
 if(s.hair.style==='tuft'){px(cx-fw+2,top-4,11,7,hair);px(cx+fw-15,top-3,13,6,shade(hair,10));px(cx-3,top-5,7,4,hair);}

 // glasses, if any, are the last thing on the face
 if(s.gear==='glasses'){g.strokeStyle='#cfd6d2';g.lineWidth=1;
  const y=Math.round(eyeY-3),hh=Math.round(e.size*0.8);
  g.strokeRect(Math.round(cx-half-e.size/2-3),y,Math.round(e.size+6),hh+4);
  g.strokeRect(Math.round(cx+half-e.size/2-3),y,Math.round(e.size+6),hh+4);
  px(cx-2,eyeY+1,4,1,'#cfd6d2');}
 if(s.gear==='bandage'){px(cx+fw-6,top+2,7,22,'#e6e2d6');px(cx+fw-6,top+10,7,2,shade('#e6e2d6',-40));}

 // one light, upper left: rim on the left cheek, shadow down the right
 px(cx-fw,top+6,2,fh-12,lit);
 px(cx-fw+3,eyeY+7,5,3,shade(skin,10));px(cx+fw-8,eyeY+7,5,3,shade(skin,-14));
 px(cx+fw-2,top+6,2,fh-12,dim);
 if(s.expression==='hurt')px(cx-fw+3,eyeY+9,5,2,shade(skin,-34));
 if(s.expression==='nervous')px(cx-fw+4,eyeY+11,4,2,shade(skin,-30));
}

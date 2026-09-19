// Dialogue portraits. One shared renderer, six sets of proportions, so the whole
// cast is unmistakably drawn by the same hand: same crop, same light from the
// upper left, same palette, same level of detail.
//
// A character can also point at an illustrated file (see art/portraits/README.md).
// If that file exists it is used; if it does not, the drawn portrait below is
// used instead. Nothing ever renders blank.

export const PORTRAIT_SIZE = { w: 96, h: 114 };

// Every character below is an adult. Faces are deliberately different: different
// skull width, jaw, chin, eye spacing, nose, mouth, hair and silhouette.
const CAST = {
 mara:{
  // late twenties to early thirties; frightened and refusing to show it.
  skin:'#c9a487',shade:'#a37f63',blush:'#b07f62',
  hair:{color:'#4a3428',style:'messy',length:'medium'},
  face:{width:20,jaw:15,chin:7,cheek:4},
  eyes:{color:'#3f5a4a',width:6,height:4,spacing:8,brow:3,tilt:-1},
  nose:{length:5,width:4},mouth:{width:9,curve:0},
  cloth:{base:'#6f7a4a',trim:'#b6c187',collar:'#3c4a63'},detail:'none',
  expression:'guarded'
 },
 skrit:{
  // a person first, a monster second: wary, wiry, hungry, one ear torn.
  skin:'#7d8a74',shade:'#5f6b58',blush:'#6d7a63',
  hair:{color:'#54604f',style:'tuft',length:'short'},
  face:{width:16,jaw:12,chin:14,cheek:2,muzzle:9},
  eyes:{color:'#a8332e',width:5,height:4,spacing:7,brow:2,tilt:1},
  nose:{length:3,width:3},mouth:{width:8,curve:-1},
  cloth:{base:'#5d7f7a',trim:'#b0a184',collar:'#4a453f'},detail:'rat',
  expression:'wary'
 },
 tobin:{
  // thin, patchy, mentally inventorying everything you are carrying.
  skin:'#bd9878',shade:'#96765c',blush:'#a2755e',
  hair:{color:'#5b4632',style:'thinning',length:'short'},
  face:{width:18,jaw:13,chin:8,cheek:6},
  eyes:{color:'#5a4a34',width:5,height:4,spacing:8,brow:3,tilt:0},
  nose:{length:7,width:4},mouth:{width:7,curve:-1},
  cloth:{base:'#6f7a4a',trim:'#8a5a34',collar:'#4a453f'},detail:'stubble',
  expression:'nervous'
 },
 vex:{
  // attractive, composed, and entirely unreadable.
  skin:'#c2a084',shade:'#9b7c62',blush:'#a87c62',
  hair:{color:'#2f3238',style:'swept',length:'short'},
  face:{width:21,jaw:16,chin:8,cheek:5},
  eyes:{color:'#4fc4d8',width:6,height:4,spacing:9,brow:4,tilt:-1},
  nose:{length:6,width:3},mouth:{width:9,curve:1},
  cloth:{base:'#3c4a63',trim:'#6d6a62',collar:'#26292b'},detail:'scarf',
  expression:'calm'
 },
 eli:{
  // an ordinary man pushed a long way past his comfort zone.
  skin:'#c8a684',shade:'#a0805f',blush:'#ab7c60',
  hair:{color:'#4a4038',style:'receding',length:'short'},
  face:{width:19,jaw:14,chin:9,cheek:5},
  eyes:{color:'#5c6470',width:5,height:4,spacing:8,brow:3,tilt:1},
  nose:{length:6,width:4},mouth:{width:8,curve:-2},
  cloth:{base:'#6d6a62',trim:'#3c4a63',collar:'#4a453f'},detail:'glasses',
  expression:'frightened'
 },
 june:{
  // striking in a different key to Mara: softer structure, warmer, hurt.
  skin:'#d0a98b',shade:'#a98268',blush:'#bb8468',
  hair:{color:'#7a4a2a',style:'loose',length:'long'},
  face:{width:19,jaw:16,chin:6,cheek:6},
  eyes:{color:'#6a5a3f',width:7,height:5,spacing:8,brow:3,tilt:0},
  nose:{length:4,width:3},mouth:{width:10,curve:0},
  cloth:{base:'#5d7f7a',trim:'#b0a184',collar:'#8a5a34'},detail:'bandage',
  expression:'hurt'
 }
};

// The registry the game asks. `file` is where an illustrated portrait would live;
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
 const r=clamp((n>>16)+amount),g=clamp(((n>>8)&255)+amount),b=clamp((n&255)+amount);
 return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');}

function drawPortrait(g,s){
 const {w,h}=PORTRAIT_SIZE,cx=w/2;
 const px=(x,y,ww,hh,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(ww),Math.round(hh));};
 const fw=Math.round(s.face.width*1.5),fh=Math.round(fw*1.3),top=10;
 const hair=s.hair.color,skin=s.skin;
 // backdrop: a cold wall, darker at the edges, no scenery
 px(0,0,w,h,'#141d1e');px(0,0,w,46,'#1e2d2d');px(0,46,w,h-46,'#16221f');
 px(0,0,2,h,'#0d1414');px(w-2,0,2,h,'#0d1414');
 // hair mass sits behind the head, never over the face
 px(cx-fw-5,top-8,(fw+5)*2,fh+16,shade(hair,-18));
 if(s.hair.length!=='short'){px(cx-fw-7,top+4,11,fh+6,shade(hair,-24));px(cx+fw-4,top+4,11,fh+6,shade(hair,-24));}
 if(s.detail==='rat'){px(cx-fw-9,top-8,10,14,shade(skin,-8));px(cx+fw-1,top-8,10,14,shade(skin,-8));}
 // shoulders and collar, low in the frame so the head owns it
 const shoulderY=Math.min(h-20,top+fh+26);
 px(2,shoulderY,w-4,h-shoulderY,shade(s.cloth.base,-6));
 px(2,shoulderY,w-4,5,s.cloth.trim);
 px(cx-16,shoulderY-3,32,5,shade(s.cloth.base,12));
 px(cx-8,shoulderY,16,13,s.cloth.collar);
 // neck closes the gap between chin and shoulders
 px(cx-8,top+fh-4,16,shoulderY-(top+fh-4)+3,shade(skin,-18));
 // face: skull, jaw, chin
 px(cx-fw,top,fw*2,fh,skin);
 px(cx-fw,top,fw*2,4,shade(skin,16));
 px(cx-fw,top+fh-7,4,7,shade(skin,-12));px(cx+fw-4,top+fh-7,4,7,shade(skin,-12));
 px(cx-s.face.jaw,top+fh,s.face.jaw*2,5,shade(skin,-9));
 px(cx-s.face.chin/2,top+fh+5,s.face.chin,4,shade(skin,-15));
 if(s.detail!=='rat'){px(cx-fw-3,top+16,3,11,shade(skin,-15));px(cx+fw,top+16,3,11,shade(skin,-15));}
 if(s.face.muzzle){px(cx-7,top+fh*0.52,14,s.face.muzzle,shade(skin,12));px(cx-2,top+fh*0.52+s.face.muzzle-6,4,6,shade(skin,-32));}
 // brows carry the expression
 const e=s.eyes,eyeY=Math.round(top+fh*0.44);
 const drop=s.expression==='frightened'?-1:s.expression==='nervous'?1:s.expression==='wary'?1:0;
 const tilt=s.expression==='guarded'?1:0;
 px(cx-e.spacing/2-e.width/2-1,eyeY-7+drop-tilt,e.width+3,3,shade(hair,-6));
 px(cx+e.spacing/2-e.width/2-1,eyeY-7+drop+tilt,e.width+3,3,shade(hair,-6));
 // eye sockets, then whites, then irises
 px(cx-e.spacing/2-e.width/2-2,eyeY-2,e.width+4,e.height+4,shade(skin,-28));
 px(cx+e.spacing/2-e.width/2-2,eyeY-2,e.width+4,e.height+4,shade(skin,-28));
 px(cx-e.spacing/2-e.width/2,eyeY,e.width,e.height,'#e6e2d6');
 px(cx+e.spacing/2-e.width/2,eyeY,e.width,e.height,'#e6e2d6');
 px(cx-e.spacing/2-e.width/2+1,eyeY,e.width-2,e.height,e.color);
 px(cx+e.spacing/2-e.width/2+1,eyeY,e.width-2,e.height,e.color);
 px(cx-e.spacing/2-e.width/2+2,eyeY+1,2,2,'#1b1f21');
 px(cx+e.spacing/2-e.width/2+2,eyeY+1,2,2,'#1b1f21');
 // nose and mouth
 px(cx-1,eyeY+5,3,s.nose.length,shade(skin,-24));
 const mouthY=eyeY+7+s.nose.length,mw=s.mouth.width;
 px(cx-mw/2,mouthY,mw,2,shade(skin,-48));
 if(s.mouth.curve>0){px(cx-mw/2-2,mouthY-1,2,3,shade(skin,-42));px(cx+mw/2,mouthY-1,2,3,shade(skin,-42));}
 if(s.mouth.curve<0)px(cx-2,mouthY+2,5,2,shade(skin,-54));
 // fringe: only the hairline, and it never covers the eyes
 if(s.hair.style==='messy'){px(cx-fw,top-3,fw*2,6,hair);px(cx-fw,top+3,13,6,shade(hair,-10));px(cx+fw-15,top+2,15,4,shade(hair,10));}
 if(s.hair.style==='loose'){px(cx-fw-3,top-5,fw*2+6,7,hair);px(cx-fw-2,top+2,10,7,shade(hair,-8));px(cx+fw-8,top+1,11,6,hair);}
 if(s.hair.style==='swept'){px(cx-fw,top-4,fw*2,6,hair);px(cx-fw,top+2,16,5,shade(hair,-14));px(cx+fw-13,top,13,4,shade(hair,14));}
 if(s.hair.style==='thinning'){px(cx-fw+4,top-3,fw*2-8,5,shade(hair,-10));px(cx-fw+6,top+2,6,4,hair);px(cx+fw-12,top+2,6,4,hair);}
 if(s.hair.style==='receding'){px(cx-fw+3,top-3,fw*2-6,4,shade(hair,-12));px(cx-fw+1,top+1,7,5,hair);px(cx+fw-8,top+1,7,5,hair);}
 if(s.hair.style==='tuft'){px(cx-fw+3,top-4,12,7,hair);px(cx+fw-17,top-3,14,6,shade(hair,10));}
 // details
 if(s.detail==='glasses'){g.strokeStyle='#cfd6d2';g.lineWidth=1;
  g.strokeRect(Math.round(cx-e.spacing/2-e.width/2-3),Math.round(eyeY-3),Math.round(e.width+6),Math.round(e.height+6));
  g.strokeRect(Math.round(cx+e.spacing/2-e.width/2-3),Math.round(eyeY-3),Math.round(e.width+6),Math.round(e.height+6));
  px(cx-2,eyeY+1,4,1,'#cfd6d2');}
 if(s.detail==='stubble'){for(let i=0;i<16;i++)px(cx-s.face.jaw+1+i*2.6,top+fh+1+(i%2?2:0),1,2,shade(skin,-34));}
 if(s.detail==='scarf'){px(cx-16,shoulderY-4,32,8,'#8a5a34');px(cx-5,shoulderY-4,10,10,shade('#8a5a34',-18));}
 if(s.detail==='bandage'){px(cx+fw-10,top-1,8,20,'#e6e2d6');px(cx+fw-10,top+8,8,2,shade('#e6e2d6',-45));}
 // one light, from the upper left
 px(cx-fw,top,3,fh,shade(skin,20));
 px(cx+fw-3,top,3,fh,shade(skin,-26));
 px(cx-fw,top+capsule(s.expression),fw*2,2,shade(skin,10));
}
function capsule(expression){return expression==='hurt'?0:2;}

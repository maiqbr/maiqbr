import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Original pixel artwork. Illustrative activity, not the owner's GitHub statistics.
// Dependency-free generator; the result animates as a plain GitHub README image.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const key = (x,y) => `${x},${y}`;
const parse = s => s.split(',').map(Number);
const neighbors = (x,y) => [[x+1,y],[x,y+1],[x-1,y],[x,y-1]];
const pal = {o:'#211522',a:'#7e493b',b:'#b77547',c:'#eab56d',d:'#ffdfa0',g:'#537143',h:'#85ac59',i:'#c1d97c',p:'#694677',q:'#a270b1',s:'#bfc5cd',t:'#f4efcf',w:'#ed8550',y:'#ffd96b',r:'#ad4540',n:'#43314f'};
const sprites = {
 hero:[
 '......oooo......','.....obccbo.....','....obddddbo....','....obdddcbo....',
 '....obcccbao....','....ogdddgo.....','...ogggggggo....','..ogihhhhiggo...',
 '..ogihhhhigo.so.','..ogghhhhggo.so.','...oaggggao.sto.','....obbbbo.ssto.',
 '....obobbo..so..','....oo.ooo..oo..','................','................'],
 back:[
 '......oooo......','.....obccbo.....','....obddddbo....','....obcccabo....',
 '....obbaaaao....','....ogggggo.....','...oghhhhhgo....','..ogihhhhiggo...',
 '..ogihhhhigo.so.','..ogghhhhggo.so.','...oggggggo.sto.','....obbbbo.ssto.',
 '....obobbo..so..','....oo.ooo..oo..','................','................'],
 chest:[
 '................','................','....oooooooo....','...obccccccbo...',
 '..obccyccyccbo..','..obbybbbybbbo..','..obbybbbybbbo..','..oyyyyyyyyyyo..',
 '..oaaaattaaaao..','..obbbattaabbo..','..obbbattaabbo..','..obbbayyaabbo..',
 '..obbbbbbbbbbo..','..oooooooooooo..','................','................'],
 barrel:[
 '................','.....oooooo.....','...oobcccboo....','...obccbbbbo....',
 '...ossssssso....','...oababbabo....','...obabbabbo....','...obabbabbo....',
 '...obabbabbo....','...obabbabbo....','...ossssssso....','...oaabbbaao....',
 '....ooooooo.....','................','................','................'],
 skull:[
 '................','................','.....oooooo.....','....osttttso....',
 '...osttttttso...','...ottottotto...','...ottooottoo...',
 '....otsostto....','.....ottto......','.....ototo......','......ooo.......',
 '................','................','................','................','................'],
 slime:[
 '................','................','................','................',
 '......oooo......','....oohhhhoo....','...ohhiiiihho...','..ohiiiiiiiho...',
 '..ohhiohioihho..','..ohhhhhhhhho...','...oghhhhhgo....','....ooooooo.....',
 '................','................','................','................'],
 torch:[
 '.......y........','......yy........','......ydy.......','.....wydyw......',
 '.....wyddw......','......wyw.......','.....ossso......','......obo.......',
 '......obo.......','......obo.......','......ooo.......','................',
 '................','................','................','................'],
 rock:[
 '................','................','.....oooo.......','...oosssso......',
 '..osstttsso.....','..ossssssso.....','...onnnnno......','....oooo........',
 '........oooo....','.......osssso...','......osttssso..','......ossssso...',
 '.......ooooo....','................','................','................']
};
const rect=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
const sprite=name=>sprites[name].map((row,y)=>[...row].map((c,x)=>c==='.'?'':rect(x,y,1,1,pal[c]||pal.o)).join('')).join('');
const seed=(x,y)=>{let n=Math.imul(x+311,73856093)^Math.imul(y+223,19349663);n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return (n^(n>>>16))>>>0;};

export function makeMap(){
 const floor=new Set();for(let x=0;x<53;x++)for(let y=0;y<7;y++)floor.add(key(x,y));
 // A real maze carved into the 53 x 7 calendar, with occasional loops.
 const walkable=new Set([key(1,1)]),visited=new Set([key(1,1)]),stack=[[1,1]];
 while(stack.length){
  const [x,y]=stack.at(-1);
  const choices=[[x+2,y],[x,y+2],[x-2,y],[x,y-2]].filter(([a,b])=>a>=1&&a<=51&&b>=1&&b<=5&&!visited.has(key(a,b))).sort((a,b)=>seed(a[0]+x,a[1]+y)-seed(b[0]+x,b[1]+y));
  if(!choices.length){stack.pop();continue;}
  const [a,b]=choices[0];walkable.add(key((x+a)/2,(y+b)/2));walkable.add(key(a,b));visited.add(key(a,b));stack.push([a,b]);
 }
 for(let x=2;x<51;x++)for(let y=1;y<6;y++){
  if(!walkable.has(key(x,y))&&seed(x,y)%7===0){
   const horizontal=walkable.has(key(x-1,y))&&walkable.has(key(x+1,y));
   const vertical=walkable.has(key(x,y-1))&&walkable.has(key(x,y+1));
   if(horizontal||vertical)walkable.add(key(x,y));
  }
 }
 walkable.add(key(0,3));walkable.add(key(52,3));
 const walls=new Set([...floor].filter(p=>!walkable.has(p)));
 const props=[['barrel',7,0],['skull',17,6],['barrel',39,6],['slime',23,0],['slime',45,6]];
 // Twelve treasures distributed across the maze, not one per active cell.
 const gems=[];for(let i=0;i<12;i++){
  const candidates=[...walkable].map(parse).filter(([x,y])=>x>=i*4+2&&x<=i*4+5&&y>0&&y<6).sort((a,b)=>seed(a[0],a[1])-seed(b[0],b[1]));
  const [x,y]=candidates[0];gems.push({x,y,level:1+seed(y,x)%4});
 }
 return {floor,walkable,walls,props,gems};
}
function shortest(floor,start,goals){
 const queue=[start],prev=new Map([[start,null]]);let found;
 for(let i=0;i<queue.length;i++){
  const v=queue[i];if(goals.has(v)){found=v;break;}
  for(const [x,y] of neighbors(...parse(v))){const n=key(x,y);if(floor.has(n)&&!prev.has(n)){prev.set(n,v);queue.push(n);}}
 }
 assert(found,'Unreachable tile');const route=[];for(let n=found;n!==null;n=prev.get(n))route.push(n);return route.reverse();
}
export function makeRoute(map){
 const start=key(0,3),targets=new Set(map.gems.map(c=>key(c.x,c.y))),route=[start];targets.delete(start);
 while(targets.size){const part=shortest(map.walkable,route.at(-1),targets);route.push(...part.slice(1));for(const v of part)targets.delete(v);}
 route.push(...shortest(map.walkable,route.at(-1),new Set([key(52,3)])).slice(1));
 route.push(...shortest(map.walkable,route.at(-1),new Set([start])).slice(1));
 for(let i=1;i<route.length;i++){const [x,y]=parse(route[i]),[a,b]=parse(route[i-1]);assert.equal(Math.abs(x-a)+Math.abs(y-b),1,'Non-adjacent movement');assert(map.walkable.has(route[i]));}
 for(const g of map.gems)assert(route.includes(key(g.x,g.y)),'Uncollected gem');
 return route;
}

export function render(){
 const map=makeMap(),route=makeRoute(map),speed=.12,duration=+(route.length*speed+3).toFixed(2);
 const W=1166,H=184,ox=58,oy=28,T=20,xy=(x,y)=>[ox+x*T,oy+y*T];
 const parts=[],add=(...s)=>parts.push(...s);
 add('<svg xmlns="http://www.w3.org/2000/svg" width="1166" height="184" viewBox="0 0 1166 184" role="img" aria-labelledby="title desc">');
 add('<title id="title">Contribution dungeon</title><desc id="desc">A 53-week, seven-day contribution calendar turned into a pixel-art maze. Square activity tiles form walls and corridors. A green-cloaked adventurer collects twelve scattered treasure chests. Slimes squash and stretch in place. Illustrative activity, not actual GitHub statistics.</desc>');
 add('<defs>');for(const name of Object.keys(sprites))add('<g id="'+name+'" shape-rendering="crispEdges">'+sprite(name)+'</g>');add('</defs>');
 add('<style>@keyframes flicker{0%,100%{opacity:1}30%{opacity:.65}65%{opacity:.9}}@keyframes squash{0%,100%{transform:scale(1,1)}35%{transform:scale(1.12,.78)}65%{transform:scale(.96,1.08)}}.torch-glow{animation:flicker 1.1s steps(3) infinite}.slime{transform-box:fill-box;transform-origin:center bottom;animation:squash 1.6s ease-in-out infinite}</style>');
 add(rect(0,0,W,H,'#17111d'));
 const text=(x,y,label,extra='')=>'<text x="'+x+'" y="'+y+'" fill="#b5a4c1" font-family="ui-monospace,monospace" font-size="10" '+extra+'>'+label+'</text>';
 // Familiar calendar labels, independent of the illustrative intensity pattern.
 const months=['Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'];
 const monthCols=[0,2,6,10,15,19,23,28,32,36,41,45,50];
 months.forEach((m,i)=>add(text(ox+monthCols[i]*T,13,m)));
 [['Mon',1],['Wed',3],['Fri',5]].forEach(([label,row])=>add(text(16,oy+row*T+13,label)));
 add('<g shape-rendering="crispEdges">');
 // Narrow brick parapets frame the calendar without breaking its 53 x 7 grid.
 for(let x=ox-8;x<ox+53*T+8;x+=8){
  for(const y of [20,170]){
   add(rect(x,y,7,3,'#a4563d'),rect(x,y+3,7,2,'#663847'),rect(x,y,7,1,'#dd9160'));
  }
 }
 for(const x of [ox-8,ox+53*T+2])for(let y=25;y<170;y+=8)add(rect(x,y,5,7,'#ac6246'),rect(x,y,1,7,'#e29a63'),rect(x+4,y,1,7,'#522f3a'));
 const floors=['#533861','#735087','#9165a8','#be89d1'];
 for(const p of map.floor){
  const [x,y]=parse(p),[px,py]=xy(x,y),n=seed(x,y);
  add(rect(px,py,18,18,'#1f1729'),rect(px+1,py+1,16,16,'#2e243a'),rect(px+2,py+1,14,1,'#3c2e49'),rect(px+1,py+16,16,1,'#231b2e'));
  if(n%9===0)add('<path d="M'+(px+13)+' '+(py+2)+'v4h-3v2" fill="none" stroke="#1f172b"/>');
  if(n%6===0)add(rect(px+4,py+8,2,1,'#42334e'),rect(px+11,py+12,1,1,'#20172b'));
  if(map.walls.has(p)){
   const level=n%4;
   add('<g class="maze-wall">',rect(px+1,py+1,16,16,floors[level]),rect(px+2,py+1,14,2,'#dac0e9','opacity=".25"'),rect(px+1,py+14,16,3,'#2b1a38','opacity=".65"'),rect(px+1,py+7,16,1,'#38233e','opacity=".55"'),rect(px+8,py+3,1,4,'#38233e','opacity=".45"'),rect(px+4,py+8,1,6,'#38233e','opacity=".45"'),'</g>');
  }
 }
 // Torches, gates and banners live on the border, leaving the calendar legible.
 for(const [i,x] of [3,12,21,30,39,49].entries()){
  const px=ox+x*T;
  add('<g transform="translate('+px+' 13)"><g class="torch-glow" style="animation-delay:-'+i*.19+'s"><use href="#torch"/></g></g>');
 }
 for(const x of [8,26,43]){
  const px=ox+x*T;
  add(rect(px,169,18,7,'#1d1625'));
  for(let a=2;a<18;a+=4)add(rect(px+a,168,1,9,'#b7a2b3'),rect(px+a+1,170,1,7,'#514054'));
  add(rect(px,172,18,1,'#a68a9f'));
 }
 // Scattered chests are collected while the maze walls remain intact.
 for(const g of map.gems){
  const [px,py]=xy(g.x,g.y),index=route.indexOf(key(g.x,g.y)),at=Math.max(.000001,index*speed/duration),end=Math.min(.99999,at+.24/duration);
  add('<g class="collectible"><animate attributeName="opacity" values="1;0;0" keyTimes="0;'+at+';1" calcMode="discrete" dur="'+duration+'s" repeatCount="indefinite"/>');
  add('<use href="#chest" transform="translate('+(px+1)+' '+(py+1)+')"/>','</g>');
  add('<g opacity="0"><animate attributeName="opacity" values="0;1;0;0" keyTimes="0;'+at+';'+end+';1" calcMode="discrete" dur="'+duration+'s" repeatCount="indefinite"/>',rect(px+3,py+4,1,2,'#ffe5a1'),rect(px+13,py+6,2,1,'#ffe5a1'),rect(px+8,py+2,1,1,'#fff8da'),'</g>');
 }
 for(const [name,x,y] of map.props){
  const [px,py]=xy(x,y);
  add('<g transform="translate('+(px+1)+' '+(py+1)+')"><g '+(name==='slime'?'class="slime" style="animation-delay:-'+(x%3)*.35+'s"':'')+'><use href="#'+name+'"/></g></g>');
 }
 const points=route.map(p=>{const [x,y]=parse(p);return xy(x,y).map(n=>n+9)});
 const motion=points.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' ');
 const moving=(route.length-1)*speed/duration;
 const times=[...route.map((_,i)=>(i*speed/duration).toFixed(6)),'1'].join(';');
 const back=route.map((p,i)=>i<route.length-1&&parse(route[i+1])[1]<parse(p)[1]?'1':'0');back.push(back.at(-1));
 add('<g id="adventurer"><animateMotion path="'+motion+'" dur="'+duration+'s" keyPoints="0;1;1" keyTimes="0;'+moving+';1" calcMode="linear" repeatCount="indefinite"/><g transform="translate(-8 -9)">');
 add(rect(3,13,11,2,'#110d18','opacity=".65"'));
 add('<g><animate attributeName="opacity" values="'+back.map(v=>v==='1'?'0':'1').join(';')+'" keyTimes="'+times+'" calcMode="discrete" dur="'+duration+'s" repeatCount="indefinite"/><use href="#hero"/></g>');
 add('<g opacity="0"><animate attributeName="opacity" values="'+back.join(';')+'" keyTimes="'+times+'" calcMode="discrete" dur="'+duration+'s" repeatCount="indefinite"/><use href="#back"/></g>');
 add('<g>'+rect(4,12,3,2,'#3a292c')+'<animateTransform attributeName="transform" type="translate" values="0 0;0 1;0 0" dur=".24s" calcMode="discrete" repeatCount="indefinite"/></g>');
 add('</g></g></g></svg>');
 return {svg:parts.join(''),stats:{width:W,height:H,tiles:map.floor.size,gems:map.gems.length,steps:route.length,duration,bytes:parts.join('').length},route,map};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=render();await fs.writeFile(path.join(ROOT,'assets/dungeon-map.svg'),result.svg);console.log(JSON.stringify(result.stats));
}

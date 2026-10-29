import {names} from './inventory.js';
export const counterLayout={frontY:459,customer:{x:288,y:210,width:384},order:{x:320,y:160,width:320,height:63}};
export async function loadCounterArt(){const images=new Map();await Promise.all(['mira','jun','sora','loaf','honeybread','berrybread'].map(id=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images.set(id,image);resolve()};image.onerror=reject;image.src=['mira','jun','sora'].includes(id)?'assets/characters/'+id+'.svg':'assets/food/'+id+'.svg'})));return images}
export function drawCounter(r,s){
 const customer=s.shop.customer;
 for(const [i,id] of ['loaf','honeybread','berrybread'].entries()){const amount=s.display[id]||0,img=r.counterArt?.get(id);if(!img||!amount)continue;for(let j=0;j<Math.min(amount,4);j++)r.c.drawImage(img,235+i*180+(j%2)*69,278+Math.floor(j/2)*67,72,48);r.r(243+i*180,397,137,20,'#f3e2b8');r.text(names[id]+' × '+amount,312+i*180,411,'#6c4a2e',11)}
 if(customer?.phase==='waiting'){
  const img=r.counterArt?.get(customer.portrait),p=counterLayout.customer;
  if(img)r.c.drawImage(img,0,img.height*.14,img.width,img.height*.62,p.x,p.y,p.width,p.width*img.height*.62/img.width);
  // Restore the foreground checkout counter OVER the customer; the bread case stays behind.
  // The original photo countertop starts at logical Y=459. It hides the lower torso.
  r.c.save();r.c.beginPath();r.c.rect(0,counterLayout.frontY,960,576-counterLayout.frontY);r.c.clip();
  r.c.drawImage(r.bg.bakery,0,0,960,576);r.c.restore();
 }
 if(!customer)return;
 if(customer.phase==='knocking'){r.r(285,128,390,56,'#fff1cced');r.text('똑똑! 문을 두드리는 소리가 들려요.',480,162,'#75583b',17);return}
 const o=counterLayout.order;r.r(o.x,o.y,o.width,o.height,'#fff2d5f0');r.text(customer.name+' · 주문 대기 중',480,o.y+29,'#725333',15);r.text('손님과 대화하기 버튼으로 말을 걸어 주세요',480,o.y+51,'#8b7657',11);
}

import {names} from './inventory.js';
export async function loadCounterArt(){const images=new Map();await Promise.all(['mira','jun','sora','loaf','honeybread','berrybread'].map(id=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images.set(id,image);resolve()};image.onerror=reject;image.src=['mira','jun','sora'].includes(id)?'assets/characters/'+id+'.svg':'assets/food/'+id+'.svg'})));return images}
export function drawCounter(r,s){
 for(const [i,id] of ['loaf','honeybread','berrybread'].entries()){const amount=s.display[id]||0,img=r.counterArt?.get(id);if(!img||!amount)continue;for(let j=0;j<Math.min(amount,4);j++)r.c.drawImage(img,235+i*180+(j%2)*69,278+Math.floor(j/2)*67,72,48);r.r(243+i*180,397,137,20,'#f3e2b8');r.text(names[id]+' × '+amount,312+i*180,411,'#6c4a2e',11)}
 const customer=s.shop.customer;if(!customer)return;if(customer.phase==='knocking'){r.r(285,128,390,56,'#fff1cced');r.text('똑똑! 문을 두드리는 소리가 들려요.',480,162,'#75583b',17);return}
 const img=r.counterArt?.get(customer.portrait);if(img){r.c.save();r.c.beginPath();r.c.rect(280,265,400,311);r.c.clip();r.c.drawImage(img,0,img.height*.14,img.width,img.height*.62,288,270,384,384*img.height*.62/img.width);r.c.restore()}
 r.r(320,193,320,63,'#fff2d5f0');r.text(customer.name+' · '+names[customer.bread]+' 하나 부탁해요!',480,222,'#725333',15);r.text('진열대에서 주문한 빵을 건네주세요',480,244,'#8b7657',11);
}

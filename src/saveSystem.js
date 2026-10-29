export function fresh(){return {version:4,scene:'town',x:480,y:430,money:60,revenue:0,day:1,minutes:540,items:{flour:12,yeast:6,salt:6,honey:4,berry:0,berrySeeds:2,loaf:0,honeybread:0,berrybread:0},display:{},warehouse:{loaf:0,honeybread:0,berrybread:0},shop:{open:false,elapsed:0,customer:null,sequence:0},quests:{},affinity:{},harvestAt:0,parcels:[],parcelDay:0,baking:null,dialogueVisits:{postDay:0},garden:Array(6).fill(null)}}
const nonnegative=x=>Number.isFinite(x)&&x>=0;
export function validate(input){
 const s=structuredClone(input),base=fresh();
 if(![1,2,3,4].includes(s.version)||!['town','bakery','bakeryKitchen','post','city','store','field'].includes(s.scene))throw Error('지원하지 않는 저장 파일');
 for(const k of ['money','revenue','day','minutes','x','y','harvestAt'])if(!nonnegative(s[k]))throw Error('손상된 저장 파일');
 if(s.x>960||s.y>576||s.minutes>=1440||s.day<1)throw Error('잘못된 위치 또는 시간');
 for(const k of ['items','display','affinity',...(s.version>=2?['warehouse']:[])]){if(!s[k]||typeof s[k]!=='object'||Array.isArray(s[k]))throw Error('손상된 저장 파일');for(const v of Object.values(s[k]))if(!nonnegative(v))throw Error('손상된 저장 파일')}
 if(!s.quests||Object.values(s.quests).some(v=>!['active','done'].includes(v)))throw Error('손상된 퀘스트');
 if(s.version>=2){const shop=s.shop;if(!shop||typeof shop.open!=='boolean'||!nonnegative(shop.elapsed)||!Number.isInteger(shop.sequence)||shop.sequence<0)throw Error('손상된 상점');if(shop.customer&&(!['loaf','honeybread','berrybread'].includes(shop.customer.bread)||typeof shop.customer.name!=='string'))throw Error('손상된 주문');if(!Array.isArray(s.parcels)||s.parcels.some(p=>!Number.isInteger(p.day)||typeof p.label!=='string')||!Number.isInteger(s.parcelDay)||s.parcelDay<0)throw Error('손상된 소포')}
 if(s.version>=3){
  const customer=s.shop.customer;if(customer&&(!['knocking','waiting'].includes(customer.phase)||!nonnegative(customer.arrival)||!['mira','jun','sora'].includes(customer.portrait)))throw Error('손상된 손님');
  if(!Array.isArray(s.garden)||s.garden.length!==6||s.garden.some(p=>p!==null&&(!p||!nonnegative(p.plantedAt)||(p.wateredAt!==null&&(!nonnegative(p.wateredAt)||p.wateredAt<p.plantedAt)))))throw Error('손상된 텃밭');
  const b=s.baking;if(b!==null){if(!b||!['kneading','topping','shaped','baking','ready'].includes(b.phase)||!nonnegative(b.progress)||b.progress>100||!nonnegative(b.seconds)||b.seconds>5||![null,'none','honey','berry'].includes(b.topping))throw Error('손상된 반죽');if((['kneading','topping'].includes(b.phase)&&b.topping!==null)||(['shaped','baking','ready'].includes(b.phase)&&(b.progress!==100||b.topping===null))||(b.phase==='ready'&&b.seconds!==5)||(b.phase==='kneading'&&b.progress>=100)||(b.phase==='topping'&&b.progress!==100))throw Error('손상된 제빵 단계')}
 }else{s.garden=base.garden;s.baking=null;if(s.shop?.customer)s.shop.customer={...s.shop.customer,portrait:'mira',phase:'waiting',arrival:1.2}}
 if(s.version>=4){if(!s.dialogueVisits||!Number.isInteger(s.dialogueVisits.postDay)||s.dialogueVisits.postDay<0)throw Error('손상된 대화 방문 기록')}else s.dialogueVisits={postDay:0};
 return {...base,...s,version:4,items:{...base.items,...s.items}};
}
export function save(s,storage=localStorage){storage.setItem('little-hearth-v1',JSON.stringify(s))}
export function load(storage=localStorage){const raw=storage.getItem('little-hearth-v1');return raw?validate(JSON.parse(raw)):null}
async function request(path,options){const r=await fetch('/api/saves'+path,options);if(!r.ok)throw Error('세이브 파일을 읽거나 쓸 수 없습니다');return r.json()}
export const slots=()=>request('');
export const loadSlot=id=>request('/'+id).then(validate);
export const saveSlot=(id,s)=>request('/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(validate(s))});

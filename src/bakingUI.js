import {names} from './inventory.js';
import {baseDough,beginDough,knead,addTopping,putInOven,collectBread,breadForTopping,bakeSeconds} from './baking.js';
export function showBaking(ui){const s=ui.g.state,b=s.baking;
 if(!b){ui.panel('<h2>작은 화덕 · 반죽 준비</h2><p>밀가루 2 + 이스트 1 + 소금 1로 기본 반죽을 만듭니다.</p><p>'+Object.keys(baseDough).map(k=>`${names[k]} ${s.items[k]}`).join(' / ')+'</p><p>반죽을 마우스로 치대고, 꿀이나 베리를 넣은 뒤 구워 보세요.</p>',[['재료 섞어 반죽 시작',()=>{if(!beginDough(s))ui.notify('밀가루·이스트·소금이 부족해요');ui.show('oven')}]]);return}
 if(b.phase==='kneading'){ui.panel('<h2>반죽 치대기</h2><p>반죽 위에서 마우스를 누른 채 좌우로 여러 번 문질러 주세요.</p><canvas id="dough" width="520" height="230" aria-label="마우스로 드래그하여 반죽하기"></canvas><progress id="knead-progress" max="100" value="'+b.progress+'"></progress><p id="knead-label">반죽 '+Math.floor(b.progress)+'%</p><p class="muted">닫아도 반죽과 사용한 재료는 유지됩니다. 메뉴에서 저장할 수 있어요.</p>');attachDough(ui);return}
 if(b.phase==='topping'){ui.panel('<h2>토핑 선택</h2><p>기본 반죽 완성! 토핑은 한 가지만 넣습니다.</p><p>꿀 '+s.items.honey+' / 베리 '+s.items.berry+'</p>',[['아무것도 넣지 않기 · 밀빵',()=>choose('none')],['꿀 1개 넣기 · 꿀빵',()=>choose('honey')],['베리 2개 넣기 · 베리빵',()=>choose('berry')]]);return}
 const id=breadForTopping[b.topping];
 if(b.phase==='shaped'){ui.panel('<h2>오븐에 넣기</h2><img class="baking-bread" src="assets/food/'+id+'.svg" alt="'+names[id]+'"><p>'+names[id]+' 반죽을 준비했어요.</p>',[['오븐에 넣고 굽기',()=>{putInOven(s);ui.show('oven')}]]);return}
 if(b.phase==='baking'){ui.panel('<h2>오븐에서 굽는 중</h2><img class="baking-bread" src="assets/food/'+id+'.svg" alt="굽는 빵"><progress id="bake-progress" max="'+bakeSeconds+'" value="'+b.seconds+'"></progress><p id="bake-seconds"></p><p class="muted">메뉴를 열거나 다른 곳을 둘러보아도 굽기는 계속됩니다. 다른 탭에서는 멈춥니다.</p>');return}
 ui.panel('<h2>'+names[id]+' 완성!</h2><img class="baking-bread" src="assets/food/'+id+'.svg" alt="'+names[id]+'"><p>꺼낸 빵은 빵 창고로 옮깁니다.</p>',[['완성한 빵 꺼내기',()=>{collectBread(s);ui.notify('빵을 창고에 보관했어요');ui.show('oven')}]]);
 function choose(type){if(!addTopping(s,type))ui.notify('토핑 재료가 부족해요');ui.show('oven')}
}
function attachDough(ui){const canvas=ui.overlay.querySelector('#dough'),c=canvas.getContext('2d');let previous=null;
 const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*520/r.width,y:(e.clientY-r.top)*230/r.height}};
 const paint=()=>{const progress=ui.g.state.baking.progress;c.fillStyle='#b89263';c.fillRect(0,0,520,230);for(let y=10;y<230;y+=22){c.fillStyle='#a47d53';c.fillRect(0,y,520,2)}c.fillStyle='#f2e4bf';c.beginPath();c.ellipse(260,118,100+progress*.2,57-progress*.1,0,0,Math.PI*2);c.fill();c.strokeStyle='#d1b97e';c.lineWidth=4;for(let i=0;i<3;i++){c.beginPath();c.arc(230+i*25,113,13,0,Math.PI);c.stroke()}c.fillStyle='#fff2d0';for(let i=0;i<24;i++)c.fillRect(110+(i*53)%300,45+(i*31)%145,2,2);if(previous){c.fillStyle='#d2ab81';c.fillRect(previous.x-12,previous.y-8,24,16)}};
 canvas.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();previous=point(e);canvas.setPointerCapture(e.pointerId);paint()};
 canvas.onpointermove=e=>{if(!previous||!(e.buttons&1)){previous=null;return}const p=point(e),distance=Math.hypot(p.x-previous.x,p.y-previous.y);if(Math.abs(p.x-260)<155&&Math.abs(p.y-118)<90)knead(ui.g.state,distance);previous=p;if(ui.g.state.baking.phase==='topping'){previous=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);ui.show('oven');return}paint();ui.overlay.querySelector('#knead-progress').value=ui.g.state.baking.progress;ui.overlay.querySelector('#knead-label').textContent='반죽 '+Math.floor(ui.g.state.baking.progress)+'%'};
 canvas.onlostpointercapture=()=>{previous=null;if(ui.g.state.baking?.phase==='kneading')paint()};
 canvas.onpointerup=canvas.onpointercancel=e=>{previous=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);paint()};paint();
}

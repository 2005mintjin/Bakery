import {Interior,isInterior} from './interior.js';
import {title} from './title.js';
import {tickShop} from './shop.js';
import {residents} from './npc.js';
import {obstacles} from './sceneManager.js';
import {PlayerSprite} from './playerSprite.js';
import {fresh} from './saveSystem.js';
import {move} from './player.js';
import {transition} from './sceneManager.js';
import {target} from './exploration.js';
import {talk} from './dialogue.js';
import {UI} from './ui.js';
import {Renderer} from './renderer.js';
async function boot(){const data={};for(const key of ['npcs','quests','recipes','dialogues','city','playerAtlas']){const r=await fetch(`data/${key}.json`);if(!r.ok)throw Error(key);data[key]=await r.json()}const g={state:fresh(),keys:new Set(),data};g.ui=new UI(g);obstacles.city=data.city.buildings.map(b=>({x:b.x,y:b.y-30,w:b.w,h:160}));const renderer=new Renderer(document.querySelector('canvas'),data.city);g.interior=new Interior(g);g.sprite=new PlayerSprite(data.playerAtlas);g.spritePicker=()=>g.sprite.pick(g.ui);title(g);
function interact(){const o=target(g);if(!o)return;if(o.npc){if(o.npc.line)g.ui.panel('<h2>'+o.npc.name+'</h2><p>'+o.npc.line+'</p>');else talk(g,o.npc);}else if(o.type==='berry'){const s=g.state,now=s.day*1440+s.minutes;if(now<s.harvestAt)g.ui.notify('열매가 다시 익고 있어요. 잠시 뒤 돌아오세요.');else{s.items.berry+=3;s.harvestAt=now+30;g.ui.notify('베리 3개를 모았어요')}}else g.ui.show(o.type)}
document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>{if(g.started)g.ui.show(b.dataset.panel)});addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(e.repeat)return;if(!g.started)return;if(k==='escape'){if(g.ui.open)g.ui.close();else g.ui.show('menu');return}if(g.ui.open){if((k==='e'||k===' ')&&e.target.tagName!=='BUTTON')document.querySelector('#overlay button')?.click();return}if(['a','arrowleft'].includes(k))g.direction='left';if(['d','arrowright'].includes(k))g.direction='right';if(['w','arrowup'].includes(k))g.direction='up';if(['s','arrowdown'].includes(k))g.direction='down';if(k==='e'&&!isInterior(g.state.scene))interact();else if(k==='i')g.ui.show('inventory');else if(k==='j')g.ui.show('journal');else g.keys.add(k)});addEventListener('keyup',e=>g.keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>g.keys.clear());document.addEventListener('visibilitychange',()=>g.keys.clear());let prev=performance.now();function frame(now){const dt=Math.min((now-prev)/1000,.05);prev=now;let walking=false;if(g.started&&!g.ui.open&&!document.hidden){if(!isInterior(g.state.scene)){walking=move(g.state,g.keys,dt,residents(g));transition(g.state);}if(tickShop(g.state,dt))g.ui.notify('손님이 도착했어요! 진열대에서 주문을 확인하세요.');g.state.minutes+=dt*2;if(g.state.minutes>=1440){g.state.minutes=360;g.state.day++}}renderer.draw(g,walking,now/1000);g.interior.update();const o=target(g);g.ui.update(isInterior(g.state.scene)?'원하는 물건을 클릭하세요 · 나가기 버튼으로 광장에 복귀':o?'E · '+o.label:g.state.shop.customer?'손님 주문 도착 · 빵집 진열대에서 E':g.state.scene==='bakery'?'창고에서 빵 꺼내기 → 진열 → 개점 → 주문 응대':'오른쪽 길 → 해봄 소도시 / 우체국 문으로 들어가기');requestAnimationFrame(frame)}requestAnimationFrame(frame);g.ui.notify('달빛마을에 오신 것을 환영해요. E로 이웃과 인사해요.')}
boot().catch(e=>{document.querySelector('#hint').textContent='게임 데이터를 읽지 못했습니다. npm start로 실행해 주세요.';console.error(e)});

import {names} from './inventory.js';
import {bake,buy,display,sell} from './bakery.js';
import {save,load} from './saveSystem.js';
export class UI{
constructor(g){this.g=g;this.overlay=document.querySelector('#overlay');this.timer=0}
get open(){return !this.overlay.hidden}
close(){this.overlay.hidden=true;this.g.keys.clear()}
notify(t){document.querySelector('#toast').textContent=t;clearTimeout(this.timer);this.timer=setTimeout(()=>document.querySelector('#toast').textContent='',3500)}
panel(html,actions=[]){this.g.keys.clear();this.overlay.hidden=false;this.overlay.innerHTML='<section class="panel">'+html+'<div class="actions"></div></section>';for(const [label,fn] of [...actions,['닫기 · ESC',()=>this.close()]]){const b=document.createElement('button');b.textContent=label;b.onclick=fn;this.overlay.querySelector('.actions').append(b)}this.overlay.querySelector('button')?.focus()}
show(type){const s=this.g.state,d=this.g.data;if(type==='inventory')this.panel('<h2>나의 가방</h2>'+Object.entries(s.items).map(([k,v])=>`<div class="row"><span>${names[k]}</span><b>${v}개</b></div>`).join(''));
if(type==='journal')this.panel('<h2>부탁 수첩</h2>'+d.quests.map(q=>`<div class="row"><div><b>${q.name}</b><p>${q.description}</p></div><span>${s.quests[q.id]==='done'?'완료 ✓':s.quests[q.id]==='active'?'진행 중':'주민과 대화'}</span></div>`).join(''));
if(type==='menu')this.panel('<h2>잠깐 쉬어가기</h2><p>저장은 이 브라우저에 보관됩니다. 직접 저장해 주세요.</p>',[['저장',()=>{try{save(s);this.notify('오늘의 이야기를 저장했어요');this.close()}catch{this.notify('저장 공간을 사용할 수 없어요')}}],['불러오기',()=>{try{const loaded=load();if(!loaded){this.notify('저장된 이야기가 없어요');return}this.g.state=loaded;this.close();this.notify('이야기를 불러왔어요')}catch{this.notify('저장 파일을 읽을 수 없어요')}}],['다음 날 아침',()=>{s.day++;s.minutes=540;this.close();this.notify('새로운 아침이에요')}]]);
if(type==='oven')this.panel('<h2>작은 화덕</h2><p>현재 재료 · '+['flour','honey','berry'].map(k=>`${names[k]} ${s.items[k]}`).join(' / ')+'</p>'+d.recipes.map(r=>`<p>${r.name} — ${Object.entries(r.cost).map(([k,v])=>names[k]+' '+v).join(', ')} · 판매 ${r.price}G</p>`).join(''),d.recipes.map(r=>[r.name+' 굽기',()=>{this.notify(bake(s,r)?r.name+' 완성!':'재료가 부족해요');this.show(type)}]));
if(type==='shelf')this.panel('<h2>빵 진열대</h2><p>진열 후 손님맞이를 누르면 진열된 빵이 판매돼요.</p>'+d.recipes.map(r=>`<p>${r.name}: 가방 ${s.items[r.id]} / 진열 ${s.display[r.id]||0}</p>`).join('')+`<p>누적 판매 수익 ${s.revenue}G</p>`,[...d.recipes.map(r=>[r.name+' 진열',()=>{this.notify(display(s,r.id)?'진열했어요':'가방에 빵이 없어요');this.show(type)}]),['손님맞이 · 판매 정산',()=>{this.notify(sell(s,d.recipes)+'G 판매 수익!');this.show(type)}]]);
if(type==='supplies')this.panel('<h2>재료 배달 상자</h2><p>10G에 밀가루 4개와 꿀 1개를 주문합니다.</p>',[['재료 주문 · 10G',()=>{this.notify(buy(s)?'재료가 도착했어요':'돈이 부족해요');this.show(type)}]]);
}
update(hint){const s=this.g.state;document.querySelector('#status').textContent=`${s.day}일째 · ${String(Math.floor(s.minutes/60)).padStart(2,'0')}:${String(Math.floor(s.minutes%60)).padStart(2,'0')}　☀　${s.money} G`;document.querySelector('#location').textContent=s.scene==='town'?'❀ 달빛마을 · 마을 광장':'♨ 작은 화덕 · 빵집';document.querySelector('#hint').textContent=hint}
}

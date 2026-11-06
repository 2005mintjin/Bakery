import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fresh, validate } from "../src/saveSystem.js";
import { ClinicStory, validateClinicStories } from "../src/clinicStory.js";
import { clinicAction, clinicJournal } from "../src/clinicQuests.js";
import { configureWorld, transition, nearbyDoor, repairPosition } from "../src/sceneManager.js";
import { configureSchedule, buildOffDutyActors, facilityOpen } from "../src/schedule.js";
import { leaveInterior, isInterior } from "../src/interior.js";
import { move } from "../src/player.js";
import { residents, residentQuestStatus } from "../src/npc.js";
import { talk } from "../src/dialogue.js";
import { voicePlan } from "../src/dialogueVoice.js";
import { customerPortraits } from "../src/visitorOrder.js";
import { customerActor, orderText } from "../src/serviceDialogue.js";
const json = k => JSON.parse(readFileSync(new URL(`../data/${k}.json`, import.meta.url)));
const data = Object.fromEntries(["clinic", "worldMaps", "staffSchedule", "customers", "civicActors", "downtown", "npcs", "city", "serviceDialogues", "voices"].map(k => [k, json(k)]));
configureWorld(data.worldMaps);
configureSchedule(data.staffSchedule);
data.offDutyActors = buildOffDutyActors(data);
const mikhail = data.downtown.downtown.residents.find(n => n.story === "mikhail");
function harness(key, s = fresh()) {
  s.scene = key === "mikhail" ? "downtown" : "clinic";
  s.minutes = 720;
  let shown;
  const ui = { open: true, say(actor, pages, actions, options) { this.open = true; shown = {actor, pages, actions, options}; }, close() { this.open = false; }, notify(text) { this.notice = text; } };
  const g = {state:s, data, ui};
  const story = new ClinicStory(g, key, key === "mikhail" ? mikhail : undefined);
  return {g, s, story, get shown() {return shown;}, start() {s.scene = key === "mikhail" ? "downtown" : "clinic"; ui.open = true; story.start();}, finish() {shown.options.onComplete();}, choose(label) {const c=shown.actions.find(c=>c[0]===label);assert.ok(c,label);c[1]();}};
}
test("all four named actors retain every source line, choice and the correct distinct SD/portrait/voice", () => {
  assert.ok(validateClinicStories(data.clinic));
  for (const [key, actor] of Object.entries(data.clinic.actors)) {
    const source = readFileSync(new URL(`../data/source/${key}-dialogue.txt`, import.meta.url), "utf8");
    const nodes = Object.values(data.clinic.stories[key].nodes);
    const text = nodes.flatMap(n=>n.pages||[]).map(p=>p.text).join("\n");
    const labels = nodes.flatMap(n=>n.choices||[]).map(c=>c.label);
    for (const [, line] of source.matchAll(/"([^"]+)"/g)) assert.ok(text.includes(line),line);
    for (const [, label] of source.matchAll(/\[([^\]]+)\]/g)) assert.ok(labels.includes(label),label);
    assert.notEqual(actor.spriteAsset, actor.portraitAsset);
    for (const path of [actor.spriteAsset,actor.portraitAsset,data.voices.speakers[key].asset]) assert.ok(existsSync(new URL("../"+path,import.meta.url)));
    assert.deepEqual(voicePlan({text:"안녕!"},actor,data.voices),[key,key,null]);
    assert.ok(voicePlan({text:"지문",kind:"narration"},actor,data.voices).every(v=>v===null));
  }
  assert.equal(mikhail.id,"downtown-listener");assert.equal(mikhail.line,undefined);
  assert.equal(data.downtown.downtown.residents.some(n=>n.name==="소율"),false);
  const bad=structuredClone(data.clinic);bad.stories.valeria.nodes.intro.next="missing";
  assert.throws(()=>validateClinicStories(bad));
});
test("clinic entrance is reachable from the road, exits to its own stairs and obeys closing/Sunday", () => {
  const door=data.worldMaps.downtown.doors.find(d=>d.scene==="clinic");
  const s=Object.assign(fresh(),{scene:"downtown",minutes:720,x:door.x,y:310});
  for(let i=0;i<20&&s.scene==="downtown";i++){move(s,new Set(["w"]),.05,residents({state:s,data}));transition(s);}
  assert.equal(s.scene,"clinic");assert.ok(isInterior(s.scene));assert.equal(validate(s).scene,"clinic");
  assert.ok(leaveInterior(s));assert.equal(s.scene,"downtown");assert.equal(s.x,door.x);assert.equal(s.y,door.y+45);
  const position=[s.x,s.y];repairPosition(s);assert.deepEqual([s.x,s.y],position);
  for(const day of [1,7]){
    Object.assign(s,{day,minutes:day===1?1080:720,y:door.y+2});assert.equal(transition(s),false);assert.equal(s.scene,"downtown");
  }
  assert.equal(facilityOpen({...s,day:1,minutes:720},"clinic"),true);
  assert.ok(nearbyDoor({...s,scene:"downtown",x:door.x,y:door.y+40}));
});
test("Konstanze accepts only after the offer and consumes three bag loaves/pays the premium once",()=>{
  const h=harness("konstanze");h.start();h.choose("도와드릴 게 있을까요?");
  assert.equal(h.s.clinic.bread,"none");const accept=h.shown.options.onComplete;accept();accept();
  assert.equal(h.s.clinic.bread,"active");h.start();h.choose("여기 있어요.");
  assert.match(h.g.ui.notice,/밀빵 3개/);assert.equal(h.s.clinic.bread,"active");
  h.s.warehouse.loaf=3;h.choose("여기 있어요.");assert.equal(h.s.clinic.bread,"active");
  h.s.items.loaf=4;h.choose("여기 있어요.");assert.equal(h.s.items.loaf,4);
  const finish=h.shown.options.onComplete;finish();finish();
  assert.equal(h.s.items.loaf,1);assert.equal(h.s.warehouse.loaf,3);assert.equal(h.s.money,120);assert.equal(h.s.dailyLedger.rewards,60);
  assert.equal(h.s.quests.clinicBread,"done");assert.equal(h.s.revenue,0);assert.deepEqual(h.s.guild.sales,{});
  h.start();h.finish();assert.ok(h.shown.actions.some(c=>c[0]==="혹시 몇 살인가요?"));
});
test("unread/cancelled/stale or closed-clinic dialogue cannot accept, consume or pay",()=>{
  for(const invalidate of [h=>h.g.ui.close(),h=>h.s.scene="downtown",h=>h.s.minutes=1080,h=>h.g.state=validate(h.s)]){
    const h=harness("konstanze");h.start();h.choose("도와드릴 게 있을까요?");const finish=h.shown.options.onComplete;invalidate(h);finish();assert.equal(h.s.clinic.bread,"none");
  }
  const h=harness("konstanze");clinicAction(h.s,"acceptBread");h.s.items.loaf=3;h.start();h.choose("여기 있어요.");h.s.items.loaf=2;h.finish();assert.equal(h.s.money,60);assert.equal(h.s.items.loaf,2);assert.equal(h.s.clinic.bread,"active");
});
test("Catherine offer supports refusal and explanation without accepting; greeting appears together",()=>{
  const h=harness("catherine");h.start();assert.equal(h.shown.pages.length,1);assert.equal(h.shown.options.immediateChoices,true);
  const plan=voicePlan(h.shown.pages[0],data.clinic.actors.catherine,data.voices);assert.ok(plan.slice(h.shown.pages[0].text.indexOf("이야기:")).every(v=>v===null));
  h.choose("도와드릴 게 있을까요.");h.finish();h.choose("미하일이 누군데요?");h.finish();
  assert.equal(h.s.clinic.gift,"none");h.choose("..그건 안 되겠는데요.");assert.equal(h.g.ui.open,false);
  assert.equal(h.s.quests.clinicGift,undefined);
});
test("Catherine wraps exactly one bag berry bread; Mikhail accepts only the sealed gift; reporting has both outcomes",()=>{
  for(const reply of ["감사히 잘 먹겠대요.","귀찮게 하지 말래요."]){
    const h=harness("catherine");h.start();h.choose("도와드릴 게 있을까요.");h.finish();h.choose("당연하죠.");h.finish();
    assert.equal(h.s.clinic.gift,"baking");assert.match(clinicJournal(h.s).clinicGift,/캐서린/);
    let m=harness("mikhail",h.s);m.start();m.finish();assert.ok(!m.shown.actions.some(c=>c[0]==="여기 선물이야."));assert.equal(residentQuestStatus(h.s,mikhail),"done");
    h.start();h.choose("여기 있어요.");assert.match(h.g.ui.notice,/베리 빵/);
    h.s.items.berrybread=2;h.choose("여기 있어요.");assert.equal(h.s.items.berrybread,2);const wrap=h.shown.options.onComplete;wrap();wrap();
    assert.equal(h.s.items.berrybread,1);assert.equal(h.s.clinic.gift,"wrapped");assert.equal(h.s.quests.clinicDelivery,"active");assert.match(clinicJournal(h.s).clinicGift,/미하일/);
    assert.equal(residentQuestStatus(h.s,mikhail),"active");
    m=harness("mikhail",validate(h.s));m.start();m.finish();m.choose("여기 선물이야.");const deliver=m.shown.options.onComplete;deliver();deliver();
    assert.equal(m.s.clinic.gift,"delivered");assert.equal(m.s.quests.clinicDelivery,"done");assert.equal(m.s.items.berrybread,1);assert.equal(m.s.quests.clinicGift,"active");
    assert.equal(residentQuestStatus(m.s,mikhail),"done");assert.match(clinicJournal(m.s).clinicGift,/돌아가/);
    const back=harness("catherine",validate(m.s));back.start();back.choose("아직이에요.");assert.equal(back.s.clinic.gift,"delivered");
    back.start();back.choose("네, 갖다줬어요.");back.choose(reply);const finish=back.shown.options.onComplete;finish();finish();
    assert.equal(back.s.clinic.gift,"done");assert.equal(back.s.quests.clinicGift,"done");assert.equal(back.s.clinic.report,reply.startsWith("감사")?"thanks":"annoyed");
    assert.equal(back.s.money,60);assert.equal(back.s.affinity.catherine,1);assert.equal(back.s.affinity.mikhail,1);assert.equal(validate(back.s).clinic.report,back.s.clinic.report);
    back.start();back.finish();assert.ok(back.shown.actions.some(c=>c[0]==="안아주세요!"));
  }
});
test("gift cannot skip steps or transfer after cancellation, stock loss, repeated completion or a scene change",()=>{
  const s=fresh();for(const a of ["wrapGift","deliverGift","reportThanks"])assert.equal(clinicAction(s,a),false);
  clinicAction(s,"acceptGift");s.items.berrybread=1;
  const h=harness("catherine",s);h.start();h.choose("여기 있어요.");const complete=h.shown.options.onComplete;h.g.ui.close();complete();assert.equal(s.clinic.gift,"baking");assert.equal(s.items.berrybread,1);
  h.start();h.choose("여기 있어요.");s.items.berrybread=0;h.finish();assert.equal(s.clinic.gift,"baking");
  s.items.berrybread=1;assert.ok(clinicAction(s,"wrapGift"));assert.equal(clinicAction(s,"wrapGift"),false);
  const m=harness("mikhail",s);m.start();m.finish();m.choose("여기 선물이야.");s.scene="park";m.finish();assert.equal(s.clinic.gift,"wrapped");
});
test("all optional clinic stages migrate and save safely; invalid records and mismatched quests are rejected",()=>{
  const old=fresh();delete old.clinic;old.money=777;assert.equal(validate(old).money,777);assert.deepEqual(validate(old).clinic,{bread:"none",gift:"none",report:null});
  for(const field of [null,[],{bread:"none",gift:"wrapped",report:null},{bread:"none",gift:"none",report:"thanks"},{bread:"done",gift:"none",report:null}])assert.throws(()=>validate({...fresh(),clinic:field}));
  const s=fresh();for(const a of ["acceptBread","deliverBread","acceptGift","wrapGift","deliverGift","reportAnnoyed"]){s.items.loaf=3;s.items.berrybread=1;assert.ok(clinicAction(s,a));assert.deepEqual(validate(s),s);}
});
test("doctors, nurse and Mikhail visit the bakery with separate art, correct voice and deferred working hours",()=>{
  assert.equal(data.customers.length,18);assert.equal(customerPortraits.length,18);
  for(const key of Object.keys(data.clinic.actors)){
    const c=data.customers.find(c=>c.portrait===key);assert.ok(c);assert.notEqual(c.spriteAsset,c.portraitAsset);
    assert.equal(customerActor(c,c).portraitAsset,c.portraitAsset);assert.deepEqual(voicePlan({text:"안녕!"},c,data.voices),[key,key,null]);
    assert.match(orderText(data.serviceDialogues,{...c,bread:"berrybread",quantity:2}),/베리빵 2개/);
    for(const kind of ["thanks","later","decline"])assert.ok(data.serviceDialogues.customers[key][kind]);
    if(key!=="mikhail")assert.equal(c.workplace,"clinic");
  }
  assert.ok(!customerPortraits.includes("lotus"));
  let shown;const g={state:Object.assign(fresh(),{scene:"downtown",minutes:720}),data,ui:{open:true,say(...a){shown=a;}}};
  assert.ok(talk(g,mikhail) instanceof ClinicStory);assert.equal(shown[0].name,"미하일");
});

test("clinic staff leave the central return road clear during workdays and Sunday",()=>{
  for(const day of [1,7])for(const [x,key,dest] of [[900,"a","city"],[48,"d","downtownEast"]]){
    const s=Object.assign(fresh(),{scene:"downtown",day,minutes:720,x,y:310});
    for(let i=0;i<180&&s.scene==="downtown";i++){
      move(s,new Set([key]),.05,residents({state:s,data}));transition(s);
    }
    assert.equal(s.scene,dest,`${day}/${key}`);
  }
});

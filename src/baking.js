import {spend} from './inventory.js';
export const baseDough={flour:2,yeast:1,salt:1};
export const toppings={none:{},honey:{honey:1},berry:{berry:2}};
export const breadForTopping={none:'loaf',honey:'honeybread',berry:'berrybread'};
export const bakeSeconds=5;
export function beginDough(s){if(s.baking||!spend(s,baseDough))return false;s.baking={phase:'kneading',progress:0,topping:null,seconds:0};return true}
export function knead(s,distance){const b=s.baking;if(b?.phase!=='kneading'||!Number.isFinite(distance)||distance<=0)return false;b.progress=Math.min(100,b.progress+Math.min(distance,60)/12);if(b.progress===100)b.phase='topping';return true}
export function addTopping(s,type){const b=s.baking;if(b?.phase!=='topping'||!Object.hasOwn(toppings,type)||!spend(s,toppings[type]))return false;b.topping=type;b.phase='shaped';return true}
export function putInOven(s){if(s.baking?.phase!=='shaped')return false;s.baking.phase='baking';return true}
export function tickBaking(s,dt){const b=s.baking;if(b?.phase!=='baking'||!Number.isFinite(dt)||dt<=0)return false;b.seconds=Math.min(bakeSeconds,b.seconds+dt);if(b.seconds>=bakeSeconds){b.phase='ready';return true}return false}
export function collectBread(s){const b=s.baking;if(b?.phase!=='ready')return false;const id=breadForTopping[b.topping];s.warehouse[id]=(s.warehouse[id]||0)+1;s.baking=null;return id}

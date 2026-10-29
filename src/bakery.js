import {spend} from './inventory.js';
export function bake(s,r){if(!spend(s,r.cost))return false;s.items[r.id]=(s.items[r.id]||0)+1;return true}
export function display(s,id){if(!spend(s,{[id]:1}))return false;s.display[id]=(s.display[id]||0)+1;return true}
export function sell(s,recipes){let total=0;for(const r of recipes){total+=(s.display[r.id]||0)*r.price;s.display[r.id]=0}s.money+=total;s.revenue+=total;return total}
export function buy(s){if(s.money<10)return false;s.money-=10;s.items.flour+=4;s.items.honey+=1;return true}

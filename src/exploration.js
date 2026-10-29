import {nearby,residents} from './npc.js';
import {nearbyDoor} from './sceneManager.js';
export function target(g){const s=g.state,door=nearbyDoor(s);if(door)return {label:door.name+' 들어가기',door};const n=nearby(s,residents(g));if(n)return {label:n.name+'와 이야기하기',npc:n};if(s.scene==='town'&&Math.hypot(s.x-864,s.y-325)<65)return {label:'익은 베리 수확하기',type:'berry'};return null}

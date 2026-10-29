export const obstacles={town:[],city:[],bakery:[],bakeryKitchen:[],post:[],store:[]};
export let worldMaps={};
export function configureWorld(maps){worldMaps=maps;for(const [scene,map] of Object.entries(maps))obstacles[scene]=map.obstacles}
export function nearbyDoor(s){return (worldMaps[s.scene]?.doors||[]).find(d=>Math.abs(s.x-d.x)<d.w/2+14&&Math.abs(s.y-d.y)<d.h/2+28)}
export function enterBuilding(s,door){if(!(worldMaps[s.scene]?.doors||[]).includes(door))return false;s.scene=door.scene;s.x=480;s.y=500;return true}
export function repairPosition(s){if(!worldMaps[s.scene])return s;if(obstacles[s.scene].some(b=>s.x+10>b.x&&s.x-10<b.x+b.w&&s.y+6>b.y&&s.y-8<b.y+b.h)){[s.x,s.y]=worldMaps[s.scene].safeSpawn}return s}
export function transition(s){let dest;if(worldMaps[s.scene]){const door=nearbyDoor(s);if(door&&Math.abs(s.x-door.x)<door.w/2&&s.y<door.y+3&&s.y>door.y-door.h/2)return enterBuilding(s,door)}if(s.scene==='town'&&s.x>920&&s.y>275&&s.y<365)dest=['city',48,295];else if(s.scene==='city'&&s.x<39&&s.y>275&&s.y<365)dest=['town',905,310];if(dest){[s.scene,s.x,s.y]=dest;return true}return false}

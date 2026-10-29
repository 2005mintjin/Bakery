export function nearby(s,npcs){return s.scene==='town'?npcs.find(n=>Math.hypot(s.x-n.x,s.y-n.y)<64):null}

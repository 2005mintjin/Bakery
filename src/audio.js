export function trackForScene(config,scene){return config.scenes[scene]||'village'}
export class Music{
 constructor(config,{createAudio=()=>new Audio(),storage,onError=()=>{}}={}){
  this.config=config;this.audio=createAudio();this.audio.loop=true;this.audio.preload='metadata';this.audio.setAttribute?.('aria-label','게임 배경음악');this.currentKey=null;this.unlocked=false;this.suspended=false;this.blocked=false;this.failed=false;this.pending=false;this.token=0;this.onError=onError;this.volume=.35;this.muted=false;
  try{this.storage=storage??globalThis.localStorage;const saved=JSON.parse(this.storage?.getItem('hearth-audio')||'null');if(saved&&Number.isFinite(saved.volume))this.volume=Math.max(0,Math.min(1,saved.volume));this.muted=saved?.muted===true}catch{}this.apply();
 }
 apply(){this.audio.volume=this.volume;this.audio.muted=this.muted}
 persist(){try{this.storage?.setItem('hearth-audio',JSON.stringify({volume:this.volume,muted:this.muted}))}catch{}}
 setVolume(value){if(!Number.isFinite(value))return;this.volume=Math.max(0,Math.min(1,value));this.apply();this.persist()}
 setMuted(value){this.muted=!!value;this.apply();this.persist()}
 start(scene){if(this.failed)this.audio.load?.();this.unlocked=true;this.blocked=false;this.failed=false;this.update(scene)}
 update(scene){if(!this.unlocked)return;const key=trackForScene(this.config,scene);if(this.currentKey!==key){this.token++;this.audio.pause();this.pending=false;this.blocked=false;this.failed=false;this.currentKey=key;this.audio.src=this.config.tracks[key].asset;this.audio.load?.()}if(!this.suspended&&!this.blocked&&!this.failed&&this.audio.paused&&!this.pending)this.play()}
 play(){const token=++this.token;this.pending=true;try{Promise.resolve(this.audio.play()).then(()=>{if(token===this.token)this.pending=false}).catch(e=>{if(token!==this.token)return;this.pending=false;this.blocked=e.name==='NotAllowedError';this.failed=!this.blocked;this.onError(this.blocked?'음악 설정에서 재생 버튼을 눌러 주세요.':'음악을 읽지 못했어요. 파일과 브라우저를 확인하세요.')})}catch{this.pending=false;this.failed=true;this.onError('음악을 재생할 수 없어요. 음악 설정에서 다시 시도해 주세요.')}}
 setSuspended(value){this.suspended=!!value;if(this.suspended){this.token++;this.pending=false;this.audio.pause()}else if(this.currentKey&&this.unlocked)this.update(Object.keys(this.config.scenes).find(s=>this.config.scenes[s]===this.currentKey))}
 stop(){this.token++;this.pending=false;this.unlocked=false;this.audio.pause()}
 get title(){return this.config.tracks[this.currentKey]?.title||'게임 시작 후 재생됩니다'}
}

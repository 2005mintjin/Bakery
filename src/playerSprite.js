export function spriteFrame(atlas,width,height,walking,t,direction='down'){
const row=walking?atlas.walk:atlas.idle,scaleX=width/atlas.referenceSize[0],scaleY=height/atlas.referenceSize[1];
const col=walking?Math.floor(t*row.fps)%row.columns:(row.directions[direction]??row.directions.down);
return {x:col*width/row.columns,y:row.y*scaleY,w:width/row.columns,h:row.height*scaleY,flip:walking&&direction==='left'};
}
export class PlayerSprite{
constructor(atlas){this.atlas=atlas;this.image=new Image();this.ready=false;this.sheet=false;this.image.onload=()=>this.ready=true;this.image.src='assets/characters/player.svg';this.trySaved()}
async trySaved(){try{const r=await fetch('/api/player-sheet');if(r.ok&&r.headers.get('Content-Type')?.startsWith('image/')){const blob=await r.blob();await this.setSheet(URL.createObjectURL(blob));return}}catch{}try{const s=localStorage.getItem('hearth-player-sheet');if(s)await this.setSheet(s)}catch{}}
setSheet(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{if(image.width<450||image.height<300){reject(Error('작은 이미지'));return}this.image=image;this.sheet=true;this.ready=true;resolve()};image.onerror=()=>reject(Error('이미지를 읽지 못했습니다'));image.src=src})}
pick(ui){const input=document.createElement('input');input.type='file';input.accept='image/png';input.onchange=async()=>{const f=input.files[0];if(!f)return;if(f.size>8*1024*1024){ui.notify('8MB 이하 PNG를 선택하세요');return}try{const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f)});await this.setSheet(data);const r=await fetch('/api/player-sheet',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data})});if(!r.ok)throw Error('서버 저장 실패');ui.notify('원본 전체를 saves/player-sheet.png에 보관했어요. 빵 포즈도 보존됩니다.')}catch{ui.notify('이미지 읽기 또는 파일 저장에 실패했어요. 8MB 이하 원본 PNG인지 확인하세요.')}};input.click()}
draw(c,x,y,walking,t,direction='down'){if(!this.ready)return false;c.save();c.translate(Math.round(x),Math.round(y));if(this.sheet){const f=spriteFrame(this.atlas,this.image.width,this.image.height,walking,t,direction);if(f.flip)c.scale(-1,1);const h=70,w=h*f.w/f.h;c.drawImage(this.image,f.x,f.y,f.w,f.h,-w/2,-h+3,w,h)}else{if(direction==='left')c.scale(-1,1);c.drawImage(this.image,-28,-67+(walking?Math.sin(t*13)*1.2:0),56,70)}c.restore();return true}
}

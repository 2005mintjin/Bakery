export function characters(text){return typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(text)].map(x=>x.segment):Array.from(text)}
export class DialogueSequence{
 constructor(pages,{hasChoices=false,immediateChoices=false,interval=28}={}){this.pages=(pages.length?pages:['']).map(p=>typeof p==='string'?{text:p}:p);this.index=0;this.count=0;this.elapsed=0;this.interval=interval;this.hasChoices=hasChoices;this.phase='typing';this.setPage();if(immediateChoices){this.count=this.letters.length;this.phase=hasChoices?'choices':'finished'}}
 setPage(){this.letters=characters(this.pages[this.index].text);this.count=0;this.elapsed=0;this.phase=this.letters.length?'typing':'ready'}
 get page(){return this.pages[this.index]}
 get text(){return this.letters.slice(0,this.count).join('')}
 tick(milliseconds){if(this.phase!=='typing'||!Number.isFinite(milliseconds)||milliseconds<=0)return;this.elapsed+=milliseconds;const add=Math.floor(this.elapsed/this.interval);this.elapsed%=this.interval;this.count=Math.min(this.letters.length,this.count+add);if(this.count===this.letters.length)this.phase='ready'}
 advance(){if(this.phase==='typing'){this.count=this.letters.length;this.phase='ready';return 'revealed'}if(this.phase!=='ready')return this.phase;if(this.index+1<this.pages.length){this.index++;this.setPage();return 'page'}this.phase=this.hasChoices?'choices':'finished';return this.phase}
}

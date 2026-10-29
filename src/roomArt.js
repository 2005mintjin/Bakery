// Detailed frontal rooms. Bakery production equipment is confined to the kitchen.
export function drawRoom(r,scene){
 const c=r.c,kitchen=scene==='bakeryKitchen',store=scene==='store';
 const poly=(points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()};
 const wood=(x,y,w,h)=>{r.r(x,y,w,h,'#97724d');r.r(x+3,y+3,w-6,h-6,'#b18a59');for(let yy=y+7;yy<y+h-4;yy+=12){r.r(x+4,yy,w-8,1,'#7b5d3d');for(let xx=x+12;xx<x+w-12;xx+=31)r.r(xx,yy+4,17,1,'#cba36a')}};
 const shelf=(x,y,w,h)=>{wood(x,y,w,h);for(let yy=y+12;yy<y+h-20;yy+=51){r.r(x+9,yy,w-18,38,'#5f513d');wood(x+5,yy+38,w-10,8)}};
 const loaf=(x,y)=>{r.oval(x,y,27,17,'#b47836');r.oval(x+2,y-2,23,14,'#e3b468');for(let i=0;i<3;i++)r.r(x+6+i*6,y+1,2,7,'#f9d999')};
 const lamp=(x,y)=>{r.r(x,y,4,24,'#705635');r.r(x-10,y+24,24,5,'#746046');r.r(x-6,y+29,17,19,'#eacb7b');r.r(x-3,y+31,11,13,'#fff0b1')};
 const window=(x,y,w,h)=>{wood(x,y,w,h);r.r(x+7,y+7,w-14,h-14,'#a8c6bd');r.r(x+7,y+h*.55,w-14,h*.4,'#79975c');for(let xx=x+12;xx<x+w-12;xx+=19){r.r(xx,y+h*.6,13,12,'#92ad67');r.r(xx+4,y+h*.7,4,9,'#d2b87d')}r.r(x+w/2-3,y+6,6,h-12,'#e7d5af');r.r(x+6,y+h/2,w-12,5,'#e7d5af');wood(x-8,y+h,w+16,10)};
 r.r(0,0,960,576,'#b4926b');r.r(100,40,760,335,kitchen?'#d7c7a8':'#e4d4ac');
 for(let y=48;y<365;y+=18)for(let x=106;x<854;x+=44){r.r(x+(y%36?18:0),y,38,13,kitchen?'#c9b99c':'#dac59f');r.r(x+3,y+1,31,2,'#eee0c0')}
 poly([[0,0],[100,40],[100,375],[0,576]],'#ae8c64');poly([[960,0],[860,40],[860,375],[960,576]],'#ba986c');poly([[0,576],[100,375],[860,375],[960,576]],'#b28c60');
 for(let y=386;y<576;y+=24){r.r(0,y,960,2,'#856b48');for(let x=0;x<960;x+=74){r.r(x+(y%48?25:0),y+3,1,20,'#98784e');r.r(x+11,y+9,43,1,'#c5a06d');r.r(x+22,y+15,23,1,'#9f7e53')}}
 wood(80,28,800,17);wood(80,361,800,15);for(const x of [100,850])wood(x,40,12,325);lamp(360,44);lamp(610,44);
 r.text(kitchen?'작은 화덕 · 작업실':store?'해봄 잡화점':'작은 화덕 · 판매실',480,83,'#6d553b',21);
 if(kitchen){
  // Brick kiln, chimney and preparation bench.
  r.r(110,133,254,261,'#946e50');for(let y=143;y<384;y+=19)for(let x=119;x<355;x+=36){r.r(x+(y%38?14:0),y,29,14,'#bb9070');r.r(x+(y%38?14:0)+2,y+2,22,2,'#d5ad85')}
  r.r(174,45,115,88,'#9a8165');for(let y=51;y<130;y+=15)r.r(180,y,102,2,'#c4ab87');r.r(143,239,185,135,'#4b4235');r.oval(143,191,185,100,'#4b4235');r.r(152,273,167,95,'#332f29');r.r(163,339,146,23,'#cc8142');for(let i=0;i<6;i++){r.r(171+i*21,316-(i%3)*12,13,40+(i%3)*12,'#eaa94c');r.r(175+i*21,326,6,29,'#ffd483')}wood(100,388,277,19);
  shelf(654,134,200,263);for(let y=162;y<360;y+=51)for(let x=675;x<830;x+=41)loaf(x,y);r.text('구운 빵 보관',754,122,'#795d3e',13);
  window(408,130,171,123);wood(386,328,242,23);wood(400,351,18,124);wood(595,351,18,124);r.oval(452,303,50,24,'#e8d2a0');r.r(462,294,30,15,'#f2e4bd');r.r(535,310,56,7,'#967247');r.oval(524,307,13,13,'#a88757');for(let i=0;i<16;i++)r.r(405+i*12,322-(i%3),2,2,'#f9ebc9');
  for(const x of [57,115]){r.r(x,442,52,73,'#cbb084');r.r(x+5,449,42,3,'#e4cea2');r.text('밀',x+26,482,'#8c704b',14)}
 }else if(store){
  shelf(112,119,221,246);shelf(641,119,211,246);
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){const y=145+row*51,x=132+col*48;r.r(x,y,28,32,'#c7b68b');r.r(x+3,y+3,22,5,'#e8d7b2');r.r(x+10,y+14,8,8,'#ae9566');const xx=663+col*45;r.r(xx,y+4,23,28,'#be8b47');r.r(xx+1,y,21,6,'#7c6540');r.r(xx+5,y+12,13,11,'#f0dba4')}
  window(375,133,217,133);wood(215,353,546,19);wood(196,380,582,157);wood(215,398,544,119);for(let x=228;x<744;x+=82){r.r(x,410,65,92,'#caa16a');r.r(x+5,417,53,2,'#dfba85')}
  r.r(579,314,73,40,'#806b49');r.r(586,320,59,17,'#d9d1ab');r.r(588,341,56,8,'#5a6651');r.text('밀가루 · 이스트 · 소금 · 꿀 · 씨앗',480,458,'#fff0c6',17);
 }else{
  window(320,128,292,156);shelf(117,127,160,219);for(let y=153;y<315;y+=51)for(let x=133;x<244;x+=34)loaf(x,y);
  wood(689,136,132,111);r.r(697,144,116,95,'#465e49');r.text('OPEN',755,177,'#f3e4b4',18);r.text('작은 화덕',755,210,'#d5d6a6',13);
  poly([[255,345],[679,345],[751,414],[198,414]],'#8d7351');wood(207,413,535,134);for(let x=220;x<720;x+=71){r.r(x,431,53,96,'#c49a64');r.r(x+6,438,41,3,'#dbb581')}
  r.r(280,291,372,96,'#8a8b70');r.r(288,299,356,76,'#b3c2a2');for(let i=0;i<9;i++)loaf(296+i*37,343);r.r(285,373,364,9,'#d9c48b');r.r(288,300,354,2,'#e6e7c5');for(const x of [292,461,631])r.r(x,301,3,72,'#e6dec1');
  // Side door points to the production room; no kiln or storage cabinet here.
  wood(843,165,88,211);r.r(850,173,72,194,'#7f684b');r.r(906,263,6,9,'#ddc28a');r.text('작업실',886,151,'#6c583e',12);
 }
}

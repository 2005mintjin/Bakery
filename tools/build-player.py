"""Extract the supplied transparent sprites, keeping originals unchanged.
Optional development tool: Python + Pillow. Not needed to run the game.
"""
from pathlib import Path
import json
from PIL import Image, ImageFilter
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'assets/characters'
CELL = (224, 232)

def components(image):
    w, h = image.size
    mask = bytearray(1 if v > 128 else 0 for v in image.getchannel('A').tobytes())
    result = []
    for i in range(w*h):
        if not mask[i]:
            continue
        mask[i] = 0
        queue, pixels = [i], []
        while queue:
            p = queue.pop()
            pixels.append(p)
            y, x = divmod(p, w)
            for j in (p-1 if x else -1, p+1 if x<w-1 else -1,
                      p-w if y else -1, p+w if y<h-1 else -1):
                if j >= 0 and mask[j]:
                    mask[j] = 0
                    queue.append(j)
        if len(pixels) > 2000:
            xs, ys = [p % w for p in pixels], [p // w for p in pixels]
            result.append({'box': (min(xs), min(ys), max(xs)+1, max(ys)+1), 'pixels': pixels})
    return result

def head_geometry(part, width):
    x0,y0,x1,y1=part['box']
    xs=[p%width for p in part['pixels'] if y0+30<=p//width<y0+65]
    return (min(xs)+max(xs))/2, max(xs)-min(xs)+1

def put_frame(source, part, atlas, col, row, target=None):
    w, _ = source.size
    x0, y0, x1, y1 = part['box']
    # Isolate the connected silhouette: neighboring tails overlap bounding rectangles.
    box = (max(0,x0-2),max(0,y0-2),min(w,x1+2),min(source.height,y1+2))
    piece = source.crop(box)
    core = Image.new('L',piece.size)
    data = core.load()
    for p in part['pixels']:
        y,x = divmod(p,w)
        data[x-box[0],y-box[1]]=255
    expanded = core.filter(ImageFilter.MaxFilter(3))
    alpha = piece.getchannel('A')
    alpha.putdata([a if m else 0 for a,m in zip(alpha.tobytes(),expanded.tobytes())])
    piece.putalpha(alpha)
    # Feet/tails change sides during a stride: anchor to the head, not their extents.
    head_x,head_width=head_geometry(part,w)
    anchor_x, anchor_y = 112,224
    px = round(anchor_x-(head_x-box[0]))
    py = anchor_y-(y1-box[1])
    assert px>=0 and px+piece.width<=CELL[0] and py>=0
    atlas.alpha_composite(piece,(col*CELL[0]+px,row*CELL[1]+py))
    scale_x=target['headWidth']/head_width if target else 1
    scale_y=target['height']/(y1-y0) if target else 1
    return {'sourceIndex':part.get('sourceIndex',0),'scaleX':scale_x,'scaleY':scale_y,'bodyHeight':y1-y0,'headWidth':head_width,'x':col*CELL[0],'y':row*CELL[1],'w':CELL[0],'h':CELL[1],
            'anchorX':anchor_x,'anchorY':anchor_y}

poses=Image.open(DEST/'source/sheet-2.png').convert('RGBA')
walk=Image.open(DEST/'source/sheet-1.png').convert('RGBA')
pose_parts=components(poses)
standing=sorted([p for p in pose_parts if p['box'][1]<230],key=lambda p:p['box'][0])
assert len(standing)==9
idle_image=Image.new('RGBA',(4*CELL[0],CELL[1]))
idle={}
reference={}
for col,(direction,index) in enumerate([('down',1),('up',3),('left',2),('right',4)]):
    part=standing[index]
    reference[direction]={'headWidth':head_geometry(part,poses.width)[1],'height':part['box'][3]-part['box'][1]}
    idle[direction]=[put_frame(poses,standing[index],idle_image,col,0)]
idle_image.save(DEST/'player-idle.png')
walk_parts=components(walk)
walk_image=Image.new('RGBA',(4*CELL[0],4*CELL[1]))
# Three distinct poses and one repeated passing pose per short gait cycle.
selected={'down':[0,2,4,2],'up':[0,2,4,2],'right':[0,9,8,9],'left':[0,1,3,1]}
walking={}
for row,direction in enumerate(['down','right','up','left']):
    parts=sorted([p for p in walk_parts if row*195<=p['box'][1]<(row+1)*195],key=lambda p:p['box'][0])
    assert len(parts)==(12 if direction in ['up','down'] else 13),(direction,len(parts))
    for i,part in enumerate(parts):part['sourceIndex']=i
    walking[direction]=[put_frame(walk,parts[i],walk_image,col,row,reference[direction]) for col,i in enumerate(selected[direction])]
# Match the walking sheet's channel distributions to the original idle palette.
# This removes the warm/red cast in the supplied walking art; source PNGs stay untouched.
def histogram_match(image,reference):
    raw=image.tobytes()
    source_pixels=list(zip(raw[0::4],raw[1::4],raw[2::4],raw[3::4]))
    raw=reference.tobytes()
    target_pixels=[p for p in zip(raw[0::4],raw[1::4],raw[2::4],raw[3::4]) if p[3]>128]
    opaque=[p for p in source_pixels if p[3]>128]
    maps=[]
    for channel in range(3):
        sh=[0]*256;th=[0]*256
        for p in opaque:sh[p[channel]]+=1
        for p in target_pixels:th[p[channel]]+=1
        sc=[];tc=[];acc=0
        for n in sh:acc+=n;sc.append(acc/len(opaque))
        acc=0
        for n in th:acc+=n;tc.append(acc/len(target_pixels))
        maps.append([min(range(256),key=lambda j:abs(tc[j]-q)) for q in sc])
    image.putdata([(maps[0][r],maps[1][g],maps[2][b],a) if a else (0,0,0,0) for r,g,b,a in source_pixels])
    return maps
for row,direction in enumerate(['down','right','up','left']):
    region=(0,row*CELL[1],walk_image.width,(row+1)*CELL[1])
    strip=walk_image.crop(region)
    ref_col=['down','up','left','right'].index(direction)
    reference=idle_image.crop((ref_col*CELL[0],0,(ref_col+1)*CELL[0],CELL[1]))
    histogram_match(strip,reference)
    walk_image.paste(strip,(0,row*CELL[1]))
walking['left']=[{**frame,'flip':True} for frame in walking['right']]
idle['left']=[{**frame,'flip':True} for frame in idle['right']]
selected['left']=selected['right'][:]
walk_image.save(DEST/'player-walk.png')
config={'idle':{'asset':'assets/characters/player-idle.png','frames':idle,'scale':1},
        'walk':{'asset':'assets/characters/player-walk.png','frames':walking,'scale':1,'fps':10,'sourceFrames':selected,'paletteMatched':True},
        'reservedBread':{'asset':'assets/characters/source/sheet-2.png','sourceRect':[0,612,1536,224],
                         'enabled':False,'description':'원본 넷째 줄 전체 보존. 후속 빵 운반 기능용.'}}
(ROOT/'data/playerAnimations.json').write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
print('Extracted 4 idle directions and 4-frame short gait cycles; full original bread row retained.')

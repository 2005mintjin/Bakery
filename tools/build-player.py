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

def put_frame(source, part, atlas, col, row):
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
    # Align each pair of feet rather than centering the large tail.
    feet = [p % w for p in part['pixels'] if p // w >= y1-25]
    foot_x = (min(feet)+max(feet))/2
    anchor_x, anchor_y = 112,224
    px = round(anchor_x-(foot_x-box[0]))
    py = anchor_y-(y1-box[1])
    assert px>=0 and px+piece.width<=CELL[0] and py>=0
    atlas.alpha_composite(piece,(col*CELL[0]+px,row*CELL[1]+py))
    return {'x':col*CELL[0],'y':row*CELL[1],'w':CELL[0],'h':CELL[1],
            'anchorX':anchor_x,'anchorY':anchor_y}

poses=Image.open(DEST/'source/sheet-2.png').convert('RGBA')
walk=Image.open(DEST/'source/sheet-1.png').convert('RGBA')
pose_parts=components(poses)
standing=sorted([p for p in pose_parts if p['box'][1]<230],key=lambda p:p['box'][0])
assert len(standing)==9
idle_image=Image.new('RGBA',(4*CELL[0],CELL[1]))
idle={}
for col,(direction,index) in enumerate([('down',1),('up',3),('left',2),('right',4)]):
    idle[direction]=[put_frame(poses,standing[index],idle_image,col,0)]
idle_image.save(DEST/'player-idle.png')
walk_parts=components(walk)
walk_image=Image.new('RGBA',(13*CELL[0],4*CELL[1]))
walking={}
for row,direction in enumerate(['down','right','up','left']):
    parts=sorted([p for p in walk_parts if row*195<=p['box'][1]<(row+1)*195],key=lambda p:p['box'][0])
    assert len(parts)==(12 if direction in ['up','down'] else 13),(direction,len(parts))
    walking[direction]=[put_frame(walk,p,walk_image,col,row) for col,p in enumerate(parts)]
walk_image.save(DEST/'player-walk.png')
config={'idle':{'asset':'assets/characters/player-idle.png','frames':idle,'scale':1},
        'walk':{'asset':'assets/characters/player-walk.png','frames':walking,'scale':205/188,'fps':10},
        'reservedBread':{'asset':'assets/characters/source/sheet-2.png','sourceRect':[0,612,1536,224],
                         'enabled':False,'description':'원본 넷째 줄 전체 보존. 후속 빵 운반 기능용.'}}
(ROOT/'data/playerAnimations.json').write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
print('Extracted 4 idle directions and 50 walking frames; full original bread row retained.')

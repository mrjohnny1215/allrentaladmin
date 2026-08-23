#!/usr/bin/env python3
"""goods_detail 원본(834MB)을 웹 배포용으로 리사이즈/재압축.
   - 최대 폭 1200px, JPEG quality 82, progressive
   - 원본은 /opt/data/allnup_detail_raw 로 백업 이동(레포 밖)
"""
import os, shutil, sys
from concurrent.futures import ThreadPoolExecutor

SRC = '/opt/data/allnup-clone/public/assets/goods_detail'
RAW = '/opt/data/allnup_detail_raw'
MAXW = 1200
Q = 82

try:
    from PIL import Image
except ImportError:
    print('Pillow 필요: uv pip install pillow', file=sys.stderr)
    sys.exit(2)

os.makedirs(RAW, exist_ok=True)
files = [f for f in os.listdir(SRC) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
print(f'[start] {len(files)} files')

stat = {'ok': 0, 'skip': 0, 'err': 0, 'before': 0, 'after': 0}


def work(f):
    src = os.path.join(SRC, f)
    try:
        before = os.path.getsize(src)
        bak = os.path.join(RAW, f)
        if not os.path.exists(bak):
            shutil.copy2(src, bak)
        im = Image.open(src)
        im = im.convert('RGB')
        if im.width > MAXW:
            h = round(im.height * MAXW / im.width)
            im = im.resize((MAXW, h), Image.LANCZOS)
        out = os.path.splitext(src)[0] + '.jpg'
        im.save(out, 'JPEG', quality=Q, optimize=True, progressive=True)
        if out != src and os.path.exists(src):
            os.remove(src)
        after = os.path.getsize(out)
        return ('ok', before, after)
    except Exception as e:
        return ('err', 0, 0)


with ThreadPoolExecutor(max_workers=8) as ex:
    for i, (k, b, a) in enumerate(ex.map(work, files), 1):
        stat[k] += 1
        stat['before'] += b
        stat['after'] += a
        if i % 500 == 0:
            print(f'  [{i}/{len(files)}] {stat["before"]/1e6:.0f}MB -> {stat["after"]/1e6:.0f}MB', flush=True)

print(f'[done] ok={stat["ok"]} err={stat["err"]} '
      f'{stat["before"]/1e6:.0f}MB -> {stat["after"]/1e6:.0f}MB '
      f'({100 - stat["after"] / max(stat["before"], 1) * 100:.0f}% 절감)')

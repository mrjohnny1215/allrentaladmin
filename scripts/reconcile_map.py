#!/usr/bin/env python3
"""images_map.json 을 디스크 실제 파일 기준으로 정합화.
   - optimize_images.py 가 .png -> .jpg 로 재저장하므로 확장자 불일치 해소
   - '+' 등 unsafe 문자 치환 반영
   - 실제 존재하지 않는 항목 제거
"""
import json, os

ROOT = '/opt/data/allnup-clone'
DIR = f'{ROOT}/public/assets/goods_detail'
MAP = f'{ROOT}/public/data/images_map.json'

disk = set(os.listdir(DIR))
m = json.load(open(MAP, encoding='utf-8'))

fixed = dropped = 0
out = {}
for name, arr in m.items():
    keep = []
    for f in arr:
        cand = f
        if cand not in disk:
            # 확장자 교체 시도 (.png -> .jpg 등)
            stem = os.path.splitext(cand)[0]
            alt = [f'{stem}.jpg', f'{stem}.jpeg', f'{stem}.png']
            hit = next((a for a in alt if a in disk), None)
            if hit:
                cand = hit; fixed += 1
            else:
                # unsafe 문자 치환본 시도
                hit2 = next((a for a in [f'{stem.replace("+", "plus")}.jpg'] if a in disk), None)
                if hit2:
                    cand = hit2; fixed += 1
                else:
                    dropped += 1
                    continue
        keep.append(cand)
    if keep:
        out[name] = keep

json.dump(out, open(MAP, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(f'products with images: {len(out)} (was {len(m)})')
print(f'extension/name fixed : {fixed}')
print(f'dropped (no file)    : {dropped}')
print(f'total refs           : {sum(len(v) for v in out.values())}')
print(f'disk files           : {len(disk)}')

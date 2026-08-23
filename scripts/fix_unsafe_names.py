#!/usr/bin/env python3
"""파일명에 URL-unsafe 문자('+')가 있는 이미지를 정규화 rename.
   '+'는 HTTP 서버가 공백으로 디코딩해서 404를 유발한다.
"""
import os, re, json

DIR = '/opt/data/allnup-clone/public/assets/goods_detail'
MAP = '/opt/data/allnup-clone/public/data/images_map.json'

renames = {}
for f in os.listdir(DIR):
    if '+' not in f:
        continue
    nf = f.replace('+', 'plus')
    src, dst = os.path.join(DIR, f), os.path.join(DIR, nf)
    if os.path.exists(dst):
        os.remove(src)
    else:
        os.rename(src, dst)
    renames[f] = nf

print(f'renamed {len(renames)} files')
for a, b in list(renames.items())[:8]:
    print(f'  {a}\n   -> {b}')

# images_map.json 동기화
if os.path.exists(MAP) and renames:
    m = json.load(open(MAP, encoding='utf-8'))
    n = 0
    for k, arr in m.items():
        for i, v in enumerate(arr):
            if v in renames:
                arr[i] = renames[v]; n += 1
    json.dump(m, open(MAP, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(f'images_map.json entries updated: {n}')

left = [f for f in os.listdir(DIR) if '+' in f]
print('remaining "+" files:', len(left))

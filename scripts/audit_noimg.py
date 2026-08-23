"""이미지 0장 상품 25건의 정체 확인 — 원본에 정말 이미지가 없는지 교차검증."""
import json, urllib.parse, urllib.request, urllib.error, collections

ROOT = '/opt/data/allnup-clone'
SID = None
for ln in open('/opt/data/allnup_ck_new.txt', encoding='utf-8'):
    if 'PHPSESSID' in ln:
        SID = ln.split('\t')[-1].strip()
HDR = {'User-Agent': 'Mozilla/5.0', 'Cookie': f'auto_login_userid=sunghoon; PHPSESSID={SID}',
       'Referer': 'https://allnup.com/layout.php?page=counsel.php'}

ps = json.load(open(f'{ROOT}/public/data/products.json', encoding='utf-8'))
noimg = [p for p in ps if not p['images']]
print(f'이미지 0장 상품: {len(noimg)}건')
print('카테고리 분포 :', dict(collections.Counter(p['category'] for p in noimg)))
print('브랜드 분포   :', dict(collections.Counter(p['brand'] for p in noimg)))
print()

# 원본 API 재조회로 "정말 없는지" 확인
same = diff = 0
for p in noimg:
    url = ('https://allnup.com/counsel.php?image='
           + urllib.parse.quote(p['name']) + '&mode=list')
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=HDR), timeout=20) as r:
            arr = json.loads(r.read().decode('utf-8', 'ignore'))
    except Exception as e:
        print(f"  [ERR] {p['name'][:34]:34s} {e}")
        continue
    real = [a for a in arr if 'no_image' not in str(a)]
    tag = 'ORIGIN_EMPTY' if not real else f'*** ORIGIN_HAS {len(real)}'
    if real:
        diff += 1
    else:
        same += 1
    print(f"  {tag:18s} {p['brand']:6s} {p['name'][:32]:32s} model={p['model_code'][:18]}")

print()
print(f'원본도 이미지 없음(정상) : {same}건')
print(f'원본엔 있는데 누락(버그) : {diff}건')

#!/usr/bin/env python3
"""서브 이미지(-1..-N)의 실제 원본 URL base 탐색."""
import re, urllib.parse, urllib.request, sys

SID = None
for ln in open('/opt/data/allnup_ck_new.txt', encoding='utf-8'):
    if 'PHPSESSID' in ln:
        SID = ln.split('\t')[-1].strip()
print('SID', SID)

HDR = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Cookie': f'auto_login_userid=sunghoon; PHPSESSID={SID}',
    'Referer': 'https://allnup.com/layout.php?page=counsel.php',
}

def get(url, timeout=20):
    req = urllib.request.Request(url, headers=HDR)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read(), r.headers.get('Content-Type', '')
    except Exception as e:
        return getattr(e, 'code', -1), b'', str(e)

name = '냉온 아이콘3-1.jpg'
q = urllib.parse.quote(name)
bases = [
    'https://allnup.com/goods_image/',
    'https://allnup.com/assets/goods_image/',
    'https://allnup.com/upload/goods_image/',
    'https://allnup.com/data/goods_image/',
    'https://allnup.com/images/goods_image/',
    'https://allnup.com/img/goods_image/',
    'https://allnup.com/file/goods_image/',
    'https://allnup.com/uploads/goods_image/',
]
for b in bases:
    st, body, ct = get(b + q)
    print(f'{b:48s} {st} {len(body):8d} {ct[:30]}')

# counsel.php 원본 HTML에서 goods_image 참조 패턴 추출
st, body, ct = get('https://allnup.com/counsel.php')
html = body.decode('utf-8', 'ignore')
print('counsel.php', st, len(html))
pats = sorted(set(re.findall(r'[^"\'\s()]{0,60}goods_image[^"\'\s()]{0,40}', html)))
for p in pats[:40]:
    print('  PAT', p)

#!/usr/bin/env python3
"""
allnup.com 다중 이미지(상품명 기준 -1..-N) 전량 크롤러.

전략:
 1) counsel.php?image=<상품명>&mode=list -> 이미지 파일명 배열(JSON)
 2) 각 파일을 https://allnup.com/goods_image/<file> 로 고화질 원본 다운로드
 3) public/assets/goods_detail/<sanitized> 로 저장 + images_map.json 산출

가드:
 - HTTP 200 + content-type image/* + size>=2000 만 저장
 - placeholder(140727 / no_image) 스킵
 - 기존 정상 파일은 재다운로드 스킵(resume 가능)
"""
import json, os, re, sys, time, hashlib, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = '/opt/data/allnup-clone'
OUT_DIR = os.path.join(ROOT, 'public/assets/goods_detail')
MAP_PATH = os.path.join(ROOT, 'public/data/images_map.json')
WS = os.path.join(ROOT, 'public/data/counsel_ws.json')
COOKIE_FILE = '/opt/data/allnup_ck_new.txt'
PLACEHOLDER_SIZES = {140727, 9668}

os.makedirs(OUT_DIR, exist_ok=True)

SID = None
for ln in open(COOKIE_FILE, encoding='utf-8'):
    if 'PHPSESSID' in ln:
        SID = ln.split('\t')[-1].strip()
assert SID, 'PHPSESSID 없음'

HDR = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Cookie': f'auto_login_userid=sunghoon; PHPSESSID={SID}',
    'Referer': 'https://allnup.com/layout.php?page=counsel.php',
}


def fetch(url, timeout=25, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=HDR)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read(), r.headers.get('Content-Type', '')
        except Exception as e:
            if i == tries - 1:
                return getattr(e, 'code', -1), b'', str(e)
            time.sleep(1.2 * (i + 1))
    return -1, b'', 'fail'


def sanitize(fname):
    return re.sub(r'[\\/]', '_', fname)


def do_name(name):
    """상품명 하나 처리 -> (name, [저장된 상대경로...])"""
    url = ('https://allnup.com/counsel.php?image=' + urllib.parse.quote(name)
           + '&mode=list&t=' + str(int(time.time() * 1000)))
    st, body, ct = fetch(url)
    if st != 200 or not body:
        return name, [], f'list_http={st}'
    try:
        paths = json.loads(body.decode('utf-8', 'ignore'))
    except Exception:
        return name, [], 'list_json_err'
    if not isinstance(paths, list):
        return name, [], 'list_not_array'

    saved = []
    for p in paths:
        fname = str(p).split('/')[-1]
        if not fname or 'no_image' in fname:
            continue
        local = sanitize(fname)
        dest = os.path.join(OUT_DIR, local)
        if os.path.exists(dest) and os.path.getsize(dest) >= 2000 \
                and os.path.getsize(dest) not in PLACEHOLDER_SIZES:
            saved.append(local)
            continue
        img_url = 'https://allnup.com/goods_image/' + urllib.parse.quote(fname)
        ist, data, ict = fetch(img_url)
        if ist != 200 or not data or len(data) < 2000:
            continue
        if not ict.startswith('image/'):
            continue
        if len(data) in PLACEHOLDER_SIZES:
            continue
        with open(dest, 'wb') as f:
            f.write(data)
        saved.append(local)
    return name, saved, 'ok'


def main():
    ws = json.load(open(WS, encoding='utf-8'))
    hdr, rows = ws[0], ws[1:]
    ni = hdr.index('상품명')
    names = sorted({r[ni].strip() for r in rows if r[ni].strip()})
    print(f'[start] 상품명 {len(names)}개, 출력 {OUT_DIR}', flush=True)

    result, errors = {}, []
    done = 0
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(do_name, n): n for n in names}
        for fut in as_completed(futs):
            name, saved, status = fut.result()
            done += 1
            if saved:
                result[name] = saved
            if status != 'ok':
                errors.append({'name': name, 'status': status})
            if done % 25 == 0:
                tot = sum(len(v) for v in result.values())
                print(f'[{done}/{len(names)}] 상품 {len(result)} / 이미지 {tot}', flush=True)

    total_imgs = sum(len(v) for v in result.values())
    multi = sum(1 for v in result.values() if len(v) > 1)
    json.dump(result, open(MAP_PATH, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=0)
    print(f'[done] 상품 {len(result)}/{len(names)} · 이미지 {total_imgs}장 '
          f'· 다중이미지 상품 {multi}개 · 오류 {len(errors)}', flush=True)
    if errors:
        json.dump(errors, open(os.path.join(ROOT, 'public/data/images_errors.json'),
                               'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()

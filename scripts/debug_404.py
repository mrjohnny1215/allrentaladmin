"""라이브 404 이미지의 정확한 URL 수집 → 원인 규명."""
import json, time, collections
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 430, 'height': 920})
    bad, ok = [], []
    pg.on('response', lambda r: (bad if r.status >= 400 else ok).append((r.status, r.url)))
    pg.goto('https://allrentaladmin.vercel.app/', wait_until='networkidle', timeout=90000)
    pg.wait_for_selector('.pcard', timeout=45000)
    time.sleep(4)
    print('404 count:', len(bad))
    for s, u in bad[:15]:
        print(' ', s, u[:150])
    print()
    print('OK img sample:')
    for s, u in [x for x in ok if 'goods_detail' in x[1]][:5]:
        print(' ', s, u[:150])
    b.close()

"""계산기 반응성 집중 검증: 48조합 상품(냉온 아이콘3)으로 옵션 변경 → 값 변동 확인."""
import json, time
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:4178/'
out = {}
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1280, 'height': 950})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)

    pg.goto(BASE, wait_until='networkidle', timeout=60000)
    pg.wait_for_selector('.pcard', timeout=30000)

    pg.fill('.cat-search', 'CHP-7220N')
    pg.wait_for_timeout(900)
    out['search_hits'] = pg.locator('.pcard').count()
    pg.locator('.pcard').first.click()
    pg.wait_for_selector('.calc', timeout=15000)
    pg.wait_for_timeout(800)
    out['title'] = pg.inner_text('.detail-title')
    out['model'] = pg.inner_text('.detail-sub')
    out['gallery_thumbs'] = pg.locator('.gal-thumbs button').count()
    out['colors'] = pg.locator('.color-list span').count()
    out['selling_points'] = pg.locator('.pt-list span').count()
    out['filters'] = pg.locator('.filter-list li').count()
    out['has_promo'] = pg.locator('.promo-pre').count() > 0

    def vals():
        return pg.evaluate("""() => {
          const v=[...document.querySelectorAll('.result-line .v')].map(e=>e.innerText.trim());
          const m=document.querySelector('.result-meta');
          return {fee:v[0]||null, comm:v[1]||null, meta:m?m.innerText:null};
        }""")

    def opts(cap):
        loc = pg.locator('.calc-row', has_text=cap).locator('button')
        return [(loc.nth(i).inner_text(),
                 'on' in (loc.nth(i).get_attribute('class') or ''),
                 loc.nth(i).is_disabled()) for i in range(loc.count())]

    out['opts_mgmt'] = opts('관리 방식')
    out['opts_contract'] = opts('계약 유형')
    out['opts_years'] = opts('약정 기간')

    # 약정 기간 전부 순회
    seq = []
    yl = pg.locator('.seg.years button')
    for i in range(yl.count()):
        btn = yl.nth(i)
        if btn.is_disabled():
            continue
        btn.click(); pg.wait_for_timeout(450)
        v = vals(); v['clicked'] = btn.inner_text()
        seq.append(v)
    out['years_sweep'] = seq
    out['years_reactive'] = len({s['fee'] for s in seq}) > 1

    # 계약 유형 순회
    seq2 = []
    cl = pg.locator('.calc-row', has_text='계약 유형').locator('button')
    for i in range(cl.count()):
        btn = cl.nth(i)
        if btn.is_disabled():
            continue
        btn.click(); pg.wait_for_timeout(450)
        v = vals(); v['clicked'] = btn.inner_text()
        seq2.append(v)
    out['contract_sweep'] = seq2
    out['contract_reactive'] = len({s['fee'] for s in seq2}) > 1

    # 관리 방식 순회
    seq3 = []
    ml = pg.locator('.calc-row', has_text='관리 방식').locator('button')
    for i in range(ml.count()):
        btn = ml.nth(i)
        if btn.is_disabled():
            continue
        btn.click(); pg.wait_for_timeout(450)
        v = vals(); v['clicked'] = btn.inner_text()
        seq3.append(v)
    out['mgmt_sweep'] = seq3
    out['mgmt_reactive'] = len({s['fee'] for s in seq3}) > 1

    pg.screenshot(path='/opt/data/allnup-clone/detail_shot.png', full_page=False)
    out['errors'] = errs[:5]
    b.close()
print(json.dumps(out, ensure_ascii=False, indent=2))

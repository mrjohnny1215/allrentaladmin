"""라이브 배포 최종 검증 (allrentaladmin.vercel.app)."""
import json, time
from playwright.sync_api import sync_playwright

BASE = 'https://allrentaladmin.vercel.app/'
out = {'url': BASE}
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 430, 'height': 920})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
    pg.on('console', lambda m: errs.append(m.text[:160]) if m.type == 'error' else None)
    fails = []
    pg.on('requestfailed', lambda r: fails.append(r.url[:110]))

    pg.goto(BASE, wait_until='networkidle', timeout=90000)
    pg.wait_for_selector('.pcard', timeout=45000)
    time.sleep(1.2)

    out['header'] = pg.inner_text('.cat-header')
    out['cards'] = pg.locator('.pcard').count()
    out['card_imgs'] = pg.evaluate("""() => {
      const on=[...document.querySelectorAll('.pcard-thumb img.on')];
      return {shown:on.length, loaded:on.filter(i=>i.naturalWidth>0).length,
              noimg:on.filter(i=>i.src.includes('no_image')).length};
    }""")

    # 슬라이드쇼 순환
    def idx0():
        return pg.evaluate("""() => {const c=document.querySelector('.pcard');
          return [...c.querySelectorAll('.pcard-thumb img')].findIndex(i=>i.classList.contains('on'));}""")
    a = idx0(); time.sleep(2.5); out['slideshow'] = {'before': a, 'after': idx0()}
    out['slideshow']['rotating'] = out['slideshow']['before'] != out['slideshow']['after']

    # 카테고리별 카드 렌더 확인
    per_cat = {}
    for c in ['정수기', '공기청정기', '비데', '매트리스', '안마의자']:
        pg.locator('.chip', has_text=c).first.click()
        time.sleep(0.9)
        per_cat[c] = {
            'cards': pg.locator('.pcard').count(),
            'imgs_ok': pg.evaluate("""() => [...document.querySelectorAll('.pcard-thumb img.on')]
                                        .filter(i=>i.naturalWidth>0).length"""),
        }
        pg.locator('.chip', has_text=c).first.click()  # 해제
        time.sleep(0.4)
    out['per_category'] = per_cat

    # 검색 → 상세 → 계산기 3축 반응성
    pg.fill('.cat-search', 'CHP-7220N')
    time.sleep(1.0)
    pg.locator('.pcard').first.click()
    pg.wait_for_selector('.calc', timeout=20000)
    time.sleep(1.0)
    out['detail'] = {
        'title': pg.inner_text('.detail-title'),
        'sub': pg.inner_text('.detail-sub'),
        'gallery_thumbs': pg.locator('.gal-thumbs button').count(),
        'gallery_loaded': pg.evaluate("()=>{const i=document.querySelector('.gal-main img');return i?i.naturalWidth:0}"),
        'points': pg.locator('.pt-list span').count(),
        'colors': pg.locator('.color-list span').count(),
        'promo': pg.locator('.promo-pre').count() > 0,
    }

    def fee():
        return pg.evaluate("""() => {const v=[...document.querySelectorAll('.result-line .v')]
            .map(e=>e.innerText.trim()); return {fee:v[0],comm:v[1]};}""")

    sweep = {}
    for cap, cls in [('약정 기간', '.seg.years button'), ('계약 유형', None), ('관리 방식', None)]:
        loc = pg.locator(cls) if cls else pg.locator('.calc-row', has_text=cap).locator('button')
        seen = []
        for i in range(loc.count()):
            btn = loc.nth(i)
            if btn.is_disabled():
                continue
            btn.click(); time.sleep(0.5)
            seen.append({'opt': btn.inner_text(), **fee()})
        sweep[cap] = {'steps': seen, 'reactive': len({s['fee'] for s in seen}) > 1}
    out['calculator'] = sweep

    pg.screenshot(path='/opt/data/allnup-clone/live_shot.png')
    out['console_errors'] = errs[:5]
    out['failed_requests'] = fails[:5]
    b.close()
print(json.dumps(out, ensure_ascii=False, indent=2))

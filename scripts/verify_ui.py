"""헤드리스 렌더 검증: 카드 그리드 / 슬라이드쇼 / 상세 스크롤 / 계산기 연동."""
import json, sys, time
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:4178/'
report = {}

with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 430, 'height': 900})
    errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))

    pg.goto(BASE, wait_until='networkidle', timeout=60000)
    pg.wait_for_selector('.pcard', timeout=30000)
    time.sleep(1.0)

    report['cards'] = pg.locator('.pcard').count()
    report['header_count'] = pg.locator('.cat-header .count').inner_text()
    report['multi_img_badges'] = pg.locator('.badge-imgs').count()

    # 카드 이미지 실제 로드 여부(naturalWidth>0) 검사
    report['card_imgs'] = pg.evaluate("""() => {
      const on = [...document.querySelectorAll('.pcard-thumb img.on')];
      return {total: on.length,
              loaded: on.filter(i => i.naturalWidth > 0).length,
              noimg: on.filter(i => i.src.includes('no_image')).length};
    }""")

    # 슬라이드쇼 자동 순환 확인: 첫 카드의 활성 인덱스가 변하는지
    def act_idx():
        return pg.evaluate("""() => {
          const c = document.querySelector('.pcard');
          const imgs = [...c.querySelectorAll('.pcard-thumb img')];
          return imgs.findIndex(i => i.classList.contains('on'));
        }""")
    a = act_idx(); time.sleep(2.4); bb = act_idx()
    report['slideshow'] = {'idx_before': a, 'idx_after': bb, 'rotating': a != bb}

    # 정수기 필터 → 카드 클릭 → 상세 섹션 인라인 노출 + 스크롤
    pg.locator('.chip', has_text='정수기').first.click()
    time.sleep(0.8)
    report['after_cat_filter_cards'] = pg.locator('.pcard').count()

    scroll_before = pg.evaluate('window.scrollY')
    pg.locator('.pcard').first.click()
    time.sleep(1.6)
    report['scroll_moved'] = pg.evaluate('window.scrollY') > scroll_before + 100
    report['same_page'] = pg.url.rstrip('/') == BASE.rstrip('/')
    report['detail_visible'] = pg.locator('.detail-wrap').count() > 0
    report['detail_title'] = pg.locator('.detail-title').inner_text()
    report['selected_card'] = pg.locator('.pcard.selected').count()
    report['gallery_thumbs'] = pg.locator('.gal-thumbs button').count()
    report['gallery_img_loaded'] = pg.evaluate(
        "() => {const i=document.querySelector('.gal-main img'); return i? i.naturalWidth:0}")
    report['selling_points'] = pg.locator('.pt-list span').count()

    # 계산기: 약정 기간 변경 시 월 렌탈료/수수료가 실제로 바뀌는지
    def vals():
        return pg.evaluate("""() => {
          const v=[...document.querySelectorAll('.result-line .v')].map(e=>e.innerText.trim());
          return {fee: v[0]||null, comm: v[1]||null,
                  meta: (document.querySelector('.result-meta')||{}).innerText||null};
        }""")
    v1 = vals()
    yrs = pg.locator('.seg.years button:not([disabled])')
    n = yrs.count()
    v2 = None
    for k in range(n):
        btn = yrs.nth(k)
        if 'on' not in (btn.get_attribute('class') or ''):
            btn.click(); time.sleep(0.6); v2 = vals(); break
    report['calc'] = {'years_options': n, 'before': v1, 'after': v2,
                      'reactive': bool(v2 and v2['fee'] != v1['fee'])}

    # 관리방식 토글 반응
    mg = pg.locator('.calc-row', has_text='관리 방식').locator('button:not([disabled])')
    v3 = None
    if mg.count() > 1:
        for k in range(mg.count()):
            if 'on' not in (mg.nth(k).get_attribute('class') or ''):
                mg.nth(k).click(); time.sleep(0.6); v3 = vals(); break
    report['calc_mgmt'] = {'options': mg.count(), 'after': v3}

    report['console_errors'] = errs[:6]
    b.close()

print(json.dumps(report, ensure_ascii=False, indent=2))

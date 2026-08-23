"""lazy-loading 확정 검증: 비데 카테고리에서 스크롤 후 이미지 로드율 재측정."""
import json, time
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 430, 'height': 920})
    pg.goto('https://allrentaladmin.vercel.app/', wait_until='networkidle', timeout=90000)
    pg.wait_for_selector('.pcard', timeout=45000)
    pg.locator('.chip', has_text='비데').first.click()
    time.sleep(1.2)

    def stat():
        return pg.evaluate("""() => {
          const on=[...document.querySelectorAll('.pcard-thumb img.on')];
          return {shown:on.length, loaded:on.filter(i=>i.naturalWidth>0).length,
                  noimg:on.filter(i=>i.src.includes('no_image')).length};
        }""")

    print('스크롤 전 :', stat())
    # 전체 그리드 스크롤로 lazy 이미지 강제 로드
    for _ in range(14):
        pg.mouse.wheel(0, 1400)
        time.sleep(0.55)
    time.sleep(3)
    print('스크롤 후 :', stat())
    # 카드별 실제 src 200 여부(상위 8개)
    print('src 샘플  :', pg.evaluate("""() => [...document.querySelectorAll('.pcard-thumb img.on')]
        .slice(0,6).map(i=>({w:i.naturalWidth, src:decodeURIComponent(i.src.split('/').pop())}))"""))
    b.close()

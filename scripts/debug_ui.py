import json
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--no-sandbox'])
    pg = b.new_page()
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.on('requestfailed', lambda r: logs.append(f'REQFAIL: {r.url} {r.failure}'))
    resp = []
    pg.on('response', lambda r: resp.append((r.status, r.url)))
    pg.goto('http://127.0.0.1:4178/', wait_until='networkidle', timeout=60000)
    pg.wait_for_timeout(3000)
    print('URL:', pg.url)
    print('TITLE:', pg.title())
    print('BODY:', pg.inner_text('body')[:600])
    print('ROOT HTML:', pg.inner_html('#root')[:800])
    print('--- logs ---')
    for l in logs[:25]:
        print(' ', l[:200])
    print('--- responses ---')
    for s, u in resp[:25]:
        print(' ', s, u[:120])
    b.close()

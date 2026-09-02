#!/usr/bin/env python3
"""allnup.com 로그인 및 상담/접수 흐름 분석 스크립트"""
import time
import json
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

LOGIN_URL = "https://allnup.com"
USERNAME = "sunghoon"
PASSWORD = "you098!"

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        
        # ---- Step 1: Login ----
        print("=== Step 1: allnup.com 접속 및 로그인 ===")
        page.goto(LOGIN_URL, wait_until="networkidle", timeout=30000)
        time.sleep(2)
        
        inputs = page.query_selector_all('input')
        print(f"Found {len(inputs)} input fields on login page")
        for i, inp in enumerate(inputs):
            ph = inp.get_attribute('placeholder') or ''
            nm = inp.get_attribute('name') or ''
            typ = inp.get_attribute('type') or ''
            print(f"  Input {i}: name={nm}, type={typ}, placeholder={ph}")
        
        # Fill credentials
        page.fill('input[type="text"]', USERNAME)
        page.fill('input[type="password"]', PASSWORD)
        
        # Find login button
        login_btn = page.query_selector('input[type="submit"], button[type="submit"], button')
        if login_btn:
            login_btn.click()
        time.sleep(3)
        
        print(f"After login URL: {page.url}")
        print(f"After login Title: {page.title()}")
        page.screenshot(path="/tmp/allnup_after_login.png")
        print("Screenshot: /tmp/allnup_after_login.png")
        
        # ---- Step 2: Find menu button ----
        print("\n=== Step 2: 메뉴 버튼 찾기 ===")
        # Look for a menu/ hamburger button
        menu_selectors = [
            'button:has-text("메뉴")',
            'a:has-text("메뉴")',
            'button[aria-label*="menu"]',
            '.menu',
            '.gnb',
            '.header-menu',
            'nav',
            '.sidebar',
            '.lnb',
        ]
        
        menu_items = []
        for sel in menu_selectors:
            els = page.query_selector_all(sel)
            if els:
                for el in els:
                    txt = el.inner_text().strip()
                    tag = el.evaluate('el => el.tagName').upper()
                    print(f"  Found menu element ({sel}): tag={tag}, text='{txt[:50]}'")
                    if txt:
                        menu_items.append(txt)
        
        # Also check for links containing common menu names
        all_links = page.query_selector_all('a')
        menu_keywords = ['정산', '상담', '접수', '견적', '공지', '문의', '제품비교', '메뉴', '관리', 'FAQ', '설정', '마이페이지', '로그아웃']
        print(f"\nAll links on page ({len(all_links)} total):")
        for link in all_links:
            txt = link.inner_text().strip()
            if txt:
                for kw in menu_keywords:
                    if kw in txt:
                        href = link.get_attribute('href') or ''
                        print(f"  Menu link: text='{txt}', href={href}")
                        break
        
        browser.close()
        
        # Save results
        result = {
            "login_success": page.url != LOGIN_URL,
            "login_url": page.url,
            "title": page.title(),
            "menu_items_found": menu_items,
        }
        with open("/tmp/allnup_login_result.json", "w") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print("\n=== Result saved to /tmp/allnup_login_result.json ===")
        print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    run()

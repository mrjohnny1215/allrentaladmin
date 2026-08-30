#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""LG/코웨이/쿠쿠/세스코 상세페이지 모든 이미지 네트워크 캡처 -> 본문+메인샷 모두 수집"""
import json, re
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright

BASE="/opt/data/allrentaladmin"
with open(f"{BASE}/public/data/products.json",encoding="utf-8") as f:
    data=json.load(f)
targets={}
for brand in ["LG","코웨이","쿠쿠","세스코"]:
    p=next((x for x in data if x["brand"]==brand and x.get("detail_url")),None)
    if p: targets[brand]=p["detail_url"]

with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=["--no-sandbox"])
    pg=b.new_page(viewport={"width":1280,"height":2000})
    for brand,url in targets.items():
        reqs=[]
        def on_resp(r):
            if re.search(r'\.(jpg|jpeg|png|webp)', r.url, re.I): reqs.append(r.url)
        pg.on("response", on_resp)
        try:
            pg.goto(url,wait_until="domcontentloaded",timeout=30000); pg.wait_for_timeout(4000)
            for _ in range(5): pg.mouse.wheel(0,1500); pg.wait_for_timeout(600)
            pg.wait_for_timeout(1500)
        except Exception as e:
            print(f"[{brand}] 실패 {e}"); continue
        pg.remove_listener("response", on_resp)
        # 도메인 기준 상품 이미지 (아이콘/UI 제외용 키워드)
        skip=re.compile(r'(ico_|icon|flag|logo|banner|btn_|close|arrow|nav|ui_|pixel|\.gif)',re.I)
        cands=[u for u in reqs if not skip.search(u)]
        seen=[]
        for u in cands:
            if u not in seen: seen.append(u)
        print(f"\n[{brand}] 총img {len(reqs)} / 후보 {len(seen)}")
        for u in seen[:15]: print("   ",u[-60:])
    b.close()

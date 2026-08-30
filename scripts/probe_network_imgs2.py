#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""나머지 4브랜드(cuckoo/wells/sesco/hyundai) 본문 이미지 네트워크 캡처"""
import json, re
from playwright.sync_api import sync_playwright

BASE="/opt/data/allrentaladmin"
with open(f"{BASE}/public/data/products.json",encoding="utf-8") as f:
    data=json.load(f)
targets={}
for brand in ["쿠쿠","웰스","세스코","현대큐밍"]:
    p=next((x for x in data if x["brand"]==brand and x.get("detail_url")), None)
    if p: targets[brand]=p["detail_url"]

with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=["--no-sandbox"])
    for brand,url in targets.items():
        pg=b.new_page(viewport={"width":1280,"height":2000})
        img_reqs=[]
        def on_resp(r):
            if re.search(r'\.(jpg|jpeg|png|webp)', r.url, re.I):
                img_reqs.append(r.url)
        pg.on("response", on_resp)
        try:
            pg.goto(url,wait_until="domcontentloaded",timeout=30000)
            pg.wait_for_timeout(4000)
            for _ in range(4):
                pg.mouse.wheel(0,1500); pg.wait_for_timeout(600)
            pg.wait_for_timeout(1500)
        except Exception as e:
            print(f"[{brand}] 로드실패 {e}")
        cands=[u for u in img_reqs if re.search(r'(upload/product|goods|detail|desc|editor|prd|/a/ch/)', u, re.I)]
        seen=[]; 
        for u in cands:
            if u not in seen: seen.append(u)
        print(f"\n[{brand}] 총img {len(img_reqs)} / 본문후보 {len(seen)}")
        for u in seen[:20]: print("   ",u[-65:])
        pg.close()
    b.close()

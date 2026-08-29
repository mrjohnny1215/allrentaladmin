#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""7브랜드 샘플 상세페이지 모든 img URL 수집 -> JSON 저장 (비전 수동확정용)"""
import json, re
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright

BASE="/opt/data/allrentaladmin"
with open(f"{BASE}/public/data/products.json",encoding="utf-8") as f:
    data=json.load(f)
samples={}
for brand in ["코웨이","청호나이스","SK매직","쿠쿠","웰스","세스코","현대큐밍"]:
    p=next((x for x in data if x["brand"]==brand and x.get("detail_url")), None)
    if p: samples[brand]=p["detail_url"]

out={}
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=["--no-sandbox"])
    pg=b.new_page()
    for brand,url in samples.items():
        print(f"[수집] {brand}", flush=True)
        try:
            pg.goto(url,wait_until="domcontentloaded",timeout=30000)
            pg.wait_for_timeout(3500)
        except Exception as e:
            out[brand]={"url":url,"imgs":[],"err":str(e)}; continue
        all_imgs=pg.eval_on_selector_all("img","els=>els.map(e=>e.getAttribute('src')||e.getAttribute('data-src')||e.getAttribute('data-original')).filter(Boolean).filter(u=>/\.(jpg|jpeg|png|webp)/i.test(u))")
        absd=[]
        for u in all_imgs:
            if u.startswith("//"): u="https:"+u
            if u.startswith("/"): u=urljoin(url,u)
            if re.search(r'\.(jpg|jpeg|png|webp)',u,re.I): absd.append(u)
        seen=[]; 
        for u in absd:
            if u not in seen: seen.append(u)
        out[brand]={"url":url,"imgs":seen}
    b.close()

with open(f"{BASE}/brand_sample_imgs.json","w",encoding="utf-8") as f:
    json.dump(out,f,ensure_ascii=False,indent=1)
print("\n[SAVED] brand_sample_imgs.json")
for k,v in out.items():
    print(f"  {k}: {len(v['imgs'])}건")

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
[검증] 7브랜드 샘플 상세페이지에서 후보 이미지 URL 수집 + 해상도 측정
-> 세로형 본문 이미지 판별 기준 확정
"""
import json, os, re
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright
from PIL import Image
import io, urllib.request

BASE="/opt/data/allrentaladmin"
with open(f"{BASE}/public/data/products.json",encoding="utf-8") as f:
    data=json.load(f)

# 브랜드별 샘플 (정수기 카테고리 우선)
samples={}
for brand in ["코웨이","청호나이스","SK매직","쿠쿠","웰스","세스코","현대큐밍"]:
    p=next((x for x in data if x["brand"]==brand and x.get("detail_url")), None)
    if p: samples[brand]=p["detail_url"]

# 광범위 후보 셀렉터 (모든 img를 일단 다 긁어서 해상도로 판별)
WIDE="img"

def measure(url):
    try:
        req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
        b=urllib.request.urlopen(req,timeout=15).read()
        im=Image.open(io.BytesIO(b)); return im.size
    except Exception:
        return None

with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=["--no-sandbox"])
    pg=b.new_page()
    for brand,url in samples.items():
        print(f"\n========== [{brand}] {url} ==========")
        try:
            pg.goto(url,wait_until="domcontentloaded",timeout=30000)
            pg.wait_for_timeout(3500)
        except Exception as e:
            print("  로드실패:",e); continue
        # 페이지 내 모든 img src
        all_imgs=pg.eval_on_selector_all("img","els=>els.map(e=>e.getAttribute('src')||e.getAttribute('data-src')).filter(Boolean).filter(u=>/\.(jpg|jpeg|png|webp)/i.test(u))")
        absd=[]
        for u in all_imgs:
            if u.startswith("//"): u="https:"+u
            if u.startswith("/"): u=urljoin(url,u)
            if re.search(r'\.(jpg|jpeg|png|webp)',u,re.I): absd.append(u)
        # 중복제거, 상위 40개 해상도 측정
        seen=[]; 
        for u in absd:
            if u not in seen: seen.append(u)
        print(f"  총 img {len(seen)}건, 상위 25개 해상도:")
        tall=0; sq=0; wide=0
        for u in seen[:25]:
            sz=measure(u)
            if not sz: 
                print(f"    ? {u[-50:]}"); continue
            w,h=sz; r=h/w
            tag="세로형" if r>1.5 else ("정사각" if r>=0.8 else "가로형")
            if r>1.5: tall+=1
            elif r>=0.8: sq+=1
            else: wide+=1
            print(f"    {w}x{h} [{tag}] {u[-45:]}")
        print(f"  >> 세로형(본문후보)={tall} 정사각={sq} 가로형={wide}")
    b.close()

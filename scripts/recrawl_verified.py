#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
[재크롤] 본문 이미지 있는 4브랜드만: SK매직(goods_desc), 청호(/a/ch/prd/), 웰스(/upload/editor/), 현대(본문키워드)
코웨이/쿠쿠/세스코는 본문 없음 -> 건드리지 않음(빈배열 유지)
usage: python recrawl_verified.py
"""
import json, os, re, subprocess
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright

BASE="/opt/data/allrentaladmin"
PRODUCTS=f"{BASE}/public/data/products.json"
BRAND_EN={"SK매직":"sk","청호나이스":"chungho","웰스":"wells","현대큐밍":"hyundai"}
VERIFIED={"SK매직","청호나이스","웰스","현대큐밍"}

def download(u,dest):
    try:
        r=subprocess.run(["curl","-ksSL","--max-time","30","-A","Mozilla/5.0","-e",u,"-o",dest,u],capture_output=True,text=True,timeout=35)
        return os.path.exists(dest) and os.path.getsize(dest)>2000
    except Exception:
        return False

with open(PRODUCTS,encoding="utf-8") as f:
    data=json.load(f)
targets=[p for p in data if p.get("brand") in VERIFIED and p.get("detail_url")]
print(f"[INFO] 본문있음 4브랜드 대상 {len(targets)}건", flush=True)

total=0
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=["--no-sandbox"])
    pg=b.new_page(viewport={"width":1280,"height":2000})
    for idx,prod in enumerate(targets):
        brand=prod["brand"]; en=BRAND_EN[brand]
        model=(prod.get("model_code") or prod.get("id")).replace("/","_")
        out_dir=f"{BASE}/public/images/details/{en}/{model}"
        os.makedirs(out_dir,exist_ok=True)
        url=prod["detail_url"]
        imgs=[]
        try:
            if brand=="SK매직":
                pg.goto(url,wait_until="domcontentloaded",timeout=30000); pg.wait_for_timeout(3000)
                imgs=pg.eval_on_selector_all(".goods_desc img, img[src*='goods_desc']",
                    "els=>els.map(e=>e.getAttribute('src')||e.getAttribute('data-src')).filter(Boolean).filter(u=>/\.(jpg|jpeg|png|webp)/i.test(u))")
            else:
                # 네트워크 캡처
                reqs=[]
                def on_resp(r):
                    if re.search(r'\.(jpg|jpeg|png|webp)', r.url, re.I): reqs.append(r.url)
                pg.on("response", on_resp)
                pg.goto(url,wait_until="domcontentloaded",timeout=30000); pg.wait_for_timeout(3500)
                for _ in range(4): pg.mouse.wheel(0,1500); pg.wait_for_timeout(500)
                pg.wait_for_timeout(1000)
                pg.remove_listener("response", on_resp)
                for u in reqs:
                    if brand=="청호나이스" and "/a/ch/prd/" in u: imgs.append(u)
                    elif brand=="웰스" and "/upload/editor/" in u: imgs.append(u)
                    elif brand=="현대큐밍" and "EB9B4EC9AB4" in u: imgs.append(u)  # '본문' 인코딩
        except Exception:
            prod["detail_description_images"]=prod.get("detail_description_images") or []; continue
        # 절대화 + 중복제거
        absd=[]
        for u in imgs:
            if u.startswith("//"): u="https:"+u
            if u.startswith("/"): u=urljoin(url,u)
            if re.search(r'\.(jpg|jpeg|png|webp)',u,re.I) and u not in absd: absd.append(u)
        local=[]
        for i,u in enumerate(absd,1):
            ext=".jpg" if u.lower().endswith((".jpg",".jpeg")) else (".png" if u.lower().endswith(".png") else ".webp")
            fname=f"{i:02d}{ext}"; dest=os.path.join(out_dir,fname)
            if os.path.exists(dest) and os.path.getsize(dest)>2000:
                local.append(f"/images/details/{en}/{model}/{fname}"); continue
            if download(u,dest):
                local.append(f"/images/details/{en}/{model}/{fname}"); total+=1
            else:
                if os.path.exists(dest): os.remove(dest)
        prod["detail_description_images"]=local
        if (idx+1)%20==0:
            print(f"[PROGRESS] {idx+1}/{len(targets)} 다운로드 {total}", flush=True)
    b.close()
with open(PRODUCTS,"w",encoding="utf-8") as f:
    json.dump(data,f,ensure_ascii=False,indent=1)
print(f"\n[RESULT] 4브랜드 다운로드 {total}장 / 매핑 {len(targets)}건", flush=True)

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
[재크롤] LG/코웨이/쿠쿠/세스코 상품 이미지 모두 노출 (현대/웰스 방식)
- 네트워크 캡처로 상품 이미지 수집 (아이콘/UI/배너 제외)
- 메인샷 + 상세본문 모두 포함
"""
import json, os, re, subprocess
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright

BASE="/opt/data/allrentaladmin"
PRODUCTS=f"{BASE}/public/data/products.json"
BRAND_EN={"LG":"lg","코웨이":"coway","쿠쿠":"cuckoo","세스코":"sesco"}
TARGETS={"LG","코웨이","쿠쿠","세스코"}

UI_SKIP=re.compile(r'(ico_|icon|flag|logo|banner|btn_|close|arrow|nav|ui_|pixel|\.gif|wish|counsel|iso_mark|dot_line|searchRental|pc_new|main_mini|card\.jpg|benefit_)',re.I)

def download(u,dest):
    try:
        r=subprocess.run(["curl","-ksSL","--max-time","30","-A","Mozilla/5.0","-e",u,"-o",dest,u],capture_output=True,text=True,timeout=35)
        return os.path.exists(dest) and os.path.getsize(dest)>2000
    except Exception: return False

def is_product(u,brand):
    if UI_SKIP.search(u): return False
    if brand=="LG": return "lge.co.kr" in u and re.search(r'\.(jpg|jpeg|png|webp)',u,re.I)
    if brand=="코웨이": return "cowaystatic" in u and ("attimg" in u or "product" in u)
    if brand=="쿠쿠": return ("esmplus.com/cuckoohs/spec" in u) or ("_bo_rental/product" in u)
    if brand=="세스코": return "upload/item/" in u and re.search(r'L\.jpg|\.jpg|\.png',u,re.I)
    return False

with open(PRODUCTS,encoding="utf-8") as f:
    data=json.load(f)
targets=[p for p in data if p.get("brand") in TARGETS and p.get("detail_url")]
print(f"[INFO] 대상 {len(targets)}건", flush=True)

total=0
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=["--no-sandbox"])
    pg=b.new_page(viewport={"width":1280,"height":2000})
    for idx,prod in enumerate(targets):
        brand=prod["brand"]; en=BRAND_EN[brand]
        model=(prod.get("model_code") or prod.get("id")).replace("/","_")
        out_dir=f"{BASE}/public/images/details/{en}/{model}"
        os.makedirs(out_dir,exist_ok=True)
        reqs=[]
        def on_resp(r):
            if re.search(r'\.(jpg|jpeg|png|webp)', r.url, re.I): reqs.append(r.url)
        pg.on("response", on_resp)
        try:
            pg.goto(prod["detail_url"],wait_until="domcontentloaded",timeout=30000); pg.wait_for_timeout(3500)
            for _ in range(5): pg.mouse.wheel(0,1500); pg.wait_for_timeout(500)
            pg.wait_for_timeout(1000)
        except Exception:
            prod["detail_description_images"]=prod.get("detail_description_images") or []; pg.remove_listener("response",on_resp); continue
        pg.remove_listener("response", on_resp)
        imgs=[u for u in reqs if is_product(u,brand)]
        absd=[]
        for u in imgs:
            if u.startswith("//"): u="https:"+u
            if u.startswith("/"): u=urljoin(prod["detail_url"],u)
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
        if (idx+1)%25==0: print(f"[PROGRESS] {idx+1}/{len(targets)} 다운로드 {total}", flush=True)
    b.close()
with open(PRODUCTS,"w",encoding="utf-8") as f:
    json.dump(data,f,ensure_ascii=False,indent=1)
print(f"\n[RESULT] 4브랜드 다운로드 {total}장 / 매핑 {len(targets)}건", flush=True)

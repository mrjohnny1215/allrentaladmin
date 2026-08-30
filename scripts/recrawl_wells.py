#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""웰스만: /upload/editor/ 본문 이미지 재크롤 (이어받기)"""
import json, os, re, subprocess
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright

BASE="/opt/data/allrentaladmin"
PRODUCTS=f"{BASE}/public/data/products.json"
with open(PRODUCTS,encoding="utf-8") as f:
    data=json.load(f)
wells=[p for p in data if p["brand"]=="웰스" and p.get("detail_url")]
print(f"[INFO] 웰스 {len(wells)}건", flush=True)

def download(u,dest):
    try:
        r=subprocess.run(["curl","-ksSL","--max-time","30","-A","Mozilla/5.0","-e",u,"-o",dest,u],capture_output=True,text=True,timeout=35)
        return os.path.exists(dest) and os.path.getsize(dest)>2000
    except Exception: return False

total=0
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=["--no-sandbox"])
    pg=b.new_page(viewport={"width":1280,"height":2000})
    for idx,prod in enumerate(wells):
        model=(prod.get("model_code") or prod.get("id")).replace("/","_")
        out_dir=f"{BASE}/public/images/details/wells/{model}"
        os.makedirs(out_dir,exist_ok=True)
        reqs=[]
        def on_resp(r):
            if re.search(r'\.(jpg|jpeg|png|webp)', r.url, re.I): reqs.append(r.url)
        pg.on("response", on_resp)
        try:
            pg.goto(prod["detail_url"],wait_until="domcontentloaded",timeout=30000); pg.wait_for_timeout(3500)
            for _ in range(3): pg.mouse.wheel(0,1500); pg.wait_for_timeout(400)
            pg.wait_for_timeout(800)
        except Exception:
            prod["detail_description_images"]=prod.get("detail_description_images") or []; pg.remove_listener("response",on_resp); continue
        pg.remove_listener("response", on_resp)
        imgs=[u for u in reqs if "/upload/editor/" in u]
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
                local.append(f"/images/details/wells/{model}/{fname}"); continue
            if download(u,dest):
                local.append(f"/images/details/wells/{model}/{fname}"); total+=1
            else:
                if os.path.exists(dest): os.remove(dest)
        prod["detail_description_images"]=local
        if (idx+1)%20==0: print(f"[PROGRESS] {idx+1}/{len(wells)} 다운로드 {total}", flush=True)
    b.close()
with open(PRODUCTS,"w",encoding="utf-8") as f:
    json.dump(data,f,ensure_ascii=False,indent=1)
print(f"\n[RESULT] 웰스 다운로드 {total}장 / 매핑 {len(wells)}건", flush=True)

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SK매직만 goods_desc 본문 이미지 정확 재크롤 (sk 디렉토리)"""
import json, os, re, subprocess
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright

BASE="/opt/data/allrentaladmin"
PRODUCTS=f"{BASE}/public/data/products.json"
with open(PRODUCTS,encoding="utf-8") as f:
    data=json.load(f)
sk=[p for p in data if p["brand"]=="SK매직" and p.get("detail_url")]
print(f"[INFO] SK매직 대상 {len(sk)}건", flush=True)

total=0
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=["--no-sandbox"])
    pg=b.new_page()
    for idx,prod in enumerate(sk):
        model=(prod.get("model_code") or prod.get("id")).replace("/","_")
        out_dir=f"{BASE}/public/images/details/sk/{model}"
        os.makedirs(out_dir,exist_ok=True)
        try:
            pg.goto(prod["detail_url"],wait_until="domcontentloaded",timeout=30000)
            pg.wait_for_timeout(3000)
        except Exception:
            prod["detail_description_images"]=[]; continue
        # goods_desc 만
        imgs=pg.eval_on_selector_all(".goods_desc img, img[src*='goods_desc']",
            "els=>els.map(e=>e.getAttribute('src')||e.getAttribute('data-src')).filter(Boolean).filter(u=>/\.(jpg|jpeg|png|webp)/i.test(u))")
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
                local.append(f"/images/details/sk/{model}/{fname}"); continue
            try:
                r=subprocess.run(["curl","-ksSL","--max-time","30","-A","Mozilla/5.0","-e",u,"-o",dest,u],capture_output=True,text=True,timeout=35)
                if os.path.exists(dest) and os.path.getsize(dest)>2000:
                    local.append(f"/images/details/sk/{model}/{fname}"); total+=1
                else:
                    if os.path.exists(dest): os.remove(dest)
            except Exception: pass
        prod["detail_description_images"]=local
        if (idx+1)%10==0:
            print(f"[PROGRESS] {idx+1}/{len(sk)} 다운로드 {total}", flush=True)
    b.close()
with open(PRODUCTS,"w",encoding="utf-8") as f:
    json.dump(data,f,ensure_ascii=False,indent=1)
print(f"\n[RESULT] SK매직 다운로드 {total}장 / 매핑 {len(sk)}건", flush=True)

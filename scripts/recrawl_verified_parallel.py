#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
[병렬 재크롤] 본문있는 4브랜드: SK매직/청호/웰스/현대
- playwright 컨텍스트 4개 병렬
- 이미 받은 파일은 스킵 (이어받기)
"""
import json, os, re, subprocess
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright
from concurrent.futures import ThreadPoolExecutor

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

def fetch_one(browser, prod):
    brand=prod["brand"]; en=BRAND_EN[brand]
    model=(prod.get("model_code") or prod.get("id")).replace("/","_")
    out_dir=f"{BASE}/public/images/details/{en}/{model}"
    os.makedirs(out_dir,exist_ok=True)
    url=prod["detail_url"]; imgs=[]
    ctx=browser.new_context(viewport={"width":1280,"height":2000})
    pg=ctx.new_page()
    try:
        if brand=="SK매직":
            pg.goto(url,wait_until="domcontentloaded",timeout=30000); pg.wait_for_timeout(2500)
            imgs=pg.eval_on_selector_all(".goods_desc img, img[src*='goods_desc']",
                "els=>els.map(e=>e.getAttribute('src')||e.getAttribute('data-src')).filter(Boolean).filter(u=>/\.(jpg|jpeg|png|webp)/i.test(u))")
        else:
            reqs=[]
            def on_resp(r):
                if re.search(r'\.(jpg|jpeg|png|webp)', r.url, re.I): reqs.append(r.url)
            pg.on("response", on_resp)
            pg.goto(url,wait_until="domcontentloaded",timeout=30000); pg.wait_for_timeout(3000)
            for _ in range(3): pg.mouse.wheel(0,1500); pg.wait_for_timeout(400)
            pg.wait_for_timeout(800)
            pg.remove_listener("response", on_resp)
            for u in reqs:
                if brand=="청호나이스" and "/a/ch/prd/" in u: imgs.append(u)
                elif brand=="웰스" and "/upload/editor/" in u: imgs.append(u)
                elif brand=="현대큐밍" and "EB9B4EC9AB4" in u: imgs.append(u)
    except Exception:
        ctx.close(); return prod.get("id"), []
    ctx.close()
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
            local.append(f"/images/details/{en}/{model}/{fname}")
        else:
            if os.path.exists(dest): os.remove(dest)
    return prod.get("id"), local

def main():
    with open(PRODUCTS,encoding="utf-8") as f:
        data=json.load(f)
    targets=[p for p in data if p.get("brand") in VERIFIED and p.get("detail_url")]
    print(f"[INFO] 대상 {len(targets)}건 (병렬 4)", flush=True)
    mapping={}
    with sync_playwright() as p:
        b=p.chromium.launch(headless=True,args=["--no-sandbox"])
        with ThreadPoolExecutor(max_workers=4) as ex:
            futs=[ex.submit(fetch_one,b,prod) for prod in targets]
            done=0
            for ft in futs:
                pid,local=ft.result()
                mapping[pid]=local; done+=1
                if done%30==0: print(f"[PROGRESS] {done}/{len(targets)}", flush=True)
        b.close()
    for prod in data:
        if prod.get("id") in mapping:
            prod["detail_description_images"]=mapping[prod["id"]]
    with open(PRODUCTS,"w",encoding="utf-8") as f:
        json.dump(data,f,ensure_ascii=False,indent=1)
    tot=sum(len(v) for v in mapping.values())
    print(f"\n[RESULT] 매핑 {len(mapping)}건 / 이미지 {tot}장", flush=True)

if __name__=="__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
[재작업] 브랜드별 상세본문 컨테이너 셀렉터 기반 정확 추출 + 로컬 저장 + products.json 매핑
- playwright 렌더링 후 정확한 상세본문 영역만 추출 (잡이미지 배제)
- usage: python crawl_detail_correct.py <카테고리>
"""
import json, os, re, sys, time
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright

BASE = "/opt/data/allrentaladmin"
PRODUCTS = f"{BASE}/public/data/products.json"
BRAND_EN = {"코웨이":"coway","청호나이스":"chungho","SK매직":"sk","쿠쿠":"cuckoo","웰스":"wells","세스코":"sesco","현대큐밍":"hyundai","LG":"lg"}
TARGET_BRANDS = set(BRAND_EN.keys())

# 브랜드별 상세본문 컨테이너 셀렉터 (probe 결과)
CONTAINER = {
    "청호나이스": ".hb_img_box img",
    "세스코": ".product_info img",
    "현대큐밍": ".xans-product-detail img",
    "SK매직": ".goods_desc img, .detail_cont img, #detail img",
    "코웨이": "img[src*='attimg_org']",
    "쿠쿠": ".prd_detail img, .product_detail img, .xans-product-detail img",
    "웰스": ".detail_info img, .product_detail img, .goods_detail img",
}

def fetch_detail_imgs(page, url, brand):
    sel = CONTAINER.get(brand, ".detail img, .product_detail img, .goods_detail img")
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3500)  # JS 렌더 대기
    except Exception as e:
        return []
    imgs = []
    for s in sel.split(","):
        s=s.strip()
        if not s: continue
        try:
            got = page.eval_on_selector_all(s, "els=>els.map(e=>e.getAttribute('src')||e.getAttribute('data-src')||e.getAttribute('data-original')).filter(Boolean).filter(u=>/\.(jpg|jpeg|png|webp)/i.test(u))")
            imgs += got
        except Exception:
            pass
    # 절대화
    out=[]
    for u in imgs:
        if u.startswith("//"): u="https:"+u
        if u.startswith("/"): u=urljoin(url,u)
        if re.search(r'\.(jpg|jpeg|png|webp)', u, re.I) and u not in out:
            out.append(u)
    return out

def main():
    cat = sys.argv[1] if len(sys.argv)>1 else "정수기"
    with open(PRODUCTS, encoding="utf-8") as f:
        data=json.load(f)
    targets=[p for p in data if p.get("category")==cat and p.get("brand") in TARGET_BRANDS and p.get("detail_url")]
    print(f"[INFO] {cat} 대상 {len(targets)}건", flush=True)
    total=0; errors=[]
    with sync_playwright() as p:
        b=p.chromium.launch(headless=True,args=["--no-sandbox"])
        pg=b.new_page()
        for idx,p in enumerate(targets):
            brand=p["brand"]; brand_en=BRAND_EN.get(brand,brand)
            model=(p.get("model_code") or p.get("id") or "unknown").replace("/","_")
            out_dir=f"{BASE}/public/images/details/{brand_en}/{model}"
            os.makedirs(out_dir,exist_ok=True)
            urls=fetch_detail_imgs(pg,p["detail_url"],brand)
            if not urls:
                errors.append({"id":p.get("id"),"brand":brand,"reason":"no_imgs"})
                continue
            local=[]
            for i,u in enumerate(urls,1):
                ext=".jpg" if u.lower().endswith((".jpg",".jpeg")) else (".png" if u.lower().endswith(".png") else ".webp")
                fname=f"{i:02d}{ext}"; dest=os.path.join(out_dir,fname)
                if os.path.exists(dest) and os.path.getsize(dest)>2000:
                    local.append(f"/images/details/{brand_en}/{model}/{fname}"); continue
                try:
                    import subprocess
                    r=subprocess.run(["curl","-ksSL","--max-time","30","-A","Mozilla/5.0","-e",u,"-o",dest,u],capture_output=True,text=True,timeout=35)
                    if os.path.exists(dest) and os.path.getsize(dest)>2000:
                        local.append(f"/images/details/{brand_en}/{model}/{fname}"); total+=1
                    else:
                        if os.path.exists(dest): os.remove(dest)
                except Exception: pass
            p["detail_description_images"]=local
            if (idx+1)%15==0:
                print(f"[PROGRESS] {idx+1}/{len(targets)} 다운로드 {total}", flush=True)
        b.close()
    with open(PRODUCTS,"w",encoding="utf-8") as f:
        json.dump(data,f,ensure_ascii=False,indent=1)
    print(f"\n[RESULT] {cat} 다운로드 {total}장 / 매핑 {len(targets)}건 / 실패 {len(errors)}건", flush=True)
    with open(f"{BASE}/correct_errors_{cat}.json","w",encoding="utf-8") as f:
        json.dump(errors,f,ensure_ascii=False,indent=1)

if __name__=="__main__":
    main()

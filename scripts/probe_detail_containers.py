#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""각 브랜드 상세페이지에서 상세본문 이미지 컨테이너 셀렉터 탐색 (playwright 렌더링)"""
import json
from playwright.sync_api import sync_playwright

BASE="/opt/data/allrentaladmin"
with open(f"{BASE}/public/data/products.json",encoding="utf-8") as f:
    data=json.load(f)

# 브랜드별 샘플 1건 (로컬경로 아직 안 바뀐 원본 URL이 있다면 그걸, 없으면 detail_url)
samples={
    "쿠쿠": next((p for p in data if p["brand"]=="쿠쿠" and p.get("detail_url")), None),
    "웰스": next((p for p in data if p["brand"]=="웰스" and p.get("detail_url")), None),
    "세스코": next((p for p in data if p["brand"]=="세스코" and p.get("detail_url")), None),
    "현대큐밍": next((p for p in data if p["brand"]=="현대큐밍" and p.get("detail_url")), None),
    "청호나이스": next((p for p in data if p["brand"]=="청호나이스" and "chungho-direct" in (p.get("detail_url") or "")), None),
}

# 상세본문 후보 셀렉터 사전
CANDIDATES = [
    ".hb_img_box img", ".product_detail img", ".goods_detail img", ".prd_detail img",
    ".detail_cont img", ".view_detail img", ".detail_area img", "#vip_detail_pdp_wrap img",
    ".product-detail img", ".detail_info img", ".prd_info img", ".product_info img",
    ".editor img", ".goods_desc img", ".detail_description img", ".product-desc img",
    ".xans-product-detail img", ".detail img", ".product-view img",
]

with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=["--no-sandbox"])
    pg=b.new_page()
    for brand, prod in samples.items():
        if not prod: 
            print(f"[{brand}] 샘플없음"); continue
        url=prod["detail_url"]
        print(f"\n========== [{brand}] {url} ==========")
        try:
            pg.goto(url, wait_until="networkidle", timeout=30000)
            pg.wait_for_timeout(2000)
        except Exception as e:
            print("  로드실패:", e); continue
        for sel in CANDIDATES:
            try:
                imgs=pg.eval_on_selector_all(sel, "els=>els.map(e=>e.getAttribute('src')||e.getAttribute('data-src')).filter(Boolean).filter(u=>/\.(jpg|jpeg|png|webp)/i.test(u))")
                if imgs:
                    print(f"  셀렉터 '{sel}' -> {len(imgs)}건")
                    for u in imgs[:3]: print("     ", u[:90])
            except Exception:
                pass
    b.close()

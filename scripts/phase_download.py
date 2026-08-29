#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
카테고리별 상세본문 이미지 일괄 다운로드 + products.json 로컬경로 매핑
사용: python phase_download.py <카테고리> [브랜드제한없음]
- 정수기/공기청정기/비데/매트리스/안마의자
"""
import json, os, re, sys, subprocess, time
from collections import Counter

BASE = "/opt/data/allrentaladmin"
PRODUCTS = f"{BASE}/public/data/products.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

BRAND_EN = {
    "코웨이": "coway", "청호나이스": "chungho", "SK매직": "sk", "쿠쿠": "cuckoo",
    "웰스": "wells", "세스코": "sesco", "현대큐밍": "hyundai", "LG": "lg",
}
TARGET_BRANDS = set(BRAND_EN.keys())

def is_detail_body(u):
    s = u.lower()
    if re.search(r'_(\d+)x(\d+)\.', s):  # 썸네일 치수
        return False
    if "/editor/event/" in s or any(k in s for k in ["promo","banner","event","gift","coupon"]):
        return False
    if "/goods_desc/" in s:
        return True
    if "/image/goods/" in s and not re.search(r'_\d+x\d+\.', s):
        return True
    if any(k in s for k in ["/web/product/big/","/web/product/extra/big/","goods-basic","attimg_org","_bo_rental","_bo_cs","/upload/item/","/upload/product/"]):
        return True
    return False

def main():
    cat = sys.argv[1] if len(sys.argv) > 1 else "정수기"
    with open(PRODUCTS, encoding="utf-8") as f:
        data = json.load(f)

    targets = [p for p in data
               if p.get("category") == cat and p.get("brand") in TARGET_BRANDS
               and p.get("detail_description_images")
               and any(str(u).startswith("http") for u in p["detail_description_images"])]
    print(f"[INFO] {cat} 다운로드 대상: {len(targets)}건", flush=True)

    total_dl = 0
    skipped = 0
    errors = []
    for idx, p in enumerate(targets):
        brand_en = BRAND_EN.get(p["brand"], p["brand"])
        model = (p.get("model_code") or p.get("id") or "unknown").replace("/", "_")
        out_dir = f"{BASE}/public/images/details/{brand_en}/{model}"
        os.makedirs(out_dir, exist_ok=True)
        detail_urls = [u for u in p["detail_description_images"] if is_detail_body(u)]
        if not detail_urls:
            skipped += 1
            errors.append({"id": p.get("id"), "reason": "no_detail_body_after_filter", "orig_count": len(p["detail_description_images"])})
            continue
        local = []
        for i, u in enumerate(detail_urls, 1):
            ext = ".jpg" if u.lower().endswith((".jpg",".jpeg")) else (".png" if u.lower().endswith(".png") else ".webp")
            fname = f"{i:02d}{ext}"
            dest = os.path.join(out_dir, fname)
            if os.path.exists(dest) and os.path.getsize(dest) > 1000:
                local.append(f"/images/details/{brand_en}/{model}/{fname}")
                continue
            try:
                r = subprocess.run(["curl","-ksSL","--max-time","30","-A",UA,"-e",u,"-o",dest,u],
                                   capture_output=True, text=True, timeout=35)
                if os.path.exists(dest) and os.path.getsize(dest) > 1000:
                    local.append(f"/images/details/{brand_en}/{model}/{fname}")
                    total_dl += 1
                else:
                    if os.path.exists(dest): os.remove(dest)
            except Exception:
                pass
        p["detail_description_images"] = local
        if (idx+1) % 20 == 0:
            print(f"[PROGRESS] {idx+1}/{len(targets)} 총다운로드 {total_dl}", flush=True)
        time.sleep(0.15)

    # 저장
    with open(PRODUCTS, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"\n[RESULT] {cat} 다운로드 {total_dl}장 / 매핑 {len(targets)}건 / 필터제외 {skipped}건", flush=True)
    with open(f"{BASE}/phase_dl_errors_{cat}.json","w",encoding="utf-8") as f:
        json.dump(errors, f, ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()

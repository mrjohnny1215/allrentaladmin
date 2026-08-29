#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Step1: WPU-IAC506S 상세본문 고화질 이미지 다운로드 + products.json 로컬경로 매핑"""
import json, os, re, subprocess, sys

BASE = "/opt/data/allrentaladmin"
PRODUCTS = f"{BASE}/public/data/products.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

MODEL = "WPU-IAC506S"
BRAND_DIR = "skmagic"
TARGET_ID = f"skmagic-{MODEL.lower()}"

def is_detail_body(u):
    """상세본문 고화질 판별"""
    s = u.lower()
    # 썸네일 치수 접미사 제외
    if re.search(r'_(\d+)x(\d+)\.', s):  # 480x480, 244x244 등
        return False
    # 이벤트/프로모션 배너 제외
    if "/editor/event/" in s or any(k in s for k in ["promo","banner","event","gift","coupon"]):
        return False
    # 진짜 본문: goods_desc 경로 또는 원본 상품 이미지
    if "/goods_desc/" in s:
        return True
    if "/image/goods/" in s and not re.search(r'_\d+x\d+\.', s):
        return True
    return False

def main():
    with open(PRODUCTS, encoding="utf-8") as f:
        data = json.load(f)
    hit = next((d for d in data if d.get("id") == TARGET_ID), None)
    if not hit:
        print(f"[ERR] {TARGET_ID} 없음"); sys.exit(1)
    urls = hit.get("detail_description_images") or []
    print(f"[INFO] {TARGET_ID} 원본 URL {len(urls)}건")
    detail_urls = [u for u in urls if is_detail_body(u)]
    print(f"[INFO] 상세본문 판별 {len(detail_urls)}건:")
    for u in detail_urls: print("   ", u)

    out_dir = f"{BASE}/public/images/details/{BRAND_DIR}/{MODEL}"
    os.makedirs(out_dir, exist_ok=True)

    local_paths = []
    for i, u in enumerate(detail_urls, 1):
        ext = ".jpg" if u.lower().endswith((".jpg",".jpeg")) else (".png" if u.lower().endswith(".png") else ".webp")
        fname = f"{i:02d}{ext}"
        dest = os.path.join(out_dir, fname)
        try:
            r = subprocess.run(["curl","-ksSL","--max-time","30","-A",UA,"-e",u,"-o",dest, u],
                               capture_output=True, text=True, timeout=35)
            if os.path.exists(dest) and os.path.getsize(dest) > 1000:
                local_paths.append(f"/images/details/{BRAND_DIR}/{MODEL}/{fname}")
                print(f"   ✅ {i:02d} {fname} ({os.path.getsize(dest)}B)")
            else:
                print(f"   ❌ {i:02d} 다운로드 실패/빈파일: {u}")
                if os.path.exists(dest): os.remove(dest)
        except Exception as e:
            print(f"   ❌ {i:02d} 예외: {e}")

    # products.json 매핑 (이 상품만)
    hit["detail_description_images"] = local_paths
    with open(PRODUCTS, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"\n[RESULT] 다운로드 {len(local_paths)}건 / products.json 매핑 완료")
    print(f"[LOCAL] {out_dir}")

if __name__ == "__main__":
    main()

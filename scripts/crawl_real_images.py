#!/usr/bin/env python3
"""
ALL&UP 클론 - 실제 제조사 상품 이미지 크롤러
- counselSalesRankMap (counsel.html 내장) 또는 counsel_ws.json에서 각 모델의 detail_url 추출
- 제조사 사이트(코웨이/청호/SK/쿠쿠/웰스/LG/현대/세스코) 상세페이지에서 실제 상품 이미지 URL 크롤링
- public/assets/goods_image/<모델>.jpg 로 저장 (기존 플레이스홀더 덮어씀)
"""
import json, os, re, sys, time, urllib.request, urllib.error
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOODS_DIR = os.path.join(ROOT, "public", "assets", "goods_image")
os.makedirs(GOODS_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
}

class ImgExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.imgs = []
    def handle_starttag(self, tag, attrs):
        if tag == "img":
            d = dict(attrs)
            src = d.get("src") or d.get("data-src") or d.get("data-original") or d.get("data-lazy")
            if src:
                self.imgs.append(src)

def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="replace"), resp.geturl()
    except urllib.error.HTTPError as e:
        if e.code in (301, 302, 303, 307, 308) and e.headers.get("Location"):
            return fetch(e.headers["Location"], timeout)
        return None, url
    except Exception as e:
        return None, url

def abs_url(src, base):
    if src.startswith("//"):
        return "https:" + src
    if src.startswith("http"):
        return src
    if src.startswith("/"):
        from urllib.parse import urlparse
        p = urlparse(base)
        return f"{p.scheme}://{p.netloc}{src}"
    return base.rsplit("/", 1)[0] + "/" + src

def pick_product_image(imgs, base):
    """제조사별 실제 상품 이미지 필터"""
    candidates = []
    for src in imgs:
        s = src.lower()
        # 제외: 로고, 아이콘, 버튼, 배너, ui, common, resources, ico
        if any(k in s for k in ["logo", "icon", "btn", "banner", "ico_", "/ui/", "common", "resources/web", "kakao", "naver", "close", "arrow", "bg_", "temp/"]):
            continue
        if any(s.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"]):
            candidates.append(src)
    # 우선순위: product/img/upload 경로
    for c in candidates:
        if any(k in c.lower() for k in ["product", "upload", "attimg", "goods", "item"]):
            return c
    return candidates[0] if candidates else None

def crawl_model(model_name, detail_url):
    if not detail_url:
        return False, "no detail_url"
    html, final_url = fetch(detail_url)
    if not html:
        return False, "fetch failed"
    parser = ImgExtractor()
    parser.feed(html)
    img = pick_product_image(parser.imgs, final_url)
    if not img:
        return False, "no image found"
    img_url = abs_url(img, final_url)
    # 다운로드
    try:
        req = urllib.request.Request(img_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        if len(data) < 2000:  # 너무 작으면 플레이스홀더/실패
            return False, f"too small ({len(data)} bytes)"
        out = os.path.join(GOODS_DIR, f"{model_name}.jpg")
        with open(out, "wb") as f:
            f.write(data)
        return True, f"{len(data)} bytes"
    except Exception as e:
        return False, f"download err: {e}"

def safe_name(model):
    """파일명 안전화: / ( ) 공백 한글 등 → _ """
    import re
    s = re.sub(r'[/\\()\s]', '_', model)
    s = re.sub(r'_+', '_', s).strip('_')
    return s

def load_model_map():
    """counsel_ws.json 에서 모델명 + 상세페이지 추출 (전체 4190개)"""
    import json, os
    path = os.path.join(ROOT, "public", "data", "counsel_ws.json")
    if not os.path.exists(path):
        return {}
    d = json.load(open(path, encoding="utf-8"))
    h = d[0]
    try:
        m_idx = h.index("모델명")
        u_idx = h.index("상세\n페이지")
    except ValueError:
        return {}
    result = {}
    for row in d[1:]:
        if len(row) <= max(m_idx, u_idx):
            continue
        mn = (row[m_idx] or "").strip()
        du = (row[u_idx] or "").strip()
        if mn and du and du.startswith("http"):
            result[mn] = du
    return result

def main():
    model_map = load_model_map()
    print(f"모델맵 로드: {len(model_map)}개")
    if not model_map:
        print("모델맵 추출 실패")
        sys.exit(1)

    # 이미 실제 이미지가 있으면 스킵 (크기 기준: 30KB 이상이면 실제라고 가정, 플레이스홀더는 32KB)
    # 플레이스홀더는 32545바이트 고정 → 이건 덮어씀
    success = 0; fail = 0; skip = 0
    total = len(model_map)
    for idx, (model, url) in enumerate(model_map.items(), 1):
        out = os.path.join(GOODS_DIR, f"{safe_name(model)}.jpg")
        if os.path.exists(out) and os.path.getsize(out) != 32545:
            skip += 1
            continue
        ok, msg = crawl_model(model, url)
        if ok:
            success += 1
        else:
            fail += 1
            if fail <= 20:
                print(f"  FAIL {model}: {msg}")
        if idx % 25 == 0:
            print(f"진행 {idx}/{total} 성공={success} 실패={fail} 스킵={skip}")
        time.sleep(0.3)  # 제조사 서버 부하 방지
    print(f"\n완료: 총={total} 성공={success} 실패={fail} 스킵={skip}")

if __name__ == "__main__":
    main()

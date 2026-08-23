#!/usr/bin/env python3
"""
ALL&UP 클론 - 실제 제조사 상품 이미지 크롤러 (v2: 제조사별 정확 추출 + 차원 검증)
- counsel_ws.json 에서 모델명 + 상세페이지(detail_url) 추출
- 제조사별 이미지 URL 패턴 우선순위 적용
- 다운로드 후 실제 JPEG/PNG + 10KB 이상 + 차원 100px 이상 검증
- public/assets/goods_image/<safe_model>.jpg 로 저장
"""
import json, os, re, sys, time, urllib.request, urllib.error, struct
from html.parser import HTMLParser
from urllib.parse import urlparse

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
            for k in ["src", "data-src", "data-original", "data-lazy", "data-img"]:
                src = d.get(k)
                if src:
                    self.imgs.append(src)
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

def fetch(url, timeout=20, redirects=5):
    if redirects <= 0:
        return None, url
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="replace"), resp.geturl()
    except urllib.error.HTTPError as e:
        if e.code in (301, 302, 303, 307, 308) and e.headers.get("Location"):
            loc = e.headers["Location"]
            if loc.startswith("/"):
                p = urlparse(url); loc = f"{p.scheme}://{p.netloc}{loc}"
            return fetch(loc, timeout, redirects-1)
        return None, url
    except Exception:
        return None, url

def abs_url(src, base):
    if src.startswith("//"):
        return "https:" + src
    if src.startswith("http"):
        return src
    if src.startswith("/"):
        p = urlparse(base)
        return f"{p.scheme}://{p.netloc}{src}"
    return base.rsplit("/", 1)[0] + "/" + src

def brand_of(url):
    u = url.lower()
    if "coway" in u: return "coway"
    if "chungho" in u: return "chungho"
    if "skmagic" in u or "sk.com" in u: return "sk"
    if "cuckoo" in u: return "cuckoo"
    if "kyowonwells" in u or "wells" in u: return "wells"
    if "lg" in u or "lge" in u: return "lg"
    if "hdquming" in u or "hyundai" in u: return "hyundai"
    if "cesco" in u: return "cesco"
    return "etc"

# 제조사별 이미지 URL 우선순위 (정규식, 순서대로 매칭)
BRAND_PATTERNS = {
    "coway":    [r"upload/product/product/[^\"'\s]+\.jpg", r"attimg_org\.(?:jpg|png)", r"product/[^”'\s]+\.(?:jpg|png)"],
    "chungho":  [r"/web/product/big/[^\"'\s]+\.(?:jpg|png)", r"/web/product/[^\"'\s]+_org\.(?:jpg|png)"],
    "sk":       [r"/goods/[^\"'\s]+\.(?:jpg|png)", r"goodsView[^\"'\s]*\.(?:jpg|png)"],
    "cuckoo":   [r"/productView[^\"'\s]*\.(?:jpg|png)", r"/upload/[^\"'\s]+\.(?:jpg|png)"],
    "wells":    [r"/Product/[^\"'\s]+\.(?:jpg|png)", r"/upload/[^\"'\s]+\.(?:jpg|png)"],
    "lg":       [r"/care-solutions/[^\"'\s]+\.(?:jpg|png)"],
    "hyundai":  [r"/rental[^\"'\s]*\.(?:jpg|png)"],
    "cesco":    [r"/products/[^\"'\s]+\.(?:jpg|png)"],
}

def pick_image(imgs, brand):
    # 절대 URL만, 제조사 호스트거나 upload/product 경로
    urls = []
    for src in imgs:
        s = src.lower()
        if not any(s.endswith(e) for e in [".jpg", ".jpeg", ".png", ".webp"]):
            continue
        if any(k in s for k in ["logo", "icon", "btn", "banner", "kakao", "naver", "login", "arrow", "bg_", "/ui/", "common", "resources/web", "talk_", "r-banner"]):
            continue
        urls.append(src)
    # 브랜드별 패턴 우선
    pats = BRAND_PATTERNS.get(brand, [])
    for pat in pats:
        for u in urls:
            if re.search(pat, u, re.I):
                return u
    # 폴백: product/upload 포함
    for u in urls:
        if any(k in u.lower() for k in ["product", "upload", "goods", "attimg", "item"]):
            return u
    return urls[0] if urls else None

def valid_image(data):
    """JPEG/PNG 시그니처 + 최소 크기 + 차원 검증"""
    if len(data) < 10000:
        return False
    # JPEG: FF D8 FF
    if data[:3] == b"\xff\xd8\xff":
        # 차원 추출 (SOF0~SOF15 중 C0~CF, 단 C4/C8/CC 제외)
        i = 2
        try:
            while i < len(data) - 9:
                if data[i] != 0xFF:
                    i += 1; continue
                marker = data[i+1]
                if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
                    h = int.from_bytes(data[i+5:i+7], "big")
                    w = int.from_bytes(data[i+7:i+9], "big")
                    return h >= 100 and w >= 100
                seglen = int.from_bytes(data[i+2:i+4], "big")
                i += 2 + seglen
                if seglen == 0: break
        except Exception:
            return len(data) > 15000
        return len(data) > 15000
    # PNG: 89 50 4E 47
    if data[:4] == b"\x89PNG":
        try:
            w = int.from_bytes(data[16:20], "big")
            h = int.from_bytes(data[20:24], "big")
            return h >= 100 and w >= 100
        except Exception:
            return len(data) > 15000
    return False

def crawl_model(model_name, detail_url):
    if not detail_url:
        return False, "no detail_url"
    html, final_url = fetch(detail_url)
    if not html:
        return False, "fetch failed"
    parser = ImgExtractor()
    parser.feed(html)
    brand = brand_of(final_url)
    img = pick_image(parser.imgs, brand)
    if not img:
        return False, "no image found"
    img_url = abs_url(img, final_url)
    try:
        req = urllib.request.Request(img_url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        if not valid_image(data):
            return False, f"invalid image ({len(data)} bytes, brand={brand})"
        out = os.path.join(GOODS_DIR, f"{safe_name(model_name)}.jpg")
        with open(out, "wb") as f:
            f.write(data)
        return True, f"{len(data)} bytes"
    except Exception as e:
        return False, f"download err: {e}"

def safe_name(model):
    s = re.sub(r'[/\\()\s]', '_', model)
    s = re.sub(r'_+', '_', s).strip('_')
    return s

def load_model_map():
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
        sys.exit(1)

    success = fail = skip = 0
    total = len(model_map)
    for idx, (model, url) in enumerate(model_map.items(), 1):
        out = os.path.join(GOODS_DIR, f"{safe_name(model)}.jpg")
        # 이미 실제 이미지(10KB+) 있으면 스킵
        if os.path.exists(out) and os.path.getsize(out) >= 10000:
            skip += 1
            continue
        ok, msg = crawl_model(model, url)
        if ok:
            success += 1
        else:
            fail += 1
            if fail <= 30:
                print(f"  FAIL {model} ({brand_of(url)}): {msg}")
        if idx % 50 == 0:
            print(f"진행 {idx}/{total} 성공={success} 실패={fail} 스킵={skip}")
        time.sleep(0.3)
    print(f"\n완료: 총={total} 성공={success} 실패={fail} 스킵={skip}")

if __name__ == "__main__":
    main()

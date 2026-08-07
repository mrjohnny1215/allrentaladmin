#!/usr/bin/env python3
"""청호(chungho-direct.com) 전용 이미지 재크롤러 - big 이미지 강제 추출"""
import json, os, re, time, urllib.request, urllib.error
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOODS_DIR = os.path.join(ROOT, "public", "assets", "goods_image")
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
           "Accept": "image/webp,image/apng,*/*;q=0.8"}

class P(HTMLParser):
    def __init__(self): super().__init__(); self.imgs=[]
    def handle_starttag(self, t, a):
        if t=="img":
            d=dict(a)
            for k in ["src","data-src","data-original"]:
                if d.get(k): self.imgs.append(d[k])
    def handle_startendtag(self, t, a): self.handle_starttag(t, a)

def fetch(u, n=5, ref=None):
    if n<=0: return None
    try:
        h = dict(HEADERS)
        if ref: h["Referer"] = ref
        req=urllib.request.Request(u, headers=h)
        with urllib.request.urlopen(req, timeout=20) as r: return r.read()
    except urllib.error.HTTPError as e:
        if e.code in (301,302,303,307,308) and e.headers.get("Location"):
            loc=e.headers["Location"]
            if loc.startswith("/"):
                from urllib.parse import urlparse; p=urlparse(u); loc=f"{p.scheme}://{p.netloc}{loc}"
            return fetch(loc, n-1, ref)
        return None
    except Exception: return None

def safe(m): return re.sub(r'[/\\()\s]','_',m).strip('_')

def main():
    d=json.load(open(os.path.join(ROOT,"public","data","counsel_ws.json"),encoding="utf-8"))
    h=d[0]; mi=h.index("모델명"); ui=h.index("상세\n페이지")
    # 청호 모델만
    targets=[(row[mi].strip(), row[ui].strip()) for row in d[1:] if len(row)>ui and "chungho" in row[ui].lower() and row[mi].strip()]
    print(f"청호 모델: {len(targets)}개")
    ok=fail=0
    for model,url in targets:
        fn=os.path.join(GOODS_DIR, f"{safe(model)}.jpg")
        if os.path.exists(fn) and os.path.getsize(fn)>=10000:
            continue
        html=fetch(url)
        if not html: fail+=1; continue
        p=P(); p.feed(html.decode("utf-8","replace"))
        # big 우선, 그다음 small, 그다음 아무 product 이미지
        big=[i for i in p.imgs if "/web/product/big/" in i and i.lower().endswith((".png",".jpg",".jpeg"))]
        small=[i for i in p.imgs if "/web/product/small/" in i and i.lower().endswith((".png",".jpg",".jpeg"))]
        cand = big or small or [i for i in p.imgs if "web/product" in i and i.lower().endswith((".png",".jpg",".jpeg"))]
        if not cand: fail+=1; continue
        src=cand[0]
        if src.startswith("//"): src="https:"+src
        elif src.startswith("/"):
            from urllib.parse import urlparse; pp=urlparse(url); src=f"{pp.scheme}://{pp.netloc}{src}"
        data=fetch(src, ref=url)
        if not data or len(data)<5000: fail+=1; continue
        # 차원 검증
        import struct
        dim=None
        if data[:2]==b'\xff\xd8':
            i=2
            while i<len(data)-9:
                if data[i]!=0xFF: i+=1; continue
                m=data[i+1]
                if 0xC0<=m<=0xCF and m not in (0xC4,0xC8,0xCC):
                    dim=(int.from_bytes(data[i+7:i+9],'big'),int.from_bytes(data[i+5:i+7],'big')); break
                seg=int.from_bytes(data[i+2:i+4],'big'); i+=2+seg
                if seg==0: break
        elif data[:4]==b'\x89PNG':
            dim=(struct.unpack('>I',data[16:20])[0],struct.unpack('>I',data[20:24])[0])
        if not dim or dim[0]<100 or dim[1]<100:
            fail+=1; continue
        with open(fn,"wb") as f: f.write(data)
        ok+=1
        time.sleep(0.2)
    print(f"청호 재크롤: 성공={ok} 실패={fail}")

if __name__=="__main__": main()

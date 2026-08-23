#!/usr/bin/env python3
"""
counsel_ws.json (4190행 flat) -> products.json (상품 단위 정형 스키마)

요구 스키마:
  id, brand, category, name, model_code, colors, specs, images,
  promotions, selling_points, pricing_matrix[{mgmt, contract, years, monthly_fee, commission}]

집계 키: (브랜드, 상품명, 모델명)  -- 같은 상품의 여러 행(규정/관리주기 차이)을 하나로 병합
"""
import json, os, re, collections

ROOT = '/opt/data/allnup-clone'
WS = os.path.join(ROOT, 'public/data/counsel_ws.json')
IMG_MAP = os.path.join(ROOT, 'public/data/images_map.json')
OUT = os.path.join(ROOT, 'public/data/products.json')

TARGET_BRANDS = {'코웨이', '청호', '쿠쿠', 'SK', '현대', '웰스', '세스코', 'LG'}
BRAND_LABEL = {'청호': '청호나이스', 'SK': 'SK매직', '현대': '현대큐밍'}

# 요구 카테고리 5종 매핑 (제품군 prefix -> 카테고리)
CAT_RULES = [
    ('정수기', ('얼음냉온', '얼음냉정', '냉온', '냉정', '정수', '제빙기', '연수기')),
    ('공기청정기', ('청정기', '의류청정기')),
    ('비데', ('비데',)),
    ('매트리스', ('매트리스', '프레임')),
    ('안마의자', ('안마의자',)),
]

PLAN_YEARS = ['3년', '4년', '5년', '6년', '7년', '8년', '9년']

# 계약유형 정규화 (규정 컬럼 원문 -> 요구 계약유형)
def norm_contract(rule):
    r = (rule or '').strip()
    if not r:
        return '신규'
    has_comp = any(k in r for k in ('보상', '타사'))
    if '후결합' in r or '결합' in r:
        return '보상/후결합' if has_comp else '신규/후결합'
    if '동시' in r or '구매' in r:
        return '보상/동시구매' if has_comp else '신규/동시구매'
    if has_comp:
        return '보상'
    return '신규'


def norm_mgmt(cycle):
    c = (cycle or '').strip()
    if not c:
        return ''
    if '자가' in c or '셀프' in c:
        return '셀프관리'
    return '방문관리'


def to_int(v):
    s = re.sub(r'[^0-9]', '', str(v or ''))
    return int(s) if s else 0


def category_of(pgroup):
    base = (pgroup or '').split('_')[0].strip()
    base = re.sub(r'\(.*?\)', '', base).strip()
    for cat, keys in CAT_RULES:
        for k in keys:
            if base.startswith(k):
                return cat
    return '기타'


def slugify(brand, model, name):
    src = (model or name or '').strip().lower()
    src = re.sub(r'[^a-z0-9가-힣]+', '-', src).strip('-')
    b = {'코웨이': 'coway', '청호': 'chungho', '쿠쿠': 'cuckoo', 'SK': 'skmagic',
         '현대': 'hyundai', '웰스': 'wells', '세스코': 'cesco', 'LG': 'lg'}.get(brand, 'etc')
    return f'{b}-{src}'[:80] or b


def parse_selling(text):
    """셀링포인트 컬럼 -> {filters:[], points:[]}"""
    t = (text or '').replace('\r', '')
    filters, points = [], []
    cur = None
    for ln in t.split('\n'):
        s = ln.strip()
        if not s:
            continue
        if s.startswith('■'):
            cur = 'filter' if '필터' in s else 'point'
            continue
        if cur == 'filter':
            filters.append(s)
        elif cur == 'point':
            points.append(s)
        else:
            points.append(s)
    return filters, points


def G(row, idx):
    """행 길이가 헤더보다 짧은 경우 방어."""
    try:
        v = row[idx]
    except IndexError:
        return ''
    return '' if v is None else str(v)


def main():
    ws = json.load(open(WS, encoding='utf-8'))
    hdr, rows = ws[0], ws[1:]
    I = {name: i for i, name in enumerate(hdr)}
    W = len(hdr)
    detail_col = I[[k for k in hdr if '상세' in k][0]]

    imgmap = {}
    if os.path.exists(IMG_MAP):
        imgmap = json.load(open(IMG_MAP, encoding='utf-8'))

    buckets = collections.OrderedDict()
    for r in rows:
        brand = G(r, I['브랜드']).strip()
        if brand not in TARGET_BRANDS:
            continue
        name = G(r, I['상품명']).strip()
        model = G(r, I['모델명']).strip()
        if not (name or model):
            continue
        key = (brand, name, model)
        b = buckets.setdefault(key, {
            'brand': BRAND_LABEL.get(brand, brand),
            'brand_raw': brand,
            'name': name,
            'model_code': model,
            'category': category_of(G(r, I['제품군'])),
            'product_group': G(r, I['제품군']).strip(),
            'colors': [], 'specs': {}, 'tags': [],
            'promotions': {'common': '', 'monthly': '', 'plan': {}, 'updated': ''},
            'selling_points': {'filters': [], 'points': []},
            'pricing_matrix': [], 'detail_url': '',
        })

        for c in re.split(r'[,/]', G(r, I['색상'])):
            c = c.strip()
            if c and c not in b['colors']:
                b['colors'].append(c)
        if G(r, I['용량']).strip():
            b['specs']['capacity'] = G(r, I['용량']).strip()
        if G(r, I['사이즈']).strip():
            b['specs']['size'] = G(r, I['사이즈']).strip()
        for t in G(r, I['태그']).split(','):
            t = t.strip()
            if t and t not in b['tags']:
                b['tags'].append(t)
        if G(r, detail_col).strip():
            b['detail_url'] = G(r, detail_col).strip()
        if G(r, I['업데이트']).strip():
            b['promotions']['updated'] = G(r, I['업데이트']).strip()
        if G(r, I['공통 프로모션']).strip():
            b['promotions']['common'] = G(r, I['공통 프로모션']).strip()
        if G(r, I['당월 주요 프로모션']).strip():
            b['promotions']['monthly'] = G(r, I['당월 주요 프로모션']).strip()
        if G(r, I['프로모션']).strip():
            b['promotions']['plan']['product'] = G(r, I['프로모션']).strip()
        for y in ('3년', '5년'):
            k = f'{y}_프로모션'
            if k in I and G(r, I[k]).strip():
                b['promotions']['plan'][y] = G(r, I[k]).strip()

        if G(r, I['셀링포인트']).strip() and not b['selling_points']['points']:
            f, p = parse_selling(G(r, I['셀링포인트']))
            b['selling_points'] = {'filters': f, 'points': p}

        contract = norm_contract(G(r, I['규정']))
        for y in PLAN_YEARS:
            ck, mk, fk, cmk = f'{y}약정', f'{y}관리주기', f'{y}렌탈료', f'{y}수수료'
            if fk not in I:
                continue
            fee = to_int(G(r, I[fk]))
            if not fee:
                continue
            b['pricing_matrix'].append({
                'years': y,
                'contract': contract,
                'rule_raw': G(r, I['규정']).strip(),
                'mgmt': norm_mgmt(G(r, I[mk])),
                'mgmt_cycle': G(r, I[mk]).strip(),
                'plan_label': G(r, I[ck]).strip(),
                'monthly_fee': fee,
                'commission': to_int(G(r, I[cmk])),
            })

    products = []
    for (brand, name, model), b in buckets.items():
        imgs = imgmap.get(name, [])
        b['images'] = [f'/assets/goods_detail/{f}' for f in sorted(
            imgs, key=lambda s: (len(s), s))]
        thumb_key = re.sub(r'[\\/]', '_', model or name)
        b['thumbnail'] = f'/assets/goods_image/{thumb_key}.jpg'
        if b['images']:
            b['thumbnail'] = b['images'][0]
        fees = [m['monthly_fee'] for m in b['pricing_matrix'] if m['monthly_fee']]
        b['min_monthly_fee'] = min(fees) if fees else 0
        b['max_commission'] = max([m['commission'] for m in b['pricing_matrix']] or [0])
        b['id'] = slugify(brand, model, name)
        products.append(b)

    # id 중복 해소
    seen = collections.Counter()
    for p in products:
        seen[p['id']] += 1
        if seen[p['id']] > 1:
            p['id'] = f"{p['id']}-{seen[p['id']]}"

    json.dump(products, open(OUT, 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))

    cats = collections.Counter(p['category'] for p in products)
    brands = collections.Counter(p['brand'] for p in products)
    print(f'[done] products={len(products)} -> {OUT}')
    print('  categories:', dict(cats))
    print('  brands    :', dict(brands))
    print('  multi-img products:', sum(1 for p in products if len(p['images']) > 1))
    print('  with pricing      :', sum(1 for p in products if p['pricing_matrix']))
    print('  size(MB): %.2f' % (os.path.getsize(OUT) / 1e6))


if __name__ == '__main__':
    main()

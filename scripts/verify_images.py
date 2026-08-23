import json, os, urllib.parse
ROOT = '/opt/data/allnup-clone'
ps = json.load(open(f'{ROOT}/public/data/products.json', encoding='utf-8'))

bad_plus = [i for p in ps for i in p['images'] if '+' in i]
missing = [i for p in ps for i in p['images'] if not os.path.exists(ROOT + '/public' + i)]
total = sum(len(p['images']) for p in ps)

print('총 이미지 참조 :', total)
print('+ 포함 (404위험):', len(bad_plus))
print('파일 없는 참조  :', len(missing), missing[:3])
print('이미지 없는 상품:', sum(1 for p in ps if not p['images']))
print('다중이미지 상품 :', sum(1 for p in ps if len(p['images']) > 1))

# URL 인코딩 왕복 검증(브라우저 encodeURI 동작 모사)
weird = []
for p in ps:
    for i in p['images']:
        fn = i.split('/')[-1]
        if urllib.parse.unquote(urllib.parse.quote(fn)) != fn:
            weird.append(fn)
print('인코딩 왕복 불일치:', len(weird), weird[:3])

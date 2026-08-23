import json, urllib.request, urllib.error

VT = 'vcp_8PVKGkdM34moa46ht9im64QS41ZnosuvNvvrJIRELiAgZYGWFV4fcJW9'
TEAM = None


def call(url):
    req = urllib.request.Request(url, headers={
        'Authorization': f'Bearer {VT}', 'User-Agent': 'hermes'})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]
    except Exception as e:
        return -1, str(e)


st, body = call('https://api.vercel.com/v9/projects?limit=100')
print('projects:', st)
if isinstance(body, dict):
    for p in body.get('projects', []):
        gh = (p.get('link') or {})
        print(f"  · {p['name']:28s} id={p['id']} team={p['accountId']}")
        print(f"      framework={p.get('framework')} git={gh.get('type')}:{gh.get('org')}/{gh.get('repo')}")
        tgt = (p.get('targets') or {}).get('production') or {}
        print(f"      prod_url={tgt.get('url')} prod_at={tgt.get('createdAt')}")
        for d in (p.get('alias') or [])[:4]:
            print('      alias', d if isinstance(d, str) else d.get('domain'))

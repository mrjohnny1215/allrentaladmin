import json, urllib.request, urllib.error

VT = 'vcp_8PVKGkdM34moa46ht9im64QS41ZnosuvNvvrJIRELiAgZYGWFV4fcJW9'


def call(url):
    req = urllib.request.Request(url, headers={
        'Authorization': f'Bearer {VT}', 'User-Agent': 'hermes'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.read().decode()[:400]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:400]
    except Exception as e:
        return -1, str(e)


for u in ['https://api.vercel.com/v2/user',
          'https://api.vercel.com/v9/projects?limit=20',
          'https://api.vercel.com/v2/teams']:
    st, body = call(u)
    print(f'--- {u}\n  {st} {body}\n')

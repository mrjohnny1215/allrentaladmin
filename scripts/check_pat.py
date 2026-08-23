import json, urllib.request

TOKEN = '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'
H = {'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json',
     'User-Agent': 'hermes'}


def call(url):
    try:
        req = urllib.request.Request(url, headers=H)
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, dict(r.headers), json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode()[:200]
    except Exception as e:
        return -1, {}, str(e)

st, hd, body = call('https://api.github.com/user')
print('GET /user ->', st, body.get('login') if isinstance(body, dict) else body)
print('  scopes:', hd.get('x-oauth-scopes'), '| accepted:', hd.get('x-accepted-oauth-scopes'))

st, hd, body = call('https://api.github.com/repos/mrjohnny1215/allrentaladmin')
if isinstance(body, dict):
    print('GET /repos ->', st, 'private=', body.get('private'),
          'perms=', body.get('permissions'), 'default=', body.get('default_branch'),
          'size(KB)=', body.get('size'))
else:
    print('GET /repos ->', st, body)

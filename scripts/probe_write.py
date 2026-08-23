import base64, json, urllib.request, urllib.error

TOKEN = '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'
H = {'Authorization': f'Bearer {TOKEN}', 'Accept': 'application/vnd.github+json',
     'User-Agent': 'hermes', 'Content-Type': 'application/json'}
REPO = 'mrjohnny1215/allrentaladmin'


def call(url, method='GET', payload=None):
    data = json.dumps(payload).encode() if payload else None
    req = urllib.request.Request(url, headers=H, data=data, method=method)
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, json.loads(r.read().decode() or '{}')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:300]
    except Exception as e:
        return -1, str(e)

# 1) contents write 권한 실측
st, body = call(f'https://api.github.com/repos/{REPO}/contents/.hermes_write_probe',
                'PUT', {'message': 'probe: contents write test',
                        'content': base64.b64encode(b'probe').decode(),
                        'branch': 'main'})
print('PUT contents ->', st, body if st >= 400 else 'OK sha=' + body['content']['sha'][:8])

if st < 400:
    sha = body['content']['sha']
    st2, b2 = call(f'https://api.github.com/repos/{REPO}/contents/.hermes_write_probe',
                   'DELETE', {'message': 'probe cleanup', 'sha': sha, 'branch': 'main'})
    print('DELETE probe ->', st2)

# 2) 브랜치/커밋 상태
st, body = call(f'https://api.github.com/repos/{REPO}/branches/main')
print('branch main ->', st, body.get('commit', {}).get('sha', '')[:8] if isinstance(body, dict) else body)

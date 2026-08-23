import os, base64, json, urllib.request, urllib.error

TOKEN = os.environ['GH_TOKEN']
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


st, body = call(f'https://api.github.com/repos/{REPO}/contents/.hermes_write_probe',
                'PUT', {'message': 'probe: write test',
                        'content': base64.b64encode(b'ok').decode(),
                        'branch': 'main'})
print('PUT contents ->', st, '(200/201=쓰기가능 403=여전히읽기전용)')
if st in (200, 201):
    sha = body['content']['sha']
    call(f'https://api.github.com/repos/{REPO}/contents/.hermes_write_probe',
         'DELETE', {'message': 'probe cleanup', 'sha': sha, 'branch': 'main'})
    print('DELETE probe -> cleaned up')

import json, urllib.request, urllib.error

VT = 'vcp_8PVKGkdM34moa46ht9im64QS41ZnosuvNvvrJIRELiAgZYGWFV4fcJW9'
TEAM = 'team_rS1FJjxwhmvJFHz3CsWuzVCQ'
PRJ = 'allrentaladmin'


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


st, body = call(f'https://api.vercel.com/v6/deployments?projectId={PRJ}&teamId={TEAM}&limit=8')
print('deployments:', st)
if isinstance(body, dict):
    import datetime
    for d in body.get('deployments', []):
        ts = datetime.datetime.fromtimestamp(d['created'] / 1000).strftime('%Y-%m-%d %H:%M:%S')
        print(f"  {ts}  state={d.get('state'):10s} target={d.get('target')}  {d.get('url')}")
        print(f"      readyState={d.get('readyState')} source={d.get('source')} id={d.get('uid')}")
else:
    print(body)

"""Read-only investigation of public docs responses from this network."""
import datetime
import json
import os
from pathlib import Path
import socket
import subprocess

os.umask(0o077)
output = Path('public-docs-probe')
output.mkdir(exist_ok=True)
host = 'docs.heycall-e.com'
print(json.dumps({'utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  'dns': sorted({entry[4][0] for entry in socket.getaddrinfo(host, 443)}),
                  'curl': subprocess.check_output(['curl', '--version'], text=True).splitlines()[0]}), flush=True)
results = []
for index, path in enumerate(['index.html', 'quickstart', 'quickstart.md', 'llms.txt',
                               'llms-full.txt', 'sitemap.xml', 'openapi/calle.openapi.yaml']):
    url = 'https://' + host + '/' + path
    prefix = output / str(index)
    print('REQUEST ' + url, flush=True)
    response = subprocess.run(['curl', '--silent', '--show-error', '--connect-timeout', '15',
                               '--max-time', '60', '--dump-header', str(prefix) + '.headers',
                               '--output', str(prefix) + '.body', '--write-out', '%{json}', url],
                              capture_output=True, text=True)
    metadata = json.loads(response.stdout) if response.stdout.strip() else {}
    result = {name: metadata.get(name) for name in ['url_effective', 'http_code', 'remote_ip',
              'remote_port', 'http_version', 'ssl_verify_result', 'time_namelookup',
              'time_connect', 'time_appconnect', 'time_starttransfer', 'time_total', 'size_download']}
    result.update(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  curl_exit=response.returncode, stderr=response.stderr.strip())
    headers = Path(str(prefix) + '.headers')
    result['headers'] = headers.read_text() if headers.exists() else ''
    results.append(result)
    (output / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps(result), flush=True)
raise SystemExit(int(any(item['http_code'] != 200 for item in results)))

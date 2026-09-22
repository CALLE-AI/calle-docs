"""Compare observed CDN edges without changing DNS or TLS verification."""
from concurrent.futures import ThreadPoolExecutor
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
output = Path('public-docs-probe')
output.mkdir(exist_ok=True)
host = 'docs.heycall-e.com'


def probe(target):
    label, address = target
    prefix = output / label
    command = ['curl', '--silent', '--show-error', '--connect-timeout', '15', '--max-time', '60',
               '--dump-header', str(prefix) + '.headers', '--output', str(prefix) + '.body',
               '--write-out', '%{json}']
    if address:
        command += ['--resolve', host + ':443:' + address]
    response = subprocess.run(command + ['https://' + host + '/index.html'], capture_output=True, text=True)
    data = json.loads(response.stdout)
    body = Path(str(prefix) + '.body')
    result = {name: data.get(name) for name in ['http_code', 'remote_ip', 'http_version',
              'ssl_verify_result', 'time_connect', 'time_appconnect', 'time_starttransfer', 'time_total']}
    result.update(label=label, curl_exit=response.returncode, stderr=response.stderr.strip(),
                  utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  sha256=hashlib.sha256(body.read_bytes()).hexdigest() if body.exists() else None,
                  headers=Path(str(prefix) + '.headers').read_text())
    print(json.dumps(result), flush=True)
    return result


with ThreadPoolExecutor(max_workers=3) as pool:
    results = list(pool.map(probe, [('default', None), ('observed-us-edge', '155.102.176.83'),
                                    ('observed-sg-edge', '163.181.82.199')]))
(output / 'edge-results.json').write_text(json.dumps(results, indent=2) + '\n')

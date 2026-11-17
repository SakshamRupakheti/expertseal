#!/usr/bin/env bash
# Run inside your initialized Ubuntu WSL distribution. No remote install script.
set -euo pipefail
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
config_dir="${HOME}/.config/expertseal-searxng"
if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y docker.io python3
fi
sudo service docker start
mkdir -p "$config_dir"
chmod 700 "$config_dir"
if [[ ! -f "$config_dir/settings.yml" ]]; then
  python3 - "$script_dir/settings.template.yml" "$config_dir/settings.yml" <<'PY'
import pathlib, secrets, sys, os
text = pathlib.Path(sys.argv[1]).read_text().replace('REPLACE_WITH_LOCAL_SECRET', secrets.token_hex(32))
with open(sys.argv[2], 'x') as output:
    output.write(text)
os.chmod(sys.argv[2], 0o600)
PY
fi
if sudo docker container inspect expertseal-searxng >/dev/null 2>&1; then
  sudo docker start expertseal-searxng
else
  sudo docker run --detach --name expertseal-searxng \
    --publish 127.0.0.1:8080:8080 \
    --volume "$config_dir:/etc/searxng" \
    docker.io/searxng/searxng:latest
fi
printf 'SearXNG started on loopback port 8080. Check JSON availability before using ExpertSeal.\n'

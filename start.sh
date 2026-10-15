#!/usr/bin/env bash
set -euo pipefail

nohup caddy run &> caddy.log &
disown $!

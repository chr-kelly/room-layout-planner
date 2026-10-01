#!/usr/bin/env python3
"""Fetch or verify pinned Three.js files. Only needed when vendor files are absent.
No npm install or application build is required. Network access is only used by
this maintainer utility, not by the application at runtime.
"""
from __future__ import annotations
import argparse
import hashlib
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
DEST = ROOT / 'vendor' / 'three'
BASE = 'https://raw.githubusercontent.com/mrdoob/three.js/r180/'
FILES = {
    'three.module.min.js': ('build/three.module.min.js', 'e2b5ee6bccd38fd6d8a2428546b83c5f2426d84b152ef82be8055556e3b40eb6'),
    'three.core.min.js': ('build/three.core.min.js', '61ba0df005b05991361d040d8ff670e1aadfd0ce7aeebd1fdb0725957a8957de'),
    'OrbitControls.js': ('examples/jsm/controls/OrbitControls.js', 'b97879c748170baadeb3fb84cea1ffdf4674e283dc06042f34e2acb95a76042c'),
    'LICENSE': ('LICENSE', 'bfe119ea4fd413f5f7ca3fcd63adb0c4a073ed39daa2fe7d3e6b769e21272601'),
}

def canonical(name: str, data: bytes) -> bytes:
    if name == 'OrbitControls.js':
        return data.replace(b"from './three.module.min.js'", b"from 'three'")
    return data

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check local files; do not use the network.')
    args = parser.parse_args()
    DEST.mkdir(parents=True, exist_ok=True)
    for name, (path, expected) in FILES.items():
        target = DEST / name
        try:
            data = target.read_bytes() if args.check else urllib.request.urlopen(BASE + path, timeout=30).read()
            if hashlib.sha256(canonical(name, data)).hexdigest() != expected:
                raise ValueError('SHA-256 mismatch; refusing unverified dependency')
            if not args.check:
                if name == 'OrbitControls.js':
                    if data.count(b"from 'three'") != 1:
                        raise ValueError('Unexpected OrbitControls import layout')
                    data = data.replace(b"from 'three'", b"from './three.module.min.js'")
                tmp = target.with_suffix(target.suffix + '.tmp')
                tmp.write_bytes(data)
                tmp.replace(target)
            elif name == 'OrbitControls.js' and b"from './three.module.min.js'" not in data:
                raise ValueError('OrbitControls must use the documented relative import')
            print('OK', name, len(data), 'bytes')
        except Exception as exc:
            print(f'ERROR {name}: {exc}', file=sys.stderr)
            return 1
    return 0

if __name__ == '__main__':
    raise SystemExit(main())

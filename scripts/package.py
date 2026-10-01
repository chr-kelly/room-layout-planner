"""Prepare app-only static assets; never publish or copy private project files."""
import argparse
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--fetch-vendor', action='store_true', help='Fetch the pinned official dependencies before packaging.')
args = parser.parse_args()
if args.fetch_vendor:
    subprocess.run([sys.executable, str(ROOT / 'scripts/vendor.py')], cwd=ROOT, check=True)
subprocess.run([sys.executable, str(ROOT / 'scripts/vendor.py'), '--check'], cwd=ROOT, check=True)
subprocess.run(['node', str(ROOT / 'scripts/build-pages.mjs')], cwd=ROOT, check=True)

files = [ROOT / name for name in ['index.html','favicon.svg','LICENSE','THIRD_PARTY_NOTICES.md']]
files += [ROOT / code / 'index.html' for code in ['zh-TW','ja','de','fr','es']]
files += [p for directory in ['src','vendor'] for p in (ROOT / directory).rglob('*') if p.is_file()]
allowed = {str(p.relative_to(ROOT)) for p in files} | {'.nojekyll'}
destination = ROOT / 'site'
if destination.exists():
    extra = {str(p.relative_to(destination)) for p in destination.rglob('*') if p.is_file()} - allowed
    if extra:
        raise SystemExit('Unexpected files in site/. No files were deleted: ' + ', '.join(sorted(extra)))
destination.mkdir(exist_ok=True)
for source in files:
    target = destination / source.relative_to(ROOT)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
(destination / '.nojekyll').touch()
print(f'PASS: {len(allowed)} app-only files in site/; 6 language entries; no docs, tests, .env or Git data.')

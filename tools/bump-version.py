#!/usr/bin/env python3
"""読み込むファイル（.js / .css）に版の印 ?v=… を付け直す。

ページだけ新しくなって、ブラウザが古い JS を使い回すと表示が欠ける。
push の前にこれを実行すると、新しいページは必ず新しいファイルを読み込む。
  python3 tools/bump-version.py
"""
import pathlib, re, time

ROOT = pathlib.Path(__file__).resolve().parent.parent
V = time.strftime('%Y%m%d%H%M')
PAT = re.compile(r'((?:src|href)="(?!https?:|//)[^"?#]+\.(?:js|css))(?:\?v=[0-9]+)?"')

for page in sorted(ROOT.glob('*.html')):
    s = page.read_text(encoding='utf-8')
    t = PAT.sub(lambda m: f'{m.group(1)}?v={V}"', s)
    if t != s:
        page.write_text(t, encoding='utf-8')
        print(f'{page.name}: v={V}')

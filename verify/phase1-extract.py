"""Phase 1 migration script: byte-exact extraction of index.html into the
Astro page + public/app.js. Re-runnable; assertions guarantee no drift.

Line map of the original index.html (1-indexed, verified):
  1        <!doctype html>
  2-6      <html lang="ja"> + head opening + 3 meta/title lines
  7        <style>            -> becomes <style is:inline>
  8-128    CSS content        (verbatim)
  129        </style>         (verbatim)
  130      </head>
  131      <body>
  132-427  body content       (verbatim, incl. trailing blank line 427)
  428      <script>           -> replaced by <script is:inline src="/app.js">
  429-7293 JS IIFE            -> public/app.js (verbatim)
  7294     </script>
  7295     </body>
  7296     </html>
"""
import os, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(f'{ROOT}/index.html', encoding='utf-8', newline='').read()
lines = src.split('\n')
assert '\r' not in src, 'unexpected CR in source'
assert len(lines) == 7297 and lines[-1] == '', f'unexpected line count {len(lines)}'

def seg(a, b):  # 1-indexed inclusive
    return '\n'.join(lines[a-1:b])

# sanity anchors
assert lines[0] == '<!doctype html>'
assert lines[6].strip() == '<style>'
assert lines[128].strip() == '</style>'
assert lines[129] == '</head>'
assert lines[130] == '<body>'
assert lines[427] == '<script>'
assert lines[428] == '(function(){'
assert lines[7292] == '})();'
assert lines[7293] == '</script>'

astro = (
    seg(1, 6) + '\n'
    + '  <style is:inline>\n'
    + seg(8, 128) + '\n'
    + seg(129, 131) + '\n'   # </style>, </head>, <body>
    + seg(132, 427) + '\n'
    + '<script is:inline src="/app.js"></script>\n'
    + '</body>\n</html>\n'
)

js = seg(429, 7293) + '\n'

os.makedirs(f'{ROOT}/src/pages', exist_ok=True)
os.makedirs(f'{ROOT}/public', exist_ok=True)
open(f'{ROOT}/src/pages/index.astro', 'w', encoding='utf-8', newline='').write(astro)
open(f'{ROOT}/public/app.js', 'w', encoding='utf-8', newline='').write(js)

# verification: extracted regions must be byte-identical to the original
orig_js = seg(429, 7293)
assert hashlib.sha256(js[:-1].encode()).hexdigest() == hashlib.sha256(orig_js.encode()).hexdigest()
astro_lines = astro.split('\n')
assert astro_lines[7:128] == lines[7:128], 'CSS region drifted'
assert astro_lines[131:427] == lines[131:427], 'body region drifted'
print('index.astro lines:', len(astro_lines))
print('app.js bytes:', len(js.encode()))
print('OK: JS sha256', hashlib.sha256(js.encode()).hexdigest()[:16])

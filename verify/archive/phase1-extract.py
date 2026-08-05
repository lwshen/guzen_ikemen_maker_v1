"""Phase 1 migration script: byte-exact extraction of index.html into the
Astro page + public/app.js. Re-runnable; assertions guarantee no drift.

Region boundaries are located by marker lines (not hardcoded numbers), so
upstream updates to index.html only need to keep the overall shape:

  <!doctype html> / <html lang="ja"> / <head>
    3 meta/title lines
    <style> ... </style>          -> <style is:inline> (verbatim CSS)
  </head> / <body>
    body content                  -> verbatim
  <script> IIFE </script>         -> public/app.js (verbatim)
  </body> / </html>
"""
import os, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(f'{ROOT}/index.html', encoding='utf-8', newline='').read()
lines = src.split('\n')
assert '\r' not in src, 'unexpected CR in source'

def locate(exact, desc):
    """0-indexed position of the unique line equal to `exact`."""
    hits = [i for i, l in enumerate(lines) if l == exact]
    assert len(hits) == 1, f'{desc}: expected exactly one {exact!r} line, found {len(hits)}'
    return hits[0]

style_open  = locate('  <style>', 'style open')
style_close = locate('  </style>', 'style close')
head_close  = locate('</head>', 'head close')
body_open   = locate('<body>', 'body open')
script_open = locate('<script>', 'script open')
script_close = locate('</script>', 'script close')

# shape sanity
assert lines[0] == '<!doctype html>'
assert lines[1] == '<html lang="ja">'
assert style_open < style_close < head_close < body_open < script_open < script_close
assert head_close == style_close + 1 and body_open == head_close + 1
assert lines[script_open + 1] == '(function(){', 'IIFE must start right after <script>'
assert lines[script_close - 1] == '})();', 'IIFE must end right before </script>'
assert lines[script_close + 1] == '</body>' and lines[script_close + 2] == '</html>'

def seg0(a, b):  # 0-indexed inclusive
    return '\n'.join(lines[a:b + 1])

astro = (
    seg0(0, style_open - 1) + '\n'
    + '  <style is:inline>\n'
    + seg0(style_open + 1, style_close - 1) + '\n'
    + seg0(style_close, body_open) + '\n'          # </style>, </head>, <body>
    + seg0(body_open + 1, script_open - 1) + '\n'  # body content incl. trailing blank
    + '<script is:inline src="/app.js"></script>\n'
    + '</body>\n</html>\n'
)

js = seg0(script_open + 1, script_close - 1) + '\n'

os.makedirs(f'{ROOT}/src/pages', exist_ok=True)
os.makedirs(f'{ROOT}/public', exist_ok=True)
open(f'{ROOT}/src/pages/index.astro', 'w', encoding='utf-8', newline='').write(astro)
open(f'{ROOT}/public/app.js', 'w', encoding='utf-8', newline='').write(js)

# verification: extracted regions must be byte-identical to the original
assert hashlib.sha256(js[:-1].encode()).hexdigest() == \
       hashlib.sha256(seg0(script_open + 1, script_close - 1).encode()).hexdigest()
astro_lines = astro.split('\n')
assert astro_lines[style_open + 1:style_close] == lines[style_open + 1:style_close], 'CSS region drifted'
assert astro_lines[body_open + 1:script_open] == lines[body_open + 1:script_open], 'body region drifted'
print(f'index.html: {len(lines)} lines; body {body_open + 2}-{script_open}, JS {script_open + 2}-{script_close}')
print('index.astro lines:', len(astro_lines))
print('app.js bytes:', len(js.encode()))
print('OK: JS sha256', hashlib.sha256(js.encode()).hexdigest()[:16])

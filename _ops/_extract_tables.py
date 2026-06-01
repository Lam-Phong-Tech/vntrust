import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from docx import Document
d = Document(r'C:\xampp\htdocs\Web-chong-hang-gia-main\TAI_LIEU_NGHIEP_VU_VNTRUST_FULL.docx')
for i, t in enumerate(d.tables):
    print(f'=== Table {i} ({len(t.rows)} rows x {len(t.columns)} cols) ===')
    for r in t.rows:
        cells = [c.text.replace(chr(10), ' / ').strip()[:120] for c in r.cells]
        print(' | '.join(cells))
    print()

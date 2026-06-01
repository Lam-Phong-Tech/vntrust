"""Dump structure of original doc to understand where to insert annotations"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from docx import Document

d = Document(r'C:\xampp\htdocs\Web-chong-hang-gia-main\TAI_LIEU_NGHIEP_VU_VNTRUST_FULL.docx')
for i, p in enumerate(d.paragraphs):
    style = p.style.name if p.style else 'Normal'
    txt = p.text.strip()
    if not txt: continue
    # Highlight headings
    marker = ''
    if style.startswith('Heading') or txt.startswith('I.') or txt.startswith('II.') or txt.startswith('III.') or \
       txt.startswith('IV.') or txt.startswith('V.') or txt.startswith('VI.') or txt.startswith('VII.') or \
       txt.startswith('VIII.') or txt.startswith('IX.') or txt.startswith('X.') or \
       txt.startswith('PHÂN HỆ') or txt.startswith('UC') or txt.startswith('1.') or txt.startswith('2.'):
        marker = ' ★'
    print(f'{i:4d} [{style[:20]:20}] {txt[:120]}{marker}')

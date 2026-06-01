#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extract text from .docx files (handle Windows console encoding)."""
import zipfile
import sys
import io
from xml.etree import ElementTree as ET

# Force UTF-8 stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

NS = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

def extract_text(docx_path):
    with zipfile.ZipFile(docx_path) as z:
        with z.open('word/document.xml') as f:
            xml = f.read().decode('utf-8')
    root = ET.fromstring(xml)
    out = []
    for p in root.iter(NS + 'p'):
        # Concatenate text in run order
        parts = []
        for r in p.iter(NS + 'r'):
            for t in r.iter(NS + 't'):
                parts.append(t.text or '')
        line = ''.join(parts).strip()
        if line:
            out.append(line)
        else:
            out.append('')  # preserve paragraph breaks
    return '\n'.join(out)

if __name__ == '__main__':
    for path in sys.argv[1:]:
        print('=' * 70)
        print('FILE:', path)
        print('=' * 70)
        try:
            text = extract_text(path)
            print(text)
        except Exception as e:
            print('ERROR:', e)
        print()

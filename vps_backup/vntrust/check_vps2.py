#!/usr/bin/env python3
path = "/var/www/vntrust/src/contexts/LanguageContext.tsx"
with open(path, encoding="utf-8") as f:
    lines = f.readlines()
line = lines[100]
# Find any unescaped double quotes inside string values
# Look at char 550-560 area
print("Chars 540-570:", repr(line[540:570]))
print("Chars 548-558:", repr(line[548:558]))
# Find all double quote positions
import re
for m in re.finditer(r'"', line):
    print(f"  quote at {m.start()}: ...{repr(line[max(0,m.start()-5):m.start()+6])}...")

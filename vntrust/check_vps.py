#!/usr/bin/env python3
path = "/var/www/vntrust/src/contexts/LanguageContext.tsx"
with open(path, encoding="utf-8") as f:
    lines = f.readlines()
line = lines[100]
idx = line.find('\u5408\u6cd5\u6d41\u901a\u4e2d')  # 合法流通中
if idx >= 0:
    print("FOUND at char", idx)
    print("Context:", repr(line[max(0,idx-3):idx+8]))
else:
    print("Clean - not found")
print("Line length:", len(line))

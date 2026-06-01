#!/usr/bin/env python3
import re

path = "/var/www/vntrust/src/contexts/LanguageContext.tsx"
with open(path, encoding="utf-8") as f:
    content = f.read()

# Fix: replace Chinese double-quoted text with single quotes
content = content.replace('激活"合法流通中"状态', "激活'合法流通中'状态")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed OK")

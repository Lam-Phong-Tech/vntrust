#!/usr/bin/env python3
import sys
sys.stdout.reconfigure(encoding='utf-8')

path = 'src/app/supply-chain/page.tsx'
with open(path, 'rb') as f:
    raw = f.read()

content = raw.decode('utf-8')

# Replace ACTIONS array (CRLF line endings)
old = 'const ACTIONS = [\r\n  "Thực thi Hợp đồng Thông minh", \r\n  "Xác nhận NFT Lô hàng mới", \r\n  "Đồng bộ Giao dịch Blockchain", \r\n  "Cập nhật Trạng thái Phân cực AI"\r\n];'
new = 'const ACTION_KEYS = ["sc_action_log1", "sc_action_log2", "sc_action_log3", "sc_action_log4"];'

if old in content:
    content = content.replace(old, new)
    print("Replaced ACTIONS -> ACTION_KEYS")
else:
    print("ACTIONS pattern not found - trying flexible match")
    import re
    content = re.sub(
        r'const ACTIONS = \[.*?\];',
        'const ACTION_KEYS = ["sc_action_log1", "sc_action_log2", "sc_action_log3", "sc_action_log4"];',
        content, flags=re.DOTALL
    )
    print("Done with regex")

with open(path, 'wb') as f:
    f.write(content.encode('utf-8'))
print("Saved. Lines:", content.count('\n'))

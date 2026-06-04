import os

target_path = r"c:\Users\Cyrix HealthCare\Desktop\other\heels-up-new\heelsup\scratch\consolidate_css.py"

with open(target_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("encoding='utf-8'", "encoding='utf-8', errors='replace'")

with open(target_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("consolidate_css.py fixed successfully!")

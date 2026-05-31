import re
import os

files_to_fix = [
    'src/routes/dashboard.js',
    'src/routes/admin.js',
    'src/routes/products.js',
    'src/routes/auth.js',
    'src/routes/auth.middleware.js'
]

for file_path in files_to_fix:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()
    
    # Table renames
    code = code.replace('FROM orders', 'FROM online_orders')
    code = code.replace('INTO orders', 'INTO online_orders')
    code = code.replace('UPDATE orders', 'UPDATE online_orders')
    
    code = code.replace('FROM users', 'FROM online_customers')
    code = code.replace('INTO users', 'INTO online_customers')
    code = code.replace('UPDATE users', 'UPDATE online_customers')
    
    # Remove tax logic
    code = re.sub(r'\$\{o\.tax_amount \? `.*?` : \'\'\}', '', code, flags=re.DOTALL)
    code = code.replace('TAX INVOICE', 'INVOICE')
    code = code.replace('GSTIN: 08XXXXX0000X1Z5', '')
    
    code = code.replace('gst_percent: Number(p.gst_percent || 0),', '')
    code = code.replace(', gst_percent', '')
    code = code.replace('tax_amount || 0', '0')
    code = code.replace('o.tax_amount || 0', '0')
    code = code.replace("'Tax', ", "")
    code = code.replace("'Tax (GST)', ", "")
    code = code.replace("Tax", "Tax (Removed)")
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(code)

print("Fixed files.")

import re

with open('src/routes/auth.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Update /register (OC-XXXX)
oc_logic = """
            const maxRow = await env.DB.prepare('SELECT MAX(id) as m FROM online_customers').first();
            const nextId = (maxRow?.m || 0) + 1;
            const customerId = `OC-${String(nextId).padStart(4, '0')}`;
            const result = await env.DB.prepare(
                "INSERT INTO online_customers (customer_id, first_name, last_name, email, phone, password_hash, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)"
            ).bind(customerId, firstName, lastName, email, phone || null, hashed, now, now).run();
"""

code = re.sub(
    r"const result = await env\.DB\.prepare\(\s*\'INSERT INTO online_customers[^\)]+\) VALUES[^\)]+\)\'\s*\)\.bind\([^\)]+\)\.run\(\);",
    oc_logic.strip(),
    code
)

# Update Google Auth (OC-XXXX)
google_oc_logic = """
                const maxRow = await env.DB.prepare('SELECT MAX(id) as m FROM online_customers').first();
                const nextId = (maxRow?.m || 0) + 1;
                const customerId = `OC-${String(nextId).padStart(4, '0')}`;
                const result = await env.DB.prepare(
                    "INSERT INTO online_customers (customer_id, first_name, last_name, email, password_hash, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)"
                ).bind(customerId, fname, lname, email, hash, now, now).run();
"""

code = re.sub(
    r"const result = await env\.DB\.prepare\(\s*\"INSERT INTO online_customers[^\)]+\) VALUES[^\)]+\)\"\s*\)\.bind\([^\)]+\)\.run\(\);",
    google_oc_logic.strip(),
    code
)

# Update admin-setup (AD-XXXX)
ad_logic = """
            const maxRow = await env.DB.prepare('SELECT MAX(id) as m FROM admins').first();
            const nextId = (maxRow?.m || 0) + 1;
            const adminId = `AD-${String(nextId).padStart(4, '0')}`;
            const result = await env.DB.prepare(
                "INSERT INTO admins (admin_id, first_name, last_name, email, password_hash, created_at, updated_at) VALUES (?, ?, '', ?, ?, ?, ?)"
            ).bind(adminId, name, email.toLowerCase().trim(), hashed, now, now).run();
"""

code = re.sub(
    r"const result = await env\.DB\.prepare\(\s*'INSERT INTO admins[^\)]+\) VALUES[^\)]+\)'\s*\)\.bind\([^\)]+\)\.run\(\);",
    ad_logic.strip(),
    code
)

with open('src/routes/auth.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated auth.js IDs")

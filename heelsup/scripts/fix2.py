import re

with open('src/routes/auth.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix admin-setup to insert into admins
code = re.sub(
    r"INSERT INTO online_customers \(first_name, last_name, email, password_hash, role, email_verified, staff_permissions, created_at, updated_at\) VALUES \(\?, '', \?, \?, 'admin', 1, '\[\]', \?, \?\)",
    "INSERT INTO admins (first_name, last_name, email, password_hash, created_at, updated_at) VALUES (?, '', ?, ?, ?, ?)",
    code
)

# Fix login flow to check all three tables
login_query = '''            let user = await env.DB.prepare("SELECT *, 'admin' as role FROM admins WHERE email = ?").bind(email).first();
            let tableName = 'admins';
            if (!user) {
                user = await env.DB.prepare("SELECT *, 'staff' as role FROM staff WHERE email = ?").bind(email).first();
                tableName = 'staff';
            }
            if (!user) {
                user = await env.DB.prepare("SELECT *, 'customer' as role FROM online_customers WHERE email = ?").bind(email).first();
                tableName = 'online_customers';
            }'''

code = re.sub(
    r'const user = await env\.DB\.prepare\(\s*\'SELECT \* FROM online_customers WHERE email = \?\'\s*\)\.bind\(email\)\.first\(\);',
    login_query,
    code
)

# Fix login last_login_at
code = re.sub(
    r"await env\.DB\.prepare\('UPDATE online_customers SET last_login_at = \? WHERE id = \?'\)\.bind\(now, user\.id\)\.run\(\);",
    "await env.DB.prepare(`UPDATE ${tableName} SET last_login_at = ? WHERE id = ?`).bind(now, user.id).run();",
    code
)

# Fix admin-verify-otp flow
admin_verify_query = '''            let user = await env.DB.prepare("SELECT *, 'admin' as role FROM admins WHERE email = ?").bind(email).first();
            let tableName = 'admins';
            if (!user) {
                user = await env.DB.prepare("SELECT *, 'staff' as role FROM staff WHERE email = ?").bind(email).first();
                tableName = 'staff';
            }
            if (!user) {
                user = await env.DB.prepare("SELECT *, 'customer' as role FROM online_customers WHERE email = ?").bind(email).first();
                tableName = 'online_customers';
            }'''

code = re.sub(
    r'const user = await env\.DB\.prepare\(\'SELECT \* FROM online_customers WHERE email = \?\'\)\.bind\(email\)\.first\(\);',
    admin_verify_query,
    code
)

# Fix /me route
me_query = '''        let dbUser = await env.DB.prepare("SELECT *, 'admin' as role FROM admins WHERE id = ?").bind(user.id).first();
        if (!dbUser || dbUser.role !== user.role) {
            dbUser = await env.DB.prepare("SELECT *, 'staff' as role FROM staff WHERE id = ?").bind(user.id).first();
        }
        if (!dbUser || dbUser.role !== user.role) {
            dbUser = await env.DB.prepare("SELECT *, 'customer' as role FROM online_customers WHERE id = ?").bind(user.id).first();
        }'''

code = re.sub(
    r'const dbUser = await env\.DB\.prepare\(\s*\'SELECT \* FROM online_customers WHERE id = \?\'\s*\)\.bind\(user\.id\)\.first\(\);',
    me_query,
    code
)

with open('src/routes/auth.js', 'w', encoding='utf-8') as f:
    f.write(code)

print('Updated auth.js for multi-table')

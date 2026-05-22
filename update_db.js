const sqls = [
  "ALTER TABLE tax_rules ADD COLUMN hsn_code TEXT;",
  "ALTER TABLE tax_rules ADD COLUMN condition_type TEXT;",
  "ALTER TABLE tax_rules ADD COLUMN condition_amount REAL;",
  "ALTER TABLE tax_rules ADD COLUMN notes TEXT;",
  "ALTER TABLE shipping_zones ADD COLUMN delivery_days TEXT;",
  "ALTER TABLE shipping_zones ADD COLUMN standard_rate REAL;",
  "ALTER TABLE shipping_zones ADD COLUMN express_rate REAL;",
  "ALTER TABLE shipping_zones ADD COLUMN sameday_rate REAL;",
  "ALTER TABLE shipping_zones ADD COLUMN free_above REAL;"
];

async function run() {
  for (const query of sqls) {
    try {
      const res = await fetch("http://localhost:8787/api/admin/dev-sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const text = await res.text();
      console.log(query, text);
    } catch (e) {
      console.error(e);
    }
  }
}
run();

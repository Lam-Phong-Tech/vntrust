import { createClient } from "@libsql/client";

async function check() {
  const client = createClient({ url: "file:./dev.db" });
  const result = await client.execute("PRAGMA table_info(SanPham);");
  console.log(result.rows);
}

check().catch(console.error);

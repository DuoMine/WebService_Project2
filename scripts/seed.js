import { pool } from "../src/config/db.js";
import bcrypt from "bcrypt";

async function main() {
  console.log("Seeding started...");

  // 예: 관리자 계정 삽입
  const hash = await bcrypt.hash("P@ssw0rd!", 10);
  await pool.execute(
    `INSERT INTO users (email, password, role, name) VALUES (?, ?, 'ADMIN', '관리자')`,
    ["admin@example.com", hash]
  );

  console.log("Done.");
  process.exit(0);
}

main();

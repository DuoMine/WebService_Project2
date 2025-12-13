import dotenv from "dotenv";
dotenv.config();

import { initDb } from "./config/db.js";
import { createApp } from "./app.js";

const PORT = process.env.PORT || 3000;

async function main() {
  await initDb();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Server start failed:", err);
  process.exit(1);
});

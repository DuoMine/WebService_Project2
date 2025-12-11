// src/config/db.js
import "dotenv/config";
import { Sequelize } from "sequelize";
import { initModels } from "../../models/initModels.js"; // ★ 경로 확정

const {
  DB_HOST = "localhost",
  DB_PORT = "3306",
  DB_USER = "root",
  DB_PASSWORD = "",
  DB_NAME = "bookstore",
} = process.env;

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: "mysql",
  logging: false,
  define: {
    freezeTableName: true,
    timestamps: false
  },
});

export const models = initModels(sequelize);

export async function initDb() {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connection established");
  } catch (err) {
    console.error("❌ DB connection failed:", err);
    process.exit(1);
  }
}

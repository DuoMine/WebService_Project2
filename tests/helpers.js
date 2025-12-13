import request from "supertest";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { initDb } from "../src/config/db.js";
import { createApp } from "../src/app.js";

let app;

beforeAll(async () => {
  await initDb();
  app = createApp();
});

export const api = () => request(app);

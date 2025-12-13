import request from "supertest";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

import { initDb } from "../src/config/db.js";
import { createApp } from "../src/app.js";

let app;

export async function setupApp() {
  if (!app) {
    await initDb();
    app = createApp();
  }
  return app;
}

export async function loginAs(email, password) {
  const app = await setupApp();

  const res = await request(app)
    .post("/auth/login")
    .send({ email, password });

  // 로그인 실패 원인 바로 보이게
  if (res.status !== 200) {
    throw new Error(
      `login failed: ${res.status} ${JSON.stringify(res.body)}`
    );
  }

  const { token_type, access_token } = res.body || {};
  if (!token_type || !access_token) {
    throw new Error(`unexpected login payload: ${JSON.stringify(res.body)}`);
  }

  return { tokenType: token_type, accessToken: access_token };
}

export function authHeader(tokenType, accessToken) {
  return `${tokenType} ${accessToken}`;
}

export function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name} (set it in .env.test)`);
  return v;
}

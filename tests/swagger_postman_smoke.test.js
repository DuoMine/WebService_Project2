// Auto-generated smoke tests from Postman collection
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app.js";

let app;
let adminToken=null, userToken=null;
let adminRefresh=null, userRefresh=null;

function authHeader(token){ return token ? { Authorization: `Bearer ${token}` } : {}; }
function assertNot5xx(res, label){ if(res.statusCode>=500){ console.error(label, res.statusCode, res.body);} assert.ok(res.statusCode<500, `${label} returned ${res.statusCode}`); }

test("bootstrap app + login", async ()=>{
  app = await createApp();
  // login USER + ADMIN if credentials provided; if not, continue with null tokens
  const USER_EMAIL = process.env.TEST_USER_EMAIL || "kindkim04@gmail.com";
  const USER_PASSWORD = process.env.TEST_USER_PASSWORD || "12341234";
  const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "kindkim02@gmail.com";
  const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "12341234";
  // USER
  try {
    const r = await request(app).post("/auth/login").send({ email: USER_EMAIL, password: USER_PASSWORD });
    assertNot5xx(r, "POST /auth/login (USER)");
    if(r.statusCode===200){ userToken=r.body.access_token; userRefresh=r.body.refresh_token; }
  } catch(e){ console.error("USER login failed", e); }
  // ADMIN
  try {
    const r = await request(app).post("/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    assertNot5xx(r, "POST /auth/login (ADMIN)");
    if(r.statusCode===200){ adminToken=r.body.access_token; adminRefresh=r.body.refresh_token; }
  } catch(e){ console.error("ADMIN login failed", e); }
});

test('Health / 헬스 체크 GET /health [GET /health]', async ()=>{
  let req = request(app).get('/health');
  req = req.set("Accept","application/json");
  const res = await req;
  assertNot5xx(res, 'GET /health');
});

test('Auth / 회원가입 POST /auth/register [POST /auth/register]', async ()=>{
  let req = request(app).post('/auth/register');
  req = req.set("Accept","application/json");
  req = req.set('Content-Type', 'application/json');
  req = req.send({"email": "kindkim02@gmail.com", "password": "12341234", "name": "김선한", "birth_year": 2002, "gender": "MALE", "region_code": "KR-11"});
  const res = await req;
  assertNot5xx(res, 'POST /auth/register');
});

test('Auth / 로그인 POST /auth/login [POST /auth/login]', async ()=>{
  let req = request(app).post('/auth/login');
  req = req.set("Accept","application/json");
  req = req.set('Content-Type', 'application/json');
  req = req.send({"email": "kindkim02@gmail.com", "password": "12341234"});
  const res = await req;
  assertNot5xx(res, 'POST /auth/login');
});

test('Auth / 토큰 재발급 POST /auth/refresh [POST /auth/refresh]', async ()=>{
  let req = request(app).post("/auth/refresh").set("Accept","application/json");
  const rt = adminRefresh || userRefresh;
  if (rt) req = req.send({ refresh_token: rt });
  const res = await req;
  assertNot5xx(res, 'POST /auth/refresh');
});

test('Auth / 로그아웃 POST /auth/logout [POST /auth/logout]', async ()=>{
  let req = request(app).post('/auth/logout');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'POST /auth/logout');
});

test('Users / 유저 생성 POST /users (Admin) [POST /users]', async ()=>{
  let req = request(app).post('/users');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"email": "user2@example.com", "password": "Password1234!", "name": "사용자2", "birth_year": 1998, "gender": "FEMALE", "region_code": "KR-26"});
  const res = await req;
  assertNot5xx(res, 'POST /users');
});

test('Users / 유저 목록 GET /users (Admin) [GET /users/?page=1&size=10&keyword=]', async ()=>{
  let req = request(app).get('/users/?page=1&size=10&keyword=');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  const res = await req;
  assertNot5xx(res, 'GET /users/?page=1&size=10&keyword=');
});

test('Users / 단일 유저 GET /users/:userId (Admin) [GET /users/1]', async ()=>{
  let req = request(app).get('/users/1');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  const res = await req;
  assertNot5xx(res, 'GET /users/1');
});

test('Users / 내 정보 GET /users/me [GET /users/me]', async ()=>{
  let req = request(app).get('/users/me');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /users/me');
});

test('Users / 유저 수정 PATCH /users/:userId (Admin) [PATCH /users/2]', async ()=>{
  let req = request(app).patch('/users/2');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"name": "수정된 사용자", "birth_year": 1999, "gender": "MALE", "region_code": "KR-27"});
  const res = await req;
  assertNot5xx(res, 'PATCH /users/2');
});

test('Users / 유저 수정 PATCH /users/me [PATCH /users/me]', async ()=>{
  let req = request(app).patch('/users/me');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"name": "김선한", "birth_year": 2002, "gender": "MALE", "region_code": "KR-1"});
  const res = await req;
  assertNot5xx(res, 'PATCH /users/me');
});

test('Users / 유저 삭제 DELETE /users/:userId (Admin) [DELETE /users/2]', async ()=>{
  let req = request(app).delete('/users/2');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  const res = await req;
  assertNot5xx(res, 'DELETE /users/2');
});

test('Users / 유저 삭제 DELETE /users/me [DELETE /users/me]', async ()=>{
  let req = request(app).delete('/users/me');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'DELETE /users/me');
});

test('Authors / 저자 생성 POST /authors (Admin) [POST /authors]', async ()=>{
  let req = request(app).post('/authors');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"penName": "김선한", "birthYear": 2002, "description": "저자 소개 텍스트"});
  const res = await req;
  assertNot5xx(res, 'POST /authors');
});

test('Authors / 저자 목록 GET /authors [GET /authors?page=1&size=10&q=김%&sort=createdAt,ASC]', async ()=>{
  let req = request(app).get('/authors?page=1&size=10&q=김%&sort=createdAt,ASC');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /authors?page=1&size=10&q=김%&sort=createdAt,ASC');
});

test('Authors / 단일 저자 정보 GET /authors/:authorId [GET /authors/1]', async ()=>{
  let req = request(app).get('/authors/1');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /authors/1');
});

test('Authors / 저자 수정 PUT /authors/:authorId (Admin) [PUT /authors/1]', async ()=>{
  let req = request(app).put('/authors/1');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"name": "수정된 저자 이름", "description": "수정된 소개"});
  const res = await req;
  assertNot5xx(res, 'PUT /authors/1');
});

test('Authors / 저자 삭제 DELETE /authors/:authorId (Admin) [DELETE /authors/1]', async ()=>{
  let req = request(app).delete('/authors/1');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  const res = await req;
  assertNot5xx(res, 'DELETE /authors/1');
});

test('Categories / 카테고리 생성 POST /categories (Admin) [POST /categories]', async ()=>{
  let req = request(app).post('/categories');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"name": "소설", "parent_id": null});
  const res = await req;
  assertNot5xx(res, 'POST /categories');
});

test('Categories / 카테고리 목록 GET /categories [GET /categories]', async ()=>{
  let req = request(app).get('/categories');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /categories');
});

test('Categories / 단일 카테고리 GET /categories/:categoryId [GET /categories/1]', async ()=>{
  let req = request(app).get('/categories/1');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"name": "소설", "parent_id": null});
  const res = await req;
  assertNot5xx(res, 'GET /categories/1');
});

test('Categories / 카테고리 수정 PUT /categories/:categoryId (Admin) [PUT /categories/1]', async ()=>{
  let req = request(app).put('/categories/1');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"name": "수필"});
  const res = await req;
  assertNot5xx(res, 'PUT /categories/1');
});

test('Categories / 카테고리 삭제 DELETE /categories/:categoryId (Admin) [DELETE /categories/2]', async ()=>{
  let req = request(app).delete('/categories/2');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  req = req.set('Content-Type', 'application/json');
  const res = await req;
  assertNot5xx(res, 'DELETE /categories/2');
});

test('Books / 도서 생성 POST /books (Admin) [POST /books]', async ()=>{
  let req = request(app).post('/books');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"title": "예시 도서 제목", "authorIds": [1], "categoryIds": [1], "sellerId": 1, "price": 15000, "isbn": "9781234567894", "stock": 10, "publisher": "publisher", "summary": "summary", "publicationDate": "2021-10-12"});
  const res = await req;
  assertNot5xx(res, 'POST /books');
});

test('Books / 도서 목록 GET /books [GET /books?page=1&size=10&keyword=&category_id=]', async ()=>{
  let req = request(app).get('/books?page=1&size=10&keyword=&category_id=');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /books?page=1&size=10&keyword=&category_id=');
});

test('Books / 단일 도서 GET /books/:bookId [GET /books/1]', async ()=>{
  let req = request(app).get('/books/1');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /books/1');
});

test('Books / 도서 수정 PUT /books/:bookId (Admin) [PUT /books/1]', async ()=>{
  let req = request(app).put('/books/1');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"title": "수정된 도서 제목", "price": 17000, "stock": 5});
  const res = await req;
  assertNot5xx(res, 'PUT /books/1');
});

test('Books / 도서 카테고리 수정 PUT /books/:bookId/categories (Admin) [PUT /books/1/categories]', async ()=>{
  let req = request(app).put('/books/1/categories');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"categoryIds": [1]});
  const res = await req;
  assertNot5xx(res, 'PUT /books/1/categories');
});

test('Books / 도서 삭제 DELETE /books/:bookId (Admin) [DELETE /books/1]', async ()=>{
  let req = request(app).delete('/books/1');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  const res = await req;
  assertNot5xx(res, 'DELETE /books/1');
});

test('Carts / 카트 도서 추가 POST /carts [POST /carts]', async ()=>{
  let req = request(app).post('/carts');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"bookId": 3});
  const res = await req;
  assertNot5xx(res, 'POST /carts');
});

test('Carts / 내 카트 GET /carts/me? [GET /carts/me?sort=quantity,ASC]', async ()=>{
  let req = request(app).get('/carts/me?sort=quantity,ASC');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /carts/me?sort=quantity,ASC');
});

test('Carts / 유저 카트 GET /carts/:userId (Admin) [GET /carts/1]', async ()=>{
  let req = request(app).get('/carts/1');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  const res = await req;
  assertNot5xx(res, 'GET /carts/1');
});

test('Carts / 도서 수량 수정 PUT /carts/:cartItemId [PUT /carts/1]', async ()=>{
  let req = request(app).put('/carts/1');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"quantity": 1});
  const res = await req;
  assertNot5xx(res, 'PUT /carts/1');
});

test('Carts / 카트 도서 삭제 DELETE /carts/:cartItemId [DELETE /carts/1]', async ()=>{
  let req = request(app).delete('/carts/1');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'DELETE /carts/1');
});

test('Carts / 카트 모든 도서 삭제 DELETE /carts [DELETE /carts]', async ()=>{
  let req = request(app).delete('/carts');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'DELETE /carts');
});

test('Sellers / 판매자 생성 POST /sellers (Admin) [POST /sellers]', async ()=>{
  let req = request(app).post('/sellers');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"businessName": "테스트 판매자", "businessNumber": "123-45-67891", "email": "seller2@test.com", "phoneNumber": "010-1234-5678", "address": "서울시 어딘가", "payoutBank": "국민은행", "payoutAccount": "123456-02-123456", "payoutHolder": "홍길동", "commissionRate": 10, "status": "ACTIVE"});
  const res = await req;
  assertNot5xx(res, 'POST /sellers');
});

test('Sellers / 판매자 목록 GET /sellers [GET /sellers]', async ()=>{
  let req = request(app).get('/sellers');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /sellers');
});

test('Sellers / 판매자 정보 GET /sellers/:sellerId [GET /sellers/1]', async ()=>{
  let req = request(app).get('/sellers/1');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /sellers/1');
});

test('Sellers / 판매자 수정 PUT /sellers (Admin) [PUT /sellers/1]', async ()=>{
  let req = request(app).put('/sellers/1');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  req = req.send('{\r\n    businessName="",\r\n    phoneNumber,\r\n    address,\r\n    payoutBank,\r\n    payoutAccount,\r\n    payoutHolder,\r\n    commissionRate,\r\n}');
  const res = await req;
  assertNot5xx(res, 'PUT /sellers/1');
});

test('Sellers / 판매자 삭제 DELETE /sellers/:sellerId (Admin) [DELETE /sellers/2]', async ()=>{
  let req = request(app).delete('/sellers/2');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  const res = await req;
  assertNot5xx(res, 'DELETE /sellers/2');
});

test('Libraries / 서재 도서 추가 POST /libraries [POST /libraries]', async ()=>{
  let req = request(app).post('/libraries');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"bookId": 1});
  const res = await req;
  assertNot5xx(res, 'POST /libraries');
});

test('Libraries / 내 서재 GET /libraries [GET /libraries]', async ()=>{
  let req = request(app).get('/libraries');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /libraries');
});

test('Libraries / 유저 서재 GET /libraries/:userId [GET /libraries/1]', async ()=>{
  let req = request(app).get('/libraries/1');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /libraries/1');
});

test('Libraries / 지점 삭제 DELETE /libraries/:userId [DELETE /libraries/2]', async ()=>{
  let req = request(app).delete('/libraries/2');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'DELETE /libraries/2');
});

test('Favorites / 찜 추가 POST /favorites [POST /favorites]', async ()=>{
  let req = request(app).post('/favorites');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"bookId": 1});
  const res = await req;
  assertNot5xx(res, 'POST /favorites');
});

test('Favorites / 내 찜 목록 GET /favorites [GET /favorites]', async ()=>{
  let req = request(app).get('/favorites');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /favorites');
});

test('Favorites / 유저 찜 목록 GET /favorites/:userId [GET /favorites/1]', async ()=>{
  let req = request(app).get('/favorites/1');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /favorites/1');
});

test('Favorites / 찜 취소 DELETE /favorites/:favoriteId [DELETE /favorites/1]', async ()=>{
  let req = request(app).delete('/favorites/1');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'DELETE /favorites/1');
});

test('Orders / 주문 생성 POST /orders [POST /orders]', async ()=>{
  let req = request(app).post('/orders');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  const res = await req;
  assertNot5xx(res, 'POST /orders');
});

test('Orders / 주문 생성 POST /orders (쿠폰사용 json) [POST /orders]', async ()=>{
  let req = request(app).post('/orders');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"coupon_id": 1});
  const res = await req;
  assertNot5xx(res, 'POST /orders');
});

test('Orders / 주문 목록 GET /orders [GET /orders?page=1&size=10]', async ()=>{
  let req = request(app).get('/orders?page=1&size=10');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /orders?page=1&size=10');
});

test('Orders / 주문 목록 GET /orders/:userId [GET /orders/1]', async ()=>{
  let req = request(app).get('/orders/1');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /orders/1');
});

test('Orders / 주문 상세 GET /orders/detail/:orderId [GET /orders/detail/1]', async ()=>{
  let req = request(app).get('/orders/detail/1');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /orders/detail/1');
});

test('Orders / 주문 취소 DELETE /orders/:orderId [DELETE /orders/3]', async ()=>{
  let req = request(app).delete('/orders/3');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'DELETE /orders/3');
});

test('Coupons / 쿠폰 생성 POST /coupons (Admin) [POST /coupons]', async ()=>{
  let req = request(app).post('/coupons');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"name": "신규가입 10% 할인", "discount_rate": 10, "start_at": "2025-12-01T23:59:59.000Z", "end_at": "2025-12-31T23:59:59.000Z", "min_price": 10000, "expires_at": "2025-12-31T23:59:59.000Z"});
  const res = await req;
  assertNot5xx(res, 'POST /coupons');
});

test('Coupons / 쿠폰 할당 POST /coupons/:couponId/assign (Admin) [POST /coupons/1]', async ()=>{
  let req = request(app).post('/coupons/1');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"user_ids": [1]});
  const res = await req;
  assertNot5xx(res, 'POST /coupons/1');
});

test('Coupons / 쿠폰 목록 GET /coupons [GET /coupons]', async ()=>{
  let req = request(app).get('/coupons');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /coupons');
});

test('Coupons / 유저 쿠폰 조회 GET /coupons/:userId [GET /coupons/1]', async ()=>{
  let req = request(app).get('/coupons/1');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  const res = await req;
  assertNot5xx(res, 'GET /coupons/1');
});

test('Coupons / 쿠폰 상태 변경 PATCH /coupons/refresh (Admin) [PATCH /coupons/refresh]', async ()=>{
  let req = request(app).patch('/coupons/refresh');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  const res = await req;
  assertNot5xx(res, 'PATCH /coupons/refresh');
});

test('Coupons / 쿠폰 삭제 DELETE /coupons/:couponId (Admin) [DELETE /coupons/1]', async ()=>{
  let req = request(app).delete('/coupons/1');
  req = req.set("Accept","application/json");
  if (adminToken) req = req.set(authHeader(adminToken));
  const res = await req;
  assertNot5xx(res, 'DELETE /coupons/1');
});

test('Reviews / 리뷰 생성 POST /reviews [POST /reviews]', async ()=>{
  let req = request(app).post('/reviews');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"bookId": 1, "rating": 5, "comment": "내용"});
  const res = await req;
  assertNot5xx(res, 'POST /reviews');
});

test('Reviews / 좋아요 추가 POST /reviews/:reviewId/likes [POST /reviews/3/likes]', async ()=>{
  let req = request(app).post('/reviews/3/likes');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  const res = await req;
  assertNot5xx(res, 'POST /reviews/3/likes');
});

test('Reviews / 리뷰 목록 GET /reviews [GET /reviews?bookId=1&page=1&size=10&sort=created_at,DESC]', async ()=>{
  let req = request(app).get('/reviews?bookId=1&page=1&size=10&sort=created_at,DESC');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /reviews?bookId=1&page=1&size=10&sort=created_at,DESC');
});

test('Reviews / 리뷰 조회 GET /reviews/:reviewId [GET /reviews/3]', async ()=>{
  let req = request(app).get('/reviews/3');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /reviews/3');
});

test('Reviews / 리뷰 수정 PATCH /reviews/:reviewId (본인/Admin) [PATCH /reviews/3]', async ()=>{
  let req = request(app).patch('/reviews/3');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"rating": 4, "comment": "다시 보니 4점"});
  const res = await req;
  assertNot5xx(res, 'PATCH /reviews/3');
});

test('Reviews / 리뷰 삭제 DELETE /reviews/:reviewId(본인/Admin) [DELETE /reviews/1]', async ()=>{
  let req = request(app).delete('/reviews/1');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"rating": 4, "comment": "다시 보니 4점"});
  const res = await req;
  assertNot5xx(res, 'DELETE /reviews/1');
});

test('Reviews / 좋아요 취소 DELETE /likes/:reviewId [DELETE /reviews/3/likes]', async ()=>{
  let req = request(app).delete('/reviews/3/likes');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'DELETE /reviews/3/likes');
});

test('Comments / 댓글 생성 POST /reviews/:reviewId/comments [POST /reviews/3/comments]', async ()=>{
  let req = request(app).post('/reviews/3/comments');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"content": "댓글 1 내용"});
  const res = await req;
  assertNot5xx(res, 'POST /reviews/3/comments');
});

test('Comments / 좋아요 추가 POST /reviews/:reviewid/comments/commentId/likes [POST /reviews/3/comments/1/likes]', async ()=>{
  let req = request(app).post('/reviews/3/comments/1/likes');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"book_id": 1});
  const res = await req;
  assertNot5xx(res, 'POST /reviews/3/comments/1/likes');
});

test('Comments / 댓글 목록 GET /reviews/:reviewid/comments [GET /reviews/3/comments?page=1&size=10]', async ()=>{
  let req = request(app).get('/reviews/3/comments?page=1&size=10');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'GET /reviews/3/comments?page=1&size=10');
});

test('Comments / 댓글 수정 PATCH /reviews/:reviewId/comments/:commentId [PATCH /reviews/3/comments/1]', async ()=>{
  let req = request(app).patch('/reviews/3/comments/1');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  req = req.set('Content-Type', 'application/json');
  req = req.send({"content": "수정된 댓글 내용입니다."});
  const res = await req;
  assertNot5xx(res, 'PATCH /reviews/3/comments/1');
});

test('Comments / 댓글 삭제 DELETE /reviews/:reviewId/comments/:commentId [DELETE /reviews/1/comments/1]', async ()=>{
  let req = request(app).delete('/reviews/1/comments/1');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'DELETE /reviews/1/comments/1');
});

test('Comments / 좋아요 취소 DELETE /reviews/:reviewId/comments/commetId/likes [DELETE /reviews/3/comments/1/likes]', async ()=>{
  let req = request(app).delete('/reviews/3/comments/1/likes');
  req = req.set("Accept","application/json");
  if (userToken) req = req.set(authHeader(userToken));
  const res = await req;
  assertNot5xx(res, 'DELETE /reviews/3/comments/1/likes');
});

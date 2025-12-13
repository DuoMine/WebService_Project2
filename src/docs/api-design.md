# API Design (Updated)

## Base URLs
- Base URL: http://<host>:<port>
- Swagger: /docs
- Health: /health

## Auth
- 인증은 쿠키 기반 access_token 사용 (cookieAuth)
- 권한: ROLE_USER, ROLE_ADMIN
- ADMIN 전용 엔드포인트는 (ADMIN) 표기

## List Query (Pagination / Sort / Filter)
- page: 기본 1
- size: 기본 10 (프로젝트 설정 최대값 적용)
- sort: sort=field,ASC|DESC (예: createdAt,DESC)
- 리소스별로 keyword/q/category_id/bookId 등 필터 지원

## List Response Shape
```
{
  "content": [],
  "page": 1,
  "size": 10,
  "totalElements": 123,
  "totalPages": 13,
  "sort": "createdAt,DESC"
}
```

## Error Response Shape
```
{
  "timestamp": "2025-12-13T00:00:00.000Z",
  "path": "/example",
  "status": 400,
  "code": "VALIDATION_FAILED",
  "message": "invalid body",
  "details": {}
}
```

## 대표 에러 코드
```
400 BAD_REQUEST / VALIDATION_FAILED / INVALID_QUERY_PARAM

401 UNAUTHORIZED / TOKEN_EXPIRED

403 FORBIDDEN

404 NOT_FOUND

409 DUPLICATE_RESOURCE / STATE_CONFLICT

422 UNPROCESSABLE_ENTITY

429 TOO_MANY_REQUESTS

500 INTERNAL_SERVER_ERROR / DATABASE_ERROR
```

---

## 1-2. “엔드포인트 요약표” 

```
### Health
- GET /health

### Auth
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout

### Users
- GET /users/me
- PATCH /users/me
- DELETE /users/me
- (ADMIN) GET /users
- (ADMIN) GET /users/:id
- (ADMIN) POST /users
- (ADMIN) PATCH /users/:id
- (ADMIN) DELETE /users/:id

### Authors
- GET /authors
- GET /authors/:authorId
- (ADMIN) POST /authors
- (ADMIN) PUT /authors/:authorId
- (ADMIN) DELETE /authors/:authorId

### Categories
- GET /categories
- GET /categories/:categoryId
- (ADMIN) POST /categories
- (ADMIN) PUT /categories/:categoryId
- (ADMIN) DELETE /categories/:categoryId

### Books
- GET /books
- GET /books/:bookId
- (ADMIN) POST /books
- (ADMIN) PUT /books/:bookId
- (ADMIN) PUT /books/:bookId/categories
- (ADMIN) DELETE /books/:bookId

### Carts
- GET /carts/me
- POST /carts
- PUT /carts/:cartItemId
- DELETE /carts/:cartItemId
- DELETE /carts
- (ADMIN) GET /carts/:userId

### Sellers
- GET /sellers
- GET /sellers/:sellerId
- (ADMIN) POST /sellers
- (ADMIN) PUT /sellers/:sellerId
- (ADMIN) DELETE /sellers/:sellerId

### Libraries
- GET /libraries
- GET /libraries/:libraryId
- POST /libraries
- DELETE /libraries/:itemId

### Favorites
- GET /favorites
- POST /favorites
- DELETE /favorites/:favoriteId
- (ADMIN) GET /favorites/:id

### Orders
- GET /orders
- POST /orders
- GET /orders/detail/:id
- DELETE /orders/:orderId
- (ADMIN) GET /orders/:userId

### Coupons
- (ADMIN) GET /coupons
- GET /coupons/:userId
- (ADMIN) POST /coupons
- (ADMIN) POST /coupons/:couponId/assign
- (ADMIN) PATCH /coupons/refresh
- (ADMIN) DELETE /coupons/:couponId

### Reviews
- GET /reviews
- GET /reviews/:id
- POST /reviews
- PATCH /reviews/:id
- DELETE /reviews/:id
- POST /reviews/:reviewId/likes
- DELETE /reviews/:reviewId/likes

### Comments
- POST /reviews/:reviewId/comments
- GET /reviews/:reviewId/comments
- PATCH /reviews/:reviewId/comments/:commentId
- DELETE /reviews/:reviewId/comments/:commentId
- POST /reviews/:reviewId/comments/:commentId/likes
- DELETE /reviews/:reviewId/comments/:commentId/likes
```
## 1-3. “변경점 요약”
- 인증 방식이 cookieAuth(access_token 쿠키) 중심으로 정리됨.
- 일부 리소스는 /me 경로를 도입하여 “본인 리소스” 접근을 명확히 분리함. (예: /users/me, /carts/me)
- 찜/서재/카트 등에서 식별자 파라미터가 userId 기반에서 itemId/favoriteId 기반으로 정리됨.
- 리스트 응답은 content/page/size/totalElements/totalPages/sort 형태로 통일.
- 중복 생성(UNIQUE 위반)은 409 DUPLICATE_RESOURCE로 응답하도록 수정.
- 레이트리밋 적용 및 에러 응답 규격 통일.
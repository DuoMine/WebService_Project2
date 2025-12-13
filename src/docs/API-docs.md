# API 명세서 (Notion용, 과제 2 기준)

아래는 Postman 컬렉션(WebService)을 기준으로 자동 정리한 API 목록입니다.

형식: 각 엔드포인트별 개요 → 요청 → 응답(예시 자리) → 에러.

## Health

### 헬스 체크 GET /health

- **Method**: `GET`
- **Path**: `/health`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---



## Auth

### 회원가입 POST /auth/register

- **Method**: `POST`
- **Path**: `/auth/register`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "email": "kindkim02@gmail.com",
  "password": "12341234",
  "name": "김선한",
  "birth_year": 2002,
  "gender": "MALE",
  "region_code": "KR-11"
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 로그인 POST /auth/login

- **Method**: `POST`
- **Path**: `/auth/login`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "email": "kindkim02@gmail.com",
  "password": "12341234"
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 토큰 재발급 POST /auth/refresh

- **Method**: `POST`
- **Path**: `/auth/refresh`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 로그아웃 POST /auth/logout

- **Method**: `POST`
- **Path**: `/auth/logout`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---



## Users

### 유저 생성 POST /users (Admin)

- **Method**: `POST`
- **Path**: `/users`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "email": "user2@example.com",
  "password": "Password1234!",
  "name": "사용자2",
  "birth_year": 1998,
  "gender": "FEMALE",
  "region_code": "KR-26"
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 유저 목록 GET /users (Admin)

- **Method**: `GET`
- **Path**: `/users/?page=1&size=10&keyword=`
- **Auth**: 없음/공개

**Query Params**

| key | value(example) |
|---|---|
| page | 1 |
| size | 10 |
| keyword |  |

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 단일 유저 GET /users/:userId (Admin)

- **Method**: `GET`
- **Path**: `/users/1`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 내 정보 GET /users/me

- **Method**: `GET`
- **Path**: `/users/me`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 유저 수정 PATCH /users/:userId (Admin)

- **Method**: `PATCH`
- **Path**: `/users/2`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "name": "수정된 사용자",
  "birth_year": 1999,
  "gender": "MALE",
  "region_code": "KR-27"
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 유저 수정 PATCH /users/me

- **Method**: `PATCH`
- **Path**: `/users/me`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "name": "김선한",
  "birth_year": 2002,
  "gender": "MALE",
  "region_code": "KR-1"
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 유저 삭제 DELETE /users/:userId (Admin)

- **Method**: `DELETE`
- **Path**: `/users/2`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 유저 삭제 DELETE /users/me

- **Method**: `DELETE`
- **Path**: `/users/me`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---



## Authors

### 저자 생성 POST /authors (Admin)

- **Method**: `POST`
- **Path**: `/authors`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "penName": "김선한",
  "birthYear": 2002,
  "description": "저자 소개 텍스트"
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 저자 목록 GET /authors

- **Method**: `GET`
- **Path**: `/authors?page=1&size=10&q=김%&sort=createdAt,ASC`
- **Auth**: 없음/공개

**Query Params**

| key | value(example) |
|---|---|
| page | 1 |
| size | 10 |
| q | 김% |
| sort | createdAt,ASC |

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 단일 저자 정보 GET /authors/:authorId

- **Method**: `GET`
- **Path**: `/authors/1`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 저자 수정 PUT /authors/:authorId (Admin)

- **Method**: `PUT`
- **Path**: `/authors/1`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "name": "수정된 저자 이름",
  "description": "수정된 소개"
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 저자 삭제 DELETE /authors/authorId (Admin)

- **Method**: `DELETE`
- **Path**: `/authors/1`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---



## Categories

### 카테고리 생성 POST /categories (Admin)

- **Method**: `POST`
- **Path**: `/categories`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "name": "소설",
  "parent_id": null
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 카테고리 목록 GET /categories

- **Method**: `GET`
- **Path**: `/categories`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 단일 카테고리 GET /categories/:categoryId

- **Method**: `GET`
- **Path**: `/categories/1`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "name": "소설",
  "parent_id": null
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 카테고리 수정 PUT /categories/:categoryId (Admin)

- **Method**: `PUT`
- **Path**: `/categories/1`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "name": "수필"
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 카테고리 삭제 DELETE /categories/:categoryId (Admin)

- **Method**: `DELETE`
- **Path**: `/categories/2`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---



## Books

### 도서 생성 POST /books (Admin)

- **Method**: `POST`
- **Path**: `/books`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "title": "예시 도서 제목",
  "authorIds": [1],
  "categoryIds": [1],
  "sellerId": 1,
  "price": 15000,
  "isbn": "9781234567894",
  "stock": 10,
  "publisher": "publisher",
  "summary": "summary",
  "publicationDate": "2021-10-12"
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 도서 목록 GET /books

- **Method**: `GET`
- **Path**: `/books?page=1&size=10&keyword=&category_id=`
- **Auth**: 없음/공개

**Query Params**

| key | value(example) |
|---|---|
| page | 1 |
| size | 10 |
| keyword |  |
| category_id |  |

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 단일 도서 GET /books/:bookId

- **Method**: `GET`
- **Path**: `/books/1`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 도서 수정 PUT /books/:bookId (Admin)

- **Method**: `PUT`
- **Path**: `/books/1`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "title": "수정된 도서 제목",
  "price": 17000,
  "stock": 5
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 도서 카테고리 수정 PUT /books/:bookId/categories (Admin)

- **Method**: `PUT`
- **Path**: `/books/1/categories`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "categoryIds": [1]
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 도서 삭제 DELETE /books/:bookId (Admin)

- **Method**: `DELETE`
- **Path**: `/books/1`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---



## Carts

### 카트 도서 추가 POST /carts

- **Method**: `POST`
- **Path**: `/carts`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "bookId": 3
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 내 카트 GET /carts/me?

- **Method**: `GET`
- **Path**: `/carts/me?sort=quantity,ASC`
- **Auth**: 없음/공개

**Query Params**

| key | value(example) |
|---|---|
| sort | quantity,ASC |

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 유저 카트 GET /carts/:userId (Admin)

- **Method**: `GET`
- **Path**: `/carts/1`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 도서 수량 수정 PUT /carts/:cartItemId

- **Method**: `PUT`
- **Path**: `/carts/1`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "quantity":1
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 카트 도서 삭제 DELETE /carts/:cartItemId

- **Method**: `DELETE`
- **Path**: `/carts/1`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 카트 모든 도서 삭제 DELETE /carts

- **Method**: `DELETE`
- **Path**: `/carts`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---



## Sellers

### 판매자 생성 POST /sellers (Admin)

- **Method**: `POST`
- **Path**: `/sellers`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "businessName": "테스트 판매자",
  "businessNumber": "123-45-67891",
  "email": "seller2@test.com",
  "phoneNumber": "010-1234-5678",
  "address": "서울시 어딘가",
  "payoutBank": "국민은행",
  "payoutAccount": "123456-02-123456",
  "payoutHolder": "홍길동",
  "commissionRate": 10,
  "status": "ACTIVE"
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 판매자 목록 GET /sellers

- **Method**: `GET`
- **Path**: `/sellers`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 판매자 정보 GET /sellers/:sellerId

- **Method**: `GET`
- **Path**: `/sellers/1`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 판매자 수정 PUT /sellers (Admin)

- **Method**: `PUT`
- **Path**: `/sellers/1`
- **Auth**: 없음/공개

**Request Body**

```json
{
    businessName="",
    phoneNumber,
    address,
    payoutBank,
    payoutAccount,
    payoutHolder,
    commissionRate,
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 판매자 삭제 DELETE /sellers/:sellerId (Admin)

- **Method**: `DELETE`
- **Path**: `/sellers/2`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---



## Libraries

### 서재 도서 추가 POST /libraries/items

- **Method**: `POST`
- **Path**: `/libraries`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "bookId": 1
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 내 서재 GET /libraries

- **Method**: `GET`
- **Path**: `/libraries`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 유저 서재 GET /libraries/:userId

- **Method**: `GET`
- **Path**: `/libraries/1`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 지점 삭제 DELETE /libraries/:userId

- **Method**: `DELETE`
- **Path**: `/libraries/2`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---



## Favorites

### 찜 추가 POST /favorites

- **Method**: `POST`
- **Path**: `/favorites`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "bookId": 1
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 내 찜 목록 GET /favorites

- **Method**: `GET`
- **Path**: `/favorites`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 유저 찜 목록 GET /favorites/:userId

- **Method**: `GET`
- **Path**: `/favorites/1`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 찜 취소 DELETE /favorites/:userId

- **Method**: `DELETE`
- **Path**: `/favorites/1`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---



## Orders

### 주문 생성 POST /orders

- **Method**: `POST`
- **Path**: `/orders`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 주문 생성 POST /orders (쿠폰사용 json)

- **Method**: `POST`
- **Path**: `/orders`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{ "coupon_id": 1 }
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 주문 목록 GET /orders

- **Method**: `GET`
- **Path**: `/orders?page=1&size=10`
- **Auth**: 없음/공개

**Query Params**

| key | value(example) |
|---|---|
| page | 1 |
| size | 10 |

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 주문 목록 GET /orders/:userId

- **Method**: `GET`
- **Path**: `/orders/1`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 주문 상세 GET /orders/detail/:orderId

- **Method**: `GET`
- **Path**: `/orders/detail/1`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 주문 취소 DELETE /orders/:orderId

- **Method**: `DELETE`
- **Path**: `/orders/3`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---



## Coupons

### 쿠폰 생성 POST /coupons (Admin)

- **Method**: `POST`
- **Path**: `/coupons`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "name": "신규가입 10% 할인",
  "discount_rate": 10,
  "start_at": "2025-12-01T23:59:59.000Z",
  "end_at": "2025-12-31T23:59:59.000Z",
  "min_price": 10000,
  "expires_at": "2025-12-31T23:59:59.000Z"
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 쿠폰 할당 POST /coupons/:couponId/assign (Admin)

- **Method**: `POST`
- **Path**: `/coupons/1`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
    "user_ids": [1]
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 쿠폰 목록 GET /coupons

- **Method**: `GET`
- **Path**: `/coupons`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 유저 쿠폰 조회 GET /coupons/:userId

- **Method**: `GET`
- **Path**: `/coupons/1`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 쿠폰 상태 변경 PATCH /coupons/refresh (Admin)

- **Method**: `PATCH`
- **Path**: `/coupons/refresh`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 쿠폰 삭제 DELETE /coupons/:couponId (Admin)

- **Method**: `DELETE`
- **Path**: `/coupons/1`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---



## Reviews

### 리뷰 생성 POST /reviews

- **Method**: `POST`
- **Path**: `/reviews`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "bookId": 1,
  "rating": 5,
  "comment": "내용"
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 좋아요 추가 POST /reviews/:reviewId/likes

- **Method**: `POST`
- **Path**: `/reviews/3/likes`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 리뷰 목록 GET /reviews

- **Method**: `GET`
- **Path**: `/reviews?bookId=1&page=1&size=10&sort=created_at,DESC`
- **Auth**: 없음/공개

**Query Params**

| key | value(example) |
|---|---|
| bookId | 1 |
| page | 1 |
| size | 10 |
| sort | created_at,DESC |

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 리뷰 조회 GET /reviews/:reviewId

- **Method**: `GET`
- **Path**: `/reviews/3`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 리뷰 수정 PATCH /reviews/:reviewId (본인/Admin)

- **Method**: `PATCH`
- **Path**: `/reviews/3`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "rating": 4,
  "comment": "다시 보니 4점"
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 리뷰 삭제 DELETE /reviews/:reviewId(본인/Admin)

- **Method**: `DELETE`
- **Path**: `/reviews/1`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "rating": 4,
  "comment": "다시 보니 4점"
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 좋아요 취소 DELETE /likes/:reviewId

- **Method**: `DELETE`
- **Path**: `/reviews/3/likes`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---



## Comments

### 댓글 생성 POST /reviews/:reviewId/comments

- **Method**: `POST`
- **Path**: `/reviews/3/comments`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "content": "댓글 1 내용"
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 좋아요 추가 POST /reviews/:reviewid/comments/commentId/likes

- **Method**: `POST`
- **Path**: `/reviews/3/comments/1/likes`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "book_id": 1
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 댓글 목록 GET /reviews/:reviewid/comments

- **Method**: `GET`
- **Path**: `/reviews/3/comments?page=1&size=10`
- **Auth**: 없음/공개

**Query Params**

| key | value(example) |
|---|---|
| page | 1 |
| size | 10 |

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 댓글 수정 PATCH /reviews/:reviewId/comments/:commentId

- **Method**: `PATCH`
- **Path**: `/reviews/3/comments/1`
- **Auth**: 없음/공개

**Headers**

| key | value(example) |
|---|---|
| Content-Type | application/json |

**Request Body**

```json
{
  "content": "수정된 댓글 내용입니다."
}
```

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 댓글 삭제 DELETE /reviews/:reviewId/comments/:commentId

- **Method**: `DELETE`
- **Path**: `/reviews/1/comments/1`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---

### 좋아요 취소 DELETE /reviews/:reviewId/comments/commetId/likes

- **Method**: `DELETE`
- **Path**: `/reviews/3/comments/1/likes`
- **Auth**: 없음/공개

**Success Response (예시)**

```json
{
  "...": "fill me"
}
```

**Error Responses (공통)**

- 400 VALIDATION_FAILED
- 401 UNAUTHORIZED / TOKEN_EXPIRED
- 403 FORBIDDEN
- 404 NOT_FOUND
- 409 DUPLICATE_RESOURCE / STATE_CONFLICT
- 500 INTERNAL_SERVER_ERROR

---



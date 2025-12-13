WebService Project 2 (Ko) – Online Bookstore API
0) 프로젝트 개요

과제 1에서 설계한 DB 스키마/ERD와 API 설계를 기반으로, 온라인 서점 서비스의 백엔드 API 서버를 Express.js + MariaDB + Sequelize로 구현하고 JCloud에 배포했습니다.
Swagger 문서와 Postman 컬렉션을 통해 기능을 검증했습니다.

핵심 구현 사항(요구사항 대응)

리소스 4개 이상 + CRUD 제공 (auth 제외)

JWT 인증/인가 + RBAC(ROLE_USER/ROLE_ADMIN)

목록 조회 페이지네이션/검색/정렬

에러 응답 규격 통일 + 입력 검증

Swagger(OpenAPI) 자동 문서화

Postman 컬렉션(JSON) 제출

헬스체크(/health) OK

PM2로 재시작 후에도 지속 구동

1) 배포 주소

JCloud는 포트 리다이렉션이 적용되어 있어, 외부 포트로 접속합니다.

API Root(Base URL): http://http://113.198.66.68/:13117

Swagger UI: http://http://113.198.66.68/:13117/api-docs (또는 /docs / /swagger-ui 중 실제 경로)

Health Check: http://http://113.198.66.68/:13117/health

헬스체크 예시:

curl http://http://113.198.66.68/:13117/health

2) 기술 스택

Node.js: 22.x

Framework: Express.js

ORM: Sequelize

DB: MariaDB(MySQL 호환)

Auth: JWT (Access/Refresh)

Docs: Swagger(OpenAPI 3)

Deploy: JCloud Ubuntu + PM2

3) 실행 방법 (로컬/서버 공통)
3-1. 의존성 설치
npm install

3-2. 환경변수 설정

로컬 실행: .env 준비

테스트 실행: .env.test 준비(아래 예시 참고)

.env / .env.test는 GitHub에 커밋 금지
레포에는 .env.example만 포함

3-3. DB 스키마 적용(마이그레이션/SQL)

프로젝트에서 사용하는 방식 중 1개로 안내:

A) SQL 파일로 스키마 생성

mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < <schema.sql>


B) Sequelize sync 기반(사용 중이면)

npm run db:sync


(네 프로젝트에 실제 존재하는 방식으로 하나만 남기고 정리해.)

3-4. 서버 실행
npm start

4) 서버 백그라운드 실행(PM2) (JCloud)
# 실행
pm2 start src/server.js --name bookstore-api

# 상태 확인
pm2 status
pm2 logs bookstore-api --lines 200

# 부팅 시 자동 시작(설정이 필요한 경우)
pm2 startup
pm2 save

5) 환경변수(.env.example)

레포에는 아래 예시 형태로 .env.example를 포함합니다.

# Server
PORT=8080
NODE_ENV=production

# DB
DB_HOST=localhost
DB_PORT=3306
DB_NAME=bookstore
DB_USER=root
DB_PASSWORD=your_password

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=14d

# CORS (필요 시)
CORS_ORIGIN=http://localhost:5173

.env.test 안내

테스트 DB를 분리했다면 .env.test에는 DB_NAME=bookstore_test 같은 식으로 분리

분리 안 했으면 .env와 동일 구성 사용(권장 X지만 과제에서 강제는 아님)

6) 인증/인가(Authorization) 흐름

JWT 인증

1) 로그인
1. 사용자 이메일/비밀번호 확인
2. DB에 Refresh Token Row 생성
3. Access Token 발급 (유효기간 15분)
4. Refresh Token 발급 
5. Refresh Token 해싱 -> DB에 저장

2) Access Token 검증
1. 쿠키 확인
2. 쿠키에 없을 시 헤더 확인
3. verifyAccessToken으로 만료/위조 검사
4. userId를 이용하여 사용자가 active인지 확인

3) Refresh Token 검증
1. 쿠키 -> 헤더 순 확인
2. verifyRefreshToken으로 만료/위조 검사
3. 해당 refresh token row 조회 -> revoke, expire 여부 및 id, hash 확인
4. 새 Access Token 발급 -> 쿠키 갱신

4) 로그아웃
1. Refresh Token 쿠키 디코드
2. DB의 해당 row의 revoked_at = now()
3. access + refresh 쿠키 삭제

Swagger에서 인증 설정

Swagger UI의 Authorize에서 아래 중 하나 사용:

cookieAuth: access_token 쿠키 값

bearerAuth: Authorization: Bearer <token>

(네 swagger에 둘 다 잡혀있는 상태면 이 문구 그대로 두면 됨)

7) API 목록 요약 (엔드포인트 30+)

POSTMAN COLLECTION 기준

Health (1)

GET /health

Auth (4)

POST /auth/register

POST /auth/login

POST /auth/refresh

POST /auth/logout

Users (8)

GET /users/me

PATCH /users/me

DELETE /users/me

GET /users

POST /users

GET /users/:id

PATCH /users/:id

DELETE /users/:id

Authors (5)

GET /authors

POST /authors

GET /authors/:authorId

PUT /authors/:authorId

DELETE /authors/:authorId

Categories (5)

GET /categories

POST /categories

GET /categories/:categoryId

PUT /categories/:categoryId

DELETE /categories/:categoryId

Books (6)

GET /books

POST /books

GET /books/:bookId

PUT /books/:bookId

DELETE /books/:bookId

GET /books/:bookId/reviews

Carts (6)

GET /carts

POST /carts

PATCH /carts/:itemId

DELETE /carts/:itemId

DELETE /carts

POST /carts/checkout

Sellers (5)

GET /sellers

POST /sellers

GET /sellers/:sellerId

PUT /sellers/:sellerId

DELETE /sellers/:sellerId

Libraries (4)

GET /libraries

POST /libraries

GET /libraries/:libraryId

DELETE /libraries/:itemId

Favorites (4)

GET /favorites

POST /favorites

DELETE /favorites/:favoriteId

GET /favorites/books

Orders (5)

POST /orders

GET /orders

GET /orders/detail/:id

GET /orders/:userId

DELETE /orders/:orderId

Coupons (6)

GET /coupons

POST /coupons

PATCH /coupons/:couponId

DELETE /coupons/:couponId

GET /coupons/my

POST /coupons/issue

Reviews (7)

GET /reviews

POST /reviews

GET /reviews/:id

PATCH /reviews/:id

DELETE /reviews/:id

POST /reviews/:reviewId/likes

DELETE /reviews/:reviewId/likes

Comments (6)

GET /reviews/:reviewId/comments

POST /reviews/:reviewId/comments

PATCH /reviews/:reviewId/comments/:commentId

DELETE /reviews/:reviewId/comments/:commentId

POST /reviews/:reviewId/comments/:commentId/likes

DELETE /reviews/:reviewId/comments/:commentId/likes

8) 목록 조회 공통 규격(페이지네이션/검색/정렬)

Pagination: page, size

Sort: sort=field,ASC|DESC

Search/Filter: 리소스별 최소 2개 이상 조건 지원

응답 형식:

{
  "content": [],
  "page": 1,
  "size": 20,
  "totalElements": 153,
  "totalPages": 8,
  "sort": "created_at,DESC"
}

9) 에러 처리 규격

모든 에러는 공통 포맷으로 반환합니다.

{
  "timestamp": "2025-12-13T17:08:24.153Z",
  "path": "/auth/register",
  "status": 400,
  "code": "VALIDATION_FAILED",
  "message": "invalid request body",
  "details": {
    "email": "email is required"
  }
}


대표 에러 코드 예시:

BAD_REQUEST

VALIDATION_FAILED

UNAUTHORIZED

TOKEN_EXPIRED

FORBIDDEN

NOT_FOUND

DUPLICATE_RESOURCE

TOO_MANY_REQUESTS

INTERNAL_SERVER_ERROR

10) 보안/성능

비밀번호 해시: bcrypt

CORS: 테스트용 Origin 허용

Rate Limit: 전역/비인증 라우트에 적용

DB 인덱스 및 FK 적용 (ERD/DB-docs 기반)

11) Postman

위치: docs/WebService.postman_collection.json

환경 변수:

baseUrl

토큰/쿠키 자동 저장 (스크립트 포함한 경우 명시)

12) DB 접속 정보 및 계정 정보 제출 안내(별도 파일)

과제 요구사항에 따라 DB 접속 정보/계정 정보는 GitHub에 올리지 않고, 별도 텍스트/워드 파일로 제출합니다.

DB Host / Port / DB Name / User / Password

접속 명령어 예시:

mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME>

13) 한계 및 개선 계획(간단)

마이그레이션 도구(Flyway 등) 적용하면 재현성이 좋아짐

테스트 케이스 범위를 더 확장 가능(권한/경계값/동시성 등)

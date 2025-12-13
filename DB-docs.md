# DB 명세서 (Notion용, 과제 2 기준)

아래 내용은 Notion에 그대로 붙여넣기 가능한 Markdown 형식입니다.

## users

### 개요
- 사용자 계정 및 권한/상태/프로필 메타데이터

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| email | varchar(100) | NOT NULL |  |
| password_hash | varchar(60) | NOT NULL |  |
| name | varchar(50) | NOT NULL |  |
| phone_number | varchar(20) | DEFAULT NULL |  |
| birth_year | smallint(6) | NOT NULL |  |
| gender | enum('MALE','FEMALE','UNKNOWN') | NOT NULL DEFAULT 'UNKNOWN' |  |
| region_code | varchar(10) | NOT NULL |  |
| role | enum('USER','ADMIN') | NOT NULL DEFAULT 'USER' |  |
| status | enum('ACTIVE','SUSPENDED','DELETED') | NOT NULL DEFAULT 'ACTIVE' |  |
| last_login_at | datetime | DEFAULT NULL |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |
| updated_at | datetime | NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() |  |
| deleted_at | datetime | DEFAULT NULL |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)
- UNIQUE KEY `uq_users_email` (`email`)
- UNIQUE KEY `phone_number` (`phone_number`)



## user_refresh_tokens

### 개요
- 리프레시 토큰 관리(세션/재발급/폐기)

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| user_id | bigint(20) | NOT NULL |  |
| refresh_token_hash | varchar(100) | NOT NULL |  |
| user_agent | varchar(150) | DEFAULT NULL |  |
| ip_address | varchar(45) | DEFAULT NULL |  |
| expires_at | datetime | NOT NULL |  |
| revoked_at | datetime | DEFAULT NULL |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)
- UNIQUE KEY `uq_user_refresh_tokens_hash` (`refresh_token_hash`)
- KEY `fk_user_refresh_tokens_user` (`user_id`)
- CONSTRAINT `fk_user_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE



## authors

### 개요
- 저자 정보

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| pen_name | varchar(100) | NOT NULL |  |
| birth_year | smallint(6) | NOT NULL |  |
| description | text | DEFAULT NULL |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)



## categories

### 개요
- 카테고리 정보

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| name | varchar(60) | NOT NULL |  |
| parent_id | bigint(20) | DEFAULT NULL |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)
- UNIQUE KEY `uq_categories_name` (`name`)
- KEY `fk_categories_parent` (`parent_id`)
- CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE



## books

### 개요
- 도서 메타데이터

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| seller_id | bigint(20) | NOT NULL |  |
| title | varchar(150) | NOT NULL |  |
| publisher | varchar(100) | NOT NULL |  |
| summary | text | DEFAULT NULL |  |
| isbn | varchar(20) | NOT NULL |  |
| language | varchar(50) | NOT NULL DEFAULT 'Korean' |  |
| price | int(11) | NOT NULL |  |
| publication_date | date | NOT NULL |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |
| updated_at | datetime | NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() |  |
| deleted_at | datetime | DEFAULT NULL |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)
- UNIQUE KEY `uq_books_isbn` (`isbn`)
- KEY `idx_books_seller_id` (`seller_id`)
- CONSTRAINT `fk_books_seller` FOREIGN KEY (`seller_id`) REFERENCES `sellers` (`id`) ON UPDATE CASCADE



## book_authors

### 개요
- 도서-저자 N:M 관계

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| book_id | bigint(20) | NOT NULL |  |
| author_id | bigint(20) | NOT NULL |  |

### 인덱스 / 제약
- PRIMARY KEY (`book_id`,`author_id`)
- KEY `idx_book_authors_author` (`author_id`,`book_id`)
- CONSTRAINT `fk_book_authors_author` FOREIGN KEY (`author_id`) REFERENCES `authors` (`id`) ON UPDATE CASCADE
- CONSTRAINT `fk_book_authors_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE ON UPDATE CASCADE



## book_categories

### 개요
- 도서-카테고리 N:M 관계

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| book_id | bigint(20) | NOT NULL |  |
| category_id | bigint(20) | NOT NULL |  |

### 인덱스 / 제약
- PRIMARY KEY (`book_id`,`category_id`)
- KEY `idx_book_categories_category` (`category_id`,`book_id`)
- CONSTRAINT `fk_book_categories_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
- CONSTRAINT `fk_book_categories_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE



## book_views

### 개요
- 도서 조회 이력/통계

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| book_id | bigint(20) | NOT NULL |  |
| user_id | bigint(20) | DEFAULT NULL |  |
| viewed_at | datetime | NOT NULL DEFAULT current_timestamp() |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)
- KEY `idx_book_views_book_viewed` (`book_id`,`viewed_at`)
- KEY `fk_book_views_user` (`user_id`)
- CONSTRAINT `fk_book_views_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON UPDATE CASCADE
- CONSTRAINT `fk_book_views_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE



## sellers

### 개요
- 판매자 정보

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| business_name | varchar(100) | NOT NULL |  |
| business_number | varchar(20) | NOT NULL |  |
| email | varchar(100) | NOT NULL |  |
| phone_number | varchar(20) | NOT NULL |  |
| address | varchar(255) | NOT NULL |  |
| payout_bank | varchar(50) | NOT NULL |  |
| payout_account | varchar(50) | NOT NULL |  |
| payout_holder | varchar(50) | NOT NULL |  |
| commission_rate | int(11) | NOT NULL DEFAULT 10 |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |
| updated_at | datetime | NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() |  |
| deleted_at | datetime | DEFAULT NULL |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)
- UNIQUE KEY `uq_sellers_business_number` (`business_number`)
- UNIQUE KEY `uq_sellers_email` (`email`)



## carts

### 개요
- 사용자 장바구니

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| user_id | bigint(20) | NOT NULL |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |
| updated_at | datetime | NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() |  |

### 인덱스 / 제약
- PRIMARY KEY (`user_id`)
- UNIQUE KEY `uq_carts_user` (`user_id`)
- CONSTRAINT `fk_carts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE



## cart_items

### 개요
- 장바구니 항목(도서, 수량, 활성 여부)

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| cart_user_id | bigint(20) | NOT NULL |  |
| book_id | bigint(20) | NOT NULL |  |
| quantity | int(11) | NOT NULL DEFAULT 1 |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |
| updated_at | datetime | NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() |  |
| is_active | tinyint(1) | NOT NULL DEFAULT 1 |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)
- UNIQUE KEY `uq_cart_items_cart_book` (`cart_user_id`,`book_id`)
- KEY `idx_cart_items_cart_active` (`cart_user_id`,`is_active`)
- KEY `idx_cart_items_book_active` (`book_id`,`is_active`)
- CONSTRAINT `fk_cart_items_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON UPDATE CASCADE
- CONSTRAINT `fk_cart_items_cart` FOREIGN KEY (`cart_user_id`) REFERENCES `carts` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE



## favorites

### 개요
- 찜(즐겨찾기)

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| user_id | bigint(20) | NOT NULL |  |
| book_id | bigint(20) | NOT NULL |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |
| updated_at | datetime | NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)
- UNIQUE KEY `uq_favorites_user_book` (`user_id`,`book_id`)
- UNIQUE KEY `uk_favorites_user_book` (`user_id`,`book_id`)
- KEY `idx_favorites_book_created` (`book_id`,`created_at`)
- KEY `idx_favorites_user_created` (`user_id`,`created_at`)
- CONSTRAINT `fk_favorites_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON UPDATE CASCADE
- CONSTRAINT `fk_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE



## libraries

### 개요
- 사용자 라이브러리(구매/보유 도서 등)

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| user_id | bigint(20) | NOT NULL |  |
| book_id | bigint(20) | NOT NULL |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |
| updated_at | datetime | NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)
- UNIQUE KEY `uq_libraries_user_book` (`user_id`,`book_id`)
- KEY `idx_libraries_book_created` (`book_id`,`created_at`)
- KEY `idx_libraries_user_created` (`user_id`,`created_at`)
- CONSTRAINT `fk_libraries_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON UPDATE CASCADE
- CONSTRAINT `fk_libraries_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE



## orders

### 개요
- 주문 마스터

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| user_id | bigint(20) | NOT NULL |  |
| subtotal_amount | int(11) | NOT NULL |  |
| coupon_discount | int(11) | NOT NULL DEFAULT 0 |  |
| total_amount | int(11) | NOT NULL |  |
| status | enum('CREATED','PAID','CANCELLED','REFUNDED') | NOT NULL DEFAULT 'CREATED' |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |
| updated_at | datetime | NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)
- KEY `idx_orders_user_created` (`user_id`,`created_at`)
- KEY `idx_orders_status_created` (`status`,`created_at`)
- CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE



## order_items

### 개요
- 주문 항목 스냅샷

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| order_id | bigint(20) | NOT NULL |  |
| book_id | bigint(20) | NOT NULL |  |
| title_snapshot | varchar(255) | NOT NULL |  |
| quantity | int(11) | NOT NULL DEFAULT 1 |  |
| unit_price | int(11) | NOT NULL |  |
| total_amount | int(11) | NOT NULL |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |
| updated_at | datetime | NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)
- KEY `idx_order_items_order` (`order_id`)
- KEY `idx_order_items_book_created` (`book_id`,`created_at`)
- CONSTRAINT `fk_order_items_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON UPDATE CASCADE
- CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE



## order_coupons

### 개요
- 주문-쿠폰 적용 이력

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| order_id | bigint(20) | NOT NULL |  |
| coupon_id | bigint(20) | NOT NULL |  |
| amount | int(11) | NOT NULL |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |

### 인덱스 / 제약
- PRIMARY KEY (`order_id`,`coupon_id`)
- KEY `fk_order_coupons_coupon` (`coupon_id`)
- CONSTRAINT `fk_order_coupons_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON UPDATE CASCADE
- CONSTRAINT `fk_order_coupons_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE



## coupons

### 개요
- 쿠폰 마스터

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| name | varchar(100) | DEFAULT NULL |  |
| discount_rate | int(11) | NOT NULL |  |
| start_at | datetime | NOT NULL |  |
| end_at | datetime | NOT NULL |  |
| status | enum('SCHEDULED','ACTIVE','PAUSED','ENDED') | NOT NULL DEFAULT 'SCHEDULED' |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |
| updated_at | datetime | NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)
- KEY `idx_coupons_status_period` (`status`,`start_at`,`end_at`)



## user_coupons

### 개요
- 사용자 보유 쿠폰

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| user_id | bigint(20) | NOT NULL |  |
| coupon_id | bigint(20) | NOT NULL |  |
| status | enum('ISSUED','USED') | NOT NULL DEFAULT 'ISSUED' |  |
| issued_at | datetime | NOT NULL DEFAULT current_timestamp() |  |
| used_at | datetime | DEFAULT NULL |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)
- UNIQUE KEY `uq_user_coupon` (`user_id`,`coupon_id`)
- KEY `idx_user_status` (`user_id`,`status`)
- KEY `fk_uc_coupon` (`coupon_id`)
- CONSTRAINT `fk_uc_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`)
- CONSTRAINT `fk_uc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE



## reviews

### 개요
- 리뷰

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| user_id | bigint(20) | NOT NULL |  |
| book_id | bigint(20) | NOT NULL |  |
| rating | int(11) | NOT NULL |  |
| comment | text | DEFAULT NULL |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |
| updated_at | datetime | NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)
- UNIQUE KEY `uq_reviews_user_book` (`user_id`,`book_id`)
- KEY `idx_reviews_book` (`book_id`)
- CONSTRAINT `fk_reviews_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON UPDATE CASCADE
- CONSTRAINT `fk_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE



## review_likes

### 개요
- 리뷰 좋아요

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| review_id | bigint(20) | NOT NULL |  |
| user_id | bigint(20) | NOT NULL |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |
| is_active | tinyint(1) | NOT NULL DEFAULT 1 |  |

### 인덱스 / 제약
- PRIMARY KEY (`review_id`,`user_id`)
- KEY `idx_review_likes_review_active` (`review_id`,`is_active`)
- KEY `fk_review_likes_user` (`user_id`)
- CONSTRAINT `fk_review_likes_review` FOREIGN KEY (`review_id`) REFERENCES `reviews` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
- CONSTRAINT `fk_review_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE



## comments

### 개요
- 리뷰 댓글

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| id | bigint(20) | NOT NULL AUTO_INCREMENT |  |
| review_id | bigint(20) | NOT NULL |  |
| user_id | bigint(20) | NOT NULL |  |
| content | text | NOT NULL |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |
| updated_at | datetime | NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() |  |
| deleted_at | datetime | DEFAULT NULL |  |

### 인덱스 / 제약
- PRIMARY KEY (`id`)
- KEY `idx_comments_review_created` (`review_id`,`created_at`)
- KEY `idx_comments_user_created` (`user_id`,`created_at`)
- CONSTRAINT `fk_comments_review` FOREIGN KEY (`review_id`) REFERENCES `reviews` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
- CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE



## comment_likes

### 개요
- 댓글 좋아요

### 컬럼

| 컬럼 | 타입 | 제약/기본값 | 설명 |
|------|------|------------|------|
| comment_id | bigint(20) | NOT NULL |  |
| user_id | bigint(20) | NOT NULL |  |
| created_at | datetime | NOT NULL DEFAULT current_timestamp() |  |
| is_active | tinyint(1) | NOT NULL DEFAULT 1 |  |

### 인덱스 / 제약
- PRIMARY KEY (`comment_id`,`user_id`)
- KEY `idx_comment_likes_comment_active` (`comment_id`,`is_active`)
- KEY `fk_comment_likes_user` (`user_id`)
- CONSTRAINT `fk_comment_likes_comment` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
- CONSTRAINT `fk_comment_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE



-- --------------------------------------------------------
-- 호스트:                          127.0.0.1
-- 서버 버전:                        11.8.3-MariaDB - mariadb.org binary distribution
-- 서버 OS:                        Win64
-- HeidiSQL 버전:                  12.11.0.7065
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- 테이블 bookstore.authors 구조 내보내기
CREATE TABLE IF NOT EXISTS `authors` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `pen_name` varchar(100) NOT NULL,
  `birth_year` smallint(6) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.books 구조 내보내기
CREATE TABLE IF NOT EXISTS `books` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `seller_id` bigint(20) NOT NULL,
  `title` varchar(150) NOT NULL,
  `publisher` varchar(100) NOT NULL,
  `summary` text DEFAULT NULL,
  `isbn` varchar(20) NOT NULL,
  `language` varchar(50) NOT NULL DEFAULT 'Korean',
  `price` int(11) NOT NULL,
  `publication_date` date NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_books_isbn` (`isbn`),
  KEY `idx_books_seller_id` (`seller_id`),
  CONSTRAINT `fk_books_seller` FOREIGN KEY (`seller_id`) REFERENCES `sellers` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_books_price` CHECK (`price` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.book_authors 구조 내보내기
CREATE TABLE IF NOT EXISTS `book_authors` (
  `book_id` bigint(20) NOT NULL,
  `author_id` bigint(20) NOT NULL,
  PRIMARY KEY (`book_id`,`author_id`),
  KEY `idx_book_authors_author` (`author_id`,`book_id`),
  CONSTRAINT `fk_book_authors_author` FOREIGN KEY (`author_id`) REFERENCES `authors` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_book_authors_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.book_categories 구조 내보내기
CREATE TABLE IF NOT EXISTS `book_categories` (
  `book_id` bigint(20) NOT NULL,
  `category_id` bigint(20) NOT NULL,
  PRIMARY KEY (`book_id`,`category_id`),
  KEY `idx_book_categories_category` (`category_id`,`book_id`),
  CONSTRAINT `fk_book_categories_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_book_categories_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.carts 구조 내보내기
CREATE TABLE IF NOT EXISTS `carts` (
  `user_id` bigint(20) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_carts_user` (`user_id`),
  CONSTRAINT `fk_carts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.cart_items 구조 내보내기
CREATE TABLE IF NOT EXISTS `cart_items` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `cart_user_id` bigint(20) NOT NULL,
  `book_id` bigint(20) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cart_items_cart_book` (`cart_user_id`,`book_id`),
  KEY `idx_cart_items_cart_active` (`cart_user_id`,`is_active`),
  KEY `idx_cart_items_book_active` (`book_id`,`is_active`),
  CONSTRAINT `fk_cart_items_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_cart_items_cart` FOREIGN KEY (`cart_user_id`) REFERENCES `carts` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_cart_items_quantity` CHECK (`quantity` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.categories 구조 내보내기
CREATE TABLE IF NOT EXISTS `categories` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(60) NOT NULL,
  `parent_id` bigint(20) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_name` (`name`),
  KEY `fk_categories_parent` (`parent_id`),
  CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.comments 구조 내보내기
CREATE TABLE IF NOT EXISTS `comments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `review_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_comments_review_created` (`review_id`,`created_at`),
  KEY `idx_comments_user_created` (`user_id`,`created_at`),
  CONSTRAINT `fk_comments_review` FOREIGN KEY (`review_id`) REFERENCES `reviews` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.comment_likes 구조 내보내기
CREATE TABLE IF NOT EXISTS `comment_likes` (
  `comment_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`comment_id`,`user_id`),
  KEY `idx_comment_likes_comment_active` (`comment_id`,`is_active`),
  KEY `fk_comment_likes_user` (`user_id`),
  CONSTRAINT `fk_comment_likes_comment` FOREIGN KEY (`comment_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_comment_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.coupons 구조 내보내기
CREATE TABLE IF NOT EXISTS `coupons` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `discount_rate` int(11) NOT NULL,
  `start_at` datetime NOT NULL,
  `end_at` datetime NOT NULL,
  `status` enum('SCHEDULED','ACTIVE','PAUSED','ENDED') NOT NULL DEFAULT 'SCHEDULED',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_coupons_status_period` (`status`,`start_at`,`end_at`),
  CONSTRAINT `chk_coupons_rate` CHECK (`discount_rate` between 1 and 90),
  CONSTRAINT `chk_coupons_period` CHECK (`start_at` < `end_at`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.favorites 구조 내보내기
CREATE TABLE IF NOT EXISTS `favorites` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `book_id` bigint(20) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_favorites_user_book` (`user_id`,`book_id`),
  UNIQUE KEY `uk_favorites_user_book` (`user_id`,`book_id`),
  KEY `idx_favorites_book_created` (`book_id`,`created_at`),
  KEY `idx_favorites_user_created` (`user_id`,`created_at`),
  CONSTRAINT `fk_favorites_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_favorites_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.libraries 구조 내보내기
CREATE TABLE IF NOT EXISTS `libraries` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `book_id` bigint(20) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_libraries_user_book` (`user_id`,`book_id`),
  KEY `idx_libraries_book_created` (`book_id`,`created_at`),
  KEY `idx_libraries_user_created` (`user_id`,`created_at`),
  CONSTRAINT `fk_libraries_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_libraries_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.orders 구조 내보내기
CREATE TABLE IF NOT EXISTS `orders` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `subtotal_amount` int(11) NOT NULL,
  `coupon_discount` int(11) NOT NULL DEFAULT 0,
  `total_amount` int(11) NOT NULL,
  `status` enum('CREATED','PAID','CANCELLED','REFUNDED') NOT NULL DEFAULT 'CREATED',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_orders_user_created` (`user_id`,`created_at`),
  KEY `idx_orders_status_created` (`status`,`created_at`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `chk_orders_subtotal` CHECK (`subtotal_amount` >= 0),
  CONSTRAINT `chk_orders_coupon_discount` CHECK (`coupon_discount` >= 0),
  CONSTRAINT `chk_orders_total` CHECK (`total_amount` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.order_coupons 구조 내보내기
CREATE TABLE IF NOT EXISTS `order_coupons` (
  `order_id` bigint(20) NOT NULL,
  `coupon_id` bigint(20) NOT NULL,
  `amount` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`order_id`,`coupon_id`),
  KEY `fk_order_coupons_coupon` (`coupon_id`),
  CONSTRAINT `fk_order_coupons_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_order_coupons_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_order_coupons_amount` CHECK (`amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.order_items 구조 내보내기
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `order_id` bigint(20) NOT NULL,
  `book_id` bigint(20) NOT NULL,
  `title_snapshot` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` int(11) NOT NULL,
  `total_amount` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `idx_order_items_book_created` (`book_id`,`created_at`),
  CONSTRAINT `fk_order_items_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_order_items_quantity` CHECK (`quantity` > 0),
  CONSTRAINT `chk_order_items_unit_price` CHECK (`unit_price` >= 0),
  CONSTRAINT `chk_order_items_total` CHECK (`total_amount` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.reviews 구조 내보내기
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `book_id` bigint(20) NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reviews_user_book` (`user_id`,`book_id`),
  KEY `idx_reviews_book` (`book_id`),
  CONSTRAINT `fk_reviews_book` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_reviews_rating` CHECK (`rating` between 1 and 5)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.review_likes 구조 내보내기
CREATE TABLE IF NOT EXISTS `review_likes` (
  `review_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`review_id`,`user_id`),
  KEY `idx_review_likes_review_active` (`review_id`,`is_active`),
  KEY `fk_review_likes_user` (`user_id`),
  CONSTRAINT `fk_review_likes_review` FOREIGN KEY (`review_id`) REFERENCES `reviews` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_review_likes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.sellers 구조 내보내기
CREATE TABLE IF NOT EXISTS `sellers` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `business_name` varchar(100) NOT NULL,
  `business_number` varchar(20) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `address` varchar(255) NOT NULL,
  `payout_bank` varchar(50) NOT NULL,
  `payout_account` varchar(50) NOT NULL,
  `payout_holder` varchar(50) NOT NULL,
  `commission_rate` int(11) NOT NULL DEFAULT 10,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sellers_business_number` (`business_number`),
  UNIQUE KEY `uq_sellers_email` (`email`),
  CONSTRAINT `chk_sellers_commission_rate` CHECK (`commission_rate` between 0 and 90)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.users 구조 내보내기
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(60) NOT NULL,
  `name` varchar(50) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `birth_year` smallint(6) NOT NULL,
  `gender` enum('MALE','FEMALE','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  `region_code` varchar(10) NOT NULL,
  `role` enum('USER','ADMIN') NOT NULL DEFAULT 'USER',
  `status` enum('ACTIVE','SUSPENDED','DELETED') NOT NULL DEFAULT 'ACTIVE',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `phone_number` (`phone_number`),
  CONSTRAINT `chk_users_birth_year` CHECK (`birth_year` between 1900 and 2100)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.user_coupons 구조 내보내기
CREATE TABLE IF NOT EXISTS `user_coupons` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `coupon_id` bigint(20) NOT NULL,
  `status` enum('ISSUED','USED') NOT NULL DEFAULT 'ISSUED',
  `issued_at` datetime NOT NULL DEFAULT current_timestamp(),
  `used_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_coupon` (`user_id`,`coupon_id`),
  KEY `idx_user_status` (`user_id`,`status`),
  KEY `fk_uc_coupon` (`coupon_id`),
  CONSTRAINT `fk_uc_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`),
  CONSTRAINT `fk_uc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

-- 테이블 bookstore.user_refresh_tokens 구조 내보내기
CREATE TABLE IF NOT EXISTS `user_refresh_tokens` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `refresh_token_hash` varchar(100) NOT NULL,
  `user_agent` varchar(150) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_refresh_tokens_hash` (`refresh_token_hash`),
  KEY `fk_user_refresh_tokens_user` (`user_id`),
  CONSTRAINT `fk_user_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 내보낼 데이터가 선택되어 있지 않습니다.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;

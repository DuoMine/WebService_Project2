// models/initModels.js
import { DataTypes } from "sequelize";

export function initModels(sequelize) {
  const Authors = sequelize.define(
    "authors",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      pen_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      birth_year: {
        type: DataTypes.SMALLINT,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "authors",
      timestamps: false,
    }
  );

  const Books = sequelize.define(
    "books",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      seller_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      publisher: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isbn: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      language: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "Korean",
      },
      price: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      publication_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "books",
      timestamps: false,
    }
  );

  const BookAuthors = sequelize.define(
    "book_authors",
    {
      book_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      author_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
    },
    {
      tableName: "book_authors",
      timestamps: false,
    }
  );

  const BookCategories = sequelize.define(
    "book_categories",
    {
      book_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      category_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
    },
    {
      tableName: "book_categories",
      timestamps: false,
    }
  );

  const BookDiscounts = sequelize.define(
    "book_discounts",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      book_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      discount_rate: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      start_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("SCHEDULED", "ACTIVE", "PAUSED", "ENDED"),
        allowNull: false,
        defaultValue: "SCHEDULED",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "book_discounts",
      timestamps: false,
    }
  );

  const BookViews = sequelize.define(
    "book_views",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      book_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      viewed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "book_views",
      timestamps: false,
    }
  );

  const CartItems = sequelize.define(
    "cart_items",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      cart_user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      book_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      is_active: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
      },
    },
    {
      tableName: "cart_items",
      timestamps: false,
    }
  );

  const Carts = sequelize.define(
    "carts",
    {
      user_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "carts",
      timestamps: false,
    }
  );

  const Categories = sequelize.define(
    "categories",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(60),
        allowNull: false,
        unique: true,
      },
      parent_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "categories",
      timestamps: false,
    }
  );

  const CommentLikes = sequelize.define(
    "comment_likes",
    {
      comment_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      is_active: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "comment_likes",
      timestamps: false,
    }
  );

  const Comments = sequelize.define(
    "comments",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      review_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "comments",
      timestamps: false,
    }
  );

  const Coupons = sequelize.define(
    "coupons",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      discount_rate: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      start_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("SCHEDULED", "ACTIVE", "PAUSED", "ENDED"),
        allowNull: false,
        defaultValue: "SCHEDULED",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "coupons",
      timestamps: false,
    }
  );

  const Favorites = sequelize.define(
    "favorites",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      book_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "favorites",
      timestamps: false,
    }
  );

  const Libraries = sequelize.define(
    "libraries",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      book_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "libraries",
      timestamps: false,
    }
  );

  const UserCoupons = sequelize.define(
    "user_coupons",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      coupon_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("ISSUED", "USED"),
        allowNull: false,
        defaultValue: "ISSUED",
      },
      issued_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      used_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "user_coupons",
      timestamps: false,
      underscored: true,
      indexes: [
        { unique: true, fields: ["user_id", "coupon_id"] },
        { fields: ["user_id", "status"] },
      ],
    }
  );

  const OrderCoupons = sequelize.define(
    "order_coupons",
    {
      order_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      coupon_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "order_coupons",
      timestamps: false,
    }
  );

  const OrderItems = sequelize.define(
    "order_items",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      order_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      book_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      title_snapshot: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      unit_price: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      total_amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "order_items",
      timestamps: false,
    }
  );

  const Orders = sequelize.define(
    "orders",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      subtotal_amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      coupon_discount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("CREATED", "CANCELLED"),
        allowNull: false,
        defaultValue: "CREATED",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "orders",
      timestamps: false,
    }
  );

  const ReviewLikes = sequelize.define(
    "review_likes",
    {
      review_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      is_active: {
        type: DataTypes.TINYINT(1),
        default: 1,
        allowNull: false,
      },
    },
    {
      tableName: "review_likes",
      timestamps: false,
    }
  );

  const Reviews = sequelize.define(
    "reviews",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      book_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "reviews",
      timestamps: false,
    }
  );

  const Sellers = sequelize.define(
    "sellers",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      business_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      business_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      payout_bank: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      payout_account: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      payout_holder: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      commission_rate: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "sellers",
      timestamps: false,
    }
  );

  const SettlementItems = sequelize.define(
    "settlement_items",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      settlement_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      book_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      quantity_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sales_amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      unit_price_avg: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "settlement_items",
      timestamps: false,
    }
  );

  const Settlements = sequelize.define(
    "settlements",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      seller_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      period_start: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      period_end: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      total_sales: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      commission: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      final_payout: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      settlement_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("CREATED", "PAID"),
        allowNull: false,
        defaultValue: "CREATED",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "settlements",
      timestamps: false,
    }
  );

  const UserRefreshTokens = sequelize.define(
    "user_refresh_tokens",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      refresh_token_hash: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      user_agent: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      revoked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "user_refresh_tokens",
      timestamps: false,
    }
  );

  const Users = sequelize.define(
    "users",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      phone_number: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
      },
      birth_year: {
        type: DataTypes.SMALLINT,
        allowNull: false,
      },
      gender: {
        type: DataTypes.ENUM("MALE", "FEMALE", "UNKNOWN"),
        allowNull: false,
        defaultValue: "UNKNOWN",
      },
      region_code: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("USER", "ADMIN"),
        allowNull: false,
        defaultValue: "USER",
      },
      status: {
        type: DataTypes.ENUM("ACTIVE", "SUSPENDED", "DELETED"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "users",
      timestamps: false,
    }
  );

  // ----------------------------
  // Associations (FK 기반)
  // ----------------------------

  // Users - UserRefreshTokens (1:N)
  UserRefreshTokens.belongsTo(Users, { foreignKey: "user_id", as: "user" });
  Users.hasMany(UserRefreshTokens, { foreignKey: "user_id", as: "refreshTokens" });

  // Sellers - Books (1:N)
  Books.belongsTo(Sellers, { foreignKey: "seller_id", as: "seller" });
  Sellers.hasMany(Books, { foreignKey: "seller_id", as: "books" });

  // Books - Authors (M:N) through book_authors
  Books.belongsToMany(Authors, {
    through: BookAuthors,
    foreignKey: "book_id",
    otherKey: "author_id",
    as: "authors",
  });
  Authors.belongsToMany(Books, {
    through: BookAuthors,
    foreignKey: "author_id",
    otherKey: "book_id",
    as: "books",
  });

  // Books - Categories (M:N) through book_categories
  Books.belongsToMany(Categories, {
    through: BookCategories,
    foreignKey: "book_id",
    otherKey: "category_id",
    as: "categories",
  });
  Categories.belongsToMany(Books, {
    through: BookCategories,
    foreignKey: "category_id",
    otherKey: "book_id",
    as: "books",
  });

  // Categories - Categories (self, 1:N) parent-child
  Categories.belongsTo(Categories, { foreignKey: "parent_id", as: "parent" });
  Categories.hasMany(Categories, { foreignKey: "parent_id", as: "children" });

  // Favorites (Users 1:N Favorites, Books 1:N Favorites)
  Favorites.belongsTo(Users, { foreignKey: "user_id", as: "user" });
  Users.hasMany(Favorites, { foreignKey: "user_id", as: "favorites" });

  Favorites.belongsTo(Books, { foreignKey: "book_id", as: "book" });
  Books.hasMany(Favorites, { foreignKey: "book_id", as: "favorites" });

  // Libraries (Users 1:N Libraries, Books 1:N Libraries)
  Libraries.belongsTo(Users, { foreignKey: "user_id", as: "user" });
  Users.hasMany(Libraries, { foreignKey: "user_id", as: "libraries" });

  Libraries.belongsTo(Books, { foreignKey: "book_id", as: "book" });
  Books.hasMany(Libraries, { foreignKey: "book_id", as: "libraries" });

  // Carts (Users 1:1 Carts)  - carts.user_id is PK + FK
  Carts.belongsTo(Users, { foreignKey: "user_id", as: "user" });
  Users.hasOne(Carts, { foreignKey: "user_id", as: "cart" });

  // CartItems (Carts 1:N CartItems, Books 1:N CartItems)
  CartItems.belongsTo(Carts, { foreignKey: "cart_user_id", targetKey: "user_id", as: "cart" });
  Carts.hasMany(CartItems, { foreignKey: "cart_user_id", sourceKey: "user_id", as: "items" });

  CartItems.belongsTo(Books, { foreignKey: "book_id", as: "book" });
  Books.hasMany(CartItems, { foreignKey: "book_id", as: "cartItems" });

  // Reviews (Users 1:N Reviews, Books 1:N Reviews)
  Reviews.belongsTo(Users, { foreignKey: "user_id", as: "user" });
  Users.hasMany(Reviews, { foreignKey: "user_id", as: "reviews" });

  Reviews.belongsTo(Books, { foreignKey: "book_id", as: "book" });
  Books.hasMany(Reviews, { foreignKey: "book_id", as: "reviews" });

  // ReviewLikes (Reviews 1:N ReviewLikes, Users 1:N ReviewLikes)
  ReviewLikes.belongsTo(Reviews, { foreignKey: "review_id", as: "review" });
  Reviews.hasMany(ReviewLikes, { foreignKey: "review_id", as: "likes" });

  ReviewLikes.belongsTo(Users, { foreignKey: "user_id", as: "user" });
  Users.hasMany(ReviewLikes, { foreignKey: "user_id", as: "reviewLikes" });

  // Comments (Reviews 1:N Comments, Users 1:N Comments)
  Comments.belongsTo(Reviews, { foreignKey: "review_id", as: "review" });
  Reviews.hasMany(Comments, { foreignKey: "review_id", as: "comments" });

  Comments.belongsTo(Users, { foreignKey: "user_id", as: "user" });
  Users.hasMany(Comments, { foreignKey: "user_id", as: "comments" });

  // CommentLikes (Comments 1:N CommentLikes, Users 1:N CommentLikes)
  CommentLikes.belongsTo(Comments, { foreignKey: "comment_id", as: "comment" });
  Comments.hasMany(CommentLikes, { foreignKey: "comment_id", as: "likes" });

  CommentLikes.belongsTo(Users, { foreignKey: "user_id", as: "user" });
  Users.hasMany(CommentLikes, { foreignKey: "user_id", as: "commentLikes" });

  // BookViews (Books 1:N BookViews, Users 1:N BookViews) - user_id can be null
  BookViews.belongsTo(Books, { foreignKey: "book_id", as: "book" });
  Books.hasMany(BookViews, { foreignKey: "book_id", as: "views" });

  BookViews.belongsTo(Users, { foreignKey: "user_id", as: "user" });
  Users.hasMany(BookViews, { foreignKey: "user_id", as: "bookViews" });

  // Orders (Users 1:N Orders)
  Orders.belongsTo(Users, { foreignKey: "user_id", as: "user" });
  Users.hasMany(Orders, { foreignKey: "user_id", as: "orders" });

  // OrderItems (Orders 1:N OrderItems, Books 1:N OrderItems)
  OrderItems.belongsTo(Orders, { foreignKey: "order_id", as: "order" });
  Orders.hasMany(OrderItems, { foreignKey: "order_id", as: "items" });

  OrderItems.belongsTo(Books, { foreignKey: "book_id", as: "book" });
  Books.hasMany(OrderItems, { foreignKey: "book_id", as: "orderItems" });

  // UserCoupons (Users 1:N Usercoupons, coupons 1:N UserCoupons)
  UserCoupons.belongsTo(Users, { foreignKey: "user_id" });
  UserCoupons.belongsTo(Coupons, { foreignKey: "coupon_id" });

  // OrderCoupons (Orders 1:N OrderCoupons, Coupons 1:N OrderCoupons)
  OrderCoupons.belongsTo(Orders, { foreignKey: "order_id", as: "order" });
  Orders.hasMany(OrderCoupons, { foreignKey: "order_id", as: "orderCoupons" });

  OrderCoupons.belongsTo(Coupons, { foreignKey: "coupon_id", as: "coupon" });
  Coupons.hasMany(OrderCoupons, { foreignKey: "coupon_id", as: "orderCoupons" });

  // BookDiscounts (Books 1:N BookDiscounts)
  BookDiscounts.belongsTo(Books, { foreignKey: "book_id", as: "book" });
  Books.hasMany(BookDiscounts, { foreignKey: "book_id", as: "discounts" });

  // Settlements (Sellers 1:N Settlements)
  Settlements.belongsTo(Sellers, { foreignKey: "seller_id", as: "seller" });
  Sellers.hasMany(Settlements, { foreignKey: "seller_id", as: "settlements" });

  // SettlementItems (Settlements 1:N SettlementItems, Books 1:N SettlementItems)
  SettlementItems.belongsTo(Settlements, { foreignKey: "settlement_id", as: "settlement" });
  Settlements.hasMany(SettlementItems, { foreignKey: "settlement_id", as: "items" });

  SettlementItems.belongsTo(Books, { foreignKey: "book_id", as: "book" });
  Books.hasMany(SettlementItems, { foreignKey: "book_id", as: "settlementItems" });


  return {
    Authors,
    Books,
    BookAuthors,
    BookCategories,
    BookDiscounts,
    BookViews,
    CartItems,
    Carts,
    Categories,
    CommentLikes,
    Comments,
    Coupons,
    Favorites,
    Libraries,
    OrderCoupons,
    OrderItems,
    Orders,
    ReviewLikes,
    Reviews,
    Sellers,
    SettlementItems,
    Settlements,
    UserRefreshTokens,
    Users,
    UserCoupons,
  };
}

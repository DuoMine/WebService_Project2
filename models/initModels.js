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
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
        type: DataTypes.BOOLEAN,
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
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "libraries",
      timestamps: false,
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
      status: {
        type: DataTypes.ENUM("CREATED", "PAID", "CANCELLED", "REFUNDED"),
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
      subtotal_items: {
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
        type: DataTypes.ENUM("CREATED", "PAID", "CANCELLED", "REFUNDED"),
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
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      status: {
        type: DataTypes.ENUM("ACTIVE", "SUSPENDED"),
        allowNull: false,
        defaultValue: "ACTIVE",
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

  // 🔗 여기서부터 associations 묶을 수 있음 (원하면 나중에 채우자)
  // 예시:
  // Books.belongsTo(Sellers, { foreignKey: "seller_id" });
  // Users.hasMany(Orders, { foreignKey: "user_id" });
  // Orders.belongsTo(Users, { foreignKey: "user_id" });

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
  };
}

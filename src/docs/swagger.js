import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Online Bookstore API",
      version: "1.0.0"
    }
  },
  apis: ["./src/routes/*.js"], // 라우터 주석에서 자동으로 읽어감
});

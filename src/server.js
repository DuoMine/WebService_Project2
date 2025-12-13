// src/server.js
import { createApp } from "./app.js";

const PORT = process.env.PORT || 3000;

const app = await createApp();
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

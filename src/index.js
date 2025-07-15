import express from "express";

const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Eazika backend API!",
    status: "success",
  });
});

app.listen(PORT, () => {
  console.log(`⚙️ Server is running at port: ${PORT}`);
});

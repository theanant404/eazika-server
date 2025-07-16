import express from "express";
import { userRouter } from "./auth.routes.js";

const router = express();
// const router = Router();

// router.get("/user", (req, res) => {
//   res.json({ message: "User route is working" });
// });
router.use("/user", userRouter);

export default router;

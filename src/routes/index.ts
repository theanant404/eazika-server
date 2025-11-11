import { Router } from "express";
// import userRouter from "./user.route.js";

const router = Router();

router.use("/users", (_, res) => res.send("User route is under construction."));

router.get("/shop", (_, res) => res.send("Shop route is under construction."));

router.get("/customers", (_, res) =>
  res.send("Customers route is under construction.")
);
router.get("/deliveries", (_, res) =>
  res.send("Deliveries route is under construction.")
);

router.get("/admin", (_, res) =>
  res.send("Admin route is under construction.")
);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import ordersRouter from "./orders.js";
import authRouter from "./auth.js";
import adminRouter from "./admin.js";
import customerAuthRouter from "./customer-auth.js";
import customerRouter from "./customer.js";
import storeRouter from "./store.js";
import ratingsRouter from "./ratings.js";
import adminAnalyticsRouter from "./admin-analytics.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ordersRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(customerAuthRouter);
router.use(customerRouter);
router.use(storeRouter);
router.use(ratingsRouter);
router.use(adminAnalyticsRouter);

export default router;

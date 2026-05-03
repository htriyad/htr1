import { Router, type IRouter } from "express";
import healthRouter     from "./health";
import roseRouter       from "./redrose";
import gamifRouter      from "./gamification";
import aiRouter         from "./ai";
import socialRouter     from "./social";
import fractalRouter    from "./fractal";

const router: IRouter = Router();

router.use(healthRouter);
router.use(roseRouter);
router.use("/gamification", gamifRouter);
router.use("/ai",           aiRouter);
router.use("/fractal",      fractalRouter);
router.use(socialRouter);

export default router;

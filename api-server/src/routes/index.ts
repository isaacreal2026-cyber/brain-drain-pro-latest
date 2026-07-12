import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import intelligenceRouter from "./intelligence";
import recommendationsRouter from "./recommendations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(intelligenceRouter);
router.use(recommendationsRouter);

export default router;

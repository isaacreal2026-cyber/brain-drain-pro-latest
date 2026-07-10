import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import intelligenceRouter from "./intelligence";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(intelligenceRouter);

export default router;

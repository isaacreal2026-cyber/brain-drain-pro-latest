import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import intelligenceRouter from "./intelligence";
import recommendationsRouter from "./recommendations";
import clientErrorsRouter from "./client-errors";
import feedRouter from "./feed";
import postsRouter from "./posts";
import topicsRouter from "./topics";
import brainsRouter from "./brains";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(intelligenceRouter);
router.use(recommendationsRouter);
router.use(clientErrorsRouter);
router.use(feedRouter);
router.use(postsRouter);
router.use(topicsRouter);
router.use(brainsRouter);

export default router;

import { Router, type IRouter } from "express";
import { SimulationEngine } from "../lib/simulation-engine";

const router: IRouter = Router();
const simulation = new SimulationEngine();

router.get("/analytics/trends", (_req, res) => {
  const summary = simulation.getSimulationSummary();

  // Calculate aggregate metrics
  const totalUsers = summary.totalUsers;
  const continentTrends = summary.demographics.reduce((acc: any, curr) => {
    acc[curr.continent] = (acc[curr.continent] || 0) + curr.count;
    return acc;
  }, {});

  const trendsByContinent = Object.entries(continentTrends).map(([continent, count]) => ({
    continent,
    percentage: ((count as number) / totalUsers) * 100,
    userCount: count
  }));

  res.json({
    totalUsers,
    trendsByContinent,
    usageTrends: summary.usageTrends,
    feedbackSummary: summary.feedback,
    generatedAt: summary.timestamp
  });
});

export default router;

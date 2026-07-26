export interface DemographicStats {
  continent: string;
  gender: string;
  ageGroup: string;
  count: number;
}

export interface UsageTrend {
  timeRange: string;
  usagePercentage: number;
  averageTimeSpentMinutes: number;
}

export interface UserFeedback {
  category: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  count: number;
  commonComments: string[];
}

export class SimulationEngine {
  private totalUsers = 1_000_000;

  generateDemographics(): DemographicStats[] {
    const continents = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];
    const genders = ['Male', 'Female', 'Non-binary'];
    const ageGroups = ['13-18', '19-25', '26-40', '41-60', '60+'];

    const stats: DemographicStats[] = [];

    // Simple distribution for simulation purposes
    const continentDist = [0.17, 0.59, 0.10, 0.08, 0.05, 0.01];
    const genderDist = [0.49, 0.49, 0.02];
    const ageDist = [0.15, 0.25, 0.35, 0.20, 0.05];

    continents.forEach((continent, cIdx) => {
      genders.forEach((gender, gIdx) => {
        ageGroups.forEach((ageGroup, aIdx) => {
          const count = Math.floor(
            this.totalUsers *
            continentDist[cIdx] *
            genderDist[gIdx] *
            ageDist[aIdx]
          );
          stats.push({ continent, gender, ageGroup, count });
        });
      });
    });

    return stats;
  }

  generateUsageTrends(): UsageTrend[] {
    return [
      { timeRange: '00:00-04:00', usagePercentage: 12, averageTimeSpentMinutes: 15 },
      { timeRange: '04:00-08:00', usagePercentage: 18, averageTimeSpentMinutes: 20 },
      { timeRange: '08:00-12:00', usagePercentage: 45, averageTimeSpentMinutes: 45 },
      { timeRange: '12:00-16:00', usagePercentage: 55, averageTimeSpentMinutes: 35 },
      { timeRange: '16:00-20:00', usagePercentage: 75, averageTimeSpentMinutes: 60 },
      { timeRange: '20:00-00:00', usagePercentage: 40, averageTimeSpentMinutes: 25 },
    ];
  }

  generateFeedback(): UserFeedback[] {
    return [
      {
        category: 'Performance',
        sentiment: 'negative',
        count: 150_000,
        commonComments: ['App lags during peak hours', 'Initial load is slow on 3G']
      },
      {
        category: 'Content',
        sentiment: 'positive',
        count: 600_000,
        commonComments: ['Love the brain variations', 'Pathway missions are very clear']
      },
      {
        category: 'UX/UI',
        sentiment: 'neutral',
        count: 250_000,
        commonComments: ['Dark mode is great but need more themes', 'Navigation could be simpler']
      }
    ];
  }

  getSimulationSummary() {
    return {
      totalUsers: this.totalUsers,
      demographics: this.generateDemographics(),
      usageTrends: this.generateUsageTrends(),
      feedback: this.generateFeedback(),
      timestamp: new Date().toISOString()
    };
  }
}

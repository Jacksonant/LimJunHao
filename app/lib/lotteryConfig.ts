export type LotteryId = 'supreme-toto-6-58';

export interface LotteryConfig {
  id: LotteryId;
  name: string;
  tableName: string;
  range: number;
  picks: number;
  sessionCostRM: number;
  payoutByMatch: Partial<Record<number, number>>;
}

export const LOTTERY_CONFIGS: LotteryConfig[] = [
  {
    id: 'supreme-toto-6-58',
    name: 'Supreme Toto 6/58',
    tableName: 'supreme_toto_6_58',
    range: 58,
    picks: 6,
    sessionCostRM: 2,
    payoutByMatch: {
      3: 8,
      4: 80,
      5: 6888,
    },
  },
];

export const DEFAULT_LOTTERY_ID: LotteryId = LOTTERY_CONFIGS[0].id;

const LOTTERY_CONFIG_MAP: Record<LotteryId, LotteryConfig> = LOTTERY_CONFIGS.reduce(
  (acc, config) => {
    acc[config.id] = config;
    return acc;
  },
  {} as Record<LotteryId, LotteryConfig>
);

export const getLotteryConfig = (type?: string): LotteryConfig => {
  if (!type) return LOTTERY_CONFIG_MAP[DEFAULT_LOTTERY_ID];
  return LOTTERY_CONFIG_MAP[type as LotteryId] ?? LOTTERY_CONFIG_MAP[DEFAULT_LOTTERY_ID];
};

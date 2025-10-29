import { Position } from '../types';

/**
 * Calculate average cost per share
 */
export const calculateAverageCost = (costBasis: number, shares: number): number => {
  if (shares === 0) return 0;
  return costBasis / shares;
};

/**
 * Calculate market value
 */
export const calculateMarketValue = (shares: number, currentPrice?: number): number | undefined => {
  if (currentPrice === undefined) return undefined;
  return shares * currentPrice;
};

/**
 * Calculate unrealized profit/loss
 */
export const calculateUnrealizedPL = (marketValue?: number, costBasis?: number): number | undefined => {
  if (marketValue === undefined || costBasis === undefined) return undefined;
  return marketValue - costBasis;
};

/**
 * Calculate unrealized P&L percentage
 */
export const calculateUnrealizedPLPercent = (unrealizedPL?: number, costBasis?: number): number | undefined => {
  if (unrealizedPL === undefined || costBasis === undefined || costBasis === 0) return undefined;
  return (unrealizedPL / costBasis) * 100;
};

/**
 * Update calculated fields for a position
 */
export const updatePositionCalculations = (position: Partial<Position>): Position => {
  const shares = position.shares || 0;
  const costBasis = position.costBasis || 0;
  const currentPrice = position.currentPrice;

  const averageCost = calculateAverageCost(costBasis, shares);
  const marketValue = calculateMarketValue(shares, currentPrice);
  const unrealizedPL = calculateUnrealizedPL(marketValue, costBasis);

  return {
    ...position,
    averageCost,
    marketValue,
    unrealizedPL
  } as Position;
};

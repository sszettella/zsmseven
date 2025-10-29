import { OpeningAction, ClosingAction } from '../types';

/**
 * Calculate the total cost for opening a position
 * For BUY_TO_OPEN: Cost is positive (money paid out)
 * For SELL_TO_OPEN: Cost is negative (money received - shown as positive credit)
 */
export const calculateOpenTotalCost = (
  openAction: OpeningAction,
  openQuantity: number,
  openPremium: number,
  openCommission: number
): number => {
  const premiumCost = openPremium * openQuantity * 100;

  if (openAction === OpeningAction.BUY_TO_OPEN) {
    // Debit: money paid (premium + commission)
    return premiumCost + openCommission;
  } else {
    // SELL_TO_OPEN: Credit: money received (premium - commission)
    return premiumCost - openCommission;
  }
};

/**
 * Calculate the total cost for closing a position
 * For SELL_TO_CLOSE: Cost is negative (money received - shown as positive credit)
 * For BUY_TO_CLOSE: Cost is positive (money paid out)
 */
export const calculateCloseTotalCost = (
  closeAction: ClosingAction,
  closeQuantity: number,
  closePremium: number,
  closeCommission: number
): number => {
  const premiumCost = closePremium * closeQuantity * 100;

  if (closeAction === ClosingAction.SELL_TO_CLOSE) {
    // Credit: money received (premium - commission)
    return premiumCost - closeCommission;
  } else {
    // BUY_TO_CLOSE: Debit: money paid (premium + commission)
    return premiumCost + closeCommission;
  }
};

/**
 * Calculate profit/loss for a closed trade
 * For BUY_TO_OPEN (Long): P/L = closeTotalCost - openTotalCost
 * For SELL_TO_OPEN (Short): P/L = openTotalCost - closeTotalCost
 */
export const calculateProfitLoss = (
  openAction: OpeningAction,
  openTotalCost: number,
  closeTotalCost: number
): number => {
  if (openAction === OpeningAction.BUY_TO_OPEN) {
    // Long position: profit if sold for more than bought
    return closeTotalCost - openTotalCost;
  } else {
    // Short position: profit if bought back for less than sold
    return openTotalCost - closeTotalCost;
  }
};

/**
 * Validate that the closing action pairs correctly with the opening action
 */
export const isValidClosingAction = (
  openAction: OpeningAction,
  closeAction: ClosingAction
): boolean => {
  if (openAction === OpeningAction.BUY_TO_OPEN) {
    return closeAction === ClosingAction.SELL_TO_CLOSE;
  } else {
    return closeAction === ClosingAction.BUY_TO_CLOSE;
  }
};

import {
  CreateTradeRequest,
  UpdateTradeRequest,
  CloseTradeRequest,
  OpeningAction,
  ClosingAction,
  OptionType
} from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export const validateCreateTradeRequest = (body: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!body.symbol || typeof body.symbol !== 'string') {
    errors.push({ field: 'symbol', message: 'Symbol is required and must be a string' });
  } else if (body.symbol.length < 1 || body.symbol.length > 10) {
    errors.push({ field: 'symbol', message: 'Symbol must be 1-10 characters' });
  } else if (body.symbol !== body.symbol.toUpperCase()) {
    errors.push({ field: 'symbol', message: 'Symbol must be uppercase' });
  }

  if (!body.optionType || !Object.values(OptionType).includes(body.optionType)) {
    errors.push({ field: 'optionType', message: 'Option type must be "call" or "put"' });
  }

  if (body.strikePrice === undefined || typeof body.strikePrice !== 'number') {
    errors.push({ field: 'strikePrice', message: 'Strike price is required and must be a number' });
  } else if (body.strikePrice <= 0) {
    errors.push({ field: 'strikePrice', message: 'Strike price must be greater than 0' });
  }

  if (!body.expirationDate || typeof body.expirationDate !== 'string') {
    errors.push({ field: 'expirationDate', message: 'Expiration date is required (YYYY-MM-DD format)' });
  } else if (!isValidISODate(body.expirationDate)) {
    errors.push({ field: 'expirationDate', message: 'Expiration date must be in YYYY-MM-DD format' });
  }

  if (!body.openAction || !Object.values(OpeningAction).includes(body.openAction)) {
    errors.push({ field: 'openAction', message: 'Open action must be "buy_to_open" or "sell_to_open"' });
  }

  if (body.openQuantity === undefined || typeof body.openQuantity !== 'number') {
    errors.push({ field: 'openQuantity', message: 'Open quantity is required and must be a number' });
  } else if (!Number.isInteger(body.openQuantity) || body.openQuantity <= 0) {
    errors.push({ field: 'openQuantity', message: 'Open quantity must be a positive integer' });
  }

  if (body.openPremium === undefined || typeof body.openPremium !== 'number') {
    errors.push({ field: 'openPremium', message: 'Open premium is required and must be a number' });
  } else if (body.openPremium < 0.01) {
    errors.push({ field: 'openPremium', message: 'Open premium must be at least 0.01' });
  }

  if (body.openCommission === undefined || typeof body.openCommission !== 'number') {
    errors.push({ field: 'openCommission', message: 'Open commission is required and must be a number' });
  } else if (body.openCommission < 0) {
    errors.push({ field: 'openCommission', message: 'Open commission must be 0 or greater' });
  }

  if (!body.openTradeDate || typeof body.openTradeDate !== 'string') {
    errors.push({ field: 'openTradeDate', message: 'Open trade date is required (YYYY-MM-DD format)' });
  } else if (!isValidISODate(body.openTradeDate)) {
    errors.push({ field: 'openTradeDate', message: 'Open trade date must be in YYYY-MM-DD format' });
  }

  // Optional fields
  if (body.portfolioId !== undefined && body.portfolioId !== null) {
    if (typeof body.portfolioId !== 'string') {
      errors.push({ field: 'portfolioId', message: 'Portfolio ID must be a string if provided' });
    }
  }

  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== 'string') {
      errors.push({ field: 'notes', message: 'Notes must be a string if provided' });
    } else if (body.notes.length > 1000) {
      errors.push({ field: 'notes', message: 'Notes must be 1000 characters or less' });
    }
  }

  return errors;
};

export const validateUpdateTradeRequest = (body: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  // All fields are optional, but validate if present
  if (body.symbol !== undefined) {
    if (typeof body.symbol !== 'string') {
      errors.push({ field: 'symbol', message: 'Symbol must be a string' });
    } else if (body.symbol.length < 1 || body.symbol.length > 10) {
      errors.push({ field: 'symbol', message: 'Symbol must be 1-10 characters' });
    } else if (body.symbol !== body.symbol.toUpperCase()) {
      errors.push({ field: 'symbol', message: 'Symbol must be uppercase' });
    }
  }

  if (body.optionType !== undefined && !Object.values(OptionType).includes(body.optionType)) {
    errors.push({ field: 'optionType', message: 'Option type must be "call" or "put"' });
  }

  if (body.strikePrice !== undefined) {
    if (typeof body.strikePrice !== 'number') {
      errors.push({ field: 'strikePrice', message: 'Strike price must be a number' });
    } else if (body.strikePrice <= 0) {
      errors.push({ field: 'strikePrice', message: 'Strike price must be greater than 0' });
    }
  }

  if (body.expirationDate !== undefined) {
    if (typeof body.expirationDate !== 'string') {
      errors.push({ field: 'expirationDate', message: 'Expiration date must be a string' });
    } else if (!isValidISODate(body.expirationDate)) {
      errors.push({ field: 'expirationDate', message: 'Expiration date must be in YYYY-MM-DD format' });
    }
  }

  if (body.openAction !== undefined && !Object.values(OpeningAction).includes(body.openAction)) {
    errors.push({ field: 'openAction', message: 'Open action must be "buy_to_open" or "sell_to_open"' });
  }

  if (body.openQuantity !== undefined) {
    if (typeof body.openQuantity !== 'number') {
      errors.push({ field: 'openQuantity', message: 'Open quantity must be a number' });
    } else if (!Number.isInteger(body.openQuantity) || body.openQuantity <= 0) {
      errors.push({ field: 'openQuantity', message: 'Open quantity must be a positive integer' });
    }
  }

  if (body.openPremium !== undefined) {
    if (typeof body.openPremium !== 'number') {
      errors.push({ field: 'openPremium', message: 'Open premium must be a number' });
    } else if (body.openPremium < 0.01) {
      errors.push({ field: 'openPremium', message: 'Open premium must be at least 0.01' });
    }
  }

  if (body.openCommission !== undefined) {
    if (typeof body.openCommission !== 'number') {
      errors.push({ field: 'openCommission', message: 'Open commission must be a number' });
    } else if (body.openCommission < 0) {
      errors.push({ field: 'openCommission', message: 'Open commission must be 0 or greater' });
    }
  }

  if (body.openTradeDate !== undefined) {
    if (typeof body.openTradeDate !== 'string') {
      errors.push({ field: 'openTradeDate', message: 'Open trade date must be a string' });
    } else if (!isValidISODate(body.openTradeDate)) {
      errors.push({ field: 'openTradeDate', message: 'Open trade date must be in YYYY-MM-DD format' });
    }
  }

  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== 'string') {
      errors.push({ field: 'notes', message: 'Notes must be a string' });
    } else if (body.notes.length > 1000) {
      errors.push({ field: 'notes', message: 'Notes must be 1000 characters or less' });
    }
  }

  // Closing transaction fields (optional, for updating closed trades)
  if (body.closeAction !== undefined && !Object.values(ClosingAction).includes(body.closeAction)) {
    errors.push({ field: 'closeAction', message: 'Close action must be "buy_to_close" or "sell_to_close"' });
  }

  if (body.closePremium !== undefined) {
    if (typeof body.closePremium !== 'number') {
      errors.push({ field: 'closePremium', message: 'Close premium must be a number' });
    } else if (body.closePremium < 0.01) {
      errors.push({ field: 'closePremium', message: 'Close premium must be at least 0.01' });
    }
  }

  if (body.closeCommission !== undefined) {
    if (typeof body.closeCommission !== 'number') {
      errors.push({ field: 'closeCommission', message: 'Close commission must be a number' });
    } else if (body.closeCommission < 0) {
      errors.push({ field: 'closeCommission', message: 'Close commission must be 0 or greater' });
    }
  }

  if (body.closeTradeDate !== undefined) {
    if (typeof body.closeTradeDate !== 'string') {
      errors.push({ field: 'closeTradeDate', message: 'Close trade date must be a string' });
    } else if (!isValidISODate(body.closeTradeDate)) {
      errors.push({ field: 'closeTradeDate', message: 'Close trade date must be in YYYY-MM-DD format' });
    }
  }

  return errors;
};

export const validateCloseTradeRequest = (body: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!body.closeAction || !Object.values(ClosingAction).includes(body.closeAction)) {
    errors.push({ field: 'closeAction', message: 'Close action must be "buy_to_close" or "sell_to_close"' });
  }

  if (body.closePremium === undefined || typeof body.closePremium !== 'number') {
    errors.push({ field: 'closePremium', message: 'Close premium is required and must be a number' });
  } else if (body.closePremium < 0.01) {
    errors.push({ field: 'closePremium', message: 'Close premium must be at least 0.01' });
  }

  if (body.closeCommission === undefined || typeof body.closeCommission !== 'number') {
    errors.push({ field: 'closeCommission', message: 'Close commission is required and must be a number' });
  } else if (body.closeCommission < 0) {
    errors.push({ field: 'closeCommission', message: 'Close commission must be 0 or greater' });
  }

  if (!body.closeTradeDate || typeof body.closeTradeDate !== 'string') {
    errors.push({ field: 'closeTradeDate', message: 'Close trade date is required (YYYY-MM-DD format)' });
  } else if (!isValidISODate(body.closeTradeDate)) {
    errors.push({ field: 'closeTradeDate', message: 'Close trade date must be in YYYY-MM-DD format' });
  }

  return errors;
};

const isValidISODate = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  const timestamp = date.getTime();

  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
    return false;
  }

  return dateString === date.toISOString().split('T')[0];
};

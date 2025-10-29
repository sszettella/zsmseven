import {
  CreatePortfolioRequest,
  UpdatePortfolioRequest,
  CreatePositionRequest,
  UpdatePositionRequest,
  UpdatePricesRequest
} from '../types';

interface ValidationError {
  field: string;
  message: string;
}

export const validateCreatePortfolioRequest = (body: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Name is required
  if (!body.name) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (typeof body.name !== 'string') {
    errors.push({ field: 'name', message: 'Name must be a string' });
  } else if (body.name.length < 1 || body.name.length > 100) {
    errors.push({ field: 'name', message: 'Name must be between 1 and 100 characters' });
  }

  // Description is optional but must be valid if provided
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string' });
    } else if (body.description.length > 500) {
      errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
    }
  }

  // isActive is optional but must be boolean if provided
  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    errors.push({ field: 'isActive', message: 'isActive must be a boolean' });
  }

  // isDefault is optional but must be boolean if provided
  if (body.isDefault !== undefined && typeof body.isDefault !== 'boolean') {
    errors.push({ field: 'isDefault', message: 'isDefault must be a boolean' });
  }

  return errors;
};

export const validateUpdatePortfolioRequest = (body: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  // All fields are optional, but must be valid if provided
  if (body.name !== undefined) {
    if (typeof body.name !== 'string') {
      errors.push({ field: 'name', message: 'Name must be a string' });
    } else if (body.name.length < 1 || body.name.length > 100) {
      errors.push({ field: 'name', message: 'Name must be between 1 and 100 characters' });
    }
  }

  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string' });
    } else if (body.description.length > 500) {
      errors.push({ field: 'description', message: 'Description must not exceed 500 characters' });
    }
  }

  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    errors.push({ field: 'isActive', message: 'isActive must be a boolean' });
  }

  if (body.isDefault !== undefined && typeof body.isDefault !== 'boolean') {
    errors.push({ field: 'isDefault', message: 'isDefault must be a boolean' });
  }

  return errors;
};

export const validateCreatePositionRequest = (body: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Ticker is required
  if (!body.ticker) {
    errors.push({ field: 'ticker', message: 'Ticker is required' });
  } else if (typeof body.ticker !== 'string') {
    errors.push({ field: 'ticker', message: 'Ticker must be a string' });
  } else if (body.ticker.length < 1 || body.ticker.length > 10) {
    errors.push({ field: 'ticker', message: 'Ticker must be between 1 and 10 characters' });
  }

  // Shares is required and must be positive
  if (body.shares === undefined || body.shares === null) {
    errors.push({ field: 'shares', message: 'Shares is required' });
  } else if (typeof body.shares !== 'number') {
    errors.push({ field: 'shares', message: 'Shares must be a number' });
  } else if (body.shares <= 0) {
    errors.push({ field: 'shares', message: 'Shares must be greater than 0' });
  }

  // Cost basis is required and must be positive
  if (body.costBasis === undefined || body.costBasis === null) {
    errors.push({ field: 'costBasis', message: 'Cost basis is required' });
  } else if (typeof body.costBasis !== 'number') {
    errors.push({ field: 'costBasis', message: 'Cost basis must be a number' });
  } else if (body.costBasis <= 0) {
    errors.push({ field: 'costBasis', message: 'Cost basis must be greater than 0' });
  }

  // Current price is optional but must be positive if provided
  if (body.currentPrice !== undefined && body.currentPrice !== null) {
    if (typeof body.currentPrice !== 'number') {
      errors.push({ field: 'currentPrice', message: 'Current price must be a number' });
    } else if (body.currentPrice <= 0) {
      errors.push({ field: 'currentPrice', message: 'Current price must be greater than 0' });
    }
  }

  // Notes is optional but must be valid if provided
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== 'string') {
      errors.push({ field: 'notes', message: 'Notes must be a string' });
    } else if (body.notes.length > 1000) {
      errors.push({ field: 'notes', message: 'Notes must not exceed 1000 characters' });
    }
  }

  return errors;
};

export const validateUpdatePositionRequest = (body: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  // All fields are optional, but must be valid if provided
  if (body.ticker !== undefined) {
    if (typeof body.ticker !== 'string') {
      errors.push({ field: 'ticker', message: 'Ticker must be a string' });
    } else if (body.ticker.length < 1 || body.ticker.length > 10) {
      errors.push({ field: 'ticker', message: 'Ticker must be between 1 and 10 characters' });
    }
  }

  if (body.shares !== undefined) {
    if (typeof body.shares !== 'number') {
      errors.push({ field: 'shares', message: 'Shares must be a number' });
    } else if (body.shares <= 0) {
      errors.push({ field: 'shares', message: 'Shares must be greater than 0' });
    }
  }

  if (body.costBasis !== undefined) {
    if (typeof body.costBasis !== 'number') {
      errors.push({ field: 'costBasis', message: 'Cost basis must be a number' });
    } else if (body.costBasis <= 0) {
      errors.push({ field: 'costBasis', message: 'Cost basis must be greater than 0' });
    }
  }

  if (body.currentPrice !== undefined && body.currentPrice !== null) {
    if (typeof body.currentPrice !== 'number') {
      errors.push({ field: 'currentPrice', message: 'Current price must be a number' });
    } else if (body.currentPrice <= 0) {
      errors.push({ field: 'currentPrice', message: 'Current price must be greater than 0' });
    }
  }

  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== 'string') {
      errors.push({ field: 'notes', message: 'Notes must be a string' });
    } else if (body.notes.length > 1000) {
      errors.push({ field: 'notes', message: 'Notes must not exceed 1000 characters' });
    }
  }

  return errors;
};

export const validateUpdatePricesRequest = (body: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!body.prices) {
    errors.push({ field: 'prices', message: 'Prices array is required' });
    return errors;
  }

  if (!Array.isArray(body.prices)) {
    errors.push({ field: 'prices', message: 'Prices must be an array' });
    return errors;
  }

  body.prices.forEach((price: any, index: number) => {
    if (!price.ticker || typeof price.ticker !== 'string') {
      errors.push({ field: `prices[${index}].ticker`, message: 'Ticker is required and must be a string' });
    }
    if (price.currentPrice === undefined || typeof price.currentPrice !== 'number' || price.currentPrice <= 0) {
      errors.push({ field: `prices[${index}].currentPrice`, message: 'Current price is required and must be greater than 0' });
    }
  });

  return errors;
};

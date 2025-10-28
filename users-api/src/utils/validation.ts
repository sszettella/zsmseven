import { UserRole } from '../types';

export const validateEmail = (email: string): { valid: boolean; message?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Invalid email format' };
  }
  return { valid: true };
};

export const validateName = (name: string): { valid: boolean; message?: string } => {
  const trimmedName = name.trim();
  if (trimmedName.length < 1) {
    return { valid: false, message: 'Name is required' };
  }
  if (trimmedName.length > 100) {
    return { valid: false, message: 'Name must be at most 100 characters' };
  }
  return { valid: true };
};

export const validateRole = (role: string): { valid: boolean; message?: string } => {
  if (role !== UserRole.USER && role !== UserRole.ADMIN) {
    return { valid: false, message: 'Role must be either "user" or "admin"' };
  }
  return { valid: true };
};

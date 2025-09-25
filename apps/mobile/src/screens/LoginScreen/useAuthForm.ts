/**
 * Authentication Form Hook for LoginScreen
 * Handles form state, validation, and user input
 */

import { useState, useCallback } from 'react';

export interface LoginForm {
  email: string;
  password: string;
}

export interface LoginErrors {
  email?: string;
  password?: string;
  general?: string;
}

// Password minimum length constant
const MIN_PASSWORD_LENGTH = 6;

export interface AuthFormData {
  form: LoginForm;
  errors: LoginErrors;
  showPassword: boolean;
  validateForm: () => boolean;
  handleInputChange: (field: keyof LoginForm, value: string) => void;
  setShowPassword: (show: boolean) => void;
  setErrors: (errors: LoginErrors) => void;
  clearErrors: () => void;
}

export const useAuthForm = (): AuthFormData => {
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: LoginErrors = {};

    // Email validation
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  // Handle input change
  const handleInputChange = useCallback(
    (field: keyof LoginForm, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));

      // Clear field-specific error when user starts typing
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    form,
    errors,
    showPassword,
    validateForm,
    handleInputChange,
    setShowPassword,
    setErrors,
    clearErrors,
  };
};
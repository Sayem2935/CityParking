export interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
}

export interface FieldValidation {
  value: string;
  rules: ValidationRule[];
}

export interface ValidationErrors {
  [field: string]: string;
}

// Validation rules
export const required = (message = "This field is required"): ValidationRule => ({
  validate: (value) => value.trim().length > 0,
  message,
});

export const minLength = (
  min: number,
  message = `Must be at least ${min} characters`
): ValidationRule => ({
  validate: (value) => value.length >= min,
  message,
});

export const maxLength = (
  max: number,
  message = `Must be no more than ${max} characters`
): ValidationRule => ({
  validate: (value) => value.length <= max,
  message,
});

export const email = (
  message = "Please enter a valid email address"
): ValidationRule => ({
  validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  message,
});

export const password = (
  message = "Password must be at least 8 characters with uppercase, lowercase, and number"
): ValidationRule => ({
  validate: (value) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value),
  message,
});

export const matches = (
  matchFieldName: string,
  message = "Fields do not match"
): ValidationRule & { matchFieldName: string } => ({
  validate: (value) => value.length > 0, // Basic check; real validation done in useForm
  message,
  matchFieldName,
});

export const passwordStrength = (
  message = "Password must be at least 8 characters with uppercase, lowercase, and number"
): ValidationRule => ({
  validate: (value) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value),
  message,
});

export const phone = (
  message = "Please enter a valid phone number"
): ValidationRule => ({
  validate: (value) => /^[\d\s\-+()]{7,15}$/.test(value) || value === "",
  message,
});

// Validate a single field
export const validateField = (
  value: string,
  rules: ValidationRule[]
): string | null => {
  for (const rule of rules) {
    if (!rule.validate(value)) {
      return rule.message;
    }
  }
  return null;
};

// Validate multiple fields
export const validateForm = (
  fields: Record<string, FieldValidation>
): ValidationErrors => {
  const errors: ValidationErrors = {};

  for (const [fieldName, field] of Object.entries(fields)) {
    const error = validateField(field.value, field.rules);
    if (error) {
      errors[fieldName] = error;
    }
  }

  return errors;
};

// Check if form has errors
export const hasErrors = (errors: ValidationErrors): boolean => {
  return Object.values(errors).some((error) => error !== null && error !== "");
};
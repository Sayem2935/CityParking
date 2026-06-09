import { useState, useCallback } from "react";
import {
  validateField,
  type ValidationRule,
  type ValidationErrors,
} from "@/utils";

interface UseFormConfig<T extends Record<string, string>> {
  initialValues: T;
  validationRules: Record<keyof T, ValidationRule[]>;
  onSubmit: (values: T) => Promise<void> | void;
}

interface UseFormReturn<T extends Record<string, string>> {
  values: T;
  errors: ValidationErrors;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  setFieldValue: (field: keyof T, value: string) => void;
  setFieldError: (field: keyof T, error: string) => void;
  resetForm: () => void;
  isValid: boolean;
}

export const useForm = <T extends Record<string, string>>({
  initialValues,
  validationRules,
  onSubmit,
}: UseFormConfig<T>): UseFormReturn<T> => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateSingleField = useCallback(
    (name: string, value: string): string | null => {
      const rules = validationRules[name as keyof T];
      if (!rules) return null;
      return validateField(value, rules);
    },
    [validationRules]
  );

  const validateAllFields = useCallback((): ValidationErrors => {
    const newErrors: ValidationErrors = {};
    for (const [name, value] of Object.entries(values)) {
      const error = validateSingleField(name, value);
      if (error) {
        newErrors[name] = error;
      }
    }
    return newErrors;
  }, [values, validateSingleField]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setValues((prev) => ({ ...prev, [name]: value }));

      // Clear error on change if field was touched
      if (touched[name]) {
        const error = validateSingleField(name, value);
        setErrors((prev) => ({ ...prev, [name]: error || "" }));
      }
    },
    [touched, validateSingleField]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setTouched((prev) => ({ ...prev, [name]: true }));
      const error = validateSingleField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error || "" }));
    },
    [validateSingleField]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Touch all fields and validate
      const allTouched: Record<string, boolean> = {};
      for (const key of Object.keys(values)) {
        allTouched[key] = true;
      }
      setTouched(allTouched);

      const formErrors = validateAllFields();
      setErrors(formErrors);

      // Check if there are any errors
      const hasFormErrors = Object.values(formErrors).some(
        (error) => error !== null && error !== ""
      );

      if (hasFormErrors) return;

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateAllFields, onSubmit]
  );

  const setFieldValue = useCallback(
    (field: keyof T, value: string) => {
      setValues((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [field as string]: error }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const isValid = Object.values(errors).every(
    (error) => error === null || error === ""
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    resetForm,
    isValid,
  };
};
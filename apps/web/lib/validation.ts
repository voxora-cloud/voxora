// teamValidation.ts

// Name Validation
export const validateTeamName = (name: string): string | null => {
    if (name.length < 5 || name.length > 10) {
      return "Team name must be between 5 and 10 characters long.";
    }

    const nameRegex = /^[A-Za-z][A-Za-z0-9_-]*$/;
    if (!nameRegex.test(name)) {
      return "Team name must start with a letter and contain only letters, digits, underscores, or hyphens.";
    }

    return null;
  };

  // Description Validation
  export const validateTeamDescription = (description: string): string | null => {
    if (description.length < 10 || description.length > 50) {
      return "Description must be between 10 and 50 characters long.";
    }

    const onlyDigits = /^\d+$/;
    const onlySymbols = /^[^A-Za-z0-9]+$/;

    if (onlyDigits.test(description)) {
      return "Description cannot contain only digits.";
    }
    if (onlySymbols.test(description)) {
      return "Description cannot contain only symbols.";
    }

    const startsWithLetter = /^[A-Za-z]/;
    if (!startsWithLetter.test(description)) {
      return "Description must start with a letter.";
    }

    return null;
  };

  // Color Validation
  export const validateTeamColor = (color: string): string | null => {
    const colorRegex = /^#[A-Fa-f0-9]{6}$/;
    if (!colorRegex.test(color)) {
      return "Color must be a valid hex code (e.g., #3b82f6).";
    }
    return null;
  };

// Auth Form Validation

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Email Validation
export const validateEmail = (email: string): string | null => {
  if (!email) {
    return "Email is required";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }

  if (email.length > 254) {
    return "Email is too long";
  }

  return null;
};

// Password Validation
export const validatePassword = (password: string): string | null => {
  if (!password) {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  if (password.length > 128) {
    return "Password is too long (max 128 characters)";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Password must contain at least one special character";
  }

  return null;
};

// Password Confirmation Validation
export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string
): string | null => {
  if (!confirmPassword) {
    return "Please confirm your password";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match";
  }

  return null;
};

// Name Validation
export const validateName = (name: string): string | null => {
  if (!name) {
    return "Name is required";
  }

  if (name.trim().length < 2) {
    return "Name must be at least 2 characters long";
  }

  if (name.length > 100) {
    return "Name is too long (max 100 characters)";
  }

  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(name)) {
    return "Name can only contain letters, spaces, hyphens, and apostrophes";
  }

  return null;
};

// Login Form Validation
export const validateLoginForm = (
  email: string,
  password: string
): ValidationResult => {
  const errors: ValidationError[] = [];

  const emailError = validateEmail(email);
  if (emailError) {
    errors.push({ field: "email", message: emailError });
  }

  if (!password) {
    errors.push({ field: "password", message: "Password is required" });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Register Form Validation
export const validateRegisterForm = (
  name: string,
  email: string,
  password: string,
  confirmPassword: string
): ValidationResult => {
  const errors: ValidationError[] = [];

  const nameError = validateName(name);
  if (nameError) {
    errors.push({ field: "name", message: nameError });
  }

  const emailError = validateEmail(email);
  if (emailError) {
    errors.push({ field: "email", message: emailError });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.push({ field: "password", message: passwordError });
  }

  const confirmPasswordError = validatePasswordConfirmation(
    password,
    confirmPassword
  );
  if (confirmPasswordError) {
    errors.push({ field: "confirmPassword", message: confirmPasswordError });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

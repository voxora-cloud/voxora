
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

// Widget Validation

// Display Name Validation for Widget
export const validateWidgetDisplayName = (displayName: string): string | null => {
  if (!displayName || !displayName.trim()) {
    return "Display name is required";
  }

  if (displayName.trim().length < 2) {
    return "Display name must be at least 2 characters long";
  }

  if (displayName.length > 50) {
    return "Display name is too long (max 50 characters)";
  }

  const startsWithLetter = /^[A-Za-z]/;
  if (!startsWithLetter.test(displayName.trim())) {
    return "Display name must start with a letter";
  }

  const validChars = /^[A-Za-z0-9\s'-]+$/;
  if (!validChars.test(displayName)) {
    return "Display name can only contain letters, numbers, spaces, hyphens, and apostrophes";
  }

  return null;
};



// Widget Form Validation
export const validateWidgetForm = (
  displayName: string,
): ValidationResult => {
  const errors: ValidationError[] = [];

  const displayNameError = validateWidgetDisplayName(displayName);
  if (displayNameError) {
    errors.push({ field: "displayName", message: displayNameError });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

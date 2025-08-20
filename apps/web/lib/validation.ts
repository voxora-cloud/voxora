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

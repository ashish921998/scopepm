/**
 * Shared validation utilities for auth forms.
 */

export type FieldErrors<T extends string> = Partial<Record<T, string>>

/** Basic email regex — checks for non-empty local part, @, and domain with dot. */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

export type SignInErrors = FieldErrors<'email' | 'password'>

export function validateSignIn(email: string, password: string): SignInErrors {
  const errors: SignInErrors = {}

  if (!email.trim()) {
    errors.email = 'Email is required'
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address'
  }

  if (!password) {
    errors.password = 'Password is required'
  }

  return errors
}

// ---------------------------------------------------------------------------
// Sign-up
// ---------------------------------------------------------------------------

export type SignUpErrors = FieldErrors<'name' | 'email' | 'password'>

export function validateSignUp(
  name: string,
  email: string,
  password: string
): SignUpErrors {
  const errors: SignUpErrors = {}

  if (!name.trim()) {
    errors.name = 'Name is required'
  }

  if (!email.trim()) {
    errors.email = 'Email is required'
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address'
  }

  if (!password) {
    errors.password = 'Password is required'
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  }

  return errors
}

/** Returns true if the errors record has no entries. */
export function hasNoErrors(errors: FieldErrors<string>): boolean {
  return Object.keys(errors).length === 0
}

/**
 * String Length Validation Constants
 *
 * Minimum and maximum lengths for various string fields.
 */
export const STRING_LENGTH = {
  MIN: {
    PASSWORD: 8,
    USERNAME: 3,
    NAME: 2,
    DESCRIPTION: 10,
  },
  MAX: {
    EMAIL: 255,
    USERNAME: 50,
    NAME: 100,
    BIO: 500,
    DESCRIPTION: 2000,
    TITLE: 200,
    URL: 2048,
  },
} as const;

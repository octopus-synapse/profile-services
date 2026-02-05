export const SUCCESS_MESSAGES = {
 USER_REGISTERED: "User registered successfully",
 LOGIN_SUCCESS: "Login successful",
 LOGOUT_SUCCESS: "Logout successful",
 CREATED: "Resource created successfully",
 UPDATED: "Resource updated successfully",
 DELETED: "Resource deleted successfully",
 ONBOARDING_COMPLETED: "Onboarding completed successfully",
} as const;

export type SuccessMessage =
 (typeof SUCCESS_MESSAGES)[keyof typeof SUCCESS_MESSAGES];

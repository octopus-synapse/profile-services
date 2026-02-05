/**
 * Username Schema Tests
 */

import { describe, it, expect } from "bun:test";
import {
 UsernameSchema,
 RESERVED_USERNAMES,
 validateUsernameFormat,
} from "../username.schema";

describe("UsernameSchema", () => {
 describe("valid usernames", () => {
  const validUsernames = [
   "johndoe",
   "user_123",
   "test_user",
   "abc",
   "username_with_numbers_123",
   "x".repeat(30), // max length
  ];

  validUsernames.forEach((username) => {
   it(`should accept "${username}"`, () => {
    expect(() => UsernameSchema.parse(username)).not.toThrow();
   });
  });

  it("should normalize to lowercase", () => {
   const result = UsernameSchema.parse("JohnDoe");
   expect(result).toBe("johndoe");
  });

  it("should trim whitespace", () => {
   const result = UsernameSchema.parse("  johndoe  ");
   expect(result).toBe("johndoe");
  });
 });

 describe("invalid usernames - length", () => {
  it("should reject too short (< 3 chars)", () => {
   const result = UsernameSchema.safeParse("ab");
   expect(result.success).toBe(false);
   if (!result.success) {
    expect(result.error.issues[0].message).toContain("at least 3");
   }
  });

  it("should reject too long (> 30 chars)", () => {
   const result = UsernameSchema.safeParse("x".repeat(31));
   expect(result.success).toBe(false);
   if (!result.success) {
    expect(result.error.issues[0].message).toContain("cannot exceed 30");
   }
  });
 });

 describe("invalid usernames - format", () => {
  const invalidFormats = [
   { value: "John-Doe", error: "lowercase letters, numbers, and underscores" },
   { value: "user.name", error: "lowercase letters, numbers, and underscores" },
   { value: "user name", error: "lowercase letters, numbers, and underscores" },
   {
    value: "user@domain",
    error: "lowercase letters, numbers, and underscores",
   },
   { value: "_username", error: "must start with a letter or number" },
   { value: "username_", error: "must end with a letter or number" },
   { value: "user__name", error: "cannot contain consecutive underscores" },
   { value: "test___user", error: "cannot contain consecutive underscores" },
  ];

  invalidFormats.forEach(({ value, error }) => {
   it(`should reject "${value}" (${error})`, () => {
    const result = UsernameSchema.safeParse(value);
    expect(result.success).toBe(false);
    if (!result.success) {
     expect(result.error.issues[0].message).toContain(error);
    }
   });
  });
 });

 describe("invalid usernames - reserved", () => {
  const reservedSample = [
   "admin",
   "api",
   "root",
   "login",
   "logout",
   "register",
  ];

  reservedSample.forEach((reserved) => {
   it(`should reject reserved username "${reserved}"`, () => {
    const result = UsernameSchema.safeParse(reserved);
    expect(result.success).toBe(false);
    if (!result.success) {
     expect(result.error.issues[0].message).toContain("reserved");
    }
   });
  });

  it("should have comprehensive reserved list", () => {
   expect(RESERVED_USERNAMES.length).toBeGreaterThan(20);
  });
 });

 describe("validateUsernameFormat helper", () => {
  it("should return success for valid username", () => {
   const result = validateUsernameFormat("johndoe");
   expect(result.success).toBe(true);
  });

  it("should return error details for invalid username", () => {
   const result = validateUsernameFormat("ab");
   expect(result.success).toBe(false);
   if (!result.success) {
    expect(result.error.issues).toBeDefined();
   }
  });
 });
});

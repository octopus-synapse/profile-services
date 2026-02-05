/**
 * Professional Profile Schema Tests
 */

import { describe, it, expect } from "bun:test";
import {
 JobTitleSchema,
 SummarySchema,
 LinkedInUrlSchema,
 GitHubUrlSchema,
 SocialUrlSchema,
 ProfessionalProfileSchema,
} from "../professional-profile.schema";

describe("JobTitleSchema", () => {
 const validTitles = [
  "Software Engineer",
  "Sr. Product Manager",
  "VP of Engineering",
  "Full-Stack Developer",
 ];

 validTitles.forEach((title) => {
  it(`should accept "${title}"`, () => {
   expect(() => JobTitleSchema.parse(title)).not.toThrow();
  });
 });

 it("should reject too short", () => {
  const result = JobTitleSchema.safeParse("A");
  expect(result.success).toBe(false);
 });

 it("should reject too long", () => {
  const result = JobTitleSchema.safeParse("x".repeat(101));
  expect(result.success).toBe(false);
 });
});

describe("SummarySchema", () => {
 it("should accept valid summary", () => {
  const summary =
   "Experienced software engineer with 5+ years in full-stack development.";
  expect(() => SummarySchema.parse(summary)).not.toThrow();
 });

 it("should reject too short", () => {
  const result = SummarySchema.safeParse("Short");
  expect(result.success).toBe(false);
 });

 it("should reject too long", () => {
  const result = SummarySchema.safeParse("x".repeat(501));
  expect(result.success).toBe(false);
 });
});

describe("LinkedInUrlSchema", () => {
 const validUrls = [
  "https://www.linkedin.com/in/johndoe",
  "https://linkedin.com/in/johndoe",
  "http://www.linkedin.com/company/acme",
  "https://linkedin.com/company/tech-corp",
 ];

 validUrls.forEach((url) => {
  it(`should accept ${url}`, () => {
   expect(() => LinkedInUrlSchema.parse(url)).not.toThrow();
  });
 });

 it("should accept undefined (optional)", () => {
  expect(() => LinkedInUrlSchema.parse(undefined)).not.toThrow();
 });

 const invalidUrls = [
  "linkedin.com/in/user",
  "https://twitter.com/user",
  "not-a-url",
 ];

 invalidUrls.forEach((url) => {
  it(`should reject ${url}`, () => {
   const result = LinkedInUrlSchema.safeParse(url);
   expect(result.success).toBe(false);
  });
 });
});

describe("GitHubUrlSchema", () => {
 const validUrls = [
  "https://github.com/johndoe",
  "https://www.github.com/acme-corp",
  "http://github.com/user_123",
 ];

 validUrls.forEach((url) => {
  it(`should accept ${url}`, () => {
   expect(() => GitHubUrlSchema.parse(url)).not.toThrow();
  });
 });

 it("should accept undefined (optional)", () => {
  expect(() => GitHubUrlSchema.parse(undefined)).not.toThrow();
 });

 const invalidUrls = [
  "github.com/user",
  "https://gitlab.com/user",
  "not-a-url",
 ];

 invalidUrls.forEach((url) => {
  it(`should reject ${url}`, () => {
   const result = GitHubUrlSchema.safeParse(url);
   expect(result.success).toBe(false);
  });
 });
});

describe("SocialUrlSchema", () => {
 const validUrls = [
  "https://example.com",
  "http://my-portfolio.dev",
  "https://blog.user.co.uk",
 ];

 validUrls.forEach((url) => {
  it(`should accept ${url}`, () => {
   expect(() => SocialUrlSchema.parse(url)).not.toThrow();
  });
 });

 it("should accept undefined (optional)", () => {
  expect(() => SocialUrlSchema.parse(undefined)).not.toThrow();
 });

 it("should reject non-HTTP(S) URLs", () => {
  const result = SocialUrlSchema.safeParse("ftp://example.com");
  expect(result.success).toBe(false);
 });
});

describe("ProfessionalProfileSchema", () => {
 it("should validate complete profile", () => {
  const validProfile = {
   jobTitle: "Software Engineer",
   summary: "Experienced developer with focus on web technologies.",
   linkedin: "https://linkedin.com/in/johndoe",
   github: "https://github.com/johndoe",
   website: "https://johndoe.dev",
  };

  expect(() => ProfessionalProfileSchema.parse(validProfile)).not.toThrow();
 });

 it("should accept profile without optional URLs", () => {
  const minimalProfile = {
   jobTitle: "Developer",
   summary: "Building great software products.",
  };

  expect(() => ProfessionalProfileSchema.parse(minimalProfile)).not.toThrow();
 });

 it("should reject missing required fields", () => {
  const incomplete = {
   jobTitle: "Developer",
   // missing summary
  };

  const result = ProfessionalProfileSchema.safeParse(incomplete);
  expect(result.success).toBe(false);
 });
});

import { describe, expect, it } from "vitest";

import { avatarColor, formatMeetingId, initials } from "@/lib/utils";

describe("formatMeetingId", () => {
  it("formats a clean 11-digit id with dashes", () => {
    expect(formatMeetingId("12345678901")).toBe("123-4567-8901");
  });

  it("strips non-digits before formatting", () => {
    expect(formatMeetingId("abc-123-xyz-4567")).toBe("123-4567");
  });

  it("returns input unchanged for short ids", () => {
    expect(formatMeetingId("12")).toBe("12");
  });
});

describe("initials", () => {
  it("uses first two words", () => {
    expect(initials("Alice Johnson")).toBe("AJ");
  });

  it("uppercases", () => {
    expect(initials("bob smith")).toBe("BS");
  });

  it("works for single-name input", () => {
    expect(initials("Madonna")).toBe("M");
  });
});

describe("avatarColor", () => {
  it("returns the same color for the same name", () => {
    expect(avatarColor("Alice")).toBe(avatarColor("Alice"));
  });

  it("returns a hex color", () => {
    expect(avatarColor("Bob")).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

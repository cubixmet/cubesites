import { describe, expect, it } from "vitest";
import { reactivationCharge, siteCharge, staffCharge, storageCharge } from "./billing";
import { totalFrom, unitFrom, toPaise } from "./money";

describe("billing rules", () => {
  it("first 3 active sites are free, then ₹109 each", () => {
    expect(siteCharge(3).amount).toBe(0);
    expect(siteCharge(5).amount).toBe(21800);
  });
  it("first additional staff is free, then ₹29 each", () => {
    expect(staffCharge(1).amount).toBe(0);
    expect(staffCharge(3).amount).toBe(5800);
  });
  it("storage: 250 MB free, ₹5 per started 250 MB block", () => {
    expect(storageCharge(250).amount).toBe(0);
    expect(storageCharge(251).amount).toBe(500);
    expect(storageCharge(750).amount).toBe(1000);
    expect(storageCharge(751).amount).toBe(1500);
  });
  it("reactivation is prorated ₹109/30 × remaining days", () => {
    expect(reactivationCharge(30)).toBe(10900);
    expect(reactivationCharge(15)).toBe(5450);
    expect(reactivationCharge(0)).toBe(0);
  });
});

describe("price calculations", () => {
  it("computes total and unit safely", () => {
    expect(totalFrom(2.5, toPaise("410.50")!)).toBe(102625);
    expect(unitFrom(3, 100000)).toBe(33333);
    expect(unitFrom(0, 100000)).toBeNull();
  });
});

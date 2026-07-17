import { describe, it, expect } from "vitest";
import { buildPersonalReport } from "../src/engines/report";
import type { Evaluation } from "../src/models/evaluation";

describe("buildPersonalReport", () => {
  it("80以上をstrengths、50未満をimprovementsに分類する", () => {
    const evaluation: Evaluation = {
      studentAnswerId: "s1",
      understanding: 90,
      accuracy: 40,
      logic: 60,
      expression: 20,
      comment: "コメント",
    };
    const report = buildPersonalReport(evaluation, {
      studentAnswerId: "s1",
      scale: "hundred",
      value: 52,
      comment: "コメント",
    });
    expect(report.strengths).toContain("理解度");
    expect(report.improvements).toContain("正確性");
    expect(report.improvements).toContain("表現力");
  });
});

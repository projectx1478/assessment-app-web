import { describe, it, expect } from "vitest";
import { hundredEvaluator } from "../src/evaluators/hundred";
import { fiveScaleEvaluator } from "../src/evaluators/fiveScale";
import { abcEvaluator } from "../src/evaluators/abc";
import { rubricEvaluator } from "../src/evaluators/rubric";
import type { Evaluation } from "../src/models/evaluation";

const base: Evaluation = {
  studentAnswerId: "s1",
  understanding: 90,
  accuracy: 80,
  logic: 70,
  expression: 60,
  comment: "よく書けています",
};

describe("hundredEvaluator", () => {
  it("4項目平均を0-100点に変換する", () => {
    const result = hundredEvaluator.convert(base);
    expect(result.value).toBe(75);
    expect(result.scale).toBe("hundred");
  });
});

describe("fiveScaleEvaluator", () => {
  it("平均点を1-5段階に変換する", () => {
    const result = fiveScaleEvaluator.convert(base);
    expect(result.value).toBe(4);
  });
  it("下限は1", () => {
    const low = { ...base, understanding: 0, accuracy: 0, logic: 0, expression: 0 };
    expect(fiveScaleEvaluator.convert(low).value).toBe(1);
  });
});

describe("abcEvaluator", () => {
  it("平均80以上はA", () => {
    const high = { ...base, understanding: 90, accuracy: 85, logic: 80, expression: 85 };
    expect(abcEvaluator.convert(high).value).toBe("A");
  });
  it("50未満はC", () => {
    const low = { ...base, understanding: 10, accuracy: 10, logic: 10, expression: 10 };
    expect(abcEvaluator.convert(low).value).toBe("C");
  });
});

describe("rubricEvaluator", () => {
  it("項目ごとにS/A/B/Cを付与する", () => {
    const result = rubricEvaluator.convert(base);
    const breakdown = JSON.parse(result.value as string);
    expect(breakdown.understanding).toBe("S");
    expect(breakdown.expression).toBe("B");
  });
});

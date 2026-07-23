import { describe, it, expect } from "vitest";
import { detectColumns, applyManualOverride } from "../src/engines/import";

describe("detectColumns", () => {
  it("氏名・番号・設問・自由記述を判定する", () => {
    const result = detectColumns(["氏名", "出席番号", "設問1", "回答"]);
    expect(result.nameHeader).toBe("氏名");
    expect(result.numberHeader).toBe("出席番号");
    expect(result.questionHeaders).toContain("設問1");
    expect(result.freeTextHeaders).toContain("回答");
    expect(result.unknownHeaders).toHaveLength(0);
  });

  it("メールアドレス列を判定する", () => {
    const result = detectColumns(["メールアドレス", "出席番号", "回答"]);
    expect(result.emailHeader).toBe("メールアドレス");
    expect(result.unknownHeaders).toHaveLength(0);
  });

  it("未知のヘッダーはunknownHeadersに入る", () => {
    const result = detectColumns(["謎列"]);
    expect(result.unknownHeaders).toEqual(["謎列"]);
  });
});

describe("applyManualOverride", () => {
  it("手動割当でunknownHeadersから除去される", () => {
    const detected = detectColumns(["謎列"]);
    const overridden = applyManualOverride(detected, { freeTextHeaders: ["謎列"] });
    expect(overridden.unknownHeaders).toHaveLength(0);
    expect(overridden.freeTextHeaders).toContain("謎列");
  });
});

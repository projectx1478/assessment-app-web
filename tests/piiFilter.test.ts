import { describe, it, expect } from "vitest";
import { isPiiColumn, stripPiiColumns } from "../src/utils/piiFilter";

describe("isPiiColumn", () => {
  it("氏名系ヘッダーを検出する", () => {
    expect(isPiiColumn("氏名")).toBe(true);
    expect(isPiiColumn("生徒名")).toBe(true);
    expect(isPiiColumn("Name")).toBe(true);
  });
  it("メールアドレス系ヘッダーを検出する", () => {
    expect(isPiiColumn("メールアドレス")).toBe(true);
    expect(isPiiColumn("Email")).toBe(true);
  });
  it("氏名でもメールアドレスでもないヘッダーは検出しない", () => {
    expect(isPiiColumn("回答")).toBe(false);
    expect(isPiiColumn("番号")).toBe(false);
  });
});

describe("stripPiiColumns", () => {
  it("氏名列を除去する", () => {
    const row = { 氏名: "山田太郎", 回答: "テスト回答" };
    const result = stripPiiColumns(row, ["氏名", "回答"]);
    expect(result.氏名).toBeUndefined();
    expect(result.回答).toBe("テスト回答");
  });
});

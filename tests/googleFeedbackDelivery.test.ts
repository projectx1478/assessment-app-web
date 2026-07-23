import { describe, it, expect } from "vitest";
import { buildRfc2822Message, encodeBase64Url } from "../src/utils/googleFeedbackDelivery";

describe("buildRfc2822Message", () => {
  it("宛先・件名・本文を含むRFC 2822形式のメッセージを組み立てる", () => {
    const message = buildRfc2822Message("student@example.com", "件名テスト", "本文テスト");
    expect(message).toContain("To: student@example.com");
    expect(message).toContain("Content-Type: text/plain; charset=UTF-8");
    expect(message).toContain("\r\n\r\n本文テスト");
  });

  it("件名はMIMEエンコードされる（日本語を含んでもヘッダーが壊れない）", () => {
    const message = buildRfc2822Message("student@example.com", "評価フィードバック", "本文");
    expect(message).toMatch(/Subject: =\?UTF-8\?B\?.+\?=/);
  });
});

describe("encodeBase64Url", () => {
  it("base64url形式（+ /を含まない）でエンコードする", () => {
    const encoded = encodeBase64Url("test string with special chars +/=");
    expect(encoded).not.toMatch(/[+/=]/);
  });
});

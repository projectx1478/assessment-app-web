import { describe, it, expect } from "vitest";
import { escapeHtml, formatGradeLabel, buildFeedbackEmailHtml } from "../src/utils/feedbackHtml";

const gradeInput = {
  threePerspective: { knowledge: "A", thinking: "B", attitude: "C" },
  fiveScale: 4,
  hundred: 82,
};

describe("formatGradeLabel", () => {
  it("100点法", () => {
    expect(formatGradeLabel(gradeInput, "hundred")).toBe("82点");
  });
  it("5段階評価", () => {
    expect(formatGradeLabel(gradeInput, "fiveScale")).toContain("4");
  });
  it("三観点評価", () => {
    const label = formatGradeLabel(gradeInput, "abc");
    expect(label).toContain("知識:A");
    expect(label).toContain("思考:B");
    expect(label).toContain("態度:C");
  });
});

describe("escapeHtml", () => {
  it("HTMLとして解釈される文字をエスケープする（XSS対策）", () => {
    expect(escapeHtml("<script>alert(1)</script>")).not.toContain("<script>");
    expect(escapeHtml("A&B")).toBe("A&amp;B");
  });
});

describe("buildFeedbackEmailHtml", () => {
  it("課題・回答・コメント・改善提案を含むHTMLを組み立てる", () => {
    const html = buildFeedbackEmailHtml({
      assignmentLabel: "国語 / 詩の鑑賞",
      assignmentText: "詩を読んで感想を述べよ",
      answerText: "とても良い詩だと思った",
      comment: "具体的な根拠に基づくコメント",
      improvementSuggestion: "次はここを直すとよい",
      gradeLabel: "82点",
    });
    expect(html).toContain("詩を読んで感想を述べよ");
    expect(html).toContain("とても良い詩だと思った");
    expect(html).toContain("具体的な根拠に基づくコメント");
    expect(html).toContain("次はここを直すとよい");
    expect(html).toContain("82点");
  });

  it("gradeLabelを省略すると成績セクションが出ない", () => {
    const html = buildFeedbackEmailHtml({
      assignmentLabel: "課題",
      assignmentText: "問題文",
      answerText: "回答",
      comment: "コメント",
      improvementSuggestion: "改善点",
    });
    expect(html).not.toContain("評価:");
  });

  it("ユーザー入力由来のHTMLをエスケープする", () => {
    const html = buildFeedbackEmailHtml({
      assignmentLabel: "課題",
      assignmentText: "問題文",
      answerText: "<img src=x onerror=alert(1)>",
      comment: "コメント",
      improvementSuggestion: "改善点",
    });
    expect(html).not.toContain("<img");
  });
});

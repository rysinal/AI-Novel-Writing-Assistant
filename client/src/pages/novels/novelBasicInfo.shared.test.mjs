import assert from "node:assert/strict";
import test from "node:test";

import { formatEstimatedChapterCountSummary } from "./novelBasicInfo.shared.ts";

test("estimated chapter summary describes a legacy missing value without rendering null", () => {
  assert.equal(formatEstimatedChapterCountSummary(null), "章节数按候选方案");
  assert.equal(formatEstimatedChapterCountSummary(120), "约 120 章");
});

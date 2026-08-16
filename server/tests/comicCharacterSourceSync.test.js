const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isComicCharacterGenerationActive,
  planComicCharacterSourceSync,
} = require("../dist/services/comic/characters/sourceSync.js");

function existing(overrides) {
  return {
    id: "character-1",
    name: "月",
    sourceCharacterRef: null,
    sheetData: null,
    assetImageData: [],
    ...overrides,
  };
}

test("重新导入内容源时按来源引用或名称复用角色 ID", () => {
  const result = planComicCharacterSourceSync(
    [
      existing({ id: "moon-old", name: "旧名称", sourceCharacterRef: "source-moon" }),
      existing({ id: "ulquiorra-old", name: "乌尔奇奥拉·西法" }),
      existing({ id: "removed-old", name: "已移除角色" }),
    ],
    [
      { name: "月", sourceCharacterRef: "source-moon", persona: "理性克制" },
      { name: "乌尔奇奥拉·西法", persona: "冷静" },
      { name: "新增角色" },
    ],
  );

  assert.deepEqual(
    result.matches.map((item) => item.existingId),
    ["moon-old", "ulquiorra-old"],
  );
  assert.deepEqual(result.creates.map((item) => item.name), ["新增角色"]);
  assert.deepEqual(result.deleteIds, ["removed-old"]);
});

test("重复名称不会把同一个旧角色复用两次", () => {
  const result = planComicCharacterSourceSync(
    [existing({ id: "old-1", name: "同名角色" })],
    [{ name: "同名角色" }, { name: "同名角色" }],
  );

  assert.equal(result.matches.length, 1);
  assert.equal(result.creates.length, 1);
  assert.deepEqual(result.deleteIds, []);
});

test("识别三视图、表情稿和角色资产的生成中状态", () => {
  assert.equal(isComicCharacterGenerationActive(existing({ sheetData: '{"status":"generating"}' })), true);
  assert.equal(
    isComicCharacterGenerationActive(existing({ sheetData: '{"status":"done","assets":{"expression":{"status":"generating"}}}' })),
    true,
  );
  assert.equal(
    isComicCharacterGenerationActive(existing({ assetImageData: ['{"status":"generating"}'] })),
    true,
  );
  assert.equal(isComicCharacterGenerationActive(existing({ sheetData: "invalid-json" })), false);
});

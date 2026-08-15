ALTER TABLE "ComicCharacter" ADD COLUMN IF NOT EXISTS "gender" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "ComicPanel" ADD COLUMN IF NOT EXISTS "sceneRef" TEXT;
ALTER TABLE "DramaCharacter" ADD COLUMN IF NOT EXISTS "portraitData" TEXT;
ALTER TABLE "DramaCharacter" ADD COLUMN IF NOT EXISTS "threeViewData" TEXT;
ALTER TABLE "NovelWorkflowTask" ADD COLUMN IF NOT EXISTS "pendingManualRecovery" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "PromptSlotOverride" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "novelId" TEXT,
    "promptId" TEXT NOT NULL,
    "baseVersion" TEXT NOT NULL,
    "slots" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromptSlotOverride_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PromptSlotOverride_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ComicCharacterAsset" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageData" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComicCharacterAsset_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ComicCharacterAsset_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "ComicCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ComicCharacterAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ComicProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ComicScene" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sceneType" TEXT NOT NULL DEFAULT 'interior',
    "bible" TEXT,
    "sheetData" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComicScene_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ComicScene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ComicProject"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PromptSlotOverride_promptId_idx" ON "PromptSlotOverride"("promptId");
CREATE INDEX "PromptSlotOverride_novelId_promptId_idx" ON "PromptSlotOverride"("novelId", "promptId");
CREATE UNIQUE INDEX "PromptSlotOverride_scope_novelId_promptId_key" ON "PromptSlotOverride"("scope", "novelId", "promptId");
CREATE INDEX "ComicCharacterAsset_characterId_idx" ON "ComicCharacterAsset"("characterId");
CREATE INDEX "ComicCharacterAsset_projectId_idx" ON "ComicCharacterAsset"("projectId");
CREATE INDEX "ComicScene_projectId_idx" ON "ComicScene"("projectId");
CREATE INDEX "BookAnalysisCharacterAppearanceSnapshot_characterId_chapter_idx"
    ON "BookAnalysisCharacterAppearanceSnapshot"("characterId", "chapterIndex");

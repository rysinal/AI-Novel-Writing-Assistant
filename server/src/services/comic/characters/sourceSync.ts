import type { SourceCharacter } from "../../adaptation/contracts/sourceBundle";

export interface ExistingComicCharacterForSync {
  id: string;
  name: string;
  sourceCharacterRef: string | null;
  sheetData: string | null;
  assetImageData: Array<string | null>;
}

export interface ComicCharacterSourceSyncPlan {
  matches: Array<{ existingId: string; incoming: SourceCharacter }>;
  creates: SourceCharacter[];
  deleteIds: string[];
}

function normalizeIdentity(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function hasGeneratingStatus(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const state = JSON.parse(raw) as {
      status?: unknown;
      assets?: { expression?: { status?: unknown } };
    };
    return state.status === "generating" || state.assets?.expression?.status === "generating";
  } catch {
    return false;
  }
}

export function isComicCharacterGenerationActive(character: ExistingComicCharacterForSync): boolean {
  return hasGeneratingStatus(character.sheetData)
    || character.assetImageData.some((imageData) => hasGeneratingStatus(imageData));
}

export function planComicCharacterSourceSync(
  existing: ExistingComicCharacterForSync[],
  incoming: SourceCharacter[],
): ComicCharacterSourceSyncPlan {
  const unmatched = new Map(existing.map((character) => [character.id, character]));
  const matches: ComicCharacterSourceSyncPlan["matches"] = [];
  const creates: SourceCharacter[] = [];

  for (const character of incoming) {
    const sourceRef = normalizeIdentity(character.sourceCharacterRef);
    const name = normalizeIdentity(character.name);
    const match = [...unmatched.values()].find((candidate) =>
      (sourceRef && normalizeIdentity(candidate.sourceCharacterRef) === sourceRef)
      || (name && normalizeIdentity(candidate.name) === name),
    );

    if (!match) {
      creates.push(character);
      continue;
    }

    unmatched.delete(match.id);
    matches.push({ existingId: match.id, incoming: character });
  }

  return {
    matches,
    creates,
    deleteIds: [...unmatched.keys()],
  };
}

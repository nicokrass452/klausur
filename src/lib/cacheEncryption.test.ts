import { describe, expect, it } from "vitest";
import { decryptCache, encryptCache } from "./cacheEncryption";

describe("cacheEncryption", () => {
  it("decrypts encrypted cache with the correct grant", async () => {
    const snapshot = {
      exams: [{ id: "exam-1", subject: "Mathe" }],
      settings: { theme: "system" }
    };

    const encrypted = await encryptCache(snapshot, "offline-grant");

    await expect(decryptCache(encrypted, "offline-grant")).resolves.toEqual(snapshot);
  });

  it("fails to decrypt encrypted cache with the wrong grant", async () => {
    const encrypted = await encryptCache({ exams: [] }, "offline-grant");

    await expect(decryptCache(encrypted, "wrong-grant")).resolves.toBeNull();
  });
});

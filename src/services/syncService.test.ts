import { describe, it, expect } from "vitest";
import { resolveConflicts } from "./syncService";

describe("syncService", () => {
  describe("resolveConflicts", () => {
    it("should merge correctly and keep the newer entry based on updatedAt", () => {
      const local = [
        { id: "1", name: "Local Only", updatedAt: "2024-01-01T10:00:00Z" },
        { id: "2", name: "Local Version", updatedAt: "2024-01-05T10:00:00Z" },
        { id: "3", name: "Local Old", updatedAt: "2024-01-02T10:00:00Z" }
      ];

      const remote = [
        { id: "2", name: "Remote Old", updatedAt: "2024-01-04T10:00:00Z" },
        { id: "3", name: "Remote Version", updatedAt: "2024-01-06T10:00:00Z" },
        { id: "4", name: "Remote Only", updatedAt: "2024-01-01T10:00:00Z" }
      ];

      const merged = resolveConflicts(local, remote);

      expect(merged.length).toBe(4);

      const item1 = merged.find(i => i.id === "1");
      expect(item1?.name).toBe("Local Only");

      const item2 = merged.find(i => i.id === "2");
      expect(item2?.name).toBe("Local Version");

      const item3 = merged.find(i => i.id === "3");
      expect(item3?.name).toBe("Remote Version");

      const item4 = merged.find(i => i.id === "4");
      expect(item4?.name).toBe("Remote Only");
    });
  });
});

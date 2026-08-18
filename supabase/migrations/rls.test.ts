import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Static verification of the RLS policies declared across all migrations. We
 * can't run a real Postgres instance in unit tests, so we inspect the SQL to
 * catch regressions that would weaken row level security.
 *
 * The runtime guarantee (RLS actually blocks cross-user access) is provided by
 * Postgres + Supabase auth.uid() and is exercised manually / in staging.
 */
const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

interface ParsedPolicy {
  file: string;
  name: string;
  table: string;
  command: string;
  body: string;
}

function readMigration(file: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
}

const migrationFiles = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const policies: ParsedPolicy[] = migrationFiles.flatMap((file) => {
  const sql = readMigration(file);
  const matches = sql.matchAll(/create\s+policy\s+"([^"]+)"\s+on\s+([\w.]+)\s+for\s+(\w+)([\s\S]*?);/gi);
  return Array.from(matches, (match) => ({
    file,
    name: match[1],
    table: match[2],
    command: match[3].toLowerCase(),
    body: match[4]
  }));
});

/**
 * Migrations are replayed in filename order and a later migration may drop and
 * recreate an earlier policy. Only the last definition of a given policy is in
 * force, so the invariants below are asserted against that effective set
 * rather than against each file in isolation.
 */
const effectivePolicies = new Map<string, ParsedPolicy>();
for (const policy of policies) {
  effectivePolicies.set(`${policy.table}.${policy.name}`, policy);
}
const liveP = Array.from(effectivePolicies.values());

function offenders(subset: ParsedPolicy[]): string[] {
  return subset.map((policy) => `${policy.file}: ${policy.name}`);
}

describe("migrations: RLS invariants across every migration", () => {
  it("finds policies to check (guards against a broken parser silently passing)", () => {
    expect(migrationFiles.length).toBeGreaterThan(0);
    expect(policies.length).toBeGreaterThan(10);
    expect(liveP.length).toBeGreaterThan(10);
  });

  /**
   * An UPDATE policy with only USING gates *which rows* may be updated, but
   * places no constraint on the resulting row. Without WITH CHECK a user can
   * update a row they own and rewrite its ownership column, moving the row
   * into another user's account.
   */
  it("gives every UPDATE policy a WITH CHECK clause, not just USING", () => {
    const bad = liveP
      .filter((policy) => policy.command === "update")
      .filter((policy) => !/with\s+check/i.test(policy.body));

    expect(offenders(bad)).toEqual([]);
  });

  it("ties every UPDATE policy's WITH CHECK back to the authenticated user", () => {
    const bad = liveP
      .filter((policy) => policy.command === "update")
      .filter((policy) => {
        const withCheck = /with\s+check\s*\(([\s\S]*)\)/i.exec(policy.body);
        return !withCheck || !/auth\.uid\(\)/i.test(withCheck[1]);
      });

    expect(offenders(bad)).toEqual([]);
  });

  it("ties every INSERT policy's WITH CHECK back to the authenticated user", () => {
    const bad = liveP
      .filter((policy) => policy.command === "insert")
      .filter((policy) => {
        const withCheck = /with\s+check\s*\(([\s\S]*)\)/i.exec(policy.body);
        return !withCheck || !/auth\.uid\(\)/i.test(withCheck[1]);
      });

    expect(offenders(bad)).toEqual([]);
  });

  it("never defines a policy that grants access without an auth.uid() predicate", () => {
    expect(offenders(liveP.filter((policy) => !/auth\.uid\(\)/i.test(policy.body)))).toEqual([]);
  });

  it("recreates a superseded policy rather than leaving two definitions live", () => {
    const superseded = policies.filter(
      (policy) => effectivePolicies.get(`${policy.table}.${policy.name}`) !== policy
    );

    for (const stale of superseded) {
      const winner = effectivePolicies.get(`${stale.table}.${stale.name}`)!;
      expect(readMigration(winner.file)).toMatch(
        new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+"${stale.name}"`, "i")
      );
    }
  });
});

/**
 * Migrations added after the initial schema are written to be re-runnable, so
 * that a partially applied migration can be replayed safely. `create policy`
 * has no `if not exists` form, so each one needs an explicit drop guard.
 *
 * The pre-existing migrations are exempt: they are already applied everywhere
 * and are not re-runnable by design.
 */
const RERUNNABLE_MIGRATIONS = [
  "20250101000008_learning_groups.sql",
  "20260718000001_add_study_filesystem.sql",
  "20260718000002_harden_update_policies.sql"
];

describe("migrations: re-runnable migrations are idempotent", () => {
  it.each(RERUNNABLE_MIGRATIONS)("%s guards every create policy with a drop policy if exists", (file) => {
    const sql = readMigration(file);
    const created = Array.from(sql.matchAll(/create\s+policy\s+"([^"]+)"/gi), (match) => match[1]);
    const dropped = new Set(
      Array.from(sql.matchAll(/drop\s+policy\s+if\s+exists\s+"([^"]+)"/gi), (match) => match[1])
    );

    expect(created.length).toBeGreaterThan(0);
    expect(created.filter((name) => !dropped.has(name))).toEqual([]);
  });

  it.each(RERUNNABLE_MIGRATIONS)("%s creates tables and indexes with if not exists", (file) => {
    const sql = readMigration(file);
    const bareCreates = Array.from(
      sql.matchAll(/create\s+(?:unique\s+)?(table|index)\s+(?!if\s+not\s+exists)([\w.]+)/gi),
      (match) => `${match[1]} ${match[2]}`
    );

    expect(bareCreates).toEqual([]);
  });
});

describe("learning_groups migration: RLS, ownership and invite codes", () => {
  const sql = () => readMigration("20250101000008_learning_groups.sql");

  it("creates the learning_groups table owned by an auth user", () => {
    expect(sql()).toMatch(/create\s+table\s+if\s+not\s+exists\s+public\.learning_groups/i);
    expect(sql()).toContain("user_id uuid not null references auth.users(id) on delete cascade");
    expect(sql()).toContain("invite_code text not null");
    expect(sql()).toContain("deleted_at timestamptz");
  });

  it("enables row level security on learning_groups", () => {
    expect(sql()).toMatch(/alter\s+table\s+public\.learning_groups\s+enable\s+row\s+level\s+security/i);
  });

  it("defines all four owner-scoped policies", () => {
    for (const command of ["select", "insert", "update", "delete"]) {
      expect(sql()).toMatch(new RegExp(`create\\s+policy\\s+"learning_groups_${command}_own"`, "i"));
    }
  });

  it("prevents an owner from reassigning a group to another user", () => {
    const updatePolicy = /create\s+policy\s+"learning_groups_update_own"[\s\S]*?;/i.exec(sql());
    expect(updatePolicy).not.toBeNull();
    expect(updatePolicy![0]).toMatch(/using\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i);
    expect(updatePolicy![0]).toMatch(/with\s+check\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i);
  });

  it("keeps the invite code unique only among live groups", () => {
    expect(sql()).toMatch(
      /create\s+unique\s+index\s+if\s+not\s+exists\s+learning_groups_invite_code_key[\s\S]*?on\s+public\.learning_groups\s*\(\s*invite_code\s*\)[\s\S]*?where\s+deleted_at\s+is\s+null/i
    );
  });
});

describe("study filesystem migration: chats and memories", () => {
  const sql = () => readMigration("20260718000001_add_study_filesystem.sql");

  it.each(["study_chats", "study_memories"])("creates %s scoped to an auth user and an exam", (table) => {
    expect(sql()).toMatch(new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}`, "i"));
    expect(sql()).toMatch(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i"));
  });

  it.each(["study_chats", "study_memories"])("defines all four owner-scoped policies on %s", (table) => {
    for (const command of ["select", "insert", "update", "delete"]) {
      expect(sql()).toMatch(new RegExp(`create\\s+policy\\s+"${table}_${command}_own"`, "i"));
    }
  });

  it("constrains the chat mode to the modes the coach supports", () => {
    expect(sql()).toMatch(/mode\s+text\s+not\s+null\s+check\s*\(\s*mode\s+in\s*\(([^)]*)\)/i);
  });
});

/**
 * The initial schema shipped every UPDATE policy with USING but no WITH CHECK.
 * Those migrations are already applied in production, so the fix ships as a
 * follow-up migration that recreates the policies rather than an edit in place.
 */
describe("harden_update_policies migration: closes the pre-existing WITH CHECK gap", () => {
  const sql = () => readMigration("20260718000002_harden_update_policies.sql");
  const HARDENED_TABLES = [
    "exams",
    "topics",
    "study_tasks",
    "study_materials",
    "user_stats",
    "focus_sessions",
    "badges"
  ];

  it.each(HARDENED_TABLES)("recreates the %s update policy with a WITH CHECK clause", (table) => {
    const policy = new RegExp(`create\\s+policy\\s+"${table}_update_own"[\\s\\S]*?;`, "i").exec(sql());
    expect(policy).not.toBeNull();
    expect(policy![0]).toMatch(/using\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i);
    expect(policy![0]).toMatch(/with\s+check\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i);
  });

  it("recreates the profiles update policy keyed on id rather than user_id", () => {
    const policy = /create\s+policy\s+"profiles_update_own"[\s\S]*?;/i.exec(sql());
    expect(policy).not.toBeNull();
    expect(policy![0]).toMatch(/using\s*\(\s*auth\.uid\(\)\s*=\s*id\s*\)/i);
    expect(policy![0]).toMatch(/with\s+check\s*\(\s*auth\.uid\(\)\s*=\s*id\s*\)/i);
  });
});

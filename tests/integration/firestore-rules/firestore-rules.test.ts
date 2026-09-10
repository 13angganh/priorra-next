import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { setDoc, doc, getDoc } from "firebase/firestore";

/**
 * Firestore Security Rules tests (Development Phase #26,
 * Architecture Proposal section 11.3 / Master Instruction section
 * 19). Runs against the Firebase emulator, not production.
 *
 * ============================================================
 * STATUS: written but NOT YET RUN in this environment.
 *
 * The sandbox this project was built in has no network access to
 * storage.googleapis.com, which the Firestore emulator needs to
 * download its JAR on first run. This is a network policy of the
 * build environment, not a problem with the test code or the rules
 * themselves.
 *
 * To actually run this suite:
 *   1. firebase emulators:start   (downloads the emulator JAR once)
 *   2. npm run test:rules         (see package.json)
 * ============================================================
 */

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-priorra-next",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("firestore.rules", () => {
  it("allows a user to read and write their own task document", async () => {
    const alice = testEnv.authenticatedContext("alice-uid").firestore();
    await assertSucceeds(
      setDoc(doc(alice, "users/alice-uid/tasks/task-1"), { title: "Alice's task" })
    );
    await assertSucceeds(getDoc(doc(alice, "users/alice-uid/tasks/task-1")));
  });

  it("denies a user from writing to another user's task subtree", async () => {
    const alice = testEnv.authenticatedContext("alice-uid").firestore();
    await assertFails(
      setDoc(doc(alice, "users/bob-uid/tasks/task-1"), { title: "Alice trying to write to Bob" })
    );
  });

  it("denies a user from reading another user's task subtree", async () => {
    // Seed a document as Bob, bypassing rules via the admin SDK context.
    await testEnv.withSecurityRulesDisabled(async (adminCtx) => {
      await setDoc(adminCtx.firestore().doc("users/bob-uid/tasks/task-1"), {
        title: "Bob's private task",
      });
    });

    const alice = testEnv.authenticatedContext("alice-uid").firestore();
    await assertFails(getDoc(doc(alice, "users/bob-uid/tasks/task-1")));
  });

  it("denies all access to an unauthenticated request", async () => {
    const unauth = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(unauth, "users/alice-uid/tasks/task-1"), { title: "No auth" })
    );
  });

  it("denies access to any path outside users/{uid}/...", async () => {
    const alice = testEnv.authenticatedContext("alice-uid").firestore();
    await assertFails(setDoc(doc(alice, "some-other-collection/doc-1"), { data: "x" }));
  });
});

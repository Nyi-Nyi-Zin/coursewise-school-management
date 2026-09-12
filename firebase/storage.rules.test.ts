import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { deleteObject, ref, uploadBytes } from "firebase/storage";

const describeWithEmulators =
  process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST
    ? describe
    : describe.skip;
let testEnv: RulesTestEnvironment;

describeWithEmulators("Storage avatar isolation", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "demo-coursewise-audit",
      firestore: {
        rules: readFileSync(resolve(process.cwd(), "firebase/firestore.rules"), "utf8"),
      },
      storage: {
        rules: readFileSync(resolve(process.cwd(), "firebase/storage.rules"), "utf8"),
      },
    });
  });

  afterEach(async () => {
    await Promise.all([testEnv.clearFirestore(), testEnv.clearStorage()]);
  });
  afterAll(async () => testEnv.cleanup());

  it("limits student avatars to one own profile object and permits administrator management", async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), "users", "admin-1"), { role: "admin" });
    });
    const owner = testEnv.authenticatedContext("student-a").storage();
    const other = testEnv.authenticatedContext("student-b").storage();
    const admin = testEnv.authenticatedContext("admin-1").storage();
    const path = "avatars/student-a/profile.png";
    const image = new Uint8Array([137, 80, 78, 71]);

    await assertSucceeds(uploadBytes(ref(owner, path.replace("profile.png", "profile.jpg")), image, { contentType: "image/png" }));
    await assertFails(uploadBytes(ref(owner, "avatars/student-a/other.png"), image, { contentType: "image/png" }));
    await assertFails(uploadBytes(ref(owner, path.replace("profile.png", "profile.jpg")), image, { contentType: "image/png" }));
    await assertFails(deleteObject(ref(owner, path)));
    await assertFails(uploadBytes(ref(other, "avatars/student-a/other.png"), image, { contentType: "image/png" }));
    await assertSucceeds(uploadBytes(ref(admin, path), image, { contentType: "image/png" }));
    await assertSucceeds(deleteObject(ref(admin, path)));
  });

  it("rejects oversized or non-image avatar uploads", async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), "users", "admin-1"), { role: "admin" });
    });
    const owner = testEnv.authenticatedContext("admin-1").storage();
    await assertFails(
      uploadBytes(ref(owner, "avatars/student-a/profile.txt"), new Uint8Array([1]), {
        contentType: "text/plain",
      })
    );
    await assertFails(
      uploadBytes(ref(owner, "avatars/student-a/huge.png"), new Uint8Array(5 * 1024 * 1024), {
        contentType: "image/png",
      })
    );
  });

  it("allows students to create their own assignment files and admins to manage lesson media", async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), "users", "admin-1"), { role: "admin" });
    });
    const owner = testEnv.authenticatedContext("student-a").storage();
    const other = testEnv.authenticatedContext("student-b").storage();
    const admin = testEnv.authenticatedContext("admin-1").storage();
    const pdf = new Uint8Array([37, 80, 68, 70]);

    await assertSucceeds(
      uploadBytes(ref(owner, "assignments/student-a/1234-report.pdf"), pdf, { contentType: "application/pdf" })
    );
    await assertFails(
      uploadBytes(ref(owner, "assignments/student-b/1234-report.pdf"), pdf, { contentType: "application/pdf" })
    );
    await assertFails(
      uploadBytes(ref(owner, "assignments/student-a/oversized.pdf"), new Uint8Array(20 * 1024 * 1024), { contentType: "application/pdf" })
    );
    await assertSucceeds(
      uploadBytes(ref(admin, "lessons/intro.mp4"), new Uint8Array([1, 2, 3]), { contentType: "video/mp4" })
    );
    await assertFails(deleteObject(ref(owner, "lessons/intro.mp4")));
    await assertSucceeds(deleteObject(ref(admin, "lessons/intro.mp4")));
  });
});

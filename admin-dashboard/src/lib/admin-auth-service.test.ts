import { beforeEach, describe, expect, it, vi } from "vitest";

const firebaseAuth = {
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
};
const firestore = { doc: vi.fn(), getDoc: vi.fn() };
const getFirebaseClient = vi.fn();

vi.mock("firebase/auth", () => firebaseAuth);
vi.mock("firebase/firestore", () => firestore);
vi.mock("./firebase", () => ({ hasFirebaseConfiguration: true, getFirebaseClient: () => getFirebaseClient() }));

describe("administrator authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFirebaseClient.mockReturnValue({ auth: "auth-client", db: "firestore-client" });
    firestore.doc.mockReturnValue("admin-profile");
  });

  it("signs in a Firebase user only when their matching profile has the admin role", async () => {
    const user = { uid: "admin-uid" };
    firebaseAuth.signInWithEmailAndPassword.mockResolvedValue({ user });
    firestore.getDoc.mockResolvedValue({ data: () => ({ role: "admin" }) });
    const { signInAdministrator } = await import("./admin-auth-service");

    await expect(signInAdministrator({ email: " admin@teza.test ", password: "secure-pass" })).resolves.toBe(user);
    expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith("auth-client", "admin@teza.test", "secure-pass");
    expect(firestore.doc).toHaveBeenCalledWith("firestore-client", "users", "admin-uid");
    expect(firebaseAuth.signOut).not.toHaveBeenCalled();
  });

  it("signs out a non-admin account rather than leaving it in the administration session", async () => {
    firebaseAuth.signInWithEmailAndPassword.mockResolvedValue({ user: { uid: "student-uid" } });
    firestore.getDoc.mockResolvedValue({ data: () => ({ role: "student" }) });
    const { signInAdministrator } = await import("./admin-auth-service");

    await expect(signInAdministrator({ email: "student@teza.test", password: "secure-pass" })).rejects.toThrow("does not have administrator access");
    expect(firebaseAuth.signOut).toHaveBeenCalledWith("auth-client");
  });

  it("uses Firebase's password-reset email flow for an administrator account", async () => {
    firebaseAuth.sendPasswordResetEmail.mockResolvedValue(undefined);
    const { requestAdministratorPasswordReset } = await import("./admin-auth-service");

    await requestAdministratorPasswordReset(" admin@teza.test ");
    expect(firebaseAuth.sendPasswordResetEmail).toHaveBeenCalledWith("auth-client", "admin@teza.test");
  });
});

import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ authenticate: vi.fn(), page: vi.fn(), legacy: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/assessment-backend", () => ({ listAssessmentCatalogPage: mocks.page, listAssessmentCatalog: mocks.legacy }));
vi.mock("@/lib/server-api", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/server-api")>(), requireAuthenticatedUser: mocks.authenticate }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticate.mockResolvedValue({ uid: "student" });
  mocks.page.mockResolvedValue({ quizzes: [], page: 0, pageSize: 10, total: 0 });
});

it("passes validated filters and authenticated identity to the paged backend", async () => {
  const params = new URLSearchParams({ page: "2", query: " chapter ", filter: "completed", enrollments: JSON.stringify([{ courseId: "a", batchId: "b" }]) });
  const response = await GET(new Request(`http://localhost/api/quizzes?${params}`));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(mocks.page).toHaveBeenCalledWith("student", { page: 2, query: "chapter", filter: "completed", enrollments: [{ courseId: "a", batchId: "b" }] });
  expect(mocks.legacy).not.toHaveBeenCalled();
});

it.each([
  { page: "-1" }, { page: "1.5" }, { page: "" }, { page: "9007199254740992" },
  { page: "0", filter: "unknown" }, { page: "0", query: "x".repeat(201) },
  { page: "0", enrollments: "invalid" }, { page: "0", enrollments: "{}" },
  { page: "0", enrollments: JSON.stringify([{ courseId: "a/b", batchId: "c" }]) },
])("rejects invalid pagination parameters: %j", async params => {
  const response = await GET(new Request(`http://localhost/api/quizzes?${new URLSearchParams(params)}`));
  expect(response.status).toBe(400);
  expect(mocks.page).not.toHaveBeenCalled();
});

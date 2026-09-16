// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CertificatesPage from "./page";

vi.mock("@/components/student-auth-provider", () => ({
  useStudentAuth: () => ({ user: { uid: "student-1" } }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: [{
      id: "certificate-1",
      certificateId: "CERT-001",
      verificationCode: "VERIFY-001",
      studentName: "Test Student",
      courseTitle: "Web Development",
      batchName: "Batch 1",
      courseDescription: "Frontend development",
      issuedAt: "2026-09-17T00:00:00.000Z",
      percentage: 90,
      score: 90,
      totalMarks: 100,
    }],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/components/certificate-template", () => ({
  CertificateTemplate: ({ studentName }: { studentName: string }) => (
    <div data-testid="certificate-template">Certificate for {studentName}</div>
  ),
}));

vi.mock("@/lib/student-repository", () => ({ getMyCertificates: vi.fn() }));

describe("CertificatesPage", () => {
  afterEach(() => cleanup());

  it("opens View certificate in a modal without starting a PDF download", () => {
    render(<CertificatesPage />);

    fireEvent.click(screen.getAllByRole("button", { name: "View certificate" })[0]);

    const dialog = screen.getByRole("dialog", { name: "Web Development Certificate" });
    expect(dialog).toBeTruthy();
    expect(screen.getAllByTestId("certificate-template")).toHaveLength(2);
    expect(within(dialog).getByRole("button", { name: "Download PDF" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close certificate preview" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { compressProfilePhoto } from "./cloudinary-upload-service";

afterEach(() => vi.unstubAllGlobals());
describe("profile photo compression", () => {
  it("center crops to 500 square pixels and encodes a compressed JPEG before upload", async () => {
    const close = vi.fn();
    const bitmap = { width: 1200, height: 800, close };
    const drawImage = vi.fn();
    const output = new Blob(["compressed"], { type: "image/jpeg" });
    const toBlob = vi.fn((callback: (blob: Blob) => void) => callback(output));
    const canvas = { width: 0, height: 0, getContext: () => ({ fillRect: vi.fn(), drawImage, fillStyle: "" }), toBlob };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    vi.stubGlobal("document", { createElement: () => canvas });
    expect(await compressProfilePhoto({} as File)).toBe(output);
    expect([canvas.width, canvas.height]).toEqual([500, 500]);
    expect(drawImage).toHaveBeenCalledWith(bitmap, 200, 0, 800, 800, 0, 0, 500, 500);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.8);
    expect(close).toHaveBeenCalledOnce();
  });
  it("releases the decoded image when compression is unavailable", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ close }));
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => null }) });
    await expect(compressProfilePhoto({} as File)).rejects.toThrow("could not prepare");
    expect(close).toHaveBeenCalledOnce();
  });
});

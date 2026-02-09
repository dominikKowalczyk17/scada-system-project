import { describe, it, expect, beforeEach, vi } from "vitest";
import { createRef } from "react";
import { captureAllSections } from "@/hooks/useScreenshotAll";

const mockToPng = vi.fn();

vi.mock("html-to-image", () => ({
  toPng: (...args: unknown[]) => mockToPng(...args),
}));

describe("captureAllSections", () => {
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-02-08T21:50:30.000Z"));

    clickSpy = vi.fn();

    // Mock createElement to capture link clicks
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "a") {
        el.click = clickSpy;
      }
      return el;
    });

    mockToPng.mockResolvedValue("data:image/png;base64,fakePNG");
  });

  it("captures each section and triggers download", async () => {
    const ref1 = createRef<HTMLDivElement>();
    const ref2 = createRef<HTMLDivElement>();

    Object.defineProperty(ref1, "current", {
      value: document.createElement("div"),
      writable: true,
    });
    Object.defineProperty(ref2, "current", {
      value: document.createElement("div"),
      writable: true,
    });

    await captureAllSections([
      { name: "power-quality", ref: ref1 },
      { name: "parameters", ref: ref2 },
    ]);

    expect(mockToPng).toHaveBeenCalledTimes(2);
    expect(mockToPng).toHaveBeenCalledWith(ref1.current, {
      backgroundColor: "#111827",
      pixelRatio: 2,
    });
    expect(mockToPng).toHaveBeenCalledWith(ref2.current, {
      backgroundColor: "#111827",
      pixelRatio: 2,
    });

    expect(clickSpy).toHaveBeenCalledTimes(2);
  });

  it("generates filenames with timestamp", async () => {
    const ref = createRef<HTMLDivElement>();
    Object.defineProperty(ref, "current", {
      value: document.createElement("div"),
      writable: true,
    });

    const links: HTMLAnchorElement[] = [];
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === "a") {
        el.click = clickSpy;
        links.push(el as HTMLAnchorElement);
      }
      return el;
    });

    await captureAllSections([{ name: "waveform", ref }]);

    expect(links).toHaveLength(1);
    expect(links[0].download).toBe("waveform-2026-02-08T21-50-30.png");
    expect(links[0].href).toContain("data:image/png");
  });

  it("skips sections with null refs without errors", async () => {
    const refMounted = createRef<HTMLDivElement>();
    const refNull = createRef<HTMLDivElement>();

    Object.defineProperty(refMounted, "current", {
      value: document.createElement("div"),
      writable: true,
    });

    await captureAllSections([
      { name: "streaming-charts", ref: refNull },
      { name: "harmonics", ref: refMounted },
    ]);

    expect(mockToPng).toHaveBeenCalledTimes(1);
    expect(mockToPng).toHaveBeenCalledWith(refMounted.current, {
      backgroundColor: "#111827",
      pixelRatio: 2,
    });
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("handles empty sections array", async () => {
    await captureAllSections([]);

    expect(mockToPng).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("calls beforeCapture before toPng when provided", async () => {
    const ref = createRef<HTMLDivElement>();
    Object.defineProperty(ref, "current", {
      value: document.createElement("div"),
      writable: true,
    });

    const callOrder: string[] = [];
    const beforeCapture = vi.fn(() => callOrder.push("beforeCapture"));
    mockToPng.mockImplementation(async () => {
      callOrder.push("toPng");
      return "data:image/png;base64,fakePNG";
    });

    await captureAllSections([{ name: "harmonics-voltage-log", ref, beforeCapture }]);

    expect(beforeCapture).toHaveBeenCalledTimes(1);
    expect(mockToPng).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(["beforeCapture", "toPng"]);
  });

  it("does not call beforeCapture when not provided", async () => {
    const ref = createRef<HTMLDivElement>();
    Object.defineProperty(ref, "current", {
      value: document.createElement("div"),
      writable: true,
    });

    await captureAllSections([{ name: "waveform", ref }]);

    expect(mockToPng).toHaveBeenCalledTimes(1);
  });

  it("continues capturing remaining sections when one fails", async () => {
    const ref1 = createRef<HTMLDivElement>();
    const ref2 = createRef<HTMLDivElement>();

    Object.defineProperty(ref1, "current", {
      value: document.createElement("div"),
      writable: true,
    });
    Object.defineProperty(ref2, "current", {
      value: document.createElement("div"),
      writable: true,
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockToPng
      .mockRejectedValueOnce(new Error("render failed"))
      .mockResolvedValueOnce("data:image/png;base64,fakePNG");

    await captureAllSections([
      { name: "power-quality", ref: ref1 },
      { name: "parameters", ref: ref2 },
    ]);

    expect(mockToPng).toHaveBeenCalledTimes(2);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[Screenshot] Failed to capture "power-quality":',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});

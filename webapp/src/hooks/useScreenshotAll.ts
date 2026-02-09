import { toPng } from "html-to-image";

interface ScreenshotSection {
  name: string;
  ref: React.RefObject<HTMLDivElement | null>;
  beforeCapture?: () => void;
}

export async function captureAllSections(sections: ScreenshotSection[]) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);

  for (const { name, ref, beforeCapture } of sections) {
    if (!ref.current) continue;

    try {
      if (beforeCapture) {
        beforeCapture();
        // Wait for React to re-render after state change
        await new Promise((r) => setTimeout(r, 100));
      }

      const dataUrl = await toPng(ref.current, {
        backgroundColor: "#111827",
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = `${name}-${timestamp}.png`;
      link.href = dataUrl;
      link.click();

      // Short pause between downloads so the browser doesn't block them
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.error(`[Screenshot] Failed to capture "${name}":`, err);
    }
  }
}

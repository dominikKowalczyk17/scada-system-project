import { toPng } from "html-to-image";

export async function captureAllSections(
  sections: { name: string; ref: React.RefObject<HTMLDivElement | null> }[],
) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);

  for (const { name, ref } of sections) {
    if (!ref.current) continue;

    try {
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

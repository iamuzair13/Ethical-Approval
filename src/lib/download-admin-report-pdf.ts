/**
 * PDF export: toolbar (.no-print) omitted via html2canvas onclone.
 * Pages split at table row / section bottoms so rows are not cut mid-line.
 */

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

function prepareIframeDocument(html: string): { iframe: HTMLIFrameElement; cleanup: () => void } {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "pdf-render-fallback");
  iframe.style.cssText =
    "position:fixed;left:-12000px;top:0;width:816px;min-height:400px;border:none;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    iframe.remove();
  };

  return { iframe, cleanup };
}

/** Measure safe cut Y positions in document px (toolbar excluded), matched to html2canvas output. */
function measureDocCutBottoms(body: HTMLElement): number[] {
  const doc = body.ownerDocument!;

  const wrapper = doc.createElement("div");
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.style.cssText =
    "position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;width:100%;z-index:-1;";

  const clone = body.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".no-print").forEach((n) => n.remove());
  clone.style.margin = "0";
  clone.style.width = `${body.scrollWidth}px`;

  wrapper.appendChild(clone);
  doc.body.appendChild(wrapper);
  void clone.offsetHeight;

  const rootRect = clone.getBoundingClientRect();
  const breaks = new Set<number>();
  breaks.add(0);

  const addBottom = (el: Element) => {
    const r = el.getBoundingClientRect();
    const bottom = r.bottom - rootRect.top + clone.scrollTop;
    if (bottom > 0.5) breaks.add(Math.ceil(bottom * 1000) / 1000);
  };

  clone.querySelectorAll("tr").forEach((tr) => addBottom(tr));
  clone.querySelectorAll("h1.doc-title, .sec-title, .footer-note").forEach((el) => addBottom(el));

  const total = clone.scrollHeight;
  breaks.add(total);

  wrapper.remove();

  return Array.from(breaks).sort((a, b) => a - b);
}

function addCanvasToPdfSmart(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  marginMm: number,
  cutBottomsDoc: number[],
): void {
  const docTotal = cutBottomsDoc[cutBottomsDoc.length - 1] || 1;
  const cutYs = cutBottomsDoc.map((b) => (b / docTotal) * canvas.height);

  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const contentWidthMm = pageWidthMm - 2 * marginMm;
  const contentHeightMm = pageHeightMm - 2 * marginMm;

  const imgWidthMm = contentWidthMm;
  const pxPerMm = canvas.width / imgWidthMm;
  const maxSlicePx = contentHeightMm * pxPerMm;

  let yStart = 0;

  while (yStart < canvas.height - 0.5) {
    const yHardEnd = Math.min(yStart + maxSlicePx, canvas.height);

    const eligible = cutYs.filter((y) => y > yStart + 0.25 && y <= yHardEnd + 0.25);
    let yEnd =
      eligible.length > 0
        ? Math.max(...eligible)
        : (() => {
            const next = cutYs.find((y) => y > yStart);
            if (next != null && next <= yHardEnd + maxSlicePx * 0.35) return Math.min(next, canvas.height);
            return yHardEnd;
          })();

    if (yEnd <= yStart + 0.25) {
      yEnd = Math.min(yHardEnd, canvas.height);
    }
    if (yEnd <= yStart) {
      yEnd = Math.min(yStart + 1, canvas.height);
    }

    const slicePx = Math.max(1, Math.round(yEnd) - Math.round(yStart));

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = slicePx;
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, yStart, canvas.width, slicePx, 0, 0, canvas.width, slicePx);

    const sliceHeightMm = (slicePx * imgWidthMm) / canvas.width;
    const imgData = sliceCanvas.toDataURL("image/jpeg", 0.92);
    pdf.addImage(imgData, "JPEG", marginMm, marginMm, imgWidthMm, sliceHeightMm);

    yStart = yEnd;
    if (yStart < canvas.height - 0.5) {
      pdf.addPage();
    }
  }
}

async function bodyToPdf(body: HTMLElement, fileName: string): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const cutBottomsDoc = measureDocCutBottoms(body);
  const docContentHeight = cutBottomsDoc[cutBottomsDoc.length - 1] || body.scrollHeight;

  const canvas = await html2canvas(body, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: body.scrollWidth,
    height: docContentHeight,
    windowWidth: body.scrollWidth,
    windowHeight: docContentHeight,
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc) => {
      clonedDoc.querySelectorAll(".no-print").forEach((el) => el.remove());
    },
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  addCanvasToPdfSmart(pdf, canvas, 10, cutBottomsDoc);
  pdf.save(fileName);
}

export async function downloadReportPdf(
  filenameBase: string,
  options: { previewIframe: HTMLIFrameElement | null; html: string },
): Promise<void> {
  const safeName = filenameBase.replace(/[^\w.\-]+/g, "_");
  const fileName = `${safeName}.pdf`;

  const html = options.html?.trim() ?? "";
  if (html.length > 0) {
    const { iframe, cleanup } = prepareIframeDocument(html);
    try {
      const b = iframe.contentDocument?.body;
      if (!b) {
        throw new Error("Could not parse report HTML.");
      }
      await bodyToPdf(b, fileName);
      return;
    } finally {
      cleanup();
    }
  }

  const liveBody = options.previewIframe?.contentDocument?.body ?? null;
  if (liveBody && liveBody.textContent && liveBody.textContent.trim().length > 0) {
    await bodyToPdf(liveBody, fileName);
    return;
  }

  throw new Error("No report HTML available to export.");
}

import PDFDocument from "pdfkit";
import { roles } from "./constants.js";
import { env } from "../config/env.js";

const resolvePhotoBuffer = async (user) => {
  const photoUrl =
    user.role === roles.CHIEF_EDITOR
      ? user.livePhotoUrl || user.profilePhotoUrl
      : user.profilePhotoUrl || user.livePhotoUrl;

  if (!photoUrl) return null;

  if (photoUrl.startsWith("data:")) {
    const [, encoded = ""] = photoUrl.split(",");
    return Buffer.from(encoded, "base64");
  }

  try {
    const response = await fetch(photoUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
};

const resolveQrBuffer = async (staffCode) => {
  const verifyUrl = `${env.clientUrl}/verify/${staffCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}&color=0b0f19`;
  try {
    const response = await fetch(qrUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
};

export const generateStaffCardBuffer = async (user) => {
  const isChiefEditor = user.role === roles.CHIEF_EDITOR;
  const staffCode = isChiefEditor ? user.chiefEditorCode || "PENDING" : user.reporterCode || "PENDING";

  const [photoBuffer, qrBuffer] = await Promise.all([
    resolvePhotoBuffer(user),
    resolveQrBuffer(staffCode)
  ]);

  return new Promise((resolve) => {
    // 3.5 inches x 2.2 inches is standard landscape ID card size in points (252 x 158). Let's use [350, 220] as high-res output
    const doc = new PDFDocument({ size: [350, 220], margin: 0 });
    const chunks = [];
    const roleLabel = isChiefEditor ? "Chief Editor" : "Reporter";

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // ==========================================
    // PAGE 1: FRONT SIDE
    // ==========================================

    // Outer Background Box
    doc.roundedRect(6, 6, 338, 208, 10).fill("#0b0f19");
    doc.roundedRect(6, 6, 338, 208, 10).lineWidth(2).stroke("#ea580c");

    // Header Accent bar
    doc.rect(6, 6, 338, 8).fill("#ea580c");

    // Logo & Header text
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13).text("PALAMU EXPRESS", 16, 22);
    doc.fillColor("#ea580c").font("Helvetica-Bold").fontSize(8.5).text("DIGITAL MEDIA", 140, 25.5);
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(7).text("Websites: palamuexpress.com | palamuexpress.in | palamuexpress.live", 16, 39);

    // Divider line
    doc.moveTo(16, 50).lineTo(334, 50).lineWidth(1).stroke("#1e293b");

    // Photo Box on Right
    doc.roundedRect(244, 58, 80, 94, 6).fill("#111827");
    doc.roundedRect(244, 58, 80, 94, 6).lineWidth(1.5).stroke("#ea580c");

    if (photoBuffer) {
      try {
        doc.image(photoBuffer, 247, 61, { fit: [74, 88], align: "center", valign: "center" });
      } catch {
        doc.fillColor("#475569").font("Helvetica").fontSize(8).text("PHOTO ERROR", 244, 96, { width: 80, align: "center" });
      }
    } else {
      doc.fillColor("#475569").font("Helvetica").fontSize(8).text("NO PHOTO", 244, 96, { width: 80, align: "center" });
    }

    // Role Badge (under photo)
    doc.roundedRect(244, 158, 80, 16, 4).fill("#ea580c");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8).text(roleLabel.toUpperCase(), 244, 162, { width: 80, align: "center" });

    // Details on Left
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13).text(user.fullName.toUpperCase(), 16, 58, { width: 220 });
    
    // Details Grid
    doc.font("Helvetica").fontSize(8);
    
    doc.fillColor("#94a3b8").text("ID CODE:", 16, 78);
    doc.fillColor("#f8fafc").font("Helvetica-Bold").text(staffCode, 80, 78);

    doc.font("Helvetica").fillColor("#94a3b8").text("DISTRICT:", 16, 92);
    doc.fillColor("#f8fafc").text(user.district || "-", 80, 92);

    doc.fillColor("#94a3b8").text("BLOCK:", 16, 106);
    doc.fillColor("#f8fafc").text(user.area || "-", 80, 106);

    doc.fillColor("#94a3b8").text("PHONE:", 16, 120);
    doc.fillColor("#f8fafc").text(user.phone || "-", 80, 120);

    doc.fillColor("#94a3b8").text("EMAIL:", 16, 134);
    doc.fillColor("#f8fafc").text(user.email || "-", 80, 134, { width: 155 });

    // Authority Signatory
    doc.moveTo(16, 150).lineTo(230, 150).lineWidth(0.5).stroke("#1e293b");

    doc.font("Helvetica-BoldOblique").fillColor("#38bdf8").fontSize(9.5).text("Pankaj Kumar Gupta", 16, 158);
    doc.font("Helvetica").fillColor("#64748b").fontSize(6.5).text("AUTHORIZED SIGNATORY", 16, 171);

    // Footer Ribbon
    doc.rect(6, 186, 338, 28).fill("#1e293b");
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(6.5).text("This card is official property of PALAMU EXPRESS DIGITAL MEDIA. If found, please return to office.", 16, 191, { width: 318 });
    doc.fillColor("#ea580c").font("Helvetica-Bold").fontSize(6.5).text("JURISDICTION: GARHWA, JHARKHAND", 16, 202);

    // ==========================================
    // PAGE 2: BACK SIDE
    // ==========================================
    doc.addPage({ size: [350, 220], margin: 0 });

    // Outer Background Box
    doc.roundedRect(6, 6, 338, 208, 10).fill("#080b12");
    doc.roundedRect(6, 6, 338, 208, 10).lineWidth(2).stroke("#ea580c");

    // Header Accent bar
    doc.rect(6, 6, 338, 8).fill("#ea580c");

    // Disclaimer
    doc.fillColor("#cbd5e1").font("Helvetica").fontSize(8.5).text(
      "This card is official property of PALAMU EXPRESS DIGITAL MEDIA. If found, please return to office or contact administration.",
      20, 26, { width: 310, align: "center", lineGap: 3.5 }
    );

    // QR Code on Left (Scan to Verify)
    const qrX = 50;
    const qrY = 82;
    const qrSize = 54;
    doc.roundedRect(qrX, qrY, qrSize, qrSize, 4).fill("#ffffff");

    if (qrBuffer) {
      try {
        doc.image(qrBuffer, qrX + 2, qrY + 2, { fit: [qrSize - 4, qrSize - 4], align: "center", valign: "center" });
      } catch {
        doc.fillColor("#ef4444").font("Helvetica-Bold").fontSize(5).text("QR ERROR", qrX, qrY + 22, { width: qrSize, align: "center" });
      }
    } else {
      doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(5).text("NO QR", qrX, qrY + 22, { width: qrSize, align: "center" });
    }

    doc.fillColor("#ea580c").font("Helvetica-Bold").fontSize(5.5).text("SCAN TO VERIFY", qrX, qrY + qrSize + 4, { width: qrSize, align: "center" });

    // Barcode Container on Right
    const barcodeX = 140;
    const barcodeY = 82;
    const barcodeWidth = 160;
    const barcodeHeight = 32;
    doc.roundedRect(barcodeX, barcodeY, barcodeWidth, barcodeHeight, 3).fill("#ffffff");

    // Draw realistic barcode stripes using loop
    const stripes = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 2, 1, 3, 1, 2, 2, 1, 3, 1, 4, 2];
    doc.fillColor("#000000");
    let currentBarcodeX = barcodeX + 10;
    for (let i = 0; i < stripes.length; i++) {
      const width = stripes[i];
      if (i % 2 === 0) {
        doc.rect(currentBarcodeX, barcodeY + 4, width, barcodeHeight - 8).fill("#000000");
      }
      currentBarcodeX += width + 2;
    }

    // Monospaced Code Text
    doc.fillColor("#94a3b8").font("Courier-Bold").fontSize(8).text(staffCode, barcodeX, barcodeY + barcodeHeight + 4, { width: barcodeWidth, align: "center" });

    // Footer Jurisdiction banner
    doc.rect(6, 186, 338, 28).fill("#1e293b");
    doc.fillColor("#ea580c").font("Helvetica-Bold").fontSize(7.5).text("JURISDICTION: GARHWA, JHARKHAND", 16, 196, { align: "center" });

    doc.end();
  });
};

export const generateReporterCardBuffer = (reporter) => generateStaffCardBuffer(reporter);

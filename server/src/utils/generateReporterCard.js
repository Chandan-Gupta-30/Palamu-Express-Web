import PDFDocument from "pdfkit";
import { roles } from "./constants.js";
import { env } from "../config/env.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.join(__dirname, "../assets/logo.png");

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

  // Fetch Global Expiry settings if available
  let globalIdCardExpiry = "";
  try {
    const { db } = await import("../config/firebase.js");
    const configSnap = await db.collection("settings").doc("global_config").get();
    if (configSnap.exists) {
      globalIdCardExpiry = configSnap.get("globalIdCardExpiry") || "";
    }
  } catch (err) {
    console.error("[generateStaffCardBuffer] Error fetching global settings:", err.message);
  }

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

    // Branded logo with white circle backdrop at the top
    try {
      // Draw a solid white circular backdrop to prevent the transparent logo from merging with the dark ID Card background
      doc.circle(30, 32, 14).fill("#ffffff");
      // Draw the PNG logo inside it (enlarged to 24x24 px for high visibility)
      doc.image(logoPath, 18, 20, { width: 24, height: 24 });
    } catch (err) {
      console.error("[ID Card Logo Error]:", err.message);
    }

    // Logo & Header text
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13).text("PALAMU EXPRESS", 50, 26);
    doc.fillColor("#ea580c").font("Helvetica-Bold").fontSize(8.5).text("DIGITAL MEDIA", 176, 29.5);
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(7).text("Websites: palamuexpress.com | palamuexpress.in | palamuexpress.live", 50, 41);

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
    doc.font("Helvetica").fillColor("#64748b").fontSize(6.5).text("Founder & Managing Director", 16, 171);

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

    // QR Code 1: Scan to Verify (Left)
    const qrX = 35;
    const qrY = 80;
    const qrSize = 56;
    doc.roundedRect(qrX, qrY, qrSize, qrSize, 4).fill("#ffffff");

    if (qrBuffer) {
      try {
        doc.image(qrBuffer, qrX + 2, qrY + 2, { fit: [qrSize - 4, qrSize - 4], align: "center", valign: "center" });
      } catch {
        doc.fillColor("#ef4444").font("Helvetica-Bold").fontSize(5.5).text("QR ERROR", qrX, qrY + 22, { width: qrSize, align: "center" });
      }
    } else {
      doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(5.5).text("NO QR", qrX, qrY + 22, { width: qrSize, align: "center" });
    }

    doc.fillColor("#ea580c").font("Helvetica-Bold").fontSize(6).text("SCAN TO VERIFY", qrX - 5, qrY + qrSize + 5, { width: qrSize + 10, align: "center" });

    // Vertical Divider
    doc.moveTo(115, 75).lineTo(115, 155).lineWidth(0.5).stroke("#1e293b");

    // Right Side: Details Grid
    const accreditedYear = user.createdAt ? new Date(user.createdAt).getFullYear() : 2026;
    
    // Parse validUpto date to DD-MM-YYYY format
    let expiryDateValue = user.validUpto || globalIdCardExpiry;
    let validUptoLabel = `31-12-${accreditedYear + 1}`;
    if (expiryDateValue) {
      try {
        const validDate = new Date(expiryDateValue);
        const day = String(validDate.getDate()).padStart(2, "0");
        const month = String(validDate.getMonth() + 1).padStart(2, "0");
        const year = validDate.getFullYear();
        validUptoLabel = `${day}-${month}-${year}`;
      } catch (err) {
        console.error("Failed to parse validUpto/global expiry date in PDF generation", err.message);
      }
    }

    doc.font("Helvetica").fontSize(7.5);

    doc.fillColor("#94a3b8").text("ACCREDITED SINCE:", 135, 76);
    doc.fillColor("#f8fafc").font("Helvetica-Bold").text(accreditedYear, 230, 76);

    doc.font("Helvetica").fillColor("#94a3b8").text("VALID UPTO:", 135, 92);
    doc.fillColor("#ea580c").font("Helvetica-Bold").text(validUptoLabel, 230, 92);

    doc.font("Helvetica").fillColor("#94a3b8").text("BLOOD GROUP:", 135, 108);
    doc.fillColor("#f8fafc").font("Helvetica-Bold").text(user.bloodGroup || "O+", 230, 108);

    doc.font("Helvetica").fillColor("#94a3b8").text("EMERGENCY CALL:", 135, 124);
    doc.fillColor("#f8fafc").font("Helvetica-Bold").text("+91 99999 99999", 230, 124);

    doc.font("Helvetica").fillColor("#94a3b8").text("OFFICIAL EMAIL:", 135, 140);
    doc.fillColor("#f8fafc").font("Helvetica-Bold").text("desk@palamuexpress.in", 230, 140);

    // Footer Jurisdiction banner
    doc.rect(6, 186, 338, 28).fill("#1e293b");
    doc.fillColor("#ea580c").font("Helvetica-Bold").fontSize(7.5).text("JURISDICTION: GARHWA, JHARKHAND", 16, 196, { align: "center" });

    doc.end();
  });
};

export const generateReporterCardBuffer = (reporter) => generateStaffCardBuffer(reporter);

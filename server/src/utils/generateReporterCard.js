import PDFDocument from "pdfkit";
import { roles } from "./constants.js";

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

export const generateStaffCardBuffer = async (user) => {
  const photoBuffer = await resolvePhotoBuffer(user);

  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: [350, 220], margin: 16 });
    const chunks = [];
    const isChiefEditor = user.role === roles.CHIEF_EDITOR;
    const roleLabel = isChiefEditor ? "Chief Editor" : "Reporter";
    const cardLabel = isChiefEditor ? "Official Chief Editor Identity Card" : "Official Reporter Identity Card";
    const staffCode = isChiefEditor ? user.chiefEditorCode || "PENDING" : user.reporterCode || "PENDING";

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.roundedRect(8, 8, 334, 204, 12).fillAndStroke("#0f172a", "#1d4ed8");
    doc.fillColor("#f8fafc").fontSize(18).text("Palamu Express", 20, 22);
    doc.fontSize(10).fillColor("#cbd5e1").text(cardLabel, 20, 48);

    doc.roundedRect(236, 24, 84, 100, 10).fillAndStroke("#111827", "#334155");
    if (photoBuffer) {
      doc.image(photoBuffer, 242, 30, { fit: [72, 88], align: "center", valign: "center" });
    } else {
      doc.fillColor("#94a3b8").fontSize(9).text("Photo", 264, 70, { width: 28, align: "center" });
    }

    doc.fillColor("#f8fafc").fontSize(14).text(user.fullName, 20, 82, { width: 190 });
    doc.fontSize(10).text(`${roleLabel} ID: ${staffCode}`, 20, 108, { width: 190 });
    doc.text(`District: ${user.district || "-"}`, 20, 124);
    doc.text(`Area: ${user.area || "-"}`, 20, 140);
    doc.text(`Phone: ${user.phone || "-"}`, 20, 156);
    doc.text(`Email: ${user.email || "-"}`, 20, 172, { width: 190 });
    doc.text("Authorized after admin approval", 20, 190);
    doc.end();
  });
};

export const generateReporterCardBuffer = (reporter) => generateStaffCardBuffer(reporter);

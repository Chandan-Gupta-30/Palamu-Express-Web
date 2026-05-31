import PDFDocument from "pdfkit";
import { roles, approvalStatuses } from "./constants.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
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

const drawProfessionalLetterhead = (doc) => {
  // Outer borders
  doc.rect(20, 20, 555, 802).lineWidth(1.5).stroke("#0b0f19");
  doc.rect(24, 24, 547, 794).lineWidth(0.5).stroke("#ea580c");

  // Top header block
  try {
    doc.image(logoPath, 45, 34, { width: 64, height: 64 });
  } catch (err) {
    console.error("[Letterhead Logo Error]:", err.message);
  }

  doc.fillColor("#0b0f19").font("Helvetica-Bold").fontSize(22).text("PALAMU EXPRESS", 122, 40);
  doc.fillColor("#ea580c").font("Helvetica-Bold").fontSize(11).text("DIGITAL MEDIA", 332, 47);
  
  doc.fillColor("#ea580c").font("Helvetica-Bold").fontSize(8.5).text("ACCREDITED REGIONAL NEWSROOM NETWORK", 122, 66, { characterSpacing: 0.5 });
  
  doc.fillColor("#0b0f19").font("Helvetica-Bold").fontSize(7.5).text(
    "MSME, GOVT. OF INDIA REGISTERED ENTERPRISE | UDYAM REGISTRATION NO: UDYAM-JH-07-0019715",
    122, 78, { characterSpacing: 0.1 }
  );
  doc.fillColor("#475569").font("Helvetica").fontSize(7.5).text(
    "Registered Office: Ranka, Jharkhand - 822125 | Email: desk@palamuexpress.in | Website: www.palamuexpress.in",
    122, 90
  );

  // Horizontal separator line
  doc.moveTo(45, 112).lineTo(550, 112).lineWidth(1.5).stroke("#0b0f19");
  doc.moveTo(45, 115).lineTo(550, 115).lineWidth(0.5).stroke("#ea580c");
};

const drawVerificationAndSignatory = (doc, qrBuffer, chiefEditorName = "Chief Editor / Media Head") => {
  const yStart = 665;

  // Divider line
  doc.moveTo(45, yStart - 10).lineTo(550, yStart - 10).lineWidth(0.5).stroke("#cbd5e1");

  // Left Side: Scan to Verify QR
  doc.roundedRect(45, yStart, 65, 65, 4).fill("#ffffff");
  doc.roundedRect(45, yStart, 65, 65, 4).lineWidth(0.5).stroke("#cbd5e1");

  if (qrBuffer) {
    try {
      doc.image(qrBuffer, 47, yStart + 2, { fit: [61, 61], align: "center", valign: "center" });
    } catch {
      doc.fillColor("#ef4444").font("Helvetica-Bold").fontSize(7).text("QR ERROR", 45, yStart + 28, { width: 65, align: "center" });
    }
  } else {
    doc.fillColor("#64748b").font("Helvetica-Bold").fontSize(7).text("NO QR", 45, yStart + 28, { width: 65, align: "center" });
  }

  doc.fillColor("#ea580c").font("Helvetica-Bold").fontSize(6.5).text("SCAN TO VERIFY", 35, yStart + 71, { width: 85, align: "center", characterSpacing: 0.5 });
  doc.fillColor("#64748b").font("Helvetica").fontSize(5.5).text("Accredited Verification Portal", 35, yStart + 79, { width: 85, align: "center" });

  // Co-Signatory 1: Media Head / Chief Editor (Center-Left)
  doc.fillColor("#0b0f19").font("Helvetica-BoldOblique").fontSize(13).text(chiefEditorName, 180, yStart + 10, { align: "center", width: 165 });
  
  // Signature underline bar (Media Head)
  doc.moveTo(180, yStart + 28).lineTo(345, yStart + 28).lineWidth(0.75).stroke("#ea580c");
  
  doc.fillColor("#0b0f19").font("Helvetica-Bold").fontSize(8.5).text(chiefEditorName, 180, yStart + 34, { align: "center", width: 165 });
  doc.fillColor("#475569").font("Helvetica").fontSize(7.5).text("Media Head / Chief Editor\nPALAMU EXPRESS DIGITAL MEDIA\n(Editorial Operations Board)", 180, yStart + 45, { align: "center", width: 165, lineGap: 1.5 });

  // Co-Signatory 2: Founder & Managing Director (Center-Right)
  doc.fillColor("#0b0f19").font("Helvetica-BoldOblique").fontSize(13).text("Pankaj Kumar Gupta", 385, yStart + 10, { align: "center", width: 165 });
  
  // Signature underline bar (Founder & MD)
  doc.moveTo(385, yStart + 28).lineTo(550, yStart + 28).lineWidth(0.75).stroke("#ea580c");
  
  doc.fillColor("#0b0f19").font("Helvetica-Bold").fontSize(8.5).text("Pankaj Kumar Gupta", 385, yStart + 34, { align: "center", width: 165 });
  doc.fillColor("#475569").font("Helvetica").fontSize(7.5).text("Founder & Managing Director\nPALAMU EXPRESS DIGITAL MEDIA\n(Govt. of India MSME Registered)", 385, yStart + 45, { align: "center", width: 165, lineGap: 1.5 });

  // Bottom Jurisdiction Notice
  doc.rect(24, 796, 547, 22).fill("#0b0f19");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(7.5).text("LEGAL ACCREDITATION JURISDICTION: GARHWA, JHARKHAND", 24, 804, { align: "center", characterSpacing: 1 });
};

const drawUserPhotoAndName = (doc, photoBuffer, fullName) => {
  const x = 440;
  const y = 190;
  const w = 80;
  const h = 96;

  // Background frame for profile photo
  doc.roundedRect(x, y, w, h, 4).fill("#f8fafc");
  doc.roundedRect(x, y, w, h, 4).lineWidth(1.5).stroke("#ea580c");

  if (photoBuffer) {
    try {
      doc.image(photoBuffer, x + 3, y + 3, { fit: [w - 6, h - 6], align: "center", valign: "center" });
    } catch {
      doc.fillColor("#ef4444").font("Helvetica-Bold").fontSize(8).text("PHOTO ERROR", x, y + h / 2 - 4, { width: w, align: "center" });
    }
  } else {
    // Initial letter fallback
    doc.fillColor("#cbd5e1").font("Helvetica-Bold").fontSize(28).text(fullName.charAt(0).toUpperCase(), x, y + h / 2 - 16, { width: w, align: "center" });
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(6.5).text("ACCREDITED PRESS", x, y + h - 14, { width: w, align: "center" });
  }

  // Name written right below the photo
  doc.fillColor("#0b0f19").font("Helvetica-Bold").fontSize(8).text(
    fullName.toUpperCase(),
    x - 15,
    y + h + 6,
    { width: w + 30, align: "center", lineGap: 1.5 }
  );
};

export const generateAppointmentLetterBuffer = async (user) => {
  const isChiefEditor = user.role === roles.CHIEF_EDITOR;
  const staffCode = isChiefEditor ? user.chiefEditorCode || "PENDING" : user.reporterCode || "PENDING";
  const roleLabel = isChiefEditor ? "Chief Editor" : "Reporter";
  const currentYear = new Date().getFullYear();

  const [qrBuffer, photoBuffer, chiefEditor] = await Promise.all([
    resolveQrBuffer(staffCode),
    resolvePhotoBuffer(user),
    User.findOne({ role: roles.CHIEF_EDITOR, approvalStatus: approvalStatuses.APPROVED })
  ]);

  const chiefEditorName = isChiefEditor 
    ? user.fullName 
    : (chiefEditor ? chiefEditor.fullName : "Chief Editor / Media Head");

  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    drawProfessionalLetterhead(doc);

    // Reference Number and Date
    doc.fillColor("#1e293b").font("Helvetica-Bold").fontSize(9.5).text(`Ref: PE/APPT/GRH/${currentYear}/${staffCode}`, 45, 135);
    doc.font("Helvetica").fontSize(9.5).text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 440, 135);

    // Title
    doc.fillColor("#0b0f19").font("Helvetica-Bold").fontSize(13).text("OFFICIAL ACCREDITATION & APPOINTMENT LETTER", 45, 165, { align: "center" });

    // Recipient Info
    doc.fillColor("#0b0f19").font("Helvetica-Bold").fontSize(10).text("To,", 45, 195);
    doc.font("Helvetica-Bold").fontSize(10.5).text(user.fullName.toUpperCase(), 45, 210);
    
    // Grid Details
    doc.font("Helvetica").fontSize(9).fillColor("#334155").text(`Designation: ${roleLabel}`, 45, 226);
    doc.text(`Official ID Code: ${staffCode}`, 45, 238);
    doc.text(`Blood Group: ${user.bloodGroup || "O+"}`, 45, 250);
    doc.text(`Reporting District: ${user.district || "-"}`, 45, 262);
    doc.text(`Assigned Block/Area: ${user.area || "-"}`, 45, 274);

    // Draw Photo Box and Name Under it on the Right
    drawUserPhotoAndName(doc, photoBuffer, user.fullName);

    // Letter Body (Dynamic Flow)
    doc.y = 310;
    doc.x = 45;

    doc.fillColor("#0b0f19").font("Helvetica").fontSize(9.5);
    doc.text(`Dear ${user.fullName},`, { lineGap: 2 });
    doc.moveDown(0.6);

    const bodyText1 = `We are highly pleased to inform you that upon successful background verification and evaluation of your reporting portfolio, the Board of PALAMU EXPRESS DIGITAL MEDIA (an MSME, Government of India Registered Enterprise bearing Udyam Registration Number: UDYAM-JH-07-0019715) hereby appoints you as an accredited press representative to our newsroom in the capacity of an official ${roleLabel}.`;

    const bodyText2 = `Under this official accreditation, your primary territory of ground reporting operations and investigative news collection will cover the Block/Area of "${user.area || '-'}" within the District of "${user.district || '-'}" in the State of Jharkhand. All operations will fall strictly under the legal and accreditation jurisdiction of Garhwa, Jharkhand.`;

    const bodyText3 = `As a member of Palamu Express, you are required to capture local reports, compile investigative pieces, and document audio-visual bulletins with the highest standards of journalistic truthfulness, neutral balance, and professional integrity. Your accredited reporting code is strictly mapped to your profile and must be presented when requested.`;

    const termsTitle = `CRITICAL TERMS & CONDITIONS OF APPOINTMENT:`;
    
    const termsBody = `Please be explicitly advised that this appointment is formally issued purely on a contract/independent commission basis. This accreditation does NOT guarantee permanent inclusion, fixed monthly payroll salary, or permanent employment with PALAMU EXPRESS DIGITAL MEDIA. Your inclusion is based on active performance, adherence to press codes, and newsroom guidelines. PALAMU EXPRESS DIGITAL MEDIA reserves all rights to suspend, revoke, or terminate this accreditation at any time without prior notice in case of violations of journalistic ethics, media laws, or platform regulations.`;

    doc.text(bodyText1, { align: "justify", width: 505, lineGap: 3.5 });
    doc.moveDown(0.7);

    doc.text(bodyText2, { align: "justify", width: 505, lineGap: 3.5 });
    doc.moveDown(0.7);

    doc.text(bodyText3, { align: "justify", width: 505, lineGap: 3.5 });
    doc.moveDown(0.9);

    doc.font("Helvetica-Bold").fillColor("#ea580c").fontSize(9).text(termsTitle, { lineGap: 2 });
    doc.moveDown(0.4);

    doc.font("Helvetica").fillColor("#334155").fontSize(8.5).text(termsBody, { align: "justify", width: 505, lineGap: 3.5 });
    doc.moveDown(0.9);

    const closingText = `We welcome you to our newsroom network and trust that your active contributions will strengthen high-fidelity public interest journalism in the region.`;
    doc.fillColor("#0b0f19").font("Helvetica-Oblique").fontSize(9).text(closingText, { width: 505, lineGap: 2 });

    drawVerificationAndSignatory(doc, qrBuffer, chiefEditorName);

    doc.end();
  });
};

export const generateAuthorizationLetterBuffer = async (user) => {
  const isChiefEditor = user.role === roles.CHIEF_EDITOR;
  const staffCode = isChiefEditor ? user.chiefEditorCode || "PENDING" : user.reporterCode || "PENDING";
  const roleLabel = isChiefEditor ? "Chief Editor" : "Reporter";
  const currentYear = new Date().getFullYear();

  const [qrBuffer, photoBuffer, chiefEditor] = await Promise.all([
    resolveQrBuffer(staffCode),
    resolvePhotoBuffer(user),
    User.findOne({ role: roles.CHIEF_EDITOR, approvalStatus: approvalStatuses.APPROVED })
  ]);

  const chiefEditorName = isChiefEditor 
    ? user.fullName 
    : (chiefEditor ? chiefEditor.fullName : "Chief Editor / Media Head");

  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    drawProfessionalLetterhead(doc);

    // Reference Number and Date
    doc.fillColor("#1e293b").font("Helvetica-Bold").fontSize(9.5).text(`Ref: PE/AUTH/GRH/${currentYear}/${staffCode}`, 45, 135);
    doc.font("Helvetica").fontSize(9.5).text(`Date: ${new Date().toLocaleDateString("en-IN")}`, 440, 135);

    // Title
    doc.fillColor("#0b0f19").font("Helvetica-Bold").fontSize(13).text("ACCREDITED PRESS REPRESENTATIVE AUTHORIZATION CREDIT", 45, 165, { align: "center" });

    // Formal Greeting
    doc.fillColor("#0b0f19").font("Helvetica-Bold").fontSize(11).text("TO WHOMSOEVER IT MAY CONCERN", 45, 205);

    // Draw Photo Box and Name Under it on the Right
    drawUserPhotoAndName(doc, photoBuffer, user.fullName);

    const bodyText1 = `This is to formally certify and verify that the bearer of this credentials credit, ${user.fullName.toUpperCase()}, is an officially registered, accredited, and verified Press Representative representing PALAMU EXPRESS DIGITAL MEDIA (an MSME, Government of India Registered Enterprise bearing Udyam Registration Number: UDYAM-JH-07-0019715) in the capacity of an active ${roleLabel}.`;

    const bodyText2 = `He/She is formally authorized and credentialed to gather local news stories, conduct press interviews, record public interest audio-visual bulletins, and perform investigative ground reporting operations in the assigned Block/Area of "${user.area || '-'}" situated in the District of "${user.district || '-'}", Jharkhand. All credentialed operations are governed under the jurisdictional bounds of Garhwa, Jharkhand.`;

    const bodyText3 = `All local police authorities, law enforcement agencies, government administration blocks, and public sector offices under the Jurisdiction of the State of Jharkhand are kindly requested to facilitate his/her news gathering activities, extend necessary cooperative press assistance, and ensure his/her professional safety as an accredited member of the Fourth Estate.`;

    const bodyText4 = `VERIFICATION CLAUSE: The credentials and active accreditation status of this Press Representative can be verified instantly by scanning the secure QR Code embedded on the bottom left corner of this document, which connects directly to the official Palamu Express live server. Alternatively, public officers may input the official ID Code: ${staffCode} directly on our verified portal at desk.palamuexpress.in.`;

    const bodyText5 = `This authorization is valid up to ${user.validUpto ? new Date(user.validUpto).toLocaleDateString("en-IN") : `31-12-${currentYear + 1}`} and is subject to annual credentials renewal. Any unauthorized use, misrepresentation, or duplication of this document shall attract immediate legal action under the relevant sections of the Indian Penal Code (IPC) under the Garhwa Court Jurisdiction.`;

    // Dynamic Flow positioning to completely eliminate text overlapping
    doc.y = 230;
    doc.x = 45;

    // Body Text Paragraphs
    doc.font("Helvetica").fontSize(9.8).fillColor("#0b0f19");
    
    // First paragraph (runs left of the photo)
    doc.text(bodyText1, { align: "justify", width: 370, lineGap: 4 });
    doc.moveDown(0.8);

    // Second paragraph (runs left of the photo)
    doc.text(bodyText2, { align: "justify", width: 370, lineGap: 4 });

    // Ensure we are below the photo frame height limit to prevent full-width overlaps
    if (doc.y < 320) {
      doc.y = 320;
    }
    doc.moveDown(0.5);

    // Paragraphs 3, 4, 5 (full width)
    doc.text(bodyText3, { align: "justify", width: 505, lineGap: 4 });
    doc.moveDown(0.8);

    doc.text(bodyText4, { align: "justify", width: 505, lineGap: 4 });
    doc.moveDown(0.8);

    doc.text(bodyText5, { align: "justify", width: 505, lineGap: 4 });
    doc.moveDown(0.8);

    const closingText = `Issued under the official authority of the Board of PALAMU EXPRESS DIGITAL MEDIA (Govt. of India MSME Registered, UDYAM-JH-07-0019715).`;
    doc.font("Helvetica-Oblique").fontSize(9).text(closingText, { width: 505, lineGap: 2 });

    drawVerificationAndSignatory(doc, qrBuffer, chiefEditorName);

    doc.end();
  });
};

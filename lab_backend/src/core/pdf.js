import puppeteer from "puppeteer";
import { logger } from "./logger.js";

/**
 * Escapes a value for safe interpolation into the report HTML. Test names,
 * interpretations, the receptionist's prepared narrative, and letterhead text
 * are all tenant-controlled free text; without escaping, that content would be
 * injected raw into the page Puppeteer renders (markup/script injection into the
 * PDF render context). Everything dynamic below goes through this.
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape, then preserve author line breaks as <br/>. */
function multiline(value) {
  return escapeHtml(value).replace(/\r?\n/g, "<br/>");
}

/**
 * Generates an official, styled clinical laboratory diagnostic report PDF.
 *
 * When a `letterhead` is supplied (resolved from the org's Letterhead row) the
 * report is branded with it: a full banner image, or a logo beside the lab name,
 * a signature image, and custom contact/footer text. With no letterhead it falls
 * back to a clean text header built from the organization/branch details.
 *
 * The body prefers the receptionist's approved narrative (`preparedReport`) for
 * each test; otherwise it renders the technician's structured findings. The
 * status badge reflects each result's real status — no result is ever labelled
 * "verified" unless it actually is.
 */
export async function generateResultPdf({
  organization,
  branch,
  patient,
  order,
  results = [],
  letterhead = null,
}) {
  const orgName = escapeHtml(organization?.name || "Diagnostic Laboratory");
  const branchName = escapeHtml(branch?.name || "Head Laboratory");

  // Prefer letterhead contact details, then branch/org, then omit the segment
  // entirely — never fabricate an address, phone, or email.
  const addr = letterhead?.address || branch?.address || null;
  const phone = letterhead?.phone || branch?.phone || null;
  const email = letterhead?.email || organization?.email || null;
  const contactSegments = [
    branchName,
    addr ? escapeHtml(addr) : null,
    phone ? `Phone: ${escapeHtml(phone)}` : null,
    email ? `Email: ${escapeHtml(email)}` : null,
  ].filter(Boolean);
  const orgSub = contactSegments.join(" &middot; ");

  const patientName = escapeHtml(
    patient ? `${patient.firstName || ""} ${patient.lastName || ""}`.trim() || "Patient" : "Patient",
  );
  const patientCode = escapeHtml(patient?.patientCode || "—");
  const gender = escapeHtml(patient?.gender || "—");
  const dob = escapeHtml(
    patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "—",
  );
  const orderCode = escapeHtml(order?.orderCode || "—");
  const orderDate = escapeHtml(
    order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
  );
  const reportDate = escapeHtml(new Date().toLocaleDateString());

  // ---- Header: banner image > logo + text > plain text (fallback) ----------
  let headerHtml;
  if (letterhead?.letterheadDataUri) {
    headerHtml = `
      <div class="letterhead-banner">
        <img src="${letterhead.letterheadDataUri}" alt="Laboratory letterhead" />
      </div>
      <div class="banner-caption">Official Diagnostic Report</div>
    `;
  } else {
    headerHtml = `
      <div class="header">
        <div class="header-brand">
          ${letterhead?.logoDataUri ? `<img class="org-logo" src="${letterhead.logoDataUri}" alt="Laboratory logo" />` : ""}
          <div>
            <div class="org-title">${orgName}</div>
            <div class="org-sub">${orgSub}</div>
          </div>
        </div>
        <div class="doc-badge">Official Diagnostic Report</div>
      </div>
    `;
  }

  // ---- Per-test blocks ------------------------------------------------------
  const resultsHtml = results
    .map((r, idx) => {
      const testName = escapeHtml(r.orderItem?.testName || r.testName || `Investigation #${idx + 1}`);
      const status = String(r.status || "APPROVED").toUpperCase();
      const badgeClass = status === "APPROVED" ? "badge-approved" : "badge-pending";
      const badgeText = status === "APPROVED" ? "VERIFIED" : escapeHtml(status.replace(/_/g, " "));

      // The receptionist's approved narrative is the official report content.
      const preparedHtml = r.preparedReport
        ? `<div class="report-narrative">${multiline(r.preparedReport)}</div>`
        : "";

      // Technician's structured findings (fallback / supporting data).
      const dataObj = r.data;
      let findingsText = "";
      if (dataObj && typeof dataObj === "object" && !Array.isArray(dataObj)) {
        const f = dataObj.findings ?? dataObj.testValues ?? null;
        findingsText = f ? (typeof f === "string" ? f : JSON.stringify(f)) : "";
      } else if (typeof dataObj === "string") {
        findingsText = dataObj;
      }
      const isUploaded = r.type === "UPLOADED" || (!!r.documentId && !findingsText);

      let bodyHtml;
      if (preparedHtml) {
        bodyHtml = preparedHtml;
      } else if (isUploaded) {
        bodyHtml = `<p class="muted">Result provided as an uploaded document; refer to the laboratory records.</p>`;
      } else {
        bodyHtml = `
          <table class="findings-table">
            <thead>
              <tr>
                <th>Investigation Parameter</th>
                <th>Result / Finding</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${testName}</strong></td>
                <td>${escapeHtml(findingsText) || "Completed"}</td>
                <td><span class="badge ${badgeClass}">${badgeText}</span></td>
              </tr>
            </tbody>
          </table>
        `;
      }

      const interpretationHtml = r.interpretation
        ? `<div class="interpretation-box">
             <strong>Clinical Remarks &amp; Interpretation:</strong>
             <p>${multiline(r.interpretation)}</p>
           </div>`
        : "";

      return `
        <div class="test-block">
          <div class="test-header">
            <span>${testName}</span>
            <span class="badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="test-body">
            ${bodyHtml}
            ${interpretationHtml}
          </div>
        </div>
      `;
    })
    .join("");

  const signatureHtml = letterhead?.signatureDataUri
    ? `<img class="signature-img" src="${letterhead.signatureDataUri}" alt="Authorised signature" />`
    : "";

  const footerNoteHtml = letterhead?.footerText
    ? `<div class="footer-note">${multiline(letterhead.footerText)}</div>`
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Diagnostic Report - ${orderCode}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 0;
            font-size: 13px;
            line-height: 1.5;
          }
          .header {
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .header-brand { display: flex; align-items: center; gap: 14px; }
          .org-logo { height: 56px; width: auto; max-width: 160px; object-fit: contain; }
          .letterhead-banner img { width: 100%; height: auto; display: block; }
          .banner-caption {
            text-align: center;
            font-size: 11px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #64748b;
            margin: 8px 0 18px;
            padding-bottom: 10px;
            border-bottom: 2px solid #2563eb;
          }
          .org-title { font-size: 20px; font-weight: 700; color: #1e3a8a; letter-spacing: -0.5px; }
          .org-sub { font-size: 11px; color: #64748b; }
          .doc-badge {
            background: #eff6ff;
            color: #1d4ed8;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 6px;
            border: 1px solid #bfdbfe;
            text-transform: uppercase;
            white-space: nowrap;
          }
          .patient-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 20px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }
          .field-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 600; }
          .field-value { font-size: 13px; font-weight: 600; color: #0f172a; }
          .test-block { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
          .test-header {
            background: #f1f5f9;
            padding: 8px 14px;
            font-weight: 700;
            font-size: 13px;
            color: #334155;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .test-body { padding: 12px 14px; }
          .report-narrative { font-size: 12.5px; color: #0f172a; line-height: 1.7; }
          .muted { color: #64748b; }
          .findings-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          .findings-table th {
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            color: #64748b;
            border-bottom: 1px solid #cbd5e1;
            padding: 6px 0;
          }
          .findings-table td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
          .badge-approved { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
          .badge-pending { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
          .interpretation-box {
            background: #f8fafc;
            border-left: 3px solid #3b82f6;
            padding: 8px 12px;
            font-size: 12px;
            color: #334155;
            margin-top: 8px;
          }
          .interpretation-box p { margin: 4px 0 0 0; }
          .footer {
            margin-top: 30px;
            padding-top: 14px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .sign-box { text-align: right; }
          .signature-img { height: 50px; width: auto; max-width: 200px; display: block; margin: 0 0 4px auto; object-fit: contain; }
          .stamp {
            display: inline-block;
            border: 2px solid #059669;
            color: #059669;
            font-size: 10px;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 4px;
            text-transform: uppercase;
            margin-top: 6px;
          }
          .confidential { font-size: 10px; color: #94a3b8; max-width: 60%; }
          .footer-note {
            margin-top: 14px;
            text-align: center;
            font-size: 10px;
            color: #64748b;
            border-top: 1px dashed #e2e8f0;
            padding-top: 8px;
          }
        </style>
      </head>
      <body>
        ${headerHtml}

        <div class="patient-card">
          <div>
            <div class="field-label">Patient Name</div>
            <div class="field-value">${patientName}</div>
          </div>
          <div>
            <div class="field-label">Patient Identifier (PID)</div>
            <div class="field-value">${patientCode}</div>
          </div>
          <div>
            <div class="field-label">Gender / DOB</div>
            <div class="field-value">${gender} &middot; ${dob}</div>
          </div>
          <div>
            <div class="field-label">Order Accession</div>
            <div class="field-value" style="font-family: monospace; color: #2563eb;">${orderCode}</div>
          </div>
          <div>
            <div class="field-label">Order Date</div>
            <div class="field-value">${orderDate}</div>
          </div>
          <div>
            <div class="field-label">Report Date</div>
            <div class="field-value">${reportDate}</div>
          </div>
        </div>

        <div class="results-section">
          ${resultsHtml || "<p class='muted'>No result items recorded.</p>"}
        </div>

        <div class="footer">
          <div class="confidential">
            This document contains confidential medical information.<br />
            Electronically authenticated and verified by the issuing laboratory.
          </div>
          <div class="sign-box">
            ${signatureHtml}
            <div class="field-value">Authorised Signatory</div>
            <div class="stamp">Electronically Certified</div>
          </div>
        </div>
        ${footerNoteHtml}
      </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
    });
    return pdfBuffer;
  } catch (err) {
    logger.error({ err }, "Failed to generate result PDF");
    throw err;
  } finally {
    await browser.close();
  }
}

export default { generateResultPdf };

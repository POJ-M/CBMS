const PDFDocument = require('pdfkit');
const momentTz = require('moment-timezone');
const path = require('path');
const { calcAge, TIMEZONE } = require('./helpers');

/* ================================
   CORPORATE DESIGN SYSTEM
================================ */

const COLORS = {
  primary: '#1F2937',
  accent: '#8B0000',
  lightGray: '#E5E7EB',
  midGray: '#6B7280',
  text: '#111827',
  headerLine: '#D1D5DB',
  tableHeaderBg: '#F3F4F6',
  rowEven: '#FFFFFF',
  rowOdd: '#FAFAFA',
  green: '#16A34A',
  red: '#DC2626',
  blue: '#2563EB',
  familyHeaderBg: '#FEF2F2',
  familyBorder: '#FCA5A5',
};

const FONTS = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
};

const PAGE = {
  width: 841.89,
  height: 595.28,
  margin: 40,
  get contentWidth() {
    return this.width - this.margin * 2;
  },
};

/* ================================
   HELPERS
================================ */

const fmt = (date, format = 'DD-MM-YYYY') =>
  date ? momentTz(date).tz(TIMEZONE).format(format) : '—';

const fmtAge = (dob) => {
  const age = calcAge(dob);
  return age !== null ? String(age) : '—';
};

/**
 * BIRTHDAY — Name display logic with parent names
 *
 * For Youth or Child:
 *   - If head has spouse: "Sam — Son of Mark and Mary"
 *   - If head has no spouse: "Sam — Son of Mark"
 *   - Custom relation (Other): "Sam — Nephew of Mark" or "Sam — Nephew of Mark and Mary"
 *
 * For Member / Head: plain full name only.
 */
const formatBirthdayName = (b) => {
  if (b.memberType === 'Youth' || b.memberType === 'Child') {
    // Find the relationship label
    let relation = null;
    if (b.relationshipToHead && b.relationshipToHead !== 'Self') {
      relation =
        b.relationshipToHead === 'Other' && b.relationCustom
          ? b.relationCustom
          : b.relationshipToHead;
    }

    if (!relation) return b.fullName;

    // Get family head and spouse info from populated familyId
    const family = b.familyId;
    if (!family) return `${b.fullName} — ${relation}`;

    // Head name - populated from headId
    const headName = family.headId?.fullName || null;
    if (!headName) return `${b.fullName} — ${relation}`;

    // Spouse name - check if head has spouseId or spouseName
    const head = family.headId;
    const spouseName = 
      (head?.spouseId && typeof head.spouseId === 'object' ? head.spouseId.fullName : null) ||
      head?.spouseName ||
      null;

    // Build the formatted string
    if (spouseName) {
      return `${b.fullName} — ${relation} of ${headName} and ${spouseName}`;
    } else {
      return `${b.fullName} — ${relation} of ${headName}`;
    }
  }

  // Member or Head — plain name
  return b.fullName;
};

/**
 * ANNIVERSARY — Couple display logic
 *
 * Show both husband and wife in one cell:
 *   "Samuel Raj — Rani Samuel" (using — separator)
 *
 * Falls back gracefully:
 *   - spouseId.fullName (populated ref) → preferred
 *   - spouseName (text field)           → fallback
 *   - just the believer's name alone    → last resort
 */
const formatAnniversaryCouple = (b) => {
  const spouseName =
    (b.spouseId && typeof b.spouseId === 'object' ? b.spouseId.fullName : null) ||
    b.spouseName ||
    null;

  return spouseName
    ? `${b.fullName} — ${spouseName}`
    : b.fullName;
};

/**
 * De-duplicate couples from the believers array.
 *
 * When both husband and wife are in the list (both have upcoming anniversary),
 * we only want ONE row for the couple, not two.
 *
 * Strategy:
 *   - If believer has spouseId: form a pairKey = sorted([myId, spouseId]).join('_')
 *     Keep only the first occurrence of each pairKey.
 *   - If no spouseId: treat as individual, include once.
 */
const deduplicateCouples = (believers) => {
  const seen = new Set();

  return believers.filter((b) => {
    const myId = b._id?.toString();
    const partnerId =
      (b.spouseId && typeof b.spouseId === 'object'
        ? b.spouseId._id?.toString()
        : b.spouseId?.toString()) || null;

    if (!partnerId) {
      // Individual (no linked spouse) — include once
      if (seen.has(myId)) return false;
      seen.add(myId);
      return true;
    }

    // Couple — use a canonical pairKey so we keep only one record
    const pairKey = [myId, partnerId].sort().join('|');
    if (seen.has(pairKey)) return false;
    seen.add(pairKey);
    return true;
  });
};

/* ================================
   HEADER 
================================ */

const drawHeader = (doc, reportTitle, subtitle = '') => {
  const logoPath = path.join(__dirname, '../assets/poj-logo.png');
  const { margin } = PAGE;

  try {
    doc.image(logoPath, margin, 20, { width: 45 });
  } catch (e) {}

  doc.font(FONTS.bold)
     .fontSize(16)
     .fillColor(COLORS.text)
     .text('PRESENCE OF JESUS CHURCH', margin + 60, 22);

  doc.font(FONTS.regular)
     .fontSize(11)
     .fillColor(COLORS.midGray)
     .text(reportTitle, margin + 60, 42);

  if (subtitle) {
    doc.fontSize(9)
       .fillColor(COLORS.midGray)
       .text(subtitle, margin + 60, 58);
  }

  doc.moveTo(margin, 85)
     .lineTo(PAGE.width - margin, 85)
     .strokeColor(COLORS.headerLine)
     .lineWidth(1)
     .stroke();

  return 100;
};

/* ================================
   FOOTER (Correct Page Numbers)
================================ */

const drawFooter = (doc, pageNumber, totalPages, generatedDate) => {
  const footerY = PAGE.height - 30;

  doc.moveTo(PAGE.margin, footerY - 8)
     .lineTo(PAGE.width - PAGE.margin, footerY - 8)
     .strokeColor(COLORS.lightGray)
     .lineWidth(0.5)
     .stroke();

  doc.font(FONTS.regular)
     .fontSize(8)
     .fillColor(COLORS.midGray);

  // Left side: System name
  doc.text(
    'Presence of Jesus Church — Believer Management System',
    PAGE.margin,
    footerY,
    { align: 'left', width: 350 }
  );

  // Center: Generated date
  if (generatedDate) {
    doc.text(
      `Generated: ${generatedDate}`,
      PAGE.margin + 360,
      footerY,
      { align: 'center', width: 200 }
    );
  }

  // Right side: Page number
  doc.text(
    `Page ${pageNumber} of ${totalPages}`,
    -PAGE.margin,
    footerY,
    { align: 'right' }
  );
};

/* ================================
   SUMMARY SECTION
================================ */

const drawSummary = (doc, y, stats) => {
  doc.font(FONTS.bold)
     .fontSize(11)
     .fillColor(COLORS.text)
     .text('Summary', PAGE.margin, y);

  y += 18;

  stats.forEach(stat => {
    doc.font(FONTS.regular)
       .fontSize(9)
       .fillColor(COLORS.midGray)
       .text(`${stat.label}: `, PAGE.margin, y, { continued: true });

    doc.font(FONTS.bold)
       .fillColor(COLORS.text)
       .text(stat.value);

    y += 14;
  });

  return y + 10;
};

/* ================================
   TABLE RENDERER
================================ */

const drawTable = (doc, startY, columns, rows, reportTitle = '') => {
  const { margin } = PAGE;
  let y = startY;

  const rowHeight = 22;
  const headerHeight = 24;
  const maxY = PAGE.height - 60;

  const drawHeaderRow = (yPos) => {
    doc.rect(margin, yPos, PAGE.contentWidth, headerHeight)
       .fill(COLORS.tableHeaderBg);

    let x = margin;
    columns.forEach(col => {
      doc.font(FONTS.bold)
         .fontSize(9)
         .fillColor(COLORS.text)
         .text(col.label, x + 4, yPos + 7, {
           width: col.width - 8,
           align: col.align || 'left',
         });
      x += col.width;
    });

    return yPos + headerHeight;
  };

  y = drawHeaderRow(y);

  rows.forEach((row, i) => {
    if (y + rowHeight > maxY) {
      doc.addPage({ size: 'A4', layout: 'landscape' });
      y = drawHeader(doc, reportTitle || 'Report (continued)');
      y = drawHeaderRow(y);
    }

    const bgColor = i % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd;
    doc.rect(margin, y, PAGE.contentWidth, rowHeight).fill(bgColor);

    doc.rect(margin, y, PAGE.contentWidth, rowHeight)
       .strokeColor(COLORS.lightGray)
       .lineWidth(0.3)
       .stroke();

    let x = margin;
    columns.forEach(col => {
      const value = row[col.key] ?? '—';

      doc.font(FONTS.regular)
         .fontSize(8.5)
         .fillColor(COLORS.text)
         .text(String(value), x + 4, y + 7, {
           width: col.width - 8,
           align: col.align || 'left',
           lineBreak: false,
           ellipsis: true,
         });

      x += col.width;
    });

    y += rowHeight;
  });
};

/* ================================
   MAIN REPORT GENERATOR
================================ */

const generateBelieverReportPDF = (believers, reportTitle = 'Believer Report') => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        bufferPages: true,
        autoFirstPage: false,
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.addPage({ size: 'A4', layout: 'landscape' });

      let y = drawHeader(doc, reportTitle, `Generated on ${momentTz().tz(TIMEZONE).format('DD MMM YYYY')}`);

      const baptized = believers.filter(b => b.baptized === 'Yes').length;
      const active   = believers.filter(b => b.membershipStatus === 'Active').length;

      y = drawSummary(doc, y + 10, [
        { label: 'Total Believers',  value: believers.length },
        { label: 'Active Members',   value: active },
        { label: 'Baptized Members', value: baptized },
      ]);

      const rows = believers.map((b, i) => ({
        _idx:       i + 1,
        fullName:   b.fullName,
        gender:     b.gender,
        dob:        fmt(b.dob),
        age:        fmtAge(b.dob),
        memberType: b.memberType,
        baptized:   b.baptized,
        phone:      b.phone || '—',
        status:     b.membershipStatus,
      }));

      const columns = [
        { label: 'S.No',        key: '_idx',       width: 35,  align: 'center' },
        { label: 'Full Name', key: 'fullName',  width: 150 },
        { label: 'Gender',   key: 'gender',     width: 60,  align: 'center' },
        { label: 'DOB',      key: 'dob',        width: 90,  align: 'center' },
        { label: 'Age',      key: 'age',        width: 50,  align: 'center' },
        { label: 'Type',     key: 'memberType', width: 80,  align: 'center' },
        { label: 'Baptized', key: 'baptized',   width: 80,  align: 'center' },
        { label: 'Phone',    key: 'phone',      width: 110, align: 'center' },
        { label: 'Status',   key: 'status',     width: 80,  align: 'center' },
      ];

      drawTable(doc, y + 10, columns, rows, reportTitle);

      doc.flushPages();

      const generatedDate = momentTz().tz(TIMEZONE).format('DD MMM YYYY, HH:mm');
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc, i - range.start + 1, range.count, generatedDate);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/* ================================
   REMINDER REPORT GENERATOR
================================ */

const generateReminderReportPDF = (believers, reportTitle = 'Reminder Report') => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        bufferPages: true,
        autoFirstPage: false,
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.addPage({ size: 'A4', layout: 'landscape' });

      let y = drawHeader(
        doc,
        reportTitle,
        `Generated on ${momentTz().tz(TIMEZONE).format('DD MMM YYYY')}`
      );

      if (believers.length === 0) {
        doc.font(FONTS.regular)
           .fontSize(12)
           .fillColor(COLORS.midGray)
           .text(
             'No records found for this reminder period.',
             PAGE.margin,
             y + 60,
             { align: 'center', width: PAGE.contentWidth }
           );

        doc.flushPages();

        const generatedDate = momentTz().tz(TIMEZONE).format('DD MMM YYYY, HH:mm');
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          drawFooter(doc, i - range.start + 1, range.count, generatedDate);
        }

        doc.end();
        return;
      }

      const isBirthday = reportTitle.toLowerCase().includes('birthday');

      let rows;
      let columns;

      /* ─────────────────────────────────────────────────────────────────────
         BIRTHDAY REPORT
         ─────────────────────────────────────────────────────────────────────
         Column order: Name, DOB, Age, Gender, Village, Type
         
         Name column shows:
           • Member / Head  → "Samuel Raj"
           • Youth / Child  → "Sam — Son of Mark and Mary" (with parent names)
         One row per person.
      ───────────────────────────────────────────────────────────────────── */
      if (isBirthday) {
        rows = believers.map((b, i) => ({
          _idx:        i + 1,
          nameDisplay: formatBirthdayName(b),
          dob:         fmt(b.dob),
          age:         fmtAge(b.dob),
          gender:      b.gender,
          village:     b.familyId?.village || '—',
          memberType:  b.memberType,
        }));

        columns = [
          { label: 'S.No',                                                       key: '_idx',        width: 35,  align: 'center' },
          { label: 'Name  (Relation of Parent(s) for Youth / Child)',        key: 'nameDisplay', width: 250 },
          { label: 'Date of Birth',                                          key: 'dob',         width: 95,  align: 'center' },
          { label: 'Age',                                                    key: 'age',         width: 45,  align: 'center' },
          { label: 'Gender',                                                 key: 'gender',      width: 60,  align: 'center' },
          { label: 'Village',                                                key: 'village',     width: 100 },
          { label: 'Type',                                                   key: 'memberType',  width: 70,  align: 'center' },
        ];

      /* ─────────────────────────────────────────────────────────────────────
         ANNIVERSARY REPORT
         ─────────────────────────────────────────────────────────────────────
         Column order: Spouse Name (Husband — Wife), Wedding Date, Years Married, Village
         
         ONE row per couple.
         "Spouse Name" column: "Samuel Raj — Rani Samuel"
      ───────────────────────────────────────────────────────────────────── */
      } else {
        const dedupedBelievers = deduplicateCouples(believers);

        rows = dedupedBelievers.map((b, i) => ({
          _idx:         i + 1,
          coupleDisplay: formatAnniversaryCouple(b),
          weddingDate:  fmt(b.weddingDate),
          yearsMarried: b.weddingDate
            ? `${momentTz().tz(TIMEZONE).diff(momentTz(b.weddingDate).tz(TIMEZONE), 'years')} yrs`
            : '—',
          village:      b.familyId?.village || '—',
        }));

        columns = [
          { label: 'S.No',                                 key: '_idx',          width: 35,  align: 'center' },
          { label: 'Spouse Name  (Husband — Wife)',     key: 'coupleDisplay', width: 280 },
          { label: 'Wedding Date',                      key: 'weddingDate',   width: 100, align: 'center' },
          { label: 'Years Married',                     key: 'yearsMarried',  width: 90,  align: 'center' },
          { label: 'Village',                           key: 'village',       width: 150 },
        ];
      }

      drawTable(doc, y + 20, columns, rows, reportTitle);

      doc.flushPages();

      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc, i - range.start + 1, range.count);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/* ================================
   FAMILY-WISE REPORT GENERATOR
   Professional Industry Standard Design
================================ */

const generateFamilyReportPDF = (familiesWithMembers, reportTitle = 'Family-wise Report') => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 40, bottom: 50, left: 40, right: 40 },
        bufferPages: true,
        autoFirstPage: false,
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Start first page
      doc.addPage({ size: 'A4', layout: 'landscape' });

      const { margin } = PAGE;
      const maxY = PAGE.height - 70; // Reserve space for footer
      const contentWidth = PAGE.contentWidth;

      let y = drawHeader(
        doc,
        reportTitle,
        `Generated on ${momentTz().tz(TIMEZONE).format('DD MMM YYYY, HH:mm')} IST`
      );

      // Summary section with proper spacing
      const totalMembers = familiesWithMembers.reduce((sum, f) => sum + f.members.length, 0);
      
      y += 5;
      doc.font(FONTS.bold)
         .fontSize(11)
         .fillColor(COLORS.text)
         .text('Report Summary', margin, y);

      y += 18;
      
      // Summary cards with proper spacing
      const summaryData = [
        { label: 'Total Families', value: familiesWithMembers.length },
        { label: 'Total Members', value: totalMembers },
      ];

      summaryData.forEach(stat => {
        doc.font(FONTS.regular)
           .fontSize(9)
           .fillColor(COLORS.midGray)
           .text(`${stat.label}: `, margin, y, { continued: true });

        doc.font(FONTS.bold)
           .fillColor(COLORS.text)
           .text(stat.value);

        y += 14;
      });

      y += 20; // Space before families

      // Process each family
      familiesWithMembers.forEach((family, familyIndex) => {
        const familyHeaderHeight = 32;
        const memberHeaderHeight = 22;
        const memberRowHeight = 20;
        const familyBottomPadding = 20;
        const totalMembersHeight = memberHeaderHeight + (family.members.length * memberRowHeight);
        const totalFamilyBlockHeight = familyHeaderHeight + totalMembersHeight + familyBottomPadding;

        // Check if entire family block fits on current page
        if (y + totalFamilyBlockHeight > maxY) {
          // Move to new page
          doc.addPage({ size: 'A4', layout: 'landscape' });
          y = 60; // Start below header space on new page
        }

        // Family header with professional styling
        doc.roundedRect(margin, y, contentWidth, familyHeaderHeight, 4)
           .fillAndStroke(COLORS.familyHeaderBg, COLORS.familyBorder);

        // Family info - left side
        doc.font(FONTS.bold)
           .fontSize(12)
           .fillColor(COLORS.accent)
           .text(family.familyCode, margin + 12, y + 9);

        // Family details - middle
        const detailsX = margin + 140;
        doc.font(FONTS.regular)
           .fontSize(9)
           .fillColor(COLORS.text)
           .text(`Head: ${family.headId?.fullName || '—'}`, detailsX, y + 8);
        
        doc.font(FONTS.regular)
           .fontSize(8)
           .fillColor(COLORS.midGray)
           .text(`Village: ${family.village}  •  Status: ${family.familyStatus}`, detailsX, y + 20);

        // Member count badge - right side
        const badgeX = margin + contentWidth - 90;
        doc.roundedRect(badgeX, y + 7, 80, 18, 9)
           .fillAndStroke('#EFF6FF', '#93C5FD');
        
        doc.font(FONTS.bold)
           .fontSize(9)
           .fillColor('#1E40AF')
           .text(`${family.members.length} Members`, badgeX + 8, y + 11);

        y += familyHeaderHeight + 6;

        // Members table
        const memberColumns = [
          { label: 'S.No',        width: 30,  align: 'center' },
          { label: 'Full Name',     width: 150 },
          { label: 'Relationship',  width: 100 },
          { label: 'Gender',   width: 60,  align: 'center' },
          { label: 'Age',      width: 50,  align: 'center' },
          { label: 'Type',     width: 80,  align: 'center' },
          { label: 'Baptized', width: 70,  align: 'center' },
          { label: 'Phone',    width: 110 },
        ];

        // Member table header
        doc.rect(margin, y, contentWidth, memberHeaderHeight)
           .fillAndStroke(COLORS.tableHeaderBg, COLORS.lightGray);

        let x = margin;
        memberColumns.forEach(col => {
          doc.font(FONTS.bold)
             .fontSize(8)
             .fillColor(COLORS.text)
             .text(col.label, x + 6, y + 7, {
               width: col.width - 12,
               align: col.align || 'left',
             });
          x += col.width;
        });

        y += memberHeaderHeight;

        // Member rows with zebra striping
        family.members.forEach((member, mIdx) => {
          const bgColor = mIdx % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
          doc.rect(margin, y, contentWidth, memberRowHeight)
             .fillAndStroke(bgColor, COLORS.lightGray);

          // Determine relationship display
          let relationDisplay = '—';
          if (member.isHead) {
            relationDisplay = 'HEAD';
          } else if (member.relationshipToHead === 'Other' && member.relationCustom) {
            relationDisplay = member.relationCustom;
          } else if (member.relationshipToHead) {
            relationDisplay = member.relationshipToHead;
          }

          const rowData = [
            String(mIdx + 1),
            member.fullName,
            relationDisplay,
            member.gender,
            fmtAge(member.dob),
            member.memberType,
            member.baptized,
            member.phone || '—',
          ];

          x = margin;
          memberColumns.forEach((col, colIdx) => {
            let textColor = COLORS.text;
            let fontType = FONTS.regular;

            // Highlight HEAD row
            if (member.isHead && colIdx === 2) {
              textColor = COLORS.accent;
              fontType = FONTS.bold;
            }

            doc.font(fontType)
               .fontSize(8)
               .fillColor(textColor)
               .text(String(rowData[colIdx]), x + 6, y + 6, {
                 width: col.width - 12,
                 align: col.align || 'left',
                 lineBreak: false,
                 ellipsis: true,
               });
            x += col.width;
          });

          y += memberRowHeight;
        });

        y += familyBottomPadding; // Space between families
      });

      // Finalize and add page numbers
      doc.flushPages();

      const generatedDate = momentTz().tz(TIMEZONE).format('DD MMM YYYY, HH:mm');
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc, i - range.start + 1, range.count, generatedDate);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateBelieverReportPDF, generateReminderReportPDF, generateFamilyReportPDF };
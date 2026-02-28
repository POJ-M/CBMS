const ExcelJS = require('exceljs');
const momentTz = require('moment-timezone');
const Believer = require('../models/Believer');
const Family = require('../models/Family');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { calcAge, isWithinNextDays, isInCurrentMonth, TIMEZONE } = require('../utils/helpers');
const { generateBelieverReportPDF, generateReminderReportPDF, generateFamilyReportPDF } = require('../utils/pdfGenerator');

// ─── SHARED HELPERS (unchanged) ───────────────────────────────────────────────

const buildBaseQuery = (filters = {}) => {
  const query = { isDeleted: false };
  const { gender, maritalStatus, baptized, occupationCategory, memberType, membershipStatus } = filters;
  if (gender) query.gender = gender;
  if (maritalStatus) query.maritalStatus = maritalStatus;
  if (baptized) query.baptized = baptized;
  if (occupationCategory) query.occupationCategory = occupationCategory;
  if (memberType) query.memberType = memberType;
  if (membershipStatus) query.membershipStatus = membershipStatus;
  return query;
};

const applyMemoryFilters = (believers, filters = {}) => {
  let result = believers;
  const { village, ageMin, ageMax, birthdayMonth, anniversaryMonth } = filters;
  if (village?.trim()) {
    const term = village.trim().toLowerCase();
    result = result.filter((b) => b.familyId?.village?.toLowerCase().includes(term));
  }
  if (ageMin || ageMax) {
    result = result.filter((b) => {
      const age = calcAge(b.dob);
      if (ageMin && age < Number(ageMin)) return false;
      if (ageMax && age > Number(ageMax)) return false;
      return true;
    });
  }
  if (birthdayMonth) {
    result = result.filter(
      (b) => b.dob && momentTz(b.dob).tz(TIMEZONE).month() + 1 === Number(birthdayMonth)
    );
  }
  if (anniversaryMonth) {
    result = result.filter(
      (b) => b.weddingDate &&
        momentTz(b.weddingDate).tz(TIMEZONE).month() + 1 === Number(anniversaryMonth)
    );
  }
  return result;
};

/**
 * Build human-readable filter summary for PDF header.
 */
const buildFilterSummary = (filters = {}) => {
  const map = {
    gender: 'Gender',
    village: 'Village',
    maritalStatus: 'Marital Status',
    baptized: 'Baptized',
    occupationCategory: 'Occupation',
    memberType: 'Member Type',
    membershipStatus: 'Status',
    ageMin: 'Age From',
    ageMax: 'Age To',
    birthdayMonth: 'Birthday Month',
    anniversaryMonth: 'Anniversary Month',
  };
  const result = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v && map[k]) result[map[k]] = v;
  });
  return result;
};

// ─── EXISTING CONTROLLERS (unchanged) ────────────────────────────────────────

const getReportData = catchAsync(async (req, res) => {
  const query = buildBaseQuery(req.query);
  let believers = await Believer.find(query)
    .populate('familyId', 'village address familyCode')
    .populate('spouseId', 'fullName')
    .lean();
  believers = applyMemoryFilters(believers, req.query);
  res.status(200).json({ success: true, total: believers.length, data: believers });
});

const getReminderReport = catchAsync(async (req, res) => {
  const { type } = req.query;
  const validTypes = ['birthday-7days', 'birthday-month', 'anniversary-7days', 'anniversary-month'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
    });
  }
  
  // Populate family with headId, and headId with spouseId for parent name display
  const allBelievers = await Believer.find({ isDeleted: false })
    .populate({
      path: 'familyId',
      select: 'village headId',
      populate: {
        path: 'headId',
        select: 'fullName spouseId spouseName',
        populate: {
          path: 'spouseId',
          select: 'fullName'
        }
      }
    })
    .lean();
    
  let result = [];
  switch (type) {
    case 'birthday-7days':   result = allBelievers.filter((b) => b.dob && isWithinNextDays(b.dob, 7)); break;
    case 'birthday-month':   result = allBelievers.filter((b) => b.dob && isInCurrentMonth(b.dob)); break;
    case 'anniversary-7days': result = allBelievers.filter((b) => b.weddingDate && b.maritalStatus === 'Married' && isWithinNextDays(b.weddingDate, 7)); break;
    case 'anniversary-month': result = allBelievers.filter((b) => b.weddingDate && b.maritalStatus === 'Married' && isInCurrentMonth(b.weddingDate)); break;
  }
  res.status(200).json({ success: true, total: result.length, data: result });
});

// ─── NEW: FAMILY-WISE REPORT ──────────────────────────────────────────────────

/**
 * @desc    Get family-wise report (families with all members)
 * @route   GET /api/reports/family-wise
 * @access  Private (Admin)
 */
const getFamilyWiseReport = catchAsync(async (req, res) => {
  const { village, status } = req.query;
  
  const query = { isDeleted: false };
  if (village?.trim()) {
    query.village = { $regex: village.trim(), $options: 'i' };
  }
  if (status) {
    query.familyStatus = status;
  }

  const families = await Family.find(query)
    .populate('headId', 'fullName phone')
    .lean();

  // Fetch members for each family
  const familiesWithMembers = await Promise.all(
    families.map(async (family) => {
      const members = await Believer.find({ 
        familyId: family._id, 
        isDeleted: false 
      })
        .populate('spouseId', 'fullName')
        .lean();

      return {
        ...family,
        members
      };
    })
  );

  res.status(200).json({ 
    success: true, 
    total: familiesWithMembers.length, 
    data: familiesWithMembers 
  });
});

// ─── EXCEL EXPORT (updated to handle family reports) ─────────────────────────

const exportReport = catchAsync(async (req, res) => {
  const { filters = {}, reportTitle = 'Believer Report', reportType } = req.body;

  // Family-wise Excel export
  if (reportType === 'family') {
    const query = { isDeleted: false };
    if (filters.village?.trim()) {
      query.village = { $regex: filters.village.trim(), $options: 'i' };
    }
    if (filters.status) {
      query.familyStatus = filters.status;
    }

    const families = await Family.find(query)
      .populate('headId', 'fullName phone')
      .lean();

    const familiesWithMembers = await Promise.all(
      families.map(async (family) => {
        const members = await Believer.find({ 
          familyId: family._id, 
          isDeleted: false 
        }).lean();
        return { ...family, members };
      })
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Presence of Jesus Church';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Family Report', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    });

    // Header
    sheet.mergeCells('A1:H1');
    sheet.getCell('A1').value = 'PRESENCE OF JESUS CHURCH';
    sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF8B0000' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };
    sheet.getRow(1).height = 28;

    sheet.mergeCells('A2:H2');
    sheet.getCell('A2').value = 'FAMILY-WISE REPORT WITH MEMBERS';
    sheet.getCell('A2').font = { bold: true, size: 12 };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    sheet.mergeCells('A3:H3');
    sheet.getCell('A3').value = `Generated: ${momentTz().tz(TIMEZONE).format('DD-MM-YYYY HH:mm')} IST  |  Total Families: ${familiesWithMembers.length}`;
    sheet.getCell('A3').font = { italic: true, size: 9, color: { argb: 'FF666666' } };
    sheet.getCell('A3').alignment = { horizontal: 'center' };
    sheet.addRow([]);

    let currentRow = 5;

    familiesWithMembers.forEach((family, idx) => {
      // Family header row
      const familyRow = sheet.getRow(currentRow);
      familyRow.values = [
        `Family ${idx + 1}:`,
        family.familyCode,
        `Head: ${family.headId?.fullName || '—'}`,
        `Village: ${family.village}`,
        `Status: ${family.familyStatus}`,
        `Members: ${family.members.length}`,
        '', ''
      ];
      familyRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      familyRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B0000' } };
      familyRow.height = 22;
      currentRow++;

      // Members table header
      const memberHeaderRow = sheet.getRow(currentRow);
      memberHeaderRow.values = ['#', 'Full Name', 'Relation', 'Gender', 'Age', 'Type', 'Baptized', 'Phone'];
      memberHeaderRow.font = { bold: true };
      memberHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      currentRow++;

      // Members data
      family.members.forEach((member, mIdx) => {
        const memberRow = sheet.getRow(currentRow);
        memberRow.values = [
          mIdx + 1,
          member.fullName,
          member.isHead ? 'HEAD' : (member.relationshipToHead || '—'),
          member.gender,
          calcAge(member.dob) ?? '—',
          member.memberType,
          member.baptized,
          member.phone || '—'
        ];
        if (mIdx % 2 === 0) {
          memberRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
        }
        currentRow++;
      });

      currentRow++; // Gap between families
    });

    sheet.columns = [
      { width: 6 }, { width: 20 }, { width: 22 }, { width: 10 },
      { width: 8 }, { width: 13 }, { width: 10 }, { width: 14 }
    ];

    const safeTitle = reportTitle.replace(/[^a-zA-Z0-9_ -]/g, '').replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="POJ_${safeTitle}_${Date.now()}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
    return;
  }

  // Regular believer export (existing code)
  const query = buildBaseQuery(filters);
  let believers = await Believer.find(query)
    .populate('familyId', 'village address familyCode')
    .populate('spouseId', 'fullName')
    .lean();
  believers = applyMemoryFilters(believers, filters);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Presence of Jesus Church';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Believers Report', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
    properties: { tabColor: { argb: 'FF8B0000' } },
  });

  sheet.mergeCells('A1:N1');
  sheet.getCell('A1').value = 'PRESENCE OF JESUS CHURCH';
  sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF8B0000' } };
  sheet.getCell('A1').alignment = { horizontal: 'center' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells('A2:N2');
  sheet.getCell('A2').value = reportTitle.toUpperCase();
  sheet.getCell('A2').font = { bold: true, size: 12 };
  sheet.getCell('A2').alignment = { horizontal: 'center' };

  sheet.mergeCells('A3:N3');
  sheet.getCell('A3').value = `Generated: ${momentTz().tz(TIMEZONE).format('DD-MM-YYYY HH:mm')} IST  |  Total: ${believers.length}`;
  sheet.getCell('A3').font = { italic: true, size: 9, color: { argb: 'FF666666' } };
  sheet.getCell('A3').alignment = { horizontal: 'center' };
  sheet.addRow([]);

  const COLS = ['#', 'Full Name', 'Gender', 'DOB', 'Age', 'Member Type', 'Marital Status', 'Spouse Name', 'Baptized', 'Baptized Date', 'Occupation', 'Phone', 'Village', 'Status'];
  const headerRow = sheet.addRow(COLS);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B0000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  headerRow.height = 20;

  believers.forEach((b, i) => {
    const row = sheet.addRow([
      i + 1, b.fullName, b.gender,
      b.dob ? momentTz(b.dob).tz(TIMEZONE).format('DD-MM-YYYY') : '',
      calcAge(b.dob) ?? '',
      b.memberType, b.maritalStatus,
      b.spouseId?.fullName || b.spouseName || '',
      b.baptized,
      b.baptizedDate ? momentTz(b.baptizedDate).tz(TIMEZONE).format('DD-MM-YYYY') : '',
      b.occupationCategory, b.phone || '',
      b.familyId?.village || '', b.membershipStatus,
    ]);
    if (i % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
      });
    }
  });

  sheet.columns = [
    { width: 5 }, { width: 26 }, { width: 10 }, { width: 14 }, { width: 6 },
    { width: 13 }, { width: 14 }, { width: 22 }, { width: 10 }, { width: 14 },
    { width: 16 }, { width: 14 }, { width: 16 }, { width: 14 },
  ];

  const safeTitle = reportTitle.replace(/[^a-zA-Z0-9_ -]/g, '').replace(/\s+/g, '_');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="POJ_${safeTitle}_${Date.now()}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

// ─── PDF EXPORTS ──────────────────────────────────────────────────────────────

/**
 * @desc    Export filtered believer report as PDF
 * @route   POST /api/reports/export-pdf
 * @access  Private (Admin)
 */
const exportReportPDF = catchAsync(async (req, res, next) => {
  const { filters = {}, reportTitle = 'Believer Report' } = req.body;

  const query = buildBaseQuery(filters);
  let believers = await Believer.find(query)
    .populate('familyId', 'village address familyCode')
    .populate('spouseId', 'fullName')
    .lean();
  believers = applyMemoryFilters(believers, filters);

  if (believers.length === 0) {
    return next(new AppError('No records found for the selected filters. Cannot generate PDF.', 404));
  }

  const filterSummary = buildFilterSummary(filters);
  const pdfBuffer = await generateBelieverReportPDF(believers, reportTitle, filterSummary);

  const safeTitle = reportTitle.replace(/[^a-zA-Z0-9_ -]/g, '').replace(/\s+/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="POJ_${safeTitle}_${Date.now()}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.end(pdfBuffer);
});

/**
 * @desc    Export reminder report (birthdays / anniversaries) as PDF
 * @route   POST /api/reports/export-reminder-pdf
 * @access  Private (Admin)
 */
const exportReminderReportPDF = catchAsync(async (req, res, next) => {
  const { type, reportTitle = 'Reminder Report' } = req.body;

  const validTypes = ['birthday-7days', 'birthday-month', 'anniversary-7days', 'anniversary-month'];
  if (!validTypes.includes(type)) {
    return next(new AppError(`Invalid reminder type. Must be one of: ${validTypes.join(', ')}`, 400));
  }

  // Populate family with headId, and headId with spouseId for parent name display
  const allBelievers = await Believer.find({ isDeleted: false })
    .populate({
      path: 'familyId',
      select: 'village headId',
      populate: {
        path: 'headId',
        select: 'fullName spouseId spouseName',
        populate: {
          path: 'spouseId',
          select: 'fullName'
        }
      }
    })
    .populate('spouseId', 'fullName')
    .lean();

  let result = [];
  switch (type) {
    case 'birthday-7days':    result = allBelievers.filter((b) => b.dob && isWithinNextDays(b.dob, 7)); break;
    case 'birthday-month':    result = allBelievers.filter((b) => b.dob && isInCurrentMonth(b.dob)); break;
    case 'anniversary-7days': result = allBelievers.filter((b) => b.weddingDate && b.maritalStatus === 'Married' && isWithinNextDays(b.weddingDate, 7)); break;
    case 'anniversary-month': result = allBelievers.filter((b) => b.weddingDate && b.maritalStatus === 'Married' && isInCurrentMonth(b.weddingDate)); break;
  }

  const pdfBuffer = await generateReminderReportPDF(result, reportTitle);

  const safeTitle = reportTitle.replace(/[^a-zA-Z0-9_ -]/g, '').replace(/\s+/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="POJ_${safeTitle}_${Date.now()}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.end(pdfBuffer);
});

/**
 * @desc    Export family-wise report as PDF
 * @route   POST /api/reports/export-family-pdf
 * @access  Private (Admin)
 */
const exportFamilyReportPDF = catchAsync(async (req, res, next) => {
  const { filters = {}, reportTitle = 'Family-wise Report' } = req.body;

  const query = { isDeleted: false };
  if (filters.village?.trim()) {
    query.village = { $regex: filters.village.trim(), $options: 'i' };
  }
  if (filters.status) {
    query.familyStatus = filters.status;
  }

  const families = await Family.find(query)
    .populate('headId', 'fullName phone')
    .lean();

  const familiesWithMembers = await Promise.all(
    families.map(async (family) => {
      const members = await Believer.find({ 
        familyId: family._id, 
        isDeleted: false 
      })
        .populate('spouseId', 'fullName')
        .lean();
      return { ...family, members };
    })
  );

  if (familiesWithMembers.length === 0) {
    return next(new AppError('No families found for the selected filters.', 404));
  }

  const pdfBuffer = await generateFamilyReportPDF(familiesWithMembers, reportTitle);

  const safeTitle = reportTitle.replace(/[^a-zA-Z0-9_ -]/g, '').replace(/\s+/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="POJ_${safeTitle}_${Date.now()}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.end(pdfBuffer);
});

module.exports = {
  getReportData,
  getReminderReport,
  getFamilyWiseReport,
  exportReport,
  exportReportPDF,
  exportReminderReportPDF,
  exportFamilyReportPDF,
};
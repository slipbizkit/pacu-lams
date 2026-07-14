import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import sql from '../db';
import { doleLogoPng } from '../assets/doleLogo';
import { CountItem, FeedbackQuestionStat, FeedbackReport, MonthlyReport } from '../types/report';
import { SQD_KEYS } from '../types/feedback';

// CSM statements and their thematic grouping, sqd1..sqd10 in order. Kept alongside the
// report builder because that's the only backend consumer that needs the wording.
const SQD_STATEMENTS: string[] = [
  'I am satisfied with the legal assistance/service that I received.',
  'I spent a reasonable amount of time completing my transaction.',
  'The office followed the required procedures and clearly explained the process.',
  'The steps required for my transaction were easy to understand and follow.',
  'I was able to easily find information about my transaction through official channels.',
  'The office’s online or communication support responded promptly to my inquiries.',
  'I received the assistance I needed, or the reason it could not be granted was explained.',
  'The personnel who assisted me were courteous, respectful, and professional.',
  'The legal advice or information provided was clear, accurate, and easy to understand.',
  'I am confident the assistance helped me understand my rights and options.',
];

const SQD_GROUP_OF: string[] = [
  'Service Delivery', 'Service Delivery', 'Service Delivery', 'Service Delivery',
  'Information & Communication', 'Information & Communication',
  'Service Outcome', 'Staff Professionalism', 'Clarity of Advice', 'Confidence',
];

const STATUS_LABELS: Record<string, string> = {
  waiting: 'Waiting',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  incomplete: 'Incomplete',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function monthLabel(month: string): string {
  // month is 'YYYY-MM'; render as e.g. 'July 2026'
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

// Builds the monthly analytics report scoped to a single calendar month by
// clients.transaction_date. All aggregates share the same month range.
export async function getMonthlyReport(month: string): Promise<MonthlyReport> {
  const start = `${month}-01`; // first day of the selected month

  const [
    totalRows,
    statusRows,
    trendRows,
    issueRows,
    officeRows,
    sexRows,
    priorityRows,
    cityRows,
    lawyerRows,
    fbCountRows,
    fbQuestionRows,
    fbDistRows,
  ] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS total
      FROM clients c
      WHERE c.transaction_date >= ${start}::date
        AND c.transaction_date < ${start}::date + INTERVAL '1 month'
        AND c.status IN ('completed', 'cancelled')
    `,
    sql`
      SELECT c.status AS name, COUNT(*)::int AS count
      FROM clients c
      WHERE c.transaction_date >= ${start}::date
        AND c.transaction_date < ${start}::date + INTERVAL '1 month'
        AND c.status IN ('completed', 'cancelled')
      GROUP BY c.status
      ORDER BY count DESC
    `,
    sql`
      SELECT to_char(gs.m, 'YYYY-MM') AS month, COALESCE(t.cnt, 0)::int AS count
      FROM generate_series(${start}::date - INTERVAL '5 months', ${start}::date, INTERVAL '1 month') gs(m)
      LEFT JOIN (
        SELECT date_trunc('month', transaction_date) AS m, COUNT(*)::int AS cnt
        FROM clients
        WHERE transaction_date >= ${start}::date - INTERVAL '5 months'
          AND transaction_date < ${start}::date + INTERVAL '1 month'
          AND status IN ('completed', 'cancelled')
        GROUP BY 1
      ) t ON t.m = gs.m
      ORDER BY gs.m
    `,
    sql`
      SELECT ic.category_name AS name, COUNT(*)::int AS count
      FROM client_issues ci
      JOIN issue_categories ic ON ic.category_id = ci.category_id
      JOIN clients c ON c.client_id = ci.client_id
      WHERE c.transaction_date >= ${start}::date
        AND c.transaction_date < ${start}::date + INTERVAL '1 month'
        AND c.status IN ('completed', 'cancelled')
      GROUP BY ic.category_name
      ORDER BY count DESC, ic.category_name
      LIMIT 10
    `,
    sql`
      SELECT ro.office_name AS name, COUNT(*)::int AS count
      FROM clients c
      JOIN referred_offices ro ON ro.office_id = c.referred_office_id
      WHERE c.transaction_date >= ${start}::date
        AND c.transaction_date < ${start}::date + INTERVAL '1 month'
        AND c.status IN ('completed', 'cancelled')
      GROUP BY ro.office_name
      ORDER BY count DESC, ro.office_name
      LIMIT 10
    `,
    sql`
      SELECT COALESCE(c.sex::text, 'unknown') AS name, COUNT(*)::int AS count
      FROM clients c
      WHERE c.transaction_date >= ${start}::date
        AND c.transaction_date < ${start}::date + INTERVAL '1 month'
        AND c.status IN ('completed', 'cancelled')
      GROUP BY COALESCE(c.sex::text, 'unknown')
      ORDER BY count DESC
    `,
    sql`
      SELECT
        COUNT(*) FILTER (WHERE c.is_senior)::int   AS senior,
        COUNT(*) FILTER (WHERE c.is_pwd)::int      AS pwd,
        COUNT(*) FILTER (WHERE c.is_pregnant)::int AS pregnant
      FROM clients c
      WHERE c.transaction_date >= ${start}::date
        AND c.transaction_date < ${start}::date + INTERVAL '1 month'
        AND c.status IN ('completed', 'cancelled')
    `,
    sql`
      SELECT cm.city_municipality AS name, COUNT(*)::int AS count
      FROM clients c
      JOIN cities_municipalities cm ON cm.id = c.city_id
      WHERE c.transaction_date >= ${start}::date
        AND c.transaction_date < ${start}::date + INTERVAL '1 month'
        AND c.status IN ('completed', 'cancelled')
      GROUP BY cm.city_municipality
      ORDER BY count DESC, cm.city_municipality
      LIMIT 10
    `,
    sql`
      SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS name, COUNT(*)::int AS count
      FROM clients c
      JOIN users u ON u.user_id = c.assigned_lawyer_id
      WHERE c.transaction_date >= ${start}::date
        AND c.transaction_date < ${start}::date + INTERVAL '1 month'
        AND c.status IN ('completed', 'cancelled')
      GROUP BY u.user_id, u.first_name, u.last_name
      ORDER BY count DESC, name
    `,
    // Feedback: number of CSM submissions for the month's completed transactions.
    sql`
      SELECT COUNT(*)::int AS responses
      FROM client_feedback cf
      JOIN clients c ON c.client_id = cf.client_id
      WHERE c.transaction_date >= ${start}::date
        AND c.transaction_date < ${start}::date + INTERVAL '1 month'
        AND c.status = 'completed'
    `,
    // Feedback: per-question average and answered count (N/A excluded).
    sql`
      SELECT v.qkey AS key, ROUND(AVG(v.val)::numeric, 2)::float8 AS average, COUNT(v.val)::int AS responses
      FROM client_feedback cf
      JOIN clients c ON c.client_id = cf.client_id
      CROSS JOIN LATERAL (VALUES
        ('sqd1', cf.sqd1), ('sqd2', cf.sqd2), ('sqd3', cf.sqd3), ('sqd4', cf.sqd4), ('sqd5', cf.sqd5),
        ('sqd6', cf.sqd6), ('sqd7', cf.sqd7), ('sqd8', cf.sqd8), ('sqd9', cf.sqd9), ('sqd10', cf.sqd10)
      ) v(qkey, val)
      WHERE c.transaction_date >= ${start}::date
        AND c.transaction_date < ${start}::date + INTERVAL '1 month'
        AND c.status = 'completed'
        AND v.val IS NOT NULL
      GROUP BY v.qkey
    `,
    // Feedback: distribution of all answered item ratings (1-5).
    sql`
      SELECT v.val AS rating, COUNT(*)::int AS count
      FROM client_feedback cf
      JOIN clients c ON c.client_id = cf.client_id
      CROSS JOIN LATERAL (VALUES
        (cf.sqd1), (cf.sqd2), (cf.sqd3), (cf.sqd4), (cf.sqd5),
        (cf.sqd6), (cf.sqd7), (cf.sqd8), (cf.sqd9), (cf.sqd10)
      ) v(val)
      WHERE c.transaction_date >= ${start}::date
        AND c.transaction_date < ${start}::date + INTERVAL '1 month'
        AND c.status = 'completed'
        AND v.val IS NOT NULL
      GROUP BY v.val
      ORDER BY v.val
    `,
  ]);

  const priority = priorityRows[0] as { senior: number; pwd: number; pregnant: number };
  const by_priority: CountItem[] = [
    { name: 'Senior', count: priority.senior },
    { name: 'PWD', count: priority.pwd },
    { name: 'Pregnant', count: priority.pregnant },
  ].filter((p) => p.count > 0);

  const feedback = buildFeedbackReport(
    (fbCountRows[0] as { responses: number }).responses,
    (statusRows as CountItem[]).find((s) => s.name === 'completed')?.count ?? 0,
    fbQuestionRows as { key: string; average: number; responses: number }[],
    fbDistRows as { rating: number; count: number }[],
  );

  return {
    month,
    month_label: monthLabel(month),
    total: (totalRows[0] as { total: number }).total,
    by_status: statusRows as CountItem[],
    trend: (trendRows as { month: string; count: number }[]).map((r) => ({
      month: r.month,
      label: monthLabel(r.month),
      count: r.count,
    })),
    by_issue: issueRows as CountItem[],
    by_office: officeRows as CountItem[],
    by_sex: sexRows as CountItem[],
    by_priority,
    by_city: cityRows as CountItem[],
    by_lawyer: lawyerRows as CountItem[],
    feedback,
  };
}

// Assembles the CSM feedback section from the raw aggregate rows.
function buildFeedbackReport(
  responses: number,
  eligible: number,
  questionRows: { key: string; average: number; responses: number }[],
  distRows: { rating: number; count: number }[],
): FeedbackReport {
  const byKey = new Map(questionRows.map((r) => [r.key, r]));
  const by_question: FeedbackQuestionStat[] = SQD_KEYS.map((key, i) => {
    const row = byKey.get(key);
    return {
      key,
      number: i + 1,
      statement: SQD_STATEMENTS[i],
      group: SQD_GROUP_OF[i],
      average: row ? Number(row.average) : 0,
      responses: row ? row.responses : 0,
    };
  });

  const distribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: distRows.find((d) => Number(d.rating) === rating)?.count ?? 0,
  }));

  const totalItems = distribution.reduce((sum, d) => sum + d.count, 0);
  const weighted = distribution.reduce((sum, d) => sum + d.rating * d.count, 0);
  const satisfied = distribution.filter((d) => d.rating >= 4).reduce((sum, d) => sum + d.count, 0);

  return {
    responses,
    eligible,
    response_rate: eligible > 0 ? Math.round((responses / eligible) * 1000) / 10 : 0,
    overall_average: totalItems > 0 ? Math.round((weighted / totalItems) * 100) / 100 : 0,
    satisfaction_rate: totalItems > 0 ? Math.round((satisfied / totalItems) * 1000) / 10 : 0,
    by_question,
    distribution,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export async function buildExcelBuffer(report: MonthlyReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Monthly Report');

  const titleRow = sheet.addRow([`PACU Monthly Report — ${report.month_label}`]);
  titleRow.font = { bold: true, size: 14 };
  sheet.addRow([`Total transactions: ${report.total}`]);
  sheet.addRow([]);

  const section = (heading: string, columns: [string, string], items: CountItem[]) => {
    const head = sheet.addRow([heading]);
    head.font = { bold: true, size: 12 };
    const cols = sheet.addRow(columns);
    cols.font = { bold: true };
    if (items.length === 0) {
      sheet.addRow(['(none)', '']);
    } else {
      for (const it of items) sheet.addRow([it.name, it.count]);
    }
    sheet.addRow([]);
  };

  sheet.getColumn(1).width = 40;
  sheet.getColumn(2).width = 14;

  section('By Status', ['Status', 'Count'], report.by_status.map((s) => ({ name: statusLabel(s.name), count: s.count })));
  section('Top Issue Categories', ['Category', 'Count'], report.by_issue);
  section('Referred Offices', ['Office', 'Count'], report.by_office);
  section('By Sex', ['Sex', 'Count'], report.by_sex.map((s) => ({ name: s.name.charAt(0).toUpperCase() + s.name.slice(1), count: s.count })));
  section('Priority Groups', ['Group', 'Count'], report.by_priority);
  section('Top Cities / Municipalities', ['City / Municipality', 'Count'], report.by_city);
  section('Lawyer Productivity', ['Lawyer', 'Count'], report.by_lawyer);

  // Client Satisfaction Measurement
  const fb = report.feedback;
  const fbHead = sheet.addRow(['Client Satisfaction Measurement']);
  fbHead.font = { bold: true, size: 12 };
  sheet.addRow(['Responses', fb.responses]);
  sheet.addRow(['Eligible (completed)', fb.eligible]);
  sheet.addRow(['Response rate', `${fb.response_rate}%`]);
  sheet.addRow(['Overall score (out of 5)', fb.overall_average]);
  sheet.addRow(['Satisfaction rate (4-5)', `${fb.satisfaction_rate}%`]);
  sheet.addRow([]);

  const perQ = sheet.addRow(['Average by Question', 'Average', 'Responses', 'Group']);
  perQ.font = { bold: true };
  if (fb.responses === 0) {
    sheet.addRow(['(no responses this month)', '', '', '']);
  } else {
    for (const q of fb.by_question) {
      sheet.addRow([`${q.number}. ${q.statement}`, q.average, q.responses, q.group]);
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

const PDF = {
  navy: '#1b3a6b',
  navyDark: '#12294d',
  ink: '#1f2733',
  muted: '#6b7280',
  border: '#d5dae2',
  zebra: '#f4f6f9',
  cardBg: '#eef2f8',
  white: '#ffffff',
  track: '#e5e9f0',
  good: '#16a34a',
  warn: '#d97706',
  bad: '#dc2626',
};

// Bar colour by average rating: green (agree), amber (neutral), red (disagree).
function ratingColor(value: number): string {
  if (value >= 4) return PDF.good;
  if (value >= 3) return PDF.warn;
  return PDF.bad;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildPdfBuffer(report: MonthlyReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const margin = 48;
    const doc = new PDFDocument({ margin, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const contentW = right - left;
    const countColW = 110;
    const labelColW = contentW - countColW;
    const bottomLimit = () => doc.page.height - doc.page.margins.bottom - 24;

    let y = doc.page.margins.top;

    // --- Header -----------------------------------------------------------
    // Letterhead: department logo on the left, agency name stacked to its right
    // (Department of Labor and Employment over Public Assistance and Complaints Unit).
    const logoSize = 56;
    try {
      doc.image(doleLogoPng, left, doc.page.margins.top, { fit: [logoSize, logoSize] });
    } catch { /* logo optional */ }

    const orgX = left + logoSize + 14;
    const orgW = right - orgX;
    const orgTop = doc.page.margins.top + 14;
    doc.fillColor(PDF.navy).font('Helvetica-Bold').fontSize(12)
      .text('Department of Labor and Employment', orgX, orgTop, { width: orgW, lineBreak: false });
    doc.fillColor(PDF.muted).font('Helvetica').fontSize(10)
      .text('Public Assistance and Complaints Unit', orgX, orgTop + 17, { width: orgW, lineBreak: false });

    y = doc.page.margins.top + logoSize + 16;
    doc.fillColor(PDF.navy).font('Helvetica-Bold').fontSize(19)
      .text('Monthly Accomplishment Report', left, y);
    y += 26;
    doc.fillColor(PDF.ink).font('Helvetica').fontSize(12).text(report.month_label, left, y);
    doc.fillColor(PDF.muted).font('Helvetica').fontSize(9)
      .text(`Generated ${new Date().toLocaleString()}`, left, y + 3, { width: contentW, align: 'right' });
    y += 20;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(1.5).strokeColor(PDF.navy).stroke();
    y += 20;

    // --- Summary cards ----------------------------------------------------
    const statusMap: Record<string, number> = {};
    for (const s of report.by_status) statusMap[s.name] = s.count;
    const cards: [string, number][] = [
      ['Total submissions', report.total],
      ['Completed', statusMap['completed'] ?? 0],
      ['Cancelled', statusMap['cancelled'] ?? 0],
    ];
    const gap = 12;
    const cardW = (contentW - gap * 2) / 3;
    const cardH = 52;
    cards.forEach(([label, value], i) => {
      const x = left + i * (cardW + gap);
      doc.roundedRect(x, y, cardW, cardH, 6).fillColor(PDF.cardBg).fill();
      doc.roundedRect(x, y, cardW, cardH, 6).lineWidth(0.5).strokeColor(PDF.border).stroke();
      doc.fillColor(PDF.muted).font('Helvetica').fontSize(8)
        .text(label.toUpperCase(), x + 12, y + 10, { width: cardW - 24 });
      doc.fillColor(PDF.navy).font('Helvetica-Bold').fontSize(20)
        .text(String(value), x + 12, y + 24, { width: cardW - 24 });
    });
    y += cardH + 24;

    // --- Table helper -----------------------------------------------------
    const rowH = 22;

    function drawHeaderRow(cols: [string, string]) {
      doc.rect(left, y, contentW, rowH).fillColor(PDF.navy).fill();
      doc.fillColor(PDF.white).font('Helvetica-Bold').fontSize(9);
      doc.text(cols[0], left + 8, y + 7, { width: labelColW - 16, lineBreak: false });
      doc.text(cols[1], left + labelColW, y + 7, { width: countColW - 10, align: 'right', lineBreak: false });
      y += rowH;
    }

    function drawRow(name: string, count: string, index: number, bold = false) {
      const top = y;
      if (index % 2 === 1) doc.rect(left, top, contentW, rowH).fillColor(PDF.zebra).fill();
      doc.fillColor(PDF.ink).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
      doc.text(name, left + 8, top + 7, { width: labelColW - 16, ellipsis: true, lineBreak: false });
      doc.text(count, left + labelColW, top + 7, { width: countColW - 10, align: 'right', lineBreak: false });
      doc.lineWidth(0.5).strokeColor(PDF.border);
      doc.moveTo(left, top).lineTo(left, top + rowH).stroke();
      doc.moveTo(right, top).lineTo(right, top + rowH).stroke();
      doc.moveTo(left + labelColW, top).lineTo(left + labelColW, top + rowH).stroke();
      doc.moveTo(left, top + rowH).lineTo(right, top + rowH).stroke();
      y += rowH;
    }

    function drawTable(title: string, cols: [string, string], items: CountItem[], totalRow?: number) {
      if (y + 60 > bottomLimit()) { doc.addPage(); y = doc.page.margins.top; }
      doc.fillColor(PDF.navyDark).font('Helvetica-Bold').fontSize(12).text(title, left, y);
      y += 18;
      drawHeaderRow(cols);
      if (items.length === 0) {
        doc.fillColor(PDF.muted).font('Helvetica-Oblique').fontSize(9)
          .text('No data for this month', left + 8, y + 7, { width: contentW - 16, lineBreak: false });
        doc.lineWidth(0.5).strokeColor(PDF.border).rect(left, y, contentW, rowH).stroke();
        y += rowH;
      } else {
        items.forEach((it, i) => {
          if (y + rowH > bottomLimit()) { doc.addPage(); y = doc.page.margins.top; drawHeaderRow(cols); }
          drawRow(it.name, String(it.count), i);
        });
        if (totalRow !== undefined) {
          if (y + rowH > bottomLimit()) { doc.addPage(); y = doc.page.margins.top; drawHeaderRow(cols); }
          drawRow('Total', String(totalRow), items.length, true);
        }
      }
      y += 18;
    }

    // --- Sections ---------------------------------------------------------
    drawTable('Transactions by status', ['Status', 'Transactions'],
      report.by_status.map((s) => ({ name: statusLabel(s.name), count: s.count })), report.total);
    drawTable('Top issue categories', ['Category', 'Count'], report.by_issue);
    drawTable('Referrals by office', ['Office', 'Count'], report.by_office);
    drawTable('Clients by sex', ['Sex', 'Count'],
      report.by_sex.map((s) => ({ name: titleCase(s.name), count: s.count })));
    drawTable('Priority groups', ['Group', 'Count'], report.by_priority);
    drawTable('Top cities / municipalities', ['City / Municipality', 'Count'], report.by_city);
    drawTable('Accomplishments by lawyer', ['Lawyer', 'Transactions'], report.by_lawyer);

    // --- Client Satisfaction Measurement ---------------------------------
    drawFeedbackSection();

    function sectionHeading(title: string, minSpace = 120) {
      if (y + minSpace > bottomLimit()) { doc.addPage(); y = doc.page.margins.top; }
      doc.fillColor(PDF.navyDark).font('Helvetica-Bold').fontSize(12).text(title, left, y);
      y += 18;
    }

    // A labelled horizontal bar scaled to `max`; colour reflects the value.
    function drawScoreBar(label: string, value: number, responses: number, max = 5) {
      const rowH = 30;
      if (y + rowH > bottomLimit()) { doc.addPage(); y = doc.page.margins.top; }
      const valueColW = 42;
      const trackX = left;
      const trackW = contentW - valueColW;
      doc.fillColor(PDF.ink).font('Helvetica').fontSize(8)
        .text(label, left, y, { width: trackW, ellipsis: true, lineBreak: false });
      const barY = y + 13;
      const barH = 9;
      doc.roundedRect(trackX, barY, trackW, barH, 2).fillColor(PDF.track).fill();
      const filled = Math.max(0, Math.min(1, value / max)) * trackW;
      if (filled > 0) doc.roundedRect(trackX, barY, filled, barH, 2).fillColor(ratingColor(value)).fill();
      doc.fillColor(PDF.ink).font('Helvetica-Bold').fontSize(9)
        .text(value ? value.toFixed(2) : '—', trackX + trackW + 6, barY - 1, { width: valueColW, align: 'right', lineBreak: false });
      doc.fillColor(PDF.muted).font('Helvetica').fontSize(7)
        .text(`${responses} response${responses === 1 ? '' : 's'}`, trackX + trackW - 120, y, { width: 120, align: 'right', lineBreak: false });
      y += rowH;
    }

    function drawFeedbackSection() {
      const fb = report.feedback;
      sectionHeading('Client Satisfaction Measurement');

      // Summary cards
      const fbCards: [string, string][] = [
        ['Responses', `${fb.responses} / ${fb.eligible}`],
        ['Response rate', `${fb.response_rate}%`],
        ['Overall score', `${fb.overall_average.toFixed(2)} / 5`],
        ['Satisfaction (4-5)', `${fb.satisfaction_rate}%`],
      ];
      const g = 10;
      const cw = (contentW - g * 3) / 4;
      const ch = 50;
      if (y + ch > bottomLimit()) { doc.addPage(); y = doc.page.margins.top; }
      fbCards.forEach(([label, value], i) => {
        const x = left + i * (cw + g);
        doc.roundedRect(x, y, cw, ch, 6).fillColor(PDF.cardBg).fill();
        doc.roundedRect(x, y, cw, ch, 6).lineWidth(0.5).strokeColor(PDF.border).stroke();
        doc.fillColor(PDF.muted).font('Helvetica').fontSize(7).text(label.toUpperCase(), x + 10, y + 9, { width: cw - 20 });
        doc.fillColor(PDF.navy).font('Helvetica-Bold').fontSize(15).text(value, x + 10, y + 22, { width: cw - 20, lineBreak: false });
      });
      y += ch + 20;

      if (fb.responses === 0) {
        doc.fillColor(PDF.muted).font('Helvetica-Oblique').fontSize(9)
          .text('No feedback responses for this month.', left, y, { width: contentW, lineBreak: false });
        y += 24;
        return;
      }

      // Average score by question, grouped by category
      doc.fillColor(PDF.ink).font('Helvetica-Bold').fontSize(10).text('Average score by question (out of 5)', left, y);
      y += 16;
      let currentGroup = '';
      for (const q of fb.by_question) {
        if (q.group !== currentGroup) {
          currentGroup = q.group;
          if (y + 26 > bottomLimit()) { doc.addPage(); y = doc.page.margins.top; }
          doc.fillColor(PDF.navy).font('Helvetica-Bold').fontSize(8)
            .text(currentGroup.toUpperCase(), left, y, { characterSpacing: 0.5, lineBreak: false });
          y += 13;
        }
        drawScoreBar(`${q.number}. ${q.statement}`, q.average, q.responses);
      }
      y += 8;

      // Rating distribution
      sectionHeading('Rating distribution', 90);
      const distLabels: Record<number, string> = {
        5: '5 · Strongly Agree', 4: '4 · Agree', 3: '3 · Neither', 2: '2 · Disagree', 1: '1 · Strongly Disagree',
      };
      const maxCount = Math.max(...fb.distribution.map((d) => d.count), 1);
      [...fb.distribution].reverse().forEach((d) => {
        const rowH = 20;
        if (y + rowH > bottomLimit()) { doc.addPage(); y = doc.page.margins.top; }
        const labelW = 130;
        const valueColW = 40;
        const trackX = left + labelW;
        const trackW = contentW - labelW - valueColW;
        doc.fillColor(PDF.ink).font('Helvetica').fontSize(8)
          .text(distLabels[d.rating], left, y + 4, { width: labelW - 8, lineBreak: false });
        doc.roundedRect(trackX, y + 3, trackW, 10, 2).fillColor(PDF.track).fill();
        const w = (d.count / maxCount) * trackW;
        if (w > 0) doc.roundedRect(trackX, y + 3, w, 10, 2).fillColor(ratingColor(d.rating)).fill();
        doc.fillColor(PDF.ink).font('Helvetica-Bold').fontSize(8)
          .text(String(d.count), trackX + trackW + 6, y + 4, { width: valueColW, align: 'right', lineBreak: false });
        y += rowH;
      });
      y += 10;
    }

    // --- Footer (page numbers) -------------------------------------------
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      // Keep the footer above the bottom-margin boundary; writing into the margin
      // makes PDFKit auto-append a blank page.
      const fy = doc.page.height - doc.page.margins.bottom - 12;
      doc.lineWidth(0.5).strokeColor(PDF.border)
        .moveTo(left, fy - 6).lineTo(right, fy - 6).stroke();
      doc.fillColor(PDF.muted).font('Helvetica').fontSize(8);
      doc.text('PACU — Confidential', left, fy, { width: contentW / 2, lineBreak: false });
      doc.text(`Page ${i + 1} of ${range.count}`, left, fy, { width: contentW, align: 'right', lineBreak: false });
    }

    doc.end();
  });
}

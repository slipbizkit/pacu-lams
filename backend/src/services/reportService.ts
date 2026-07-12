import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import sql from '../db';
import { CountItem, MonthlyReport } from '../types/report';

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
  ]);

  const priority = priorityRows[0] as { senior: number; pwd: number; pregnant: number };
  const by_priority: CountItem[] = [
    { name: 'Senior', count: priority.senior },
    { name: 'PWD', count: priority.pwd },
    { name: 'Pregnant', count: priority.pregnant },
  ].filter((p) => p.count > 0);

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

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function buildPdfBuffer(report: MonthlyReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).fillColor('#000').text('PACU Monthly Report', { align: 'left' });
    doc.fontSize(12).fillColor('#333').text(report.month_label);
    doc.fontSize(9).fillColor('#666').text(`Generated ${new Date().toLocaleString()} — ${report.total} transaction(s)`);
    doc.moveDown();

    const section = (heading: string, items: CountItem[]) => {
      if (doc.y > doc.page.height - 140) doc.addPage();
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#000').font('Helvetica-Bold').text(heading);
      doc.moveDown(0.25);
      doc.fontSize(10).font('Helvetica').fillColor('#222');
      if (items.length === 0) {
        doc.fillColor('#888').text('No data for this month.');
        doc.fillColor('#222');
        return;
      }
      const labelWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right - 60;
      for (const it of items) {
        if (doc.y > doc.page.height - doc.page.margins.bottom - 20) doc.addPage();
        const y = doc.y;
        doc.text(it.name, doc.page.margins.left, y, { width: labelWidth, ellipsis: true, continued: false });
        doc.text(String(it.count), doc.page.margins.left + labelWidth, y, { width: 60, align: 'right' });
      }
    };

    section('By Status', report.by_status.map((s) => ({ name: statusLabel(s.name), count: s.count })));
    section('Top Issue Categories', report.by_issue);
    section('Referred Offices', report.by_office);
    section('By Sex', report.by_sex.map((s) => ({ name: s.name.charAt(0).toUpperCase() + s.name.slice(1), count: s.count })));
    section('Priority Groups', report.by_priority);
    section('Top Cities / Municipalities', report.by_city);
    section('Lawyer Productivity', report.by_lawyer);

    doc.end();
  });
}

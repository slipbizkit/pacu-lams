import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import sql from '../db';
import { ReportFilters, ReportRow } from '../types/report';

// The neon() HTTP client's tagged-template form can't build a WHERE clause with a variable
// number of conditions, so this uses its callable $1/$2-param form instead.
export async function runReport(filters: ReportFilters): Promise<ReportRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  function addCondition(clause: string, value: unknown) {
    params.push(value);
    conditions.push(clause.replace('?', `$${params.length}`));
  }

  if (filters.date_from) addCondition('c.transaction_date >= ?', filters.date_from);
  if (filters.date_to) addCondition('c.transaction_date <= ?', filters.date_to);
  if (filters.lawyer_id) addCondition('c.assigned_lawyer_id = ?', filters.lawyer_id);
  if (filters.referred_office_id) addCondition('c.referred_office_id = ?', filters.referred_office_id);
  if (filters.sex) addCondition('c.sex = ?', filters.sex);
  if (filters.city) addCondition('c.city ILIKE ?', `%${filters.city}%`);
  if (filters.province) addCondition('c.province ILIKE ?', `%${filters.province}%`);
  if (filters.status) addCondition('c.status = ?', filters.status);
  if (filters.priority_only) conditions.push('(c.is_senior OR c.is_pwd OR c.is_pregnant)');
  if (filters.min_age != null) addCondition('DATE_PART(\'year\', AGE(CURRENT_DATE, c.birth_date)) >= ?', filters.min_age);
  if (filters.max_age != null) addCondition('DATE_PART(\'year\', AGE(CURRENT_DATE, c.birth_date)) <= ?', filters.max_age);
  if (filters.issue_category_id) {
    params.push(filters.issue_category_id);
    conditions.push(`EXISTS (SELECT 1 FROM client_issues ci WHERE ci.client_id = c.client_id AND ci.category_id = $${params.length})`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      c.client_id, c.reference_no, c.queue_number, c.transaction_date,
      c.first_name, c.last_name, c.sex,
      DATE_PART('year', AGE(CURRENT_DATE, c.birth_date))::int AS age,
      c.city, c.province, c.is_senior, c.is_pwd, c.is_pregnant, c.status,
      TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS lawyer_name,
      ro.office_name AS referred_office,
      (
        SELECT STRING_AGG(DISTINCT ic.category_name, ', ' ORDER BY ic.category_name)
        FROM client_issues ci
        JOIN issue_categories ic ON ic.category_id = ci.category_id
        WHERE ci.client_id = c.client_id
      ) AS issue_categories
    FROM clients c
    LEFT JOIN users u ON u.user_id = c.assigned_lawyer_id
    LEFT JOIN referred_offices ro ON ro.office_id = c.referred_office_id
    ${where}
    ORDER BY c.transaction_date DESC, c.queue_number DESC
  `;

  const rows = await sql(query, params);
  return rows as ReportRow[];
}

export async function buildExcelBuffer(rows: ReportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');

  sheet.columns = [
    { header: 'Reference No.', key: 'reference_no', width: 20 },
    { header: 'Date', key: 'transaction_date', width: 14 },
    { header: 'Queue #', key: 'queue_number', width: 10 },
    { header: 'Client Name', key: 'name', width: 24 },
    { header: 'Sex', key: 'sex', width: 10 },
    { header: 'Age', key: 'age', width: 8 },
    { header: 'City', key: 'city', width: 16 },
    { header: 'Province', key: 'province', width: 16 },
    { header: 'Priority', key: 'priority', width: 18 },
    { header: 'Lawyer', key: 'lawyer_name', width: 22 },
    { header: 'Issue Categories', key: 'issue_categories', width: 30 },
    { header: 'Referred Office', key: 'referred_office', width: 22 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    const priority = [row.is_senior && 'Senior', row.is_pwd && 'PWD', row.is_pregnant && 'Pregnant']
      .filter(Boolean)
      .join(', ');
    sheet.addRow({
      reference_no: row.reference_no,
      transaction_date: row.transaction_date,
      queue_number: row.queue_number,
      name: `${row.first_name} ${row.last_name}`,
      sex: row.sex ?? '',
      age: row.age ?? '',
      city: row.city ?? '',
      province: row.province ?? '',
      priority,
      lawyer_name: row.lawyer_name ?? '',
      issue_categories: row.issue_categories ?? '',
      referred_office: row.referred_office ?? '',
      status: row.status,
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function buildPdfBuffer(rows: ReportRow[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text('PACU Transaction Report', { align: 'left' });
    doc.fontSize(9).fillColor('#666').text(`Generated ${new Date().toLocaleString()} — ${rows.length} record(s)`);
    doc.moveDown();

    const columns = ['Ref No.', 'Date', 'Client', 'Sex/Age', 'Lawyer', 'Issues', 'Office', 'Status'];
    const widths = [90, 60, 110, 55, 100, 160, 110, 70];
    let y = doc.y;
    doc.fontSize(8).fillColor('#000');

    function drawRow(cells: string[], bold: boolean) {
      let x = doc.page.margins.left;
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
      cells.forEach((cell, i) => {
        doc.text(cell, x, y, { width: widths[i], ellipsis: true });
        x += widths[i];
      });
      y += 16;
      if (y > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    }

    drawRow(columns, true);
    for (const row of rows) {
      const priority = [row.is_senior && 'S', row.is_pwd && 'P', row.is_pregnant && 'Pr'].filter(Boolean).join('/');
      drawRow(
        [
          row.reference_no,
          row.transaction_date,
          `${row.first_name} ${row.last_name}${priority ? ` (${priority})` : ''}`,
          `${row.sex ?? '-'}/${row.age ?? '-'}`,
          row.lawyer_name ?? '-',
          row.issue_categories ?? '-',
          row.referred_office ?? '-',
          row.status,
        ],
        false
      );
    }

    doc.end();
  });
}

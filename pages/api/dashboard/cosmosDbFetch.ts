import connectDB from '../../../utils/lib/dbconnect';
import WorkflowV2 from '../../../utils/lib/types/workflow_v2.model';

import fs from "fs";
import * as XLSX from 'xlsx';


export default async function getWorkspaceMetrics(userEmail: string) {
  await connectDB();

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // 1. Agents Creation Rate (created in last 90 days)
  const agentsCreationRate = await WorkflowV2.countDocuments({
    createdBy: userEmail,
    createdAt: { $gte: ninetyDaysAgo }
  });

  // 2. Agents Deployment Rate (publish = true)
  const agentsDeploymentRate = await WorkflowV2.countDocuments({
    createdBy: userEmail,
    publish: true
  });

  // 3. Contribution Impact (sum hitCount for all user workflows)
  const contributionAgg = await WorkflowV2.aggregate([
    { $match: { createdBy: userEmail } },
    { $group: { _id: null, totalHits: { $sum: "$hitCount" } } }
  ]);

  const contributionImpact = contributionAgg[0]?.totalHits ?? 0;

  return {
    agentsCreationRate,
    agentsDeploymentRate,
    contributionImpact
  };
}


// Workaround for employee list: dme_tg_end_users_31222025.xlsx

//id, userPrincipalName, mail, displayName, givenName, surname, department, country, usageLocation, userType, jobTitle, accountEnabled

export type ExcelEmployee = {
  name: string;
  department: string;
  email: string;
  country: string;
};

export async function readExcelEmployees(
  input: Buffer | ArrayBuffer | File
): Promise<ExcelEmployee[]> {
  // Normalize input to ArrayBuffer for xlsx.read
  let arrayBuffer: ArrayBuffer | SharedArrayBuffer;

  if (input instanceof ArrayBuffer) {
    arrayBuffer = input;
  } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    // Node.js Buffer → ArrayBuffer
    arrayBuffer = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  } else if (typeof File !== 'undefined' && input instanceof File) {
    arrayBuffer = await input.arrayBuffer();
  } else {
    throw new Error('Unsupported input type. Provide a Buffer, ArrayBuffer, or File.');
  }

  // Parse workbook
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Use the first sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];

  // Get raw rows: header row + data rows
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
  if (!rows.length) return [];

  // Required headers (exact human labels expected in the Excel)
  // const REQUIRED_HEADERS = [
  //   "id",
  //   "userPrincipalName",
  //   "mail",
  //   "displayName",
  //   "givenName",
  //   "surname",
  //   "department",
  //   "country",
  //   "usageLocation",
  //   "userType",
  //   "jobTitle",
  //   "accountEnabled"
  // ] as const;

  const REQUIRED_HEADERS = [
    "iSystemNo2",
    "displayName",
    "jobTitle",
    "department",
    "Type(ICS/CS)",
    "ContractType",
    "country",
    "Office",
    "CompanyStart",
    "mail"
  ] as const;

  // Normalize header (trim + lowercase)
  const normalize = (s?: string) => (s || '').trim().toLowerCase();

  // Build header → column index map
  const headerRow = rows[0] as string[];
  const colIndex = new Map<string, number>();
  headerRow.forEach((h, i) => colIndex.set(normalize(h), i));

  // Ensure all required headers exist
  const missing = REQUIRED_HEADERS.filter((h) => !colIndex.has(normalize(h)));
  if (missing.length) {
    throw new Error(
      `Missing required columns: ${missing.join(', ')}. Found headers: ${headerRow.join(', ')}`
    );
  }

  // Helper to safely read a cell by header name
  const get = (row: any[], header: (typeof REQUIRED_HEADERS)[number]) => {
    const idx = colIndex.get(normalize(header));
    const v = idx !== undefined ? row[idx] : '';
    return (v ?? '').toString().trim();
  };

  // Map data rows to typed objects
  const excelEmployees: ExcelEmployee[] = rows.slice(1).map((row) => ({
    name: get(row, 'displayName'),
    department: get(row, 'department'),
    email: get(row, 'mail'),
    country: get(row, 'country')
  }));

  // Optional: remove completely empty records
  return excelEmployees.filter(
    (e) =>
      e.name ||
      e.department ||
      e.email ||
      e.country
  );
}
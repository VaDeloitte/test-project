import fs from "fs";
import path from "path";

import { ExcelEmployee, readExcelEmployees } from './cosmosDbFetch';

let cachedEmployees: ExcelEmployee[] | null = null;
let cachedEmailSet: Set<string> | null = null;
let cachedServiceLineMap: Map<string, string> | null = null;
let cachedCountryMap: Map<string, string> | null = null;

export default async function getExcelEmployeeCache() {
  if (cachedEmployees) {
    return {
      employees: cachedEmployees,
      emailSet: cachedEmailSet!,
      serviceLineMap: cachedServiceLineMap!,
      countryMap: cachedCountryMap!,
    };
  }

  console.log("📊 Loading Excel employees into memory...");

  const filePath = path.join(
    process.cwd(),
    "utils/data/dme_t&l_users_18122025.xlsx"
  );

  const fileBuffer = fs.readFileSync(filePath);
  const employees = await readExcelEmployees(fileBuffer);

  const emailSet = new Set<string>();
  const serviceLineMap = new Map<string, string>();
  const countryMap = new Map<string, string>();

  for (const emp of employees) {
    const email = emp.email.toLowerCase();
    emailSet.add(email);
    serviceLineMap.set(email, emp.department);
    countryMap.set(email, emp.country);
  }

  cachedEmployees = employees;
  cachedEmailSet = emailSet;
  cachedServiceLineMap = serviceLineMap;
  cachedCountryMap = countryMap;

  return {
    employees,
    emailSet,
    serviceLineMap,
    countryMap,
  };
}

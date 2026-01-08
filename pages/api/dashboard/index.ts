import type { NextApiRequest, NextApiResponse } from 'next';
import fs from "fs";
import * as XLSX from 'xlsx';
import { endOfDay } from 'date-fns';
import { ExcelEmployee, readExcelEmployees } from './cosmosDbFetch';
import  getExcelEmployeeCache  from './excelEmployeeCache';

import { APP_INSIGHTS_APP_ID_PROD, APP_INSIGHTS_API_KEY_PROD } from '@/utils/app/const';

interface QueryRequest {
  query: string;
  timespan?: string; // Optional: ISO 8601 duration or start/end times
}

interface AppInsightsResponse {
  tables: Array<{
    name: string;
    columns: Array<{ name: string; type: string }>;
    rows: any[][];
  }>;
}


interface Data {
  success: boolean;
  employeeData?: any;
  departmentData?: any;
  countryData?: any;
  message?: string;
  error?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { method } = req;

  switch (method) {
    case 'POST':
      try {
        const { query, timespan } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Query is required',
            });
        }

        // Build the API URL
        const url = new URL(
        `https://api.applicationinsights.io/v1/apps/${APP_INSIGHTS_APP_ID_PROD}/query`
        );

        // Add timespan if provided (e.g., "PT1H" for last 1 hour, "P1D" for last 1 day)
        if (timespan) {
        url.searchParams.append('timespan', timespan);
        }

        // Make the request to Application Insights
        const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': APP_INSIGHTS_API_KEY_PROD,
        },
        body: JSON.stringify({ query }),
        });

        if (!response.ok) {
        const errorText = await response.text();

        console.error('App Insights API Error:', errorText);
        
        return res.status(500).json({
          success: false,
          error: errorText,
          message: 'Failed to query Application Insights',
        });
        }

        const data: AppInsightsResponse = await response.json();

        // Transform the response into a more usable format
        const transformedData = data.tables.map(table => ({
        name: table.name,
        columns: table.columns.map(col => col.name),
        rows: table.rows.map(row => {
            const obj: Record<string, any> = {};
            table.columns.forEach((col, index) => {
            obj[col.name] = row[index];
            });
            return obj;
        }),
        }));

        return res.status(200).json({
          success: true,
          employeeData: transformedData,
          message: 'Data Fetched Succesfully',
        });

    } catch (error) {
        console.error('Error querying Application Insights:', error);
        return res.status(500).json({
          success: false,
          error: (error as Error).message,
          message: 'Internal server error',
        });
    }
case 'GET':
  try {
    // last 30 day metrics
    const responseNew = await getAppInsightTable();

    // old 60d - 30d metrics
    const responseOld = await getAppInsightTable('60d', '30d');

    if (!responseNew.ok) {
      const errorText = await responseNew.text();
      return res.status(500).json({
        success: false,
        error: errorText,
        message: 'Failed to query Application Insights',
      });
    }

    // ---- Parse NEW data ----
    const dataNew: AppInsightsResponse = await responseNew.json();

    // const filePath = "utils/data/dme_t&l_users_18122025.xlsx";
    // const fileBuffer = fs.readFileSync(filePath);
    // const excelEmployees: ExcelEmployee[] = await readExcelEmployees(fileBuffer);

    // const excelEmails = new Set(excelEmployees.map(emp => emp.email.toLowerCase()));
    // const serviceLineMap = new Map<string, string>();
    // const countryMap = new Map<string, string>();
    // excelEmployees.forEach(emp => {
    //   serviceLineMap.set(emp.email.toLowerCase(), emp.department);
    //   countryMap.set(emp.email.toLowerCase(), emp.country);
    // });

    const {
      employees: excelEmployees,
      emailSet: excelEmails,
      serviceLineMap,
      countryMap,
    } = await getExcelEmployeeCache();


    // Transform NEW data
    const transformedDataNew = dataNew.tables.map(table => ({
      name: table.name,
      columns: [...table.columns.map(col => col.name), "dept", "tier"],
      rows: table.rows.map(row => {
        const obj: Record<string, any> = {};

        table.columns.forEach((col, index) => {
          obj[col.name] = row[index];
        });

        const email = obj["email"].toLowerCase() || obj["Email"].toLowerCase();

        if (!email || !excelEmails.has(String(email).toLowerCase())) {
          return null; // Return null for rows that don't have a matching email
        }
        obj["dept"] = email ? serviceLineMap.get(String(email)) || null : null;
        obj["country"] = email ? countryMap.get(String(email)) || null : null;

        return obj;
      }).filter(row => row !== null) // Remove null rows (non-matching emails)
    }));

    const employeeRowsRecent_ = transformedDataNew[0]?.rows || [];
    const employeeRowsRecent = assignTiersByPercentile(employeeRowsRecent_);

    //const employeeData = employeeRowsRecent.slice(0, 20);   // top 20 only
    const employeeData = employeeRowsRecent; // sending all available people

    // --------- For testing Current User -----------
    // const currentUser = {
    //   name : "Karan Boro",
    //   email : "karan@dev.local",
    //   score : 18,
    //   rank : 400,
    //   tier: "Bronze",
    //   dept: "Business Tax (BT)",
    //   country: "United Arab Emirates",
    //   isCurrentUser: true
    // }
    // employeeData.push(currentUser);

    // ---------------- OLD DATA PROCESSING (for TREND) ----------------
    let employeeRowsOld_: any[] = [];
    let employeeRowsOld: any[] = [];

    if (responseOld.ok) {
      const dataOld: AppInsightsResponse = await responseOld.json();

      const transformedDataOld = dataOld.tables.map(table => ({
        name: table.name,
        columns: [...table.columns.map(col => col.name), "dept", "tier"],
        rows: table.rows.map(row => {
          const obj: Record<string, any> = {};

          table.columns.forEach((col, index) => {
            obj[col.name] = row[index];
          });

          const email = obj["email"] || obj["Email"];

          if (!email || !excelEmails.has(String(email).toLowerCase())) {
            return null; // Return null for rows that don't have a matching email
          }
          obj["dept"] = email ? serviceLineMap.get(String(email)) || null : null;
          obj["country"] = email ? countryMap.get(String(email)) || null : null;

          return obj;
        }).filter(row => row !== null)
      }));

      employeeRowsOld_ = transformedDataOld[0]?.rows || [];

      employeeRowsOld = assignTiersByPercentile(employeeRowsOld_);
    }

    const totalEmployeesByDept = getTotalEmployeesByField(excelEmployees, "department");
    const totalEmployeesByCountry = getTotalEmployeesByField(excelEmployees, "country");

    // ---------------- AGGREGATIONS ----------------
    const countryDataRecent = aggregateByField(employeeRowsRecent, "country", totalEmployeesByCountry);
    const departmentDataRecent = aggregateByField(employeeRowsRecent, "dept", totalEmployeesByDept);

    const countryDataOld = aggregateByField(employeeRowsOld, "country", totalEmployeesByCountry);
    const departmentDataOld = aggregateByField(employeeRowsOld, "dept", totalEmployeesByDept);

    // ----- Final with trend -----
    const finalCountry = addTrendData(countryDataRecent, countryDataOld);
    const finalDepartment = addTrendData(departmentDataRecent, departmentDataOld);


    return res.status(200).json({
      success: true,
      employeeData,          // top 20 only
      countryData: finalCountry,     // includes trend
      departmentData: finalDepartment, // includes trend
      message: 'Data Fetched Successfully',
    });




    } catch (error) {
        console.error('Error querying Application Insights:', error);
        return res.status(500).json({
          success: false,
          error: (error as Error).message,
          message: 'Internal server error',
        });
    }
    break;

    default:
      res.status(405).json({ success: false, message: 'Method not allowed' });
      break;
  }
}


function assignTiersByPercentile(rows: any[]) {
  if (!rows || rows.length === 0) return rows;

  // Extract all numeric scores
  const scores = rows
    .map(r => Number(r.score ?? r.Score))
    .filter(s => !isNaN(s))
    .sort((a, b) => a - b);

  if (scores.length === 0) return rows;

  // Percentile calc helper
  const getPercentile = (value: number) => {
    const count = scores.filter(s => s <= value).length;
    return (count / scores.length) * 100;
  };

  // Assign tier to each row
  return rows.map(row => {
    const score = Number(row.score ?? row.Score);

    // If no score, keep original
    if (isNaN(score)) {
      return { ...row, tier: "No Tier" };
    }

    const percentile = getPercentile(score);

    let tier = "";
    if (percentile >= 75) tier = "Platinum";
    else if (percentile >= 50) tier = "Gold";
    else if (percentile >= 25) tier = "Silver";
    else tier = "Bronze";

    return {
      ...row,
      percentile: Number(percentile.toFixed(2)),
      tier
    };
  });
}


// ---------------- Aggregation Helpers ----------------

// Converts list into country-level or department-level aggregation
// ---------------- Aggregation Helpers ----------------

// Converts list into country-level or department-level aggregation
function aggregateByField(
  rows: any[],
  field: "country" | "dept",
  totalEmployees: Record<string, number> // Map of all dept/country to total employee count
) {
  const result: Record<string, any> = {};

  // Initialize all keys from totalEmployees first (this ensures we include dept/country with 0 records)
  for (const key of Object.keys(totalEmployees)) {
    result[key] = {
      scoreSum: 0,
      count: 0,
      platinum: 0,
      gold: 0,
      silver: 0,
      bronze: 0
    };
  }

  // Process rows and aggregate data
  for (const emp of rows) {
    const key = emp[field];
    if (!key) continue;

    // Initialize if this key wasn't in totalEmployees (shouldn't happen, but safe)
    if (!result[key]) {
      result[key] = {
        scoreSum: 0,
        count: 0,
        platinum: 0,
        gold: 0,
        silver: 0,
        bronze: 0
      };
    }

    const bucket = result[key];

    // Add score
    bucket.scoreSum += Number(emp.score);
    bucket.count += 1;

    // Tier counts
    switch (emp.tier) {
      case "Platinum": bucket.platinum++; break;
      case "Gold": bucket.gold++; break;
      case "Silver": bucket.silver++; break;
      case "Bronze": bucket.bronze++; break;
    }
  }

  // Finalize aggregated structure
  const final: Record<string, any> = {};

  for (const key of Object.keys(result)) {
    const b = result[key];
    const total = totalEmployees[key] || 0;
    
    // Calculate remaining employees not assigned to any tier
    const assignedCount = b.platinum + b.gold + b.silver + b.bronze;
    const remaining = total - assignedCount;
    
    // Add remaining employees to bronze
    const bronzeTotal = b.bronze + remaining;
    
    const averageScore = b.count ? Number((b.scoreSum / b.count).toFixed(1)) : 0;

    // Calculate adoption with updated bronze count
    const adoption = total > 0
      ? ((4 * b.platinum + 3 * b.gold + 2 * b.silver + 1 * bronzeTotal) / (total * 4)) * 100
      : 0;

    final[key] = {
      score: averageScore,
      platinum: b.platinum,
      gold: b.gold,
      silver: b.silver,
      bronze: bronzeTotal,  // Include remaining people in bronze
      total,
      adoption: Number(adoption.toFixed(1))
    };
  }

  // Rank by score first, then alphabetically by key
  const ranked = Object.entries(final)
    .sort((a, b) => {
      // First priority: score (descending)
      if (b[1].score !== a[1].score) {
        return b[1].score - a[1].score;
      }
      // Second priority: alphabetical by key (ascending)
      return a[0].localeCompare(b[0]);
    })
    .reduce((acc, [key, value], index) => {
      acc[key] = { rank: index + 1, ...value };
      return acc;
    }, {} as Record<string, any>);

  return ranked;
}

function addTrendData(
  recent: Record<string, any>,
  old: Record<string, any>
) {
  const final: Record<string, any> = {};

  for (const key in recent) {
    const r = recent[key];
    const o = old[key] || {};

    const recentScore = Number(r.score ?? 0);
    const oldScore = Number(o.score ?? 0);

    // --- Trend Calculation ---
    let trend = 0;
    if (oldScore > 0) {
      trend = ((recentScore - oldScore) / oldScore) * 100;
    }

    // merge everything into final object
    final[key] = {
      ...r,
      trend: Number(trend.toFixed(1))  // e.g., 4.2%
    };
  }

  return final;
}

// Create a map of total employees by department or country from excelEmployees
function getTotalEmployeesByField(excelEmployees: ExcelEmployee[], field: "country" | "department") {
  const totalEmployees: Record<string, number> = {};

  excelEmployees.forEach(emp => {
    const key = emp[field];
    if (key) {
      if (!totalEmployees[key]) {
        totalEmployees[key] = 0;
      }
      totalEmployees[key]++;
    }
  });

  return totalEmployees;
}

// ---------------- Aggregation Helpers ----------------

// Converts list into country-level or department-level aggregation, now using totalEmployees for correct total count
function aggregateByField_1(
  rows: any[],
  field: "country" | "dept",
  totalEmployees: Record<string, number> // Pass totalEmployees here
) {
  const result: Record<string, any> = {};

  for (const emp of rows) {
    const key = emp[field];
    if (!key) continue;

    if (!result[key]) {
      result[key] = {
        scoreSum: 0,
        count: 0,
        platinum: 0,
        gold: 0,
        silver: 0,
        bronze: 0
      };
    }

    const bucket = result[key];

    // Add score
    bucket.scoreSum += Number(emp.score);
    bucket.count += 1;

    // Tier counts
    switch (emp.tier) {
      case "Platinum": bucket.platinum++; break;
      case "Gold": bucket.gold++; break;
      case "Silver": bucket.silver++; break;
      case "Bronze": bucket.bronze++; break;
    }
  }

  // Finalize aggregated structure
  const final: Record<string, any> = {};

  for (const key of Object.keys(result)) {
    const b = result[key];
    const averageScore = b.count ? Number((b.scoreSum / b.count).toFixed(1)) : 0;

    const adoption =
      ((4 * b.platinum + 3 * b.gold + 2 * b.silver + 1 * b.bronze) / (b.count * 4)) * 100;

    // Use total employees from the passed map
    const total = totalEmployees[key] || 0;

    final[key] = {
      score: averageScore,
      platinum: b.platinum,
      gold: b.gold,
      silver: b.silver,
      bronze: b.bronze,
      total,  // Set the correct total number of employees
      adoption: Number(adoption.toFixed(1))
    };
  }

  // Rank by score
  const ranked = Object.entries(final)
    .sort((a, b) => b[1].score - a[1].score)
    .reduce((acc, [key, value], index) => {
      acc[key] = { rank: index + 1, ...value };
      return acc;
    }, {} as Record<string, any>);

  return ranked;
}


export async function getAppInsightTable (start_date:string = '30d', end_date?:string , timespan?:string) {
    // Build the API URL
    const url = new URL(
        `https://api.applicationinsights.io/v1/apps/${APP_INSIGHTS_APP_ID_PROD}/query`
    );

    // Add timespan if provided (e.g., "PT1H" for last 1 hour, "P1D" for last 1 day)
    if (timespan) {
        url.searchParams.append('timespan', timespan);
    }

    let startDate = `ago(${start_date})`;
    let endDate;

    if (end_date) {
        endDate = `ago(${end_date})`
    } else {
        endDate = `now()`
    }

	const query = `
          // Final
          let startDate = ${startDate};
          let endDate = ${endDate};

          // 1. Total Logins
          let logins = customEvents
          | where timestamp between (startDate .. endDate)
          | where name == "UserLoggedIn"
          | extend userName = tostring(customDimensions.userName)
          | summarize TotalLogins = count() by user_AuthenticatedId, userName;

          // 2. Total Chats
          let chats = customEvents
          | where timestamp between (startDate .. endDate)
          | where name == "UserPrompted"
          | summarize MessagesSent = count() by user_AuthenticatedId;

          // 3. Agents Used
          let agents = pageViews
          | where timestamp between (startDate .. endDate)
          | where url has "wid="
          | extend wid = extract("wid=([a-zA-Z0-9\\\\-]+)", 1, url)
          | where isnotempty(wid)
          | summarize AgentsUsed = dcount(wid) by user_AuthenticatedId;

          // 4. Active Days
          let activedays = customEvents
          | where name == "UserPrompted"
          | where timestamp between (startDate .. endDate)
          | extend ActivityDate = startofday(timestamp)
          | summarize ActiveDays = dcount(ActivityDate) by user_AuthenticatedId;

          // 5. Last Active Date
          let lastActive = customEvents
          | where timestamp between (startDate .. endDate)
          | where user_AuthenticatedId != ""
          | summarize LastActive = max(timestamp) by user_AuthenticatedId;

          // 6. Some columns
          let table_6 = logins
          | join chats on user_AuthenticatedId
          | join lastActive on user_AuthenticatedId
          | extend
            MessagesSentPerLogin = iff(TotalLogins == 0, 0.0, todouble(MessagesSent)/todouble(TotalLogins)),
              DaysSinceLastActive = datetime_diff("day", endDate, LastActive);

          // 7. Score Table
          let score_table_raw = logins
          | join chats on user_AuthenticatedId
          | join agents on user_AuthenticatedId
          | join activedays on user_AuthenticatedId
          | join lastActive on user_AuthenticatedId
          | join table_6 on user_AuthenticatedId;

          // 8. Max Values
          let max_values = score_table_raw
          | summarize 
              MaxLogins = max(TotalLogins),
              MaxChats = max(MessagesSent),
              MaxChatsPerLogin = max(MessagesSentPerLogin),
              MaxActiveDays = max(ActiveDays),
              MaxRecency = max(DaysSinceLastActive),
              MaxAgentsUsed = max(AgentsUsed)
          | extend key = 1;


          let score_table = score_table_raw
          | extend key = 1
          | join kind=inner max_values on key
          | extend
              Score_Logins = iif(MaxLogins > 0, (todouble(TotalLogins) / MaxLogins) * 100, 0.0),
              Score_Chats = iif(MaxChats > 0, (todouble(MessagesSent) / MaxChats) * 100, 0.0),
              Score_ChatsPerLogin = iif(MaxChatsPerLogin > 0, 
                                        (todouble(MessagesSentPerLogin) / MaxChatsPerLogin) * 100,
                                        0.0),
              Score_ActiveDays = iif(MaxActiveDays > 0, 
                                    (todouble(ActiveDays) / MaxActiveDays) * 100, 
                                    0.0),

              // For Recency: lower is better → invert it
              Score_Recency = iif(MaxRecency > 0,
                                  ((MaxRecency - todouble(DaysSinceLastActive)) / MaxRecency) * 100,
                                  0.0),

              Score_AgentsUsed = iif(MaxAgentsUsed > 0, 
                                    (todouble(AgentsUsed) / MaxAgentsUsed) * 100, 
                                    0.0);


          // ---------------------------
          // FINAL SCORING LOGIC
          // ---------------------------
          score_table
          | extend	
              OverallScore =
                  (Score_Logins * 0.20) +
                  (Score_Chats * 0.20) +
                  (Score_ChatsPerLogin * 0.10) +
                  (Score_ActiveDays * 0.20) +
                  (Score_Recency * 0.20) +
                  (Score_AgentsUsed * 0.10)

          | project
            name = userName,
            email = user_AuthenticatedId,
            score = OverallScore
          | order by score desc
          | serialize rank = row_number();
    `
    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': APP_INSIGHTS_API_KEY_PROD,
        },
        body: JSON.stringify({ query: query }),
    });

    return response;
    // Error
    // if (!response.ok) {
    //     const errorText = await response.text();
    //     return {
    //         success: false,
    //         data: errorText,
    //         message: 'Failed to query Application Insights',
    //     };
    // }

    // return await response.json() as AppInsightsResponse;
}
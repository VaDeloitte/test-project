

interface AppInsightsResponse {
  tables: Array<{
    name: string;
    columns: Array<{ name: string; type: string }>;
    rows: any[][];
  }>;
}


export default async function getAppInsightTable (start_date:string = '30d', end_date?:string , timespan?:string) {
    const APP_INSIGHTS_APP_ID = "ab4cef67-bd36-457f-b1cf-0c5aa5ca987d";
    const APP_INSIGHTS_API_KEY = "jmlpc8ngkdkyzvs2kqfg1e53papmquv1keg5yk2k";
    // Build the API URL
    const url = new URL(
        `https://api.applicationinsights.io/v1/apps/${APP_INSIGHTS_APP_ID}/query`
    );

    // Add timespan if provided (e.g., "PT1H" for last 1 hour, "P1D" for last 1 day)
    if (timespan) {
        url.searchParams.append('timespan', timespan);
    }

    let endDate
    if (end_date) {
        endDate = `ago(${end_date})`
    } else {
        endDate = `now()`
    }

	const query = `
          // Final
          let startDate = ${start_date};
          let endDate = ${endDate};

          let middleEastCountries = dynamic([
            "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait",
            "Bahrain", "Oman", "Jordan", "Lebanon", "Iraq",
            "Egypt", "Turkey", "Israel"
          ]);


          // 1. Total Logins
          let logins = customEvents
          | where timestamp >= startDate
          | where name == "UserLoggedIn"
          | extend userName = tostring(customDimensions.userName)
          | summarize country = any(client_CountryOrRegion), TotalLogins = count() by user_AuthenticatedId, userName
          | where country in (middleEastCountries);

          // 2. Total Chats
          let chats = customEvents
          | where timestamp >= startDate
          | where name == "UserPrompted"
          | summarize MessagesSent = count() by user_AuthenticatedId;

          // 3. Agents Used
          let agents = pageViews
          | where timestamp >= startDate
          | where url has "wid="
          | extend wid = extract("wid=([a-zA-Z0-9\\\\-]+)", 1, url)
          | where isnotempty(wid)
          | summarize AgentsUsed = dcount(wid) by user_AuthenticatedId;

          // 4. Active Days
          let activedays = customEvents
          | where name == "UserPrompted"
          | where timestamp >= startDate
          | extend ActivityDate = startofday(timestamp)
          | summarize ActiveDays = dcount(ActivityDate) by user_AuthenticatedId;

          // 5. Last Active Date
          let lastActive = customEvents
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
            score = OverallScore,
            country
          | order by score desc
          | serialize rank = row_number();
    `
    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': APP_INSIGHTS_API_KEY,
        },
        body: JSON.stringify({ query: query }),
    });

    // Error
    if (!response.ok) {
        const errorText = await response.text();
        return {
            success: false,
            data: errorText,
            message: 'Failed to query Application Insights',
        };
    }

    return await response.json() as AppInsightsResponse;
}
// utils/getGroupMembersWithDepartment.ts

//Registered App: DTME Tax Genie NONPROD
const TENANT_ID = process.env.AZURE_TENANT_ID || "36da45f1-dd2c-4d1f-af13-5abe46b99921";
const CLIENT_ID = process.env.AZURE_CLIENT_ID || "e3e5bdef-e3c0-44c0-b131-81ba036a00ac";
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!;
const GROUP = "DME Tax Genie End Users SG";

// 1. Get Graph API access token (client credentials)
async function getAccessToken(): Promise<string> {
  const response = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );

  const data = await response.json();
  return data.access_token;
}

// 2. Get group ID by display name
async function getGroupId(groupName: string, token: string): Promise<string | null> {
  const url = `https://graph.microsoft.com/v1.0/groups?$filter=displayName eq '${groupName}'&$select=id`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  return data.value?.[0]?.id ?? null;
}

// 3. Get all members of the group
async function getGroupMembers(groupId: string, token: string): Promise<any[]> {
  const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members?$select=id,mail,userPrincipalName`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  return data.value ?? [];
}

// 4. Get department & country for a single email
async function getUserProfile(email: string, token: string) {
  const url = `https://graph.microsoft.com/v1.0/users/${email}?$select=mail,department,country`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    return { email, department: null, country: null };
  }

  const user = await res.json();

  return {
    email: user.mail || email,
    department: user.department || null,
    country: user.country || null,
  };
}

// 5. Master function
export default async function getGroupMemberDetails(groupName: string = GROUP) {
  const token = await getAccessToken();

  const groupId = await getGroupId(groupName, token);
  if (!groupId) throw new Error("Group not found");

  const members = await getGroupMembers(groupId, token);

  // Get unique emails
  const emails: string[] = members
    .map((m) => m.mail || m.userPrincipalName)
    .filter(Boolean);

  // Fetch department & country for all users
  const results = [];

  for (const email of emails) {
    results.push(await getUserProfile(email, token));
  }

  return {
    count: results.length,
    members: results,
  };
}

// Return Example:

  /*
  {
    count: 12,
    members: [
      { email: "john@company.com", department: "IT", country: "US" },
      { email: "alice@company.com", department: "Finance", country: "IN" },
      ...
    ]
  }
  */

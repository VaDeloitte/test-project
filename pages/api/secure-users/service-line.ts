import type { NextApiRequest, NextApiResponse } from 'next';
import getExcelEmployeeCache from '../dashboard/excelEmployeeCache';

type ResponseData =
  | { success: true; serviceLine: string }
  | { success: false };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    return res.status(405).end(); // Method Not Allowed
  }

  const email = req.query.email;

  if (typeof email !== 'string' || !email) {
    return res.status(200).json({ success: false });
  }

  try {
    const { serviceLineMap } = await getExcelEmployeeCache();

    const serviceLine = serviceLineMap.get(email);

    if (!serviceLine) {
      return res.status(200).json({ success: false });
    }

    return res.status(200).json({
      success: true,
      serviceLine
    });
  } catch (error) {
    console.error('Service line lookup failed:', error);
    return res.status(200).json({ success: false });
  }
}

import { NextApiRequest, NextApiResponse } from 'next';

import dbConnect from '@/utils/lib/dbconnect';
import ConfirmUser from '@/utils/lib/types/confirm-user.model';
import User from '@/utils/lib/types/user.model';

import bcrypt from 'bcryptjs';

const handler = async (request: NextApiRequest, response: NextApiResponse) => {
  const { email, otp, password } = await request.body;
  const { method } = await request;

  switch (method) {
    case 'POST':
      await dbConnect();
      const user = await User.findOne({ email: email });
      const hashedPassword = await bcrypt.hash(password, 5);

      const userToConfirm = await ConfirmUser.findOne({
        $and: [{ email: email }, { otp: otp }],
      });

      if (user && userToConfirm) {
        // if user found:
        // start resetting the password
        try {
          await User.updateOne(
            { email: email },
            { $set: { password: hashedPassword } },
          );

          await ConfirmUser.deleteOne({ email: email });
          return response.status(201).json({
            statusText: 'User password has been updated',
            postStatus: 201,
          });
        } catch (error: any) {
          return response.status(500).json({
            statusText: `something went wrong, ${error}`,
            postStatus: 500,
          });
        }
      } else {
        return response.status(400).json({
          statusText: `otp is incorrect, please check and retry again`,
          postStatus: 400,
        });
      }

    default:
      break;
  }
};

export default handler;

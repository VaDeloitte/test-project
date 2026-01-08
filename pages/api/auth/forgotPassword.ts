import { NextApiRequest, NextApiResponse } from 'next';

import dbConnect from '@/utils/lib/dbconnect';
import { sendMail } from '@/utils/lib/mail.service';
import ConfirmUser from '@/utils/lib/types/confirm-user.model';
import User from '@/utils/lib/types/user.model';

import { generateEmailBody } from '@/components/emailbody';

const handler = async (request: NextApiRequest, response: NextApiResponse) => {
  const { email } = await request.body;
  const { method } = await request;

  switch (method) {
    case 'POST':
      await dbConnect();
      const generatedOtp = Math.floor(Math.random() * 90000) + 10000; //'01234';
      const user = await User.findOne({ email: email });

      if (user) {
        // if user found, send an email with OTP, then, show reset password inputs
        const userToConfirm = await ConfirmUser.findOne({ email: email });
        try {
          if (!userToConfirm) {
            const newUser = new ConfirmUser({
              email,
              otp: generatedOtp.toString(),
            });
            await newUser.save();
          } else {
            await ConfirmUser.updateOne(
              { email: email },
              { $set: { otp: generatedOtp.toString() } },
            );
          }
          // send email
          // TODO: update email after this test
          try {
            await sendMail(
              'Genie AI reset password OTP',
              email,
              '',
              generateEmailBody(email, generatedOtp.toString()),
            );
          } catch (error) {
          }

          return response.status(201).json({
            statusText: `OTP is sent to email: ${email}`,
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
          statusText: `email:${email} doesn't exists`,
          postStatus: 400,
        });
      }

    default:
      break;
  }
};

export default handler;

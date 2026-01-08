import { NextApiRequest, NextApiResponse } from 'next';

import dbConnect from '@/utils/lib/dbconnect';
import User from '@/utils/lib/types/user.model';

import bcrypt from 'bcryptjs';

const handler = async (request: NextApiRequest, response: NextApiResponse) => {
  const { fullName, email, password, username } = await request.body;
  const { method } = await request;

  switch (method) {
    case 'POST':
      await dbConnect();
      const user = await User.findOne({
        $or: [{ email: email }, { username: username }],
      });

      if(!user) {
        const hashedPassword = await bcrypt.hash(password, 5);
        const newUser = new User({
          fullName,
          email,
          password: hashedPassword,
          username,
        });
        try {
          await newUser.save();
          return response
            .status(201)
            .json({ statusText: 'User has been created', postStatus: 201 });
        } catch (error: any) {
          return response
            .status(500)
            .json({ statusText: `something went wrong, ${error}`, postStatus: 500 });
        }
      } else {
        return response
        .status(400)
        .json({ statusText: `Bad request: username: ${username} or email:${email} already exists`, postStatus: 400 });
      }

    default:
      break;
  }
};

export default handler;

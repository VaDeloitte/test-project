import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import EmailProvider from "next-auth/providers/email";

import { NEXTAUTH_SECRET } from '@/utils/app/const';
import dbConnect from '@/utils/lib/dbconnect';
import clientPromise from '@/utils/lib/mongodb';
import User from '@/utils/lib/types/user.model';

import { MongoDBAdapter } from '@auth/mongodb-adapter';
import bcrypt from 'bcryptjs';
import { Adapter } from 'next-auth/adapters';

const port:any =process.env.EMAIL_SERVER_PORT;
export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise) as Adapter,
  session: {
    strategy: 'jwt',
  },
  secret: NEXTAUTH_SECRET!,
  // Configure one or more authentication providers
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port:port,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD
        }
      },
      from: process.env.EMAIL_FROM
    }),
    CredentialsProvider({
      name: 'Credentials',
      id: 'credentials',
      credentials: {
        email: {
          label: 'email',
          type: 'email',
        },
        password: { label: 'Password', type: 'password' },
        username: { label: 'username', type: 'text' },
      },
      async authorize(credentials, req) {
        await dbConnect();
        // Add logic here to look up the user from the credentials supplied
        if (credentials == null) return null;
        try {
          const user = await User.findOne({ username: credentials.username });

          if (user) {
            const isMatch = await bcrypt.compare(
              credentials.password,
              user.password,
            );

            if (isMatch) {
              return user;
            } else {
              new Response(null, {status: 400, statusText: 'Username or password is incorrect'})
              // throw new Error('Username or password is incorrect');
            }
          } else {
            throw new Error('User not found');
          }
        } catch (err: any) {
          throw new Error(err);
        }
      },
    }),
  ],
  pages: {
    // signIn: '/auth/login',
    // newUser: '/auth/signup',
    // signOut: '/auth/login',
    signIn: '/',
    newUser: '/',
    signOut: '/',
  },
  callbacks: {
    // We can pass in additional information from the user document MongoDB returns
    async jwt({ token, user }: any) {
      if (user) {
        token.user = {
          _id: user._id,
          email: user.email,
          username: user.username,
        };
      }
      return token;
    },
    // If we want to access our extra user info from sessions we have to pass it the token here to get them in sync:
    session: async ({ session, token }: any) => {
      if (token) {
        session.user = token.user;
      }
      return session;
    },
  },
};

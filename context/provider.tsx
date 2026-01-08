"use client";

import { SessionProvider } from "next-auth/react";

type Props = {
  children?: React.ReactNode;
};

export const NextAuthProvider = ({ children }: Props) => {
  return <SessionProvider>{children}</SessionProvider>;
};

// next-auth: SETUP REFERENCE:
// https://javascript.plainenglish.io/authentication-patterns-with-nextauth-and-mongodb-in-next-js-13-2c1fa98d6b5e
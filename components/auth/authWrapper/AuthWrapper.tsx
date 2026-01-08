import React from 'react';

type AuthWrapperProps = {
  children?: React.ReactNode;
};

const AuthWrapper = ({ children }: AuthWrapperProps) => {
return <>{children}</>;
};

export default AuthWrapper;

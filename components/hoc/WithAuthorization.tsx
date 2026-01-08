import { useRouter } from 'next/router';
import { useContext, useEffect } from 'react';
import { AuthContext } from '@/utils/app/azureAD';

const WithAuthorization = (WrappedComponent: React.FC<any>) => {
  return (props: any) => {
    const router = useRouter();
    const authContext = useContext(AuthContext);
    const user = authContext?.user;

    useEffect(() => {
      const checkAuthAndToken = async () => {
        if (!(process.env.NODE_ENV === 'development')) {
          if (!user || !user.loggedIn) {
            router.push('/unAuthenticated');
            return;
          }
          if (!user.isAdmin) {
            router.push('/');
            return;
          }

          if (user.idToken && authContext.validateAndRefreshToken) {
            try {
              await authContext.validateAndRefreshToken(user.idToken);
            } catch (error) {
              console.error('Error validating/refreshing token:', error);
              authContext.logout();
            }
          }
        }
      };

      checkAuthAndToken();
    }, [user, router, authContext]);

    if (process.env.NODE_ENV === 'development') {
      return <WrappedComponent {...props} />;
    }

    if (!user || !user.loggedIn || !user.isAdmin) {
      return <p>Loading...</p>;
    }

    return <WrappedComponent {...props} />;
  };
};

export default WithAuthorization;
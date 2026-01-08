import { IconCheckbox } from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import * as yup from "yup";

import FormInput from '@/components/FormInput';
import FormAction from '@/components/auth/formAction/FormAction';
import { yupResolver } from "@hookform/resolvers/yup";

import { FormContainer } from '@/components';
import { User } from '@/types';
import { HomeInitialState, initialState } from '../../context/home.state';
import { useCreateReducer } from '@/hooks/useCreateReducer';
import { saveUser } from '@/utils/app/userData';
import { useDispatch } from 'react-redux';
import { setUserDetails } from '@/store/redux/actions/user.action';
import { ErrorMessage } from '@hookform/error-message';
import { signIn, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { authConfig } from '@/azure-auth.config';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalInstance as pca, initializeMsal } from '../../msal/msal'; // Import pca from msal.js
import getApiKey from '../../apikeyserver/requestkey'
type LoginInputs = {
  username: string;
  password: string;
};

const loginSchema: yup.ObjectSchema<LoginInputs> = yup.object().shape({
  username: yup.string().required(),
  password: yup.string().min(8).max(32).required(),
});


const Login = () => {
  const [error, setError] = useState<string | null>("");
  const params = useSearchParams()!;
  const session = useSession();
  const router = useRouter();

  const {
    handleSubmit,
    formState: { errors },
    control,
    setError: setErrorMessage
  } = useForm<LoginInputs>({
    resolver: yupResolver(loginSchema),
    reValidateMode: "onSubmit",
    criteriaMode: "all",
  });
  const dispatchRedux = useDispatch();

  const contextValue = useCreateReducer<HomeInitialState>({
    initialState,
  });

  const {
    dispatch,
  } = contextValue;

  const handleSave = (user: User) => {
    dispatch({ field: 'userData', value: user })
    dispatchRedux(setUserDetails(user))
    saveUser(user);
  };

  const onSubmit: SubmitHandler<LoginInputs> = async (data) => {
    const user: User = { loggedIn: true, email: '', username: data.username };

    signIn("credentials", {
      username: user.username,
      password: data.password,
      redirect: false
    }).then((res) => {
      handleSave(user);
      if (!res?.ok) {
        setError(res?.error === "CredentialsSignin" ? 'password or user name is incorrect' : res?.error!)
      }
    });

    if (session.status === "authenticated") {
      router?.push("/");
    } else {
      console.log('wrong credintials', session);
    }
  };
  // useEffect(() => {
  //   async function fetchData() {
  //     try {
  //       const apiKey = await getApiKey();
  //       alert(`API Key: ${apiKey}`);
  //     } catch (error) {
  //       console.error('Error:', error);
  //     }
  //   }

  //   fetchData(); // Call the Axios logic when the component mounts
  // }, []);

  useEffect(() => {
    setError(params.get("error"));
  }, [params]);

  if (session.status === "authenticated") {
    router?.push("/");
  }

  const renderForm = () => {
    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <Controller render={({ field: { onChange, value }, fieldState }) => <FormInput
          placeholder={'username'}
          label="Username"
          defaultValue=""
          onChange={onChange}
          forminputvalue={value}
        />}
          name='username'
          control={control}
          rules={{
            required: true,
          }}
        />
        <ErrorMessage
          errors={errors}
          name="username"
          render={({ messages }) =>
            messages &&
            Object.entries(messages).map(([type, message]) => (
              <p className='text-red-400 text-sm mb-4' key={type}>{message}</p>
            ))
          }
        />
        <Controller render={({ field: { onChange, value }, fieldState: { error, invalid } }) => <>
          <FormInput
            type="password"
            placeholder={'password'}
            label="Password"
            onChange={onChange}
            forminputvalue={value}
          />
        </>
        }
          name='password'
          control={control}
          rules={{
            required: true,
            minLength: 8,
          }}
        />
        <ErrorMessage
          errors={errors}
          name="password"
          render={({ messages }) =>
            messages &&
            Object.entries(messages).map(([type, message]) => (
              <p className='text-red-400 text-sm mb-4' key={type}>{message}</p>
            ))
          }
        />
        {error ? <p className='text-red-400 text-sm mb-4'>{error}</p> : null}

        <div className="flex flex-row justify-between">
          <div className="flex flex-row">
            <IconCheckbox color="white" />
            <span className="px-2 text-white">Remember me</span>
          </div>
          <span className="px-2 text-[#87BE42]">
            <Link href={'/auth/forgot-password'}>Forgot your password?</Link>
          </span>
        </div>

        <FormAction
          text="Continue"
          action="submit"
          handleSubmit={handleSubmit}
          type="Button"
        />
      </form>
    );
  };

  const renderSSO = () => {
    return (
      <div
        className={`dark:bg-Info h-[56px] rounded-[8px] focus:ring-[#ade865] 
        flex justify-center items-center font-medium rounded-md focus:outline-none 
        focus:ring-2 focus:ring-offset-2`}
      >
        <button className={`text-white`} onClick={handleSSOLogin}>
          Sign In with Deloitte Credentials
        </button>
      </div>
    );
  }

  // const msalConfig = {
  //     auth: {
  //       clientId: authConfig.appId,
  //       authority: authConfig.authority,
  //       redirectUri: authConfig.redirectUrl,
  //     },
  //     cache: {
  //       cacheLocation: "localStorage", // or "sessionStorage" or "memory"
  //     },
  //   };

  // const pca = new PublicClientApplication(msalConfig);
  
  // async function handleRedirect() {
  //   try {
  //     await initializeMsal(); // Initialize MSAL
  //     // await pca.handleRedirectPromise();
  //   } catch (error) {
  //     console.error("Error handling redirect promise:", error);
  //   }
  // }
  
  // // Call the async function to handle redirects
  // handleRedirect();
  
  
  
  const handleSSOLogin = async () => {

    try {
      // Initialize the MSAL instance
      await initializeMsal(); // Initialize MSAL
      await pca.initialize();

      // Request SSO login using redirect instead of popup
      const loginRequest = {
        scopes: [...authConfig.scopes, 'openid', 'profile', 'email'],
      };

      handleSave({
        loggedIn: true
      });
      await pca.handleRedirectPromise();
      await pca.loginRedirect(loginRequest);

    } catch (error) {
      console.error('Login failed', error);
      // Handle login failure here, if necessary
    }
  };


  const renderFooter = () => {
    return (
      <div className="flex flex-col">
        <span className="text-[#A5A6A8] font-normal text-[14px] text-center">
          {`You don’t have an account yet?`}
        </span>
        <span className="text-[#87BE42] text-[16px] font-semibold text-center">
          <Link href={'/auth/signup'}>Register</Link>
        </span>
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col justify-center items-center h-screen w-screen`}
    >
      <div className="flex flex-col items-center">
        <Image
          src={'/assets/banner.png'}
          alt="Gennie"
          height={200}
          width={460}
          className="blend-mode"
        />
        <FormContainer
          formContent={renderSSO}
          // formFooter={renderFooter}
          formLabel="Sign In"
          // formDesc="Enter your username and password to begin"
        />
      </div>
      <Image
        src={'/assets/bottom-bg.png'}
        alt="Gennie bottom banner"
        height={292}
        width={1400}
        className="blend-mode absolute bottom-0 -z-10"
      />
    </div>
  );
};

export default Login;

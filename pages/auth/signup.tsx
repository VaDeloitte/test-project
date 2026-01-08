'use client';

import React, { useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import Image from 'next/image';
import Link from 'next/link';
import router from 'next/router';

import FormInput from '@/components/FormInput';
import FormAction from '@/components/auth/formAction/FormAction';
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

import { FormContainer } from '@/components';
import { User } from '@/types';
import { ErrorMessage } from '@hookform/error-message';
import { useSession } from 'next-auth/react';

type SignUpInputs = {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
};

const signupSchema: yup.ObjectSchema<SignUpInputs> = yup.object().shape({
  email: yup.string().email().required(),
  username: yup.string().required(),
  password: yup.string().min(8).max(32).required(),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Passwords must match').required(),
});

const SignUp = () => {
  const [responseError, setResponseError] = useState<string | null>();
  const {
    handleSubmit,
    formState: { errors, isValid },
    getValues,
    control
  } = useForm<SignUpInputs>({
    resolver: yupResolver(signupSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    criteriaMode: "all",
  });

  const session = useSession();

  if (session.status === "authenticated") {
    router?.push("/");
  }

  const onSubmit: SubmitHandler<SignUpInputs> = async (data) => {
    const user: User = { loggedIn: true, email: data.email, username: data.username };
    setResponseError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: user.username,
          email: user.email,
          password: data.password,
          username: data.username
        }),
      });
      if (res.status === 201)
        router.push("/auth/login?success=Account has been created");
      else {
        setResponseError(res.statusText);
      }

    } catch (err: any) {
      console.log('--- err: ', err);
    }
  };

  const renderForm = () => {
    return (
      <div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Controller render={({ field: { onChange, value } }) => <FormInput
            type="email"
            placeholder={'email'}
            forminputvalue={value}
            onChange={onChange}
            label="Email"
          />}
            name='email'
            control={control}
            rules={{
              required: true,
            }}
          />
          <ErrorMessage
            errors={errors}
            name="email"
            render={({ messages }) =>
              messages &&
              Object.entries(messages).map(([type, message]) => (
                <p className='text-red-400 text-sm mb-4' key={type}>{message}</p>
              ))
            }
          />
          <Controller render={({ field: { value, onChange } }) => <FormInput
            type="text"
            placeholder={'Username'}
            label="Username"
            forminputvalue={value}
            onChange={onChange}
          />}
            name='username'
            control={control}
            rules={{
              required: true,
              minLength: 6,
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
          <Controller render={({ field }) => <FormInput
            type="password"
            placeholder={'password'}
            label="Password"
            forminputvalue={field.value}
            onChange={field.onChange}
          />}
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

          <Controller render={({ field }) => <>
            <FormInput
              type="password"
              placeholder={'confirmPassword'}
              label="Confirm Password"
              forminputvalue={field.value}
              onChange={field.onChange}
            />
          </>}
            name='confirmPassword'
            control={control}
            rules={{
              required: true,
              minLength: 8,
              validate: (value) => value === getValues('password'),
            }}
          />
          <ErrorMessage
            errors={errors}
            name="confirmPassword"
            render={({ messages }) =>
              messages &&
              Object.entries(messages).map(([type, message]) => (
                <p className='text-red-400 text-sm mb-4' key={type}>{message}</p>
              ))
            }
          />
          {responseError && <p className='text-red-400 text-sm mb-4'>{responseError}</p>}
          {/* @ts-ignore */}
          <FormAction
            text="Continue"
            action="submit"
            handleSubmit={handleSubmit}
          />
        </form>
      </div>
    );
  };

  const renderFooter = () => {
    return (
      <>
        <span className="text-[#A5A6A8] font-normal text-[14px] text-center">
          {`You already have an account?`}
        </span>
        <span className="text-[#87BE42] text-[16px] font-semibold text-center">
          {/* @ts-ignore */}
          <Link href={'/auth/login'}>Sign in</Link>
        </span>
      </>
    );
  };

  return (
    <div
      className={`flex flex-col justify-center items-center h-screen w-screen relative`}
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
          formContent={renderForm}
          formFooter={renderFooter}
          formLabel="Sign up"
          formDesc="Enter the required information to create a new account"
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

export default SignUp;

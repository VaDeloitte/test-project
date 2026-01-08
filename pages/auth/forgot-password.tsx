import React, { useState } from 'react';
import { SubmitHandler, useForm, Controller } from 'react-hook-form';

import Image from 'next/image';
import Link from 'next/link';
import * as yup from 'yup';

import FormInput from '@/components/FormInput';
import FormAction from '@/components/auth/formAction/FormAction';

import { FormContainer } from '@/components';
import { ResetPasswordForm } from '@/components/auth/forgotPassword/ResetPasswordForm';
import { yupResolver } from '@hookform/resolvers/yup';

type ForgotPasswordInputs = {
  email: string;
};

const ForgotPasswordSchema: yup.ObjectSchema<ForgotPasswordInputs> = yup.object().shape({
  email: yup.string().email().required(),
});


const ForgotPassword = () => {

  const [activeStepIdx, setActiveStepIdx] = useState(0); // 0: inquire email and send OTP , 1: enter OTP and new password

  const {
    handleSubmit,
    formState: { errors },
    getValues,
    setError,
    control,
  } = useForm<ForgotPasswordInputs>({
    resolver: yupResolver(ForgotPasswordSchema)
  });
  const onSubmit: SubmitHandler<ForgotPasswordInputs> = async (data) => {

    try {
      const res = await fetch("/api/auth/forgotPassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: getValues('email'),
        }),
      });
      if (res.status === 201)
        setActiveStepIdx(1);
      else {
        if (!res.ok && res.status === 400)
          setError('email', { message: `account linked to this email doesn't exists` })
      }

    } catch (err: any) {
      setError('email', { message: `Email entered doesnt exist` })
    }
  };

  const renderForm = () => {
    switch (activeStepIdx) {
      case 0:
        return (
          <div>
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* @ts-ignore */}
              <Controller render={({ field: { onChange, value }, fieldState: { error, invalid } }) => <FormInput
                placeholder={'email'}
                label="email"
                defaultValue=""
                forminputvalue={value}
                onChange={onChange}
              />}
                name='email'
                control={control}
              />
              {errors ? <p className='text-red-400 text-sm mb-4'>{errors.email?.message}</p> : null}
              <FormAction text="Send a reset link" action="submit" handleSubmit={handleSubmit} />
            </form>
          </div>
        );
      case 1:
        return <ResetPasswordForm email={getValues('email')} />
      default:
        return <></>
    }
  };

  const renderFooter = () => {
    return (
      <div className="flex flex-col">
        <span className="text-[#A5A6A8] font-normal text-[14px] text-center">
          {`You don’t have an account yet?`}
        </span>
        <span className="text-[#87BE42] text-[16px] font-semibold text-center">
          {/* @ts-ignore */}
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
        {/* @ts-ignore */}
        <Image
          src={'/assets/banner.png'}
          alt="Gennie"
          height={200}
          width={460}
          className="blend-mode"
        />
        {/* @ts-ignore */}
        <FormContainer
          formContent={renderForm}
          formFooter={renderFooter}
          formLabel="Forgot Password"
          formDesc="Enter your email to get a reset password link"
        />
      </div>
      {/* @ts-ignore */}
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

export default ForgotPassword;

import React from 'react'
import FormInput from '@/components/FormInput'
import { ErrorMessage } from '@hookform/error-message'
import * as yup from "yup";
import { Controller, SubmitHandler, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup';
import router from 'next/router';
import FormAction from '../formAction/FormAction';


type ResetPasswordInputs = {
  otp: string;
  newPassword: string;
  confirmNewPassword: string;
};

const ResetPasswordSchema: yup.ObjectSchema<ResetPasswordInputs> = yup.object().shape({
  otp: yup.string().length(5).required(),
  newPassword: yup.string().min(8).max(32).required(),
  confirmNewPassword: yup.string().min(8).max(32)
    .oneOf([yup.ref('newPassword')], 'Passwords must match').required(),
});

export const ResetPasswordForm: React.FC<{ email: string }> = ({ email }) => {

  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<ResetPasswordInputs>({
    resolver: yupResolver(ResetPasswordSchema),
    reValidateMode: "onSubmit",
    criteriaMode: "all",
  });

  const onSubmit: SubmitHandler<ResetPasswordInputs> = async (data) => {
    // handle submit reset password    
    try {
      const res = await fetch("/api/auth/resetPassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          otp: data.otp,
          email: email,
          password: data.newPassword,
        }),
      });
      if (res.status === 201)
        router.push("/auth/login?success=password has been reset successfully");
    } catch (err: any) {
      // setMessage(err);
    }

  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Controller render={({ field: { onChange, value }, fieldState: { error, invalid } }) => <FormInput
        placeholder={'OTP'}
        label="OTP"
        onChange={onChange}
        forminputvalue={value}
      />}
        name='otp'
        control={control}
        rules={{
          required: true,
        }}
      />
      <Controller render={({ field: { onChange, value }, fieldState: { error, invalid } }) => <FormInput
        type="password"
        placeholder={'New password'}
        label="New password"
        defaultValue=""
        onChange={onChange}
        forminputvalue={value}
      />}
        name='newPassword'
        control={control}
        rules={{
          required: true,
        }}
      />
      <ErrorMessage
        errors={errors}
        name="newPassword"
        render={({ messages }) =>
          messages &&
          Object.entries(messages).map(([type, message]) => (
            <p className='text-red-400 text-sm mb-4' key={type}>{message}</p>
          ))
        }
      />
      <Controller render={({ field: { onChange, value }, fieldState: { error, invalid } }) => <FormInput
        placeholder={'Confirm New Password'}
        label="Confirm New password"
        defaultValue=""
        type="password"
        onChange={onChange}
        forminputvalue={value}
      />}
        name='confirmNewPassword'
        control={control}
        rules={{
          required: true,
        }}
      />
      <ErrorMessage
        errors={errors}
        name="confirmNewPassword"
        render={({ messages }) =>
          messages &&
          Object.entries(messages).map(([type, message]) => (
            <p className='text-red-400 text-sm mb-4' key={type}>{message}</p>
          ))
        }
      />
      <FormAction text="Confirm and Reset Password" action="submit" handleSubmit={handleSubmit} />
    </form>
  )
}

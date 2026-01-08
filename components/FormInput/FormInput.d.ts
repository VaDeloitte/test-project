import { HTMLAttributes } from 'react';

interface FormInputProps extends HTMLAttributes<HTMLInputElement> {
  placeholder: string;
  label?: string;
  forminputvalue?: string;
  type?: HTMLInputTypeAttribute;
}

export default FormInputProps;

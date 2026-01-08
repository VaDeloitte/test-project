import { FC } from 'react';

import { useTranslation } from 'next-i18next';

import FormInputProps from './FormInput.d';

const FormInput: FC<FormInputProps> = (props) => {
  const { t } = useTranslation('sidebar');

  return (
    <div className="relative flex mb-4 flex-col text-start">
      <div className="text-white">{props.label}</div>
      <input
        className="w-full flex-1 rounded-md border border-neutral-600 bg-[#202123] px-4 py-3 pr-10 text-[14px] leading-3 text-white"
        type="text"
        title={props.label}
        value={props.forminputvalue}
        {...props}
        placeholder={t(props.placeholder) || ''}
      />
    </div>
  );
};

export default FormInput;

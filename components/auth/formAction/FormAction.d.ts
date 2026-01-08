type FormActionsProps = {
  handleSubmit: FormEventHandler<HTMLButtonElement> | undefined;
  type?: 'Button' | 'submit';
  action?: 'submit' | 'button' | 'reset' | undefined;
  text?: string;
  invalid?: boolean;
};

export default FormActionsProps;

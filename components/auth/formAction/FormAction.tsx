import FormActionsProps from './FormAction.d';

const FormAction: React.FC<FormActionsProps> = ({
  handleSubmit,
  type = 'Button',
  action = 'submit',
  text = '',
  invalid,
}) => {
  return (
    <div
      className={`dark:bg-Info h-[56px] rounded-[8px] focus:ring-[#ade865] ${
        invalid && 'animate-[pulse_2s_ease-in-out]'
      }`}
    >
      {type === 'Button' ? (
        <button
          type={action}
          className={`group relative w-full h-full flex justify-center items-center py-2 px-4 border border-transparent text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 mt-10`}
          onSubmit={handleSubmit}
        >
          {text}
        </button>
      ) : (
        <></>
      )}
    </div>
  );
};

export default FormAction;

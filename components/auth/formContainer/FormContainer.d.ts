import { ReactElement } from 'react';

type FormContainerProps = {
  formContent: () => ReactElement;
  formFooter?: () => ReactElement;
  formLabel: string;
  formDesc?: string;
};

export default FormContainerProps;

export const getBooleanEnv = (value: string | undefined): boolean => {
    if(value)
    {
        return value === 'true' || value === '1';
    }
    else{
        return false;
    }
  };
import { IconExternalLink } from '@tabler/icons-react';
import { useContext } from 'react';

import { useTranslation } from 'next-i18next';

import { OpenAIModel } from '@/types/openai';

import HomeContext from '@/context/home.context';
import ModelDropdown from './ModelDropdown';

export const ModelSelect = () => {
  const { t } = useTranslation('chat');

  const {
    state: { selectedConversation, models, defaultModelId },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedModelObj = models.find(
      (model) => model.id === e.target.value,
    ) as OpenAIModel;
    
    console.log('[ModelSelect.tsx handleChange]: Model selected:', selectedModelObj?.id, selectedModelObj?.name);
    
    // ✅ FIX: Update global selectedModel state
    if (selectedModelObj) {
      homeDispatch({ field: 'selectedModel', value: selectedModelObj });
      console.log('[ModelSelect.tsx handleChange]: ✅ Updated global selectedModel state');
    }
    
    // Also update conversation's model
    selectedConversation &&
      handleUpdateConversation(selectedConversation, {
        key: 'model',
        value: selectedModelObj,
      });
  };

  return (
    <div className="flex flex-col">
      <div className="w-full mt-3 text-left text-neutral-700 dark:text-neutral-400 flex items-center">
        {/* <a
          href="https://platform.openai.com/account/usage"
          target="_blank"
          className="flex items-center"
        >
          <IconExternalLink size={18} className={'inline mr-1'} />
          {t('View Account Usage')}
        </a> */}
      </div>
    </div>
  );
};

import { IconX } from '@tabler/icons-react';
import { IconSearch } from '@tabler/icons-react';
import { FC, useState } from 'react';

import { useTranslation } from 'next-i18next';

interface Props {
  placeholder: string;
  searchTerm: string;
  onSearch: (searchTerm: string) => void;
  collapsed?: boolean;
  openSidebar: any;
}
const Search: FC<Props> = (props) => {
  const { placeholder, searchTerm, onSearch, collapsed } = props;
  const { t } = useTranslation('sidebar');
  const [openSearch, setOpenSearch] = useState(false);
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };

  const clearSearch = () => {
    onSearch('');
  };

  const handleSearch = () => {
    props.openSidebar();
  };

  return (
    <div className="relative flex items-center">
      {collapsed ? (
        <>
          <IconSearch size={14} className="absolute left-3 text-black dark:text-gray-300" />
          <input
            className="w-full pl-7 pr-2 py-2 rounded-md bg-gray-100 dark:bg-[#1A1F24] font-calibri text-[11px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            type="text"
            placeholder={t(placeholder) || ''}
            value={searchTerm}
            onChange={handleSearchChange}
          />

          {searchTerm && (
            <IconX
              className="absolute right-4 cursor-pointer text-neutral-300 hover:text-neutral-400 dark:text-gray-300 dark:hover:text-gray-100"
              size={18}
              onClick={clearSearch}
            />
          )}
        </>
      ) : (
        <div className="relative mx-2  flex items-center w-full rounded-xl bg-[#F2F6F7] dark:bg-[#1e1e1e] dark:bg-[#2e2e2e] px-3 py-2">
          <IconSearch size={14} className="text-gray-400 dark:text-gray-300 mr-2" />

          <input
            type="text"
            placeholder={t(placeholder) || ''}
            value={searchTerm}
            onChange={handleSearchChange}
            className="flex-1 bg-transparent font-calibri text-[11px] text-gray-900 dark:text-gray-100 
                      placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
          />

          {searchTerm && (
            <IconX
              size={18}
              onClick={clearSearch}
              className="cursor-pointer text-neutral-300 hover:text-neutral-400 dark:text-gray-300 dark:hover:text-gray-100 ml-2"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Search;

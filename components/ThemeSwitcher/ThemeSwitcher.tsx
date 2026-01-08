import { useEffect, useState } from 'react';
import useHtmlClass from '@/utils/app/getTheme';
import { IconBulb } from '@tabler/icons-react';

const ThemeSwitcher = ({ type, collapsed, icon }: any) => {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const localTheme: any = window.localStorage.getItem('theme');
    localTheme && setTheme(localTheme);
    document.documentElement.classList.add(localTheme);
  }, []);


  const windowShadow = async () => {
    const windShadowHtml = `
    <div id="windShadow" class="fixed inset-0 bg-black z-[100] opacity-0 h-0 duration-500 transition-all"></div>
`
    document.body.insertAdjacentHTML('beforeend', windShadowHtml);
    const windShadow = document.getElementById('windShadow');
    await new Promise((resolve) => setTimeout(resolve, 10));
    windShadow?.classList.remove('opacity-0');
    windShadow?.classList.remove('h-0');
    await new Promise((resolve) => setTimeout(resolve, 1100));
    windShadow?.classList.add('opacity-0');
    await new Promise((resolve) => setTimeout(resolve, 1300));
    windShadow?.remove();
  };

  const toggleTheme = async () => {
    const windShadowHtml = `
    <div id="windShadow" class="fixed inset-0 bg-black z-[100] opacity-0 h-0 duration-500 transition-all"></div>
`
    document.body.insertAdjacentHTML('beforeend', windShadowHtml);
    const windShadow = document.getElementById('windShadow');
    await new Promise((resolve) => setTimeout(resolve, 10));
    windShadow?.classList.remove('opacity-0');
    windShadow?.classList.remove('h-0');
    await new Promise((resolve) => setTimeout(resolve, 1100));



    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.remove(theme);
    document.documentElement.classList.add(newTheme);
    window.localStorage.setItem('theme', newTheme);

    windShadow?.classList.add('opacity-0');
    await new Promise((resolve) => setTimeout(resolve, 1300));
    windShadow?.remove();
  };

  return (
    <>
      {icon == 'lamp' ? <IconBulb size={22} onClick={toggleTheme} className="mt-[-3px] cursor-pointer dark:text-white text-black" /> : null}

      <div className="flex items-center">
        {type == "button" ?
          collapsed ? '' : <div>
            <span className="mr-2">Light Mode</span>

            <button
              onClick={toggleTheme}
              className={`relative inline-block w-12 h-6 transition duration-200 ease-linear align-middle rounded-full shadow-inner before:absolute before:left-1 before:top-1 dark:before:bg-white before:bg-black before:border-gray-300 before:rounded-full before:h-4 before:w-4 before:shadow before:transition-transform ${theme === 'dark' ? 'dark:bg-Info bg-[#ededed] before:translate-x-6' : 'dark:bg-gray-600 bg-[#ededed] '
                }`}
            ></button>
            <span className="ml-2">Dark Mode</span>
          </div> :
          <>
            <li className="w-[20px]">
              {useHtmlClass() == "dark" ? <img
                onClick={toggleTheme}
                src="/assets/color.svg"
                alt="theme icon"
                className={`cursor-pointer ${theme == 'dark' ? 'scale-x-[-1]' : ''}`}
                width={20}
                height={26}
              /> : <img
                onClick={toggleTheme}
                src="/assets/color-white.svg"
                alt="theme icon"
                className={`cursor-pointer ${theme == 'dark' ? 'scale-x-[-1]' : ''}`}
                width={20}
                height={26}
              />}
            </li>
          </>}

      </div></>
  );
};

export default ThemeSwitcher;

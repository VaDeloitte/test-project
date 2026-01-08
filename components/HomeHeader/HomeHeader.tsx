import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
import useHtmlClass from '@/utils/app/getTheme';
import { AuthContext } from '@/utils/app/azureAD';
import { getInitials } from '@/utils/helper/helper';
import { IconSettings, IconLogout } from '@tabler/icons-react';
import { EDUCATION, DELOITTE_AI_INSTITUTE, GEN_AI_LAMP } from '@/utils/app/const';
import { SidebarButton } from '../Sidebar/SidebarButton';

const HomeHeader: React.FC = () => {
    const mobMenuCls = 'absolute flex-col bg-white dark:bg-primary top-full left-0 w-full z-[9] items-start p-3';
    const router = useRouter();
    const authContext = useContext(AuthContext);
    const user = authContext?.user;
    const theme = useHtmlClass();
    const [isOpen, setIsOpen] = useState(false);
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    let logout: () => void;
    if (authContext) {
      logout = authContext.logout;
    }
    const menuItems = [
        { name: 'About', path: '/about' },
        { name: 'Models', path: '/models' },
        { name: 'FAQ', path: '/faq' },
        { name: 'Workflows', path: '/workflows' },
        { name: 'Agent Creation', path: '/src-app' },
        { name: 'Education', path: EDUCATION },
        { name: 'Deloitte AI institute', path: DELOITTE_AI_INSTITUTE },
        { name: 'Gen AI Lamp', path: GEN_AI_LAMP }
    ];

    useEffect(() => {
        setIsSmallScreen(window.innerWidth < 768);
        const handleResize = () => {
            setIsSmallScreen(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleLogout = async () => {
        logout();
      }


    return (
        <div className="w-full">
            <header className={`dark:text-white m-4 ${router.pathname === '/' ? 'md:m-8' : 'md:my-8'}`}>
                <div className={`relative flex justify-between items-center`}>
                    {/* Navigation links section */}
                    <ul className={`flex md:flex-row flex-1 justify-around gap-[4%] font-medium md:items-center ${isSmallScreen && !isOpen && 'hidden'} ${isSmallScreen && mobMenuCls}`}>
                        {isSmallScreen && <div className='flex justify-between w-full mb-5 p-3 border-b'>
                            <span className="bg-[#729C3E] rounded-full p-1 cursor-pointer text-xs w-[30px] h-[30px] block text-center">{getInitials(user?.username)}</span>
                            <ThemeSwitcher type="circle" />
                        </div>}
                        {/* Logos section with specific width */}
                        <div className="flex items-center gap-2 md:w[390px] mr-20">
                            <div className="relative h-auto w-auto">
                                <img
                                    src={theme === "dark" ? "/assets/deloitte-white-logo.svg" : "/assets/deloitte-logo.svg"}
                                    alt="Deloitte logo"
                                    className="w-full h-auto"
                                />
                            </div>
                            <div className="h-[30px] w-[1px] bg-black dark:bg-white mx-auto hidden md:block"></div>
                            <div className="relative w-[45%] h-auto">
                                <a href="/" className='flex items-center gap-2'>
                                    <Image src={`/assets/logo-with-shadow.svg`} alt="Tax Genie logo" height={40} width={40} />
                                    <span className="hidden lg:inline text-lg lg:text-[170%] tracking-[-0.04em] antialiased whitespace-nowrap" style={{ fontWeight: 690, textRendering: 'optimizeLegibility'}}>Genie</span>
                                </a>
                            </div>
                        </div>
                        {menuItems.map((item, index) => (
                            <Link key={index} className='md:text-xs mb-3 md:mb-0 hover:border-b-1 text-xl hover:underline hover:text-secondary hover:duration-300' href={item.path}>{item.name}</Link>
                        ))}
                        {/* User info and settings section */}
                        <ul className="flex gap-4 items-center">
                            <div className="hidden md:block">
                                <ThemeSwitcher type="circle" />
                            </div>
                            {user?.isAdmin &&
                                <li>
                                    <span onClick={() => { window.location.href = "/admin/workflows"; }}>
                                        <IconSettings size={24} className='cursor-pointer hover:rotate-90 transition-all transform' />
                                    </span>
                                </li>
                            }
                            {user?.username && !isSmallScreen && (
                                <li>
                                    <span className="bg-[#729C3E] rounded-full p-1 text-xs w-[25px] h-[25px] block text-center flex items-center justify-center">{getInitials(user?.username)}</span>
                                </li>
                            )}
                            <li>
                            <SidebarButton
                                icon={<IconLogout size={24} />}
                                onClick={handleLogout}
                                style={'!p-0'}
                            />
                            </li>
                        </ul>
                    </ul>
                </div>
            </header>
        </div>
    );
};

export default HomeHeader;

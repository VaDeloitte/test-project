import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const Landing = () => {
    return (
        <div className="bg-[url('/assets/art.svg')] bg-no-repeat bg-art bg-contain">
            <div className="xl:grid lg:grid-cols-2 xl:overflow-y-auto relative">
                <div className="bg-[##02123] xl:p-32 p-6 h-screen">
                    <Link href={'/'}>
                        <Image
                            src={'/assets/deloitte-logo.png'}
                            alt="Gennie"
                            height={79}
                            width={126}
                            className="blend-mode mb-10 xl:absolute top-[40px] xl:left-8 xl:ml-0 ml-[-10px]"
                        />
                    </Link>

                    <Image
                        src={'/assets/logo.svg'}
                        alt="Gennie"
                        height={116}
                        width={118}
                        className="blend-mode mb-10"
                    />
                    <p className="text-white text-[28px] mb-4 font-[700]">Welcome to Genie! Navigate the complexities of today’s dynamic environment with AI.</p>
                    <p className="text-[#CDCDCD] text-[21px] font-[100]">Genie is your virtual AI assistant that helps you understand the regulatory landscape, stay up to date with latest regulations, and understand the nuances behind laws in different regions.</p>
                    <Link href={'/'} className="dark:bg-Info block text-center text-white p-4 rounded-lg mt-10 px-10 w-full max-w-[440px] text-[18px]">
                        Continue to Genie
                    </Link>
                    <p className="text-white text-[14px] mt-8 xl:text-left text-center">Trouble accessing Genie? Please create a <Link href="" className="text-[#87BE42] underline">ServiceNow</Link> ticket</p>
                </div>
                <div className="bg-[#444654E5] xl:flex justify-center items-center pt-[116px]  h-screen hidden">
                    <Image
                        src={'/assets/right-image.svg'}
                        alt="Gennie"
                        height={704}
                        width={644}
                        className="mb-10"
                    />
                </div>
            </div>
        </div>

    );
};

export default Landing;

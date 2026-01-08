import { useEffect } from "react";
import Accordion from "@/pages/faq";
import Model from "@/pages/models";
import About from "@/pages/about";
import More from "@/pages/more";
import LeadershipDashboardLayout from "@/pages/leadership_dashboard";


const InfoContainer = () => {
    const activeInfoTab=sessionStorage.getItem('activeInfoTab');

    const renderChildren = () => {
        switch (activeInfoTab) {
        case "about":
            return <About />;
        case "models":
            return <Model />;
        case "faq":
            return <Accordion />;
        case "more":
            return <More />;
        case "dashboard":
            return <LeadershipDashboardLayout />;
        default:
            return null;
        }
    };

    return (
        <div className="flex-1  relative min-h-0 font-[Calibri] md:mt-0 mt-7 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 flex flex-col">
        {renderChildren()}
        </div>
    );
};

export default InfoContainer;

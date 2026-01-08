'use client';
import RatingAndReviewComponent from "@/components/Folder/NewComp/RatingAndReviewComponent"
import Header from "@/components/HomeHeader/HomeHeaderNew";
import Sidebar from "@/components/Sidebar";

const Review:React.FC=()=>{
    return(
        <div>
            <Header/>
            <div className="flex w-full" >
            <Sidebar isOpen={false} items={[]} itemComponent={undefined} folderComponent={undefined} searchTerm={""} handleSearchTerm={function (searchTerm: string): void {
                    throw new Error("Function not implemented.");
                } } handleCreateItem={function (): void {
                    throw new Error("Function not implemented.");
                } } handleDrop={function (e: any): void {
                    throw new Error("Function not implemented.");
                } }/>
                <div className="flex-1">
          <RatingAndReviewComponent/>
          </div>
          </div>
          </div>
    )
}

export default Review;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // optional
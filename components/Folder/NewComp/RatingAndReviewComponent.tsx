'use client';
import { useRouter } from "next/router";
import React, { useState } from "react";
import { showToast } from "@/components/popUps/AlertToasts";

const RatingAndReviewComponent = () => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const router=useRouter();
  const handleSubmit = (e:any) => {
    e.preventDefault();
    console.log({ name, rating, review });
    alert("Review submitted successfully!");
    setRating(0);
    setHover(0);
    setReview("");
    router.push("./")
  };

  return (
    <div className=" flex items-center justify-start w-fit">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs bg-white rounded-xl shadow-lg border border-gray-200 p-6 py-4 "
      >
        
 <span className="text-sm font-semibold text-gray-800 text-center">
          Submit Your Rating
        </span>
          <hr className="mt-2 border-t border-gray-300" />
        {/* Rating Stars */}
        <div className="flex flex-col items-center ">
          <div className="flex space-x-1">
            {[...Array(5)].map((_, index) => {
              const starValue = index + 1;
              return (
                <button
                  type="button"
                  key={index}
                  className={`text-3xl transition-colors ${
                    starValue <= (hover || rating)
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }`}
                  onClick={() => setRating(starValue)}
                  onMouseEnter={() => setHover(starValue)}
                  onMouseLeave={() => setHover(0)}
                >
                  ★
                </button>
              );
            })}
          </div>
         
          {/* <label className="text-gray-700 font-medium text-sm">Your Rating</label> */}
        </div>

        {/* Review Textarea */}
        {/* <div className="space-y-1">
          <label className="block text-gray-700 font-medium">Your Review</label>
          <textarea
            placeholder="Tell us what worked / what didn't..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            required
            rows={7}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          />
        </div> */}

        {/* Submit Button */}
        {/* <div className="flex justify-center">
          <button
            type="submit"
            className="w-2/4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            Submit Review
          </button>
        </div> */}
      </form>
    </div>
  );
};

export default RatingAndReviewComponent;



const RateAgent = ({rating,setRating,id}:any) => {
   // the selected rating
  const [hover, setHover] = useState(0);   // the star currently hovered

  return (
    <div className="flex flex-col items-start space-y-2">
      <span className="font-bold  text-[12px] text-gray-800 dark:text-gray-200">
        Your Rating:
      </span>

      {/* Rating Stars */}
      <div className="flex space-x-1">
        {[...Array(5)].map((_, index) => {
          const starValue = index + 1;
          return (
            <button
              key={index}
              
              type="button"
              onClick={() => {
                setRating({value:starValue,id:id});
              }}
              onMouseEnter={() => setHover(starValue)}
              onMouseLeave={() => setHover(0)}
              className={`text-3xl transition-colors focus:outline-none ${
              rating?.id===id&&  starValue <= (hover || rating?.value)
                  ? "text-yellow-400"
                  : "text-gray-300 dark:text-gray-600"
              }`}
            >
              ★
            </button>
          );
        })}
      </div>

      {rating?.value > 0 &&rating?.id===id&& (
        <p className="text-[12px] text-gray-600 dark:text-gray-400">
          You rated this {rating?.value} star{rating.value > 1 ? "s" : ""}.
        </p>
      )}
    </div>
  );
};

export { RateAgent };


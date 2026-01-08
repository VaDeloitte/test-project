import {
  SparklesIcon,
  MicrophoneIcon,
  ArrowUpIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/solid';
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import { FaRobot, FaFilePdf, FaFileAlt, FaFileImage } from 'react-icons/fa';
import { HiMiniWrenchScrewdriver } from 'react-icons/hi2';
import { RiOpenaiFill } from 'react-icons/ri';

const Robot = FaRobot as React.FC<{ className?: any }>;

const FilePdf = FaFilePdf as React.FC<{ className?: any }>;
const FileAlt = FaFileAlt as React.FC<{ className?: any }>;
const FileImage = FaFileImage as React.FC<{ className?: any }>;
const MiniWrenchScrewdriver = HiMiniWrenchScrewdriver as React.FC<{
  className?: any;
}>;

const OpenaiFill = RiOpenaiFill as React.FC<{ className?: any }>;

export default function Introduction({
  open,
  setRun,
  setOpen,
  setTempDismiss,
}: any) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1); // small buffer
  };

  // Scroll by container width
  const scrollPage = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollBy({
      left: direction === 'right' ? width : -width,
      behavior: 'smooth',
    });
  };

//  const INTRO_ACTIVATION_DATE = '2025-11-18'; // 👈 change ONLY this

// const isIntroExpired = () => {
//   const activation = localStorage.getItem('introDate') || INTRO_ACTIVATION_DATE;
//   return Date.now() - new Date(activation).getTime() > 30 * 24 * 60 * 60 * 1000;
// };

// useEffect(() => {
//   if (!open) return;

//   localStorage.setItem(
//     'introDate',
//     localStorage.getItem('introDate') || INTRO_ACTIVATION_DATE
//   );

//   if (isIntroExpired()) {
//     setOpen(false);
//     localStorage.setItem('introDismissed', 'true');
//   }
// }, []);


  // Run once after mount to set arrow visibility
  useEffect(() => {
    if (open) {
      updateArrows();
      // Also recalc on window resize
      window.addEventListener('resize', updateArrows);
      return () => window.removeEventListener('resize', updateArrows);
    }
  }, [open]);

  return (
    open && (
        <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-50">
          <div
            className="bg-white rounded-lg shadow-lg max-w-5xl w-full mx-4 max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                Welcome to New features of Tax Genie
              </h2>

              <button
                onClick={() => {
                  setOpen(false); // just close the modal
                  // notify parent to temporarily dismiss
                  setTempDismiss(true);
                }}
                className="text-gray-500 hover:text-black transition"
              >
                <XIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="relative px-6 py-6 flex-1 overflow-hidden">
              {/* Left Arrow */}
              {canScrollLeft && (
                <button
                  onClick={() => scrollPage('left')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow rounded-full p-2 hover:bg-gray-100"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
              )}

              {/* Scroll Container */}
              <div
                ref={scrollRef}
                className="flex overflow-hidden scroll-smooth"
                style={{ scrollSnapType: 'x mandatory' }}
                onScroll={updateArrows}
              >
                {/* PAGE 1 */}
                <div
                  className="flex gap-4 flex-shrink-0"
                  style={{
                    scrollSnapAlign: 'start',
                    width: '100%',
                    justifyContent: 'space-between',
                  }}
                >
                  <Card
                    title="GPT-5, GPT-5 Mini, Al-Jais and Anthropic new models added"
                    icon={
                      <OpenaiFill className="h-24 w-12 my-2 mx-auto flex " />
                    }
                    description="The latest GPT-5 is now available on Tax Genie, delivering faster performance and smarter reasoning. Model selection is simplified to GPT-5 Mini for speed and efficiency, and GPT-5 for advanced reasoning, alongside Al-Jais and Anthropic models for broader capabilities."
                  />
                  <Card
                    title="Dictate directly a prompt in the prompt bar"
                    icon={
                      <MicrophoneIcon className="h-24 w-12 my-2 text-black mx-auto flex" />
                    }
                    description="Tired of typing? Try dictating the prompt using the new microphone feature! Available in English."
                  />
                  <Card
                    title="More File Upload Options and Supported Formats Added"
                    icon={
                      <div className="h-28 flex items-center justify-center gap-3 my-3 mx-auto">
                        <FilePdf className="h-10 w-10 " />
                        <FileAlt className="h-10 w-10 " />
                        <FileImage className="h-10 w-10 " />
                      </div>
                    }
                    description="More formats and upload styles are now supported. Hover on any Tax Genie reply to access the “Upload File” button."
                  />
                </div>

                {/* PAGE 2 */}
                <div
                  className="flex gap-4 flex-shrink-0"
                  style={{
                    scrollSnapAlign: 'start',
                    width: '100%',
                    justifyContent: 'space-between',
                  }}
                >
                  <Card
                    title="Proactive AI"
                    icon={
                      <Robot className="h-24 w-12 my-2 mx-auto flex text-black" />
                    }
                    description="Click to upload documents, spreadsheets, presentations, and images. Limit: 1 file in this mode for focused AI assistance."
                  />
                  <Card
                    title="Agent Builder"
                    icon={
                      <MiniWrenchScrewdriver className="h-24 w-12 my-2 mx-auto flex" />
                    }
                    description="A tool that allows users to create custom AI agents tailored to specific tasks or workflows. It enables easy configuration of behaviors, knowledge, and integrations, empowering teams to design intelligent assistants without deep coding expertise."
                  />
                  <Card
                    title="Individual Spaces"
                    icon={
                      // <SparklesIcon className="h-24 w-12 my-2 mx-auto flex text-purple-500" />
                      <Image
                        src={'/assets/cardImage.png'}
                        alt="Gennie"
                        className='mx-auto flex my-3 rounded-md'
                        height={100}
                        width={200}
                        />
                    }
                    description="Your individual Spaces.Upload files, track conversations.Keep your files and conversations organized and accessible.Work independently with full control over your content."
                  />
                  <div />
                </div>
              </div>

              {/* Right Arrow */}
              {canScrollRight && (
                <button
                  onClick={() => scrollPage('right')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white shadow rounded-full p-2 hover:bg-gray-100"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="border-t px-6 py-4 flex justify-center gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setRun(true);
                  localStorage.setItem('runIntro', 'true');
                  setTempDismiss(true);
                  setOpen(false);
                }}
                className="px-6 py-3 bg-[#333333] text-white rounded-md font-medium hover:bg-[#444444]"
              >
                Let’s Go
              </button>

              <button
                onClick={() => {
                  localStorage.setItem('introDismissed', 'true');
                  setOpen(false);
                }}
                className="px-6 py-3 bg-gray-200 text-black rounded-md font-medium hover:bg-gray-300"
              >
                Don’t show again
              </button>
            </div>
          </div>
        </div>
        </div>
      )
  );
}

const Card = ({ title, icon, description }: any) => (
  <section className="bg-gray-50 rounded-lg p-6 shadow-sm hover:shadow-md transition flex-1 min-w-0">
    <h3 className="text-lg font-[Calibri] font-medium mb-2 text-black flex items-center gap-2">
      {title}
    </h3>
    {icon}
    <p className="text-gray-600 text-sm">{description}</p>
  </section>
);
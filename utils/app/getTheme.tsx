import { useState, useEffect } from 'react';

// Custom hook to monitor changes in the HTML class name and set initial theme from localStorage
const useHtmlClass = () => {
  // State to store the current class of the HTML document element
  const [htmlClass, setHtmlClass] = useState("dark");

  useEffect(() => {
    // This ensures the code does not run on the server side in a Next.js app
    if (typeof document === "undefined") {
      return;
    }

    // Read the preferred theme from localStorage and set it as the initial class if it exists
    const preferredTheme = localStorage.getItem('theme') || "dark";
    document.documentElement.className = preferredTheme || '';
    setHtmlClass(document.documentElement.className.includes('dark') ?'dark':'');

    // Handler to update state when the class attribute changes
    const handleClassChange = () => {
      setHtmlClass(document.documentElement.className.includes('dark') ?'dark':'');
    };

    // Create a MutationObserver to observe changes in class attribute
    const observer = new MutationObserver(handleClassChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Clean up observer on component unmount
    return () => observer.disconnect();
  }, []);

  return htmlClass;
};

export default useHtmlClass;

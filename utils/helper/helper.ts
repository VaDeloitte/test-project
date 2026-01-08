export const isMobile = () => {
  const userAgent =
    typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
  const mobileRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
  return mobileRegex.test(userAgent);
};

export const isDateOlderByOneDay = (date: Date | string | undefined, currentDate: Date | string | undefined): boolean => {
  if (typeof date === 'string') {
    date = new Date(date);
  }

  if (typeof currentDate === 'string') {
    currentDate = new Date(currentDate);
  }

  if (date && currentDate) {
    const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
    const isGreaterThanOneDay = (currentDate.getTime() - date.getTime()) > oneDayInMilliseconds;
    const hasDayChanged = currentDate.getDate() != date.getDate();
    if (isGreaterThanOneDay) {
      return true;
    }
    else {
      return hasDayChanged;
    }
  } else {
    return true;
  }
};

export function getInitials(name: any): string {

  if (!name) {
    return '';
  }
  // Split the name by comma and space to get an array of names
  const nameParts = name.split(/[, ]+/);

  // Extract the first letter from each part and join them together
  const initials = nameParts.map((part: any) => part?.charAt(0)).reverse().join('');

  // Return the concatenated initials
  return initials;
}

const roughSizeOfObject = (object: any): number => {
  const objectList: any[] = [];
  const stack = [object];
  let bytes = 0;

  while (stack.length) {
    const value = stack.pop();
    if (typeof value === 'boolean') {
      bytes += 4;
    } else if (typeof value === 'string') {
      bytes += value.length * 2;
    } else if (typeof value === 'number') {
      bytes += 8;
    } else if (typeof value === 'object' && !objectList.includes(value)) {
      objectList.push(value);
      for (let i in value) {
        stack.push(value[i]);
      }
    }
  }
  return bytes;
};

// Utility function to get the appropriate icon for the file type
export const getFileIcon = (fileName: any) => {
  const extension = fileName?.split('.')?.pop().toLowerCase();
  switch (extension) {
    case 'pdf':
      return '/assets/pdf.svg';  // Path to PDF icon
    case 'doc':
    case 'docx':
      return '/assets/doc.svg';  // Path to Word document icon
    case 'txt':
      return '/assets/txt.svg';  // Path to Text file icon
    case 'xlsx':
      return '/assets/xlsx.svg';  // Path to Text file icon
    case 'xls':
      return '/assets/xlsx.svg';
    default:
      return '/assets/file.svg'; // Generic file icon for other file types
  }
};

export const calculateSizeInMB = (object: any): any => {
  const bytes = roughSizeOfObject(object);
  const sizeInMB = bytes / (1024 * 1024);
  return Math.round(sizeInMB);  // Use Math.round to convert the result to an integer
};
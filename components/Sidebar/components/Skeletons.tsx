
function WorkflowSkeleton() {
  return (
    <div className="py-3 px-2 border-b border-gray-100 dark:border-gray-800 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-gray-300 dark:bg-gray-700 rounded-full" />
        <div className="h-3 w-40 bg-gray-200 dark:bg-gray-600 rounded" />
      </div>
    </div>
  );
}

export {WorkflowSkeleton};

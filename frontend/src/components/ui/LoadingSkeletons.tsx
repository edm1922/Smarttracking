import React from 'react';

/** Base pulse skeleton */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200/60 ${className}`}
      {...props}
    />
  );
}

/** Table Skeleton Loader */
export function TableSkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="animate-in fade-in duration-300">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-6 py-4 border-b border-gray-100">
              <Skeleton 
                className={`h-4 ${
                  colIndex === 0 ? 'w-3/4' : 
                  colIndex === columns - 1 ? 'w-12 ml-auto' : 
                  'w-1/2'
                }`} 
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Card Skeleton Loader */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in duration-300 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

/** Page Header Skeleton */
export function PageHeaderSkeleton() {
  return (
    <div className="flex justify-between items-end mb-8 animate-in fade-in duration-300">
      <div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
    </div>
  );
}

/** Minimal Button Spinner */
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg 
      className={`animate-spin text-current ${className}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

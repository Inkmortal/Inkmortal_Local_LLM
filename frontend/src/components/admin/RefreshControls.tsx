import React from 'react';

interface RefreshControlsProps {
  title: string;
  lastUpdated: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
  accentColor: string;
  textMutedColor: string;
  bgSecondaryColor: string;
  textSecondaryColor: string;
  borderColor: string;
  children?: React.ReactNode;
}

const RefreshControls: React.FC<RefreshControlsProps> = ({
  title,
  lastUpdated,
  isLoading,
  onRefresh,
  accentColor,
  textMutedColor,
  bgSecondaryColor,
  textSecondaryColor,
  borderColor,
  children
}) => {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-bold" style={{ color: accentColor }}>
        {title}
      </h1>
      <div className="mt-2 sm:mt-0 flex items-center space-x-4">
        {lastUpdated && (
          <div className="text-sm" style={{ color: textMutedColor }}>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
        <button
          onClick={onRefresh}
          className="p-2 rounded-md text-sm flex items-center"
          style={{ 
            backgroundColor: bgSecondaryColor,
            color: textSecondaryColor,
            border: `1px solid ${borderColor}`
          }}
          disabled={isLoading}
          aria-label="Refresh data"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Now
            </>
          )}
        </button>
        {children}
      </div>
    </div>
  );
};

export default RefreshControls;
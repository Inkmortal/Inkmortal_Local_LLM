import React from 'react';
import { MessageStatus } from '../../pages/chat/types/message';

const LoadingDots = () => (
  <span className="loading-dots">
    <span className="dot">.</span>
    <span className="dot">.</span>
    <span className="dot">.</span>
  </span>
);

/**
 * Status indicator component for chat messages
 * Shows status information in a consistently positioned manner
 */
interface StatusIndicatorProps {
  status?: MessageStatus;
  error?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, error }) => {
  if (!status || status === MessageStatus.COMPLETE) return null;
  
  switch(status) {
    case MessageStatus.SENDING:
      return <div className="text-xs text-blue-400 animate-pulse">Sending<LoadingDots /></div>;
    case MessageStatus.QUEUED:
      return <div className="text-xs text-yellow-400">Waiting in queue<LoadingDots /></div>;
    case MessageStatus.PROCESSING:
      return <div className="text-xs text-green-400 animate-pulse">Processing<LoadingDots /></div>;
    case MessageStatus.STREAMING:
      return <div className="text-xs text-green-400">Generating<LoadingDots /></div>;
    case MessageStatus.ERROR:
      return <div className="text-xs text-red-400">{error || 'Error processing message'}</div>;
    default:
      return null;
  }
};

export default StatusIndicator;
import React from 'react';

interface TopSnackbarProps {
  isVisible: boolean;
  message: string;
  type: 'info' | 'warning' | 'success';
  onClose?: () => void;
}

export const TopSnackbar: React.FC<TopSnackbarProps> = ({
  isVisible,
  message,
  type,
  onClose
}) => {
  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return 'bg-[#FFE5E5] text-[#CF0000] border-[#FFB6B6]';
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9999] ${getTypeStyles()} border-b py-2 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container mx-auto px-4 flex items-center justify-between">
        <span className="text-xs font-medium text-center flex-grow">{message}</span>
        {onClose && (
          <button 
            onClick={onClose} 
            className="text-[#CF0000] hover:opacity-70 text-lg leading-none ml-2"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

// 최하단 실시간 알림 스낵바
interface BottomSnackbarProps {
  isVisible: boolean;
  messages: string[];
  onClose: () => void;
}

export const BottomSnackbar: React.FC<BottomSnackbarProps> = ({ isVisible, messages, onClose }) => {
  if (!isVisible || messages.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-blue-50 text-blue-800 px-4 py-3 rounded-lg shadow-sm border border-blue-200 max-w-sm transition-all duration-300">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="text-sm font-medium mb-1">실시간 활동</div>
          <div className="text-xs space-y-1">
            {messages.slice(0, 3).map((msg, idx) => (
              <div key={idx} className="opacity-80">{msg}</div>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-blue-600 hover:text-blue-800 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};


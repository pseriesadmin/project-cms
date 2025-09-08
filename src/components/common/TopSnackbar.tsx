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
        return 'bg-amber-500 text-white border-amber-600';
      case 'success':
        return 'bg-green-500 text-white border-green-600';
      default:
        return 'bg-blue-500 text-white border-blue-600';
    }
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9999] ${getTypeStyles()} border-b-2 shadow-lg transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {type === 'warning' && <span className="text-lg">⚠️</span>}
          {type === 'success' && <span className="text-lg">✅</span>}
          {type === 'info' && <span className="text-lg">ℹ️</span>}
          <span className="text-sm font-medium">{message}</span>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-xl font-bold ml-4"
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
    <div className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm transition-all duration-300">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="text-sm font-medium mb-1">🔄 실시간 활동</div>
          <div className="text-xs space-y-1">
            {messages.slice(0, 3).map((msg, idx) => (
              <div key={idx} className="opacity-90">{msg}</div>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-300 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};


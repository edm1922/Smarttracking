import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  requireConfirmationText?: string;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
  requireConfirmationText,
}: ConfirmModalProps) {
  const [confirmationInput, setConfirmationInput] = useState('');

  if (!isOpen) return null;

  const isConfirmDisabled = requireConfirmationText 
    ? confirmationInput.toLowerCase() !== requireConfirmationText.toLowerCase()
    : false;

  const handleConfirm = () => {
    onConfirm();
    setConfirmationInput(''); // Reset for next use
  };

  const handleCancel = () => {
    onCancel();
    setConfirmationInput(''); // Reset for next use
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-full ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <button onClick={handleCancel} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">{title}</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
        
        {requireConfirmationText && (
          <div className="mb-8">
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">
              Type <span className="text-red-600 font-black">"{requireConfirmationText}"</span> to confirm
            </label>
            <input
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-red-100 focus:border-red-300 outline-none transition-all placeholder:font-normal"
              placeholder={`Type "${requireConfirmationText}"`}
            />
          </div>
        )}

        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed ${
              isDestructive 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' 
                : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useState } from 'react';
import { usePeerDropStore } from '../store/usePeerDropStore';
import { useFileTransfer } from '../hooks/useFileTransfer';

interface FileDropProps {
  className?: string;
}

export function FileDrop({ className = '' }: FileDropProps) {
  const { isConnected, transferState, transferProgress, transferSpeed, currentFile } = usePeerDropStore();
  const { sendFileOffer } = useFileTransfer();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!isConnected || transferState !== 'idle') return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await sendFileOffer(files[0]);
    }
  }, [isConnected, transferState, sendFileOffer]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isConnected || transferState !== 'idle') return;

    const files = e.target.files;
    if (files && files.length > 0) {
      await sendFileOffer(files[0]);
    }
  }, [isConnected, transferState, sendFileOffer]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatFileSize(bytesPerSecond) + '/s';
  };

  if (!isConnected) {
    return (
      <div className={`${className} bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center`}>
        <p className="text-gray-500 dark:text-gray-400">
          Connect to a peer to start transferring files
        </p>
      </div>
    );
  }

  if (transferState === 'sending') {
    return (
      <div className={`${className} bg-white dark:bg-gray-700 rounded-lg p-6`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sending File
        </h3>
        {currentFile && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{currentFile.name}</span>
              <span className="text-gray-600 dark:text-gray-400">
                {formatFileSize(currentFile.size)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${transferProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {transferProgress.toFixed(1)}% complete
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {formatSpeed(transferSpeed)}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (transferState === 'receiving') {
    return (
      <div className={`${className} bg-white dark:bg-gray-700 rounded-lg p-6`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Receiving File
        </h3>
        {currentFile && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{currentFile.name}</span>
              <span className="text-gray-600 dark:text-gray-400">
                {formatFileSize(currentFile.size)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${transferProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {transferProgress.toFixed(1)}% complete
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                Receiving...
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (transferState === 'complete') {
    return (
      <div className={`${className} bg-white dark:bg-gray-700 rounded-lg p-6`}>
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Transfer Complete!
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {currentFile?.name} has been transferred successfully
          </p>
        </div>
      </div>
    );
  }

  if (transferState === 'error') {
    return (
      <div className={`${className} bg-white dark:bg-gray-700 rounded-lg p-6`}>
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Transfer Failed
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Something went wrong during the file transfer
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-gray-400 dark:text-gray-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Drop files here
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              or click to select files
            </p>

            <label className="inline-block">
              <input
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                disabled={transferState !== 'idle'}
              />
              <span className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors inline-block">
                Select File
              </span>
            </label>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Files are transferred directly between browsers
          </p>
        </div>
      </div>
    </div>
  );
}
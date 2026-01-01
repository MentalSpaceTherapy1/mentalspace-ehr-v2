import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import {
  Upload,
  FileText,
  Image,
  File,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import { useCredential, useUploadDocument } from '../../hooks/useCredentialing';

interface UploadedFile {
  file: File;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  preview?: string;
}

export default function DocumentUpload() {
  const { id } = useParams();
  const { data: credential } = useCredential(id || '');
  const uploadDocument = useUploadDocument();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}`);
        return false;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File too large: ${file.name} (max 10MB)`);
        return false;
      }

      return true;
    });

    // Add files with initial state
    const uploadedFiles: UploadedFile[] = validFiles.map((file) => ({
      file,
      progress: 0,
      status: 'uploading',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    setFiles((prev) => [...prev, ...uploadedFiles]);

    // Simulate upload for each file
    uploadedFiles.forEach((uploadedFile, index) => {
      simulateUpload(files.length + index, uploadedFile.file);
    });
  };

  const simulateUpload = async (index: number, file: File) => {
    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index ? { ...f, progress } : f
        )
      );
    }

    // Mark as complete
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, status: 'complete' } : f
      )
    );

    // Actually upload if credential ID exists
    if (id) {
      try {
        await uploadDocument.mutateAsync({ credentialId: id, file });
      } catch (error) {
        setFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: 'error' } : f
          )
        );
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-8 h-8 text-blue-600" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-600" />;
    } else {
      return <File className="w-8 h-8 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
          <Upload className="w-12 h-12 text-green-600 mr-4" />
          Document Upload
        </h1>
        <p className="text-gray-600 text-lg">
          Upload credential documents and supporting files
        </p>
        {credential && (
          <div className="mt-4 p-4 bg-white rounded-xl border-2 border-gray-200">
            <p className="text-sm text-gray-600">
              Uploading for: <span className="font-bold text-gray-900">{credential.staffName}</span> -{' '}
              <span className="font-bold text-purple-600">{credential.type}</span>
            </p>
          </div>
        )}
      </div>

      {/* Upload Zone */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-8 mb-6">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-4 border-dashed rounded-2xl p-12 text-center transition-all ${
            dragActive
              ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50 scale-105'
              : 'border-gray-300 hover:border-purple-400 hover:bg-gradient-to-br hover:from-purple-50 hover:to-blue-50'
          }`}
        >
          <div className="mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Upload className="w-12 h-12 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Drag and drop your files here
            </h2>
            <p className="text-gray-600 mb-4">or</p>
            <label className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer font-bold text-lg">
              <Upload className="w-6 h-6" />
              Choose Files
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2 justify-center">
              <FileText className="w-5 h-5 text-red-600" />
              <span>PDF Documents</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <Image className="w-5 h-5 text-blue-600" />
              <span>Images (JPG, PNG)</span>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <File className="w-5 h-5 text-gray-600" />
              <span>Word Documents</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Maximum file size: 10MB per file
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <FileText className="w-7 h-7 text-purple-600 mr-3" />
            Uploaded Files ({files.length})
          </h2>

          <div className="space-y-4">
            {files.map((uploadedFile, index) => (
              <FileCard
                key={index}
                uploadedFile={uploadedFile}
                onRemove={() => removeFile(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Existing Documents */}
      {credential?.documentUrl && (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 mt-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <FileText className="w-7 h-7 text-blue-600 mr-3" />
            Existing Documents
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ExistingDocCard
              name="Credential Document"
              type="PDF"
              size="2.4 MB"
              uploadedDate={credential.updatedAt}
              url={credential.documentUrl}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// File Card Component
interface FileCardProps {
  uploadedFile: UploadedFile;
  onRemove: () => void;
}

function FileCard({ uploadedFile, onRemove }: FileCardProps) {
  const { file, progress, status, preview } = uploadedFile;

  return (
    <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
      <div className="flex items-start gap-4">
        {/* Preview/Icon */}
        <div className="flex-shrink-0">
          {preview ? (
            <img src={preview} alt={file.name} className="w-16 h-16 rounded-lg object-cover" />
          ) : (
            <div className="w-16 h-16 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
              {getFileIcon(file)}
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{file.name}</p>
              <p className="text-sm text-gray-600">{(file.size / 1024).toFixed(2)} KB</p>
            </div>
            <button
              onClick={onRemove}
              className="ml-2 p-2 hover:bg-red-100 rounded-lg transition-all flex-shrink-0"
            >
              <Trash2 className="w-5 h-5 text-red-600" />
            </button>
          </div>

          {/* Progress Bar */}
          {status === 'uploading' && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Status */}
          {status === 'complete' && (
            <div className="flex items-center gap-2 text-sm text-green-600 font-bold">
              <CheckCircle className="w-5 h-5" />
              Upload complete
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 text-sm text-red-600 font-bold">
              <AlertCircle className="w-5 h-5" />
              Upload failed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Existing Document Card Component
interface ExistingDocCardProps {
  name: string;
  type: string;
  size: string;
  uploadedDate: string;
  url: string;
}

function ExistingDocCard({ name, type, size, uploadedDate, url }: ExistingDocCardProps) {
  return (
    <div className="bg-white border-2 border-blue-200 rounded-xl p-4 hover:shadow-lg transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-600">{type} • {size}</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Uploaded: {new Date(uploadedDate).toLocaleDateString()}
      </p>

      <div className="flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all text-sm font-bold">
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>
    </div>
  );
}

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) {
    return <Image className="w-8 h-8 text-blue-600" />;
  } else if (file.type === 'application/pdf') {
    return <FileText className="w-8 h-8 text-red-600" />;
  } else {
    return <File className="w-8 h-8 text-gray-600" />;
  }
}

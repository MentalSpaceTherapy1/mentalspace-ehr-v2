import { useState, useEffect } from 'react';
import api from '../lib/api';

interface Document {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  folderId?: string;
  category?: string;
  tags?: string[];
  uploadedBy: string;
  uploadedByName: string;
  accessLevel: 'PUBLIC' | 'PRIVATE' | 'RESTRICTED';
  version: number;
  versions?: DocumentVersion[];
  createdAt: string;
  updatedAt: string;
}

interface DocumentVersion {
  id: string;
  version: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  changes?: string;
}

interface Folder {
  id: string;
  name: string;
  parentId?: string;
  documentCount: number;
  children?: Folder[];
  createdAt: string;
}

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async (folderId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/documents', {
        params: { folderId },
      });
      setDocuments(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/documents/folders');
      setFolders(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch folders');
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (data: {
    file: File;
    title: string;
    folderId?: string;
    category?: string;
    tags?: string[];
    accessLevel?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('title', data.title);
      if (data.folderId) formData.append('folderId', data.folderId);
      if (data.category) formData.append('category', data.category);
      if (data.tags) formData.append('tags', JSON.stringify(data.tags));
      if (data.accessLevel) formData.append('accessLevel', data.accessLevel);

      const response = await api.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload document');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async (data: { name: string; parentId?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/documents/folders', data);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create folder');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/documents/${documentId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete document');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const moveDocument = async (documentId: string, folderId: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/documents/${documentId}/move`, { folderId });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to move document');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const searchDocuments = async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/documents/search', {
        params: { query },
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search documents');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getDocumentVersions = async (documentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/documents/${documentId}/versions`);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch versions');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    documents,
    folders,
    loading,
    error,
    fetchDocuments,
    fetchFolders,
    uploadDocument,
    createFolder,
    deleteDocument,
    moveDocument,
    searchDocuments,
    getDocumentVersions,
  };
};

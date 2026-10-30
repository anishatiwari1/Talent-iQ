import api from './api';

export const documentService = {
  uploadDocument: async (file, documentType = 'RESUME') => {
    const form = new FormData();
    form.append('file', file);
    form.append('document_type', documentType);
    const { data } = await api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  listMyDocuments: async () => {
    const { data } = await api.get('/documents');
    return data;
  },

  processDocument: async (documentId) => {
    // Runs the Phase 4 NLP extraction pipeline on an already-uploaded
    // document; returns the skills it found and added to the profile.
    const { data } = await api.post(
      `/documents/${documentId}/process`,
      {},
      { timeout: 60000 }
    );
    return data;
  },

  downloadDocument: (documentId) => {
    // Opens in a new tab; the browser follows the Authorization header
    // via the axios instance is not possible for a plain link, so the
    // backend endpoint should be hit through api.get with responseType
    // 'blob' if you need a client-side download instead of a new tab.
    return api.get(`/documents/${documentId}/download`, { responseType: 'blob' });
  },

  deleteDocument: async (documentId) => {
    await api.delete(`/documents/${documentId}`);
  },
};

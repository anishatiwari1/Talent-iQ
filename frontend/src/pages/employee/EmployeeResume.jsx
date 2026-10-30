import React, { useEffect, useRef, useState } from 'react';
import { FileText, RefreshCw, Sparkles, Trash2, Upload } from 'lucide-react';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { documentService } from '../../services/documentService';

const errorMessage = (error, fallback) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
};

const statusVariant = (status) => {
  switch ((status || '').toUpperCase()) {
    case 'COMPLETED': return 'success';
    case 'IN_PROGRESS': return 'info';
    case 'FAILED': return 'danger';
    default: return 'warning';
  }
};

const STATUS_LABELS = {
  NOT_STARTED: 'Not processed yet',
  IN_PROGRESS: 'Processing',
  COMPLETED: 'Processed',
  FAILED: 'Processing failed',
};

const formatStatus = (status) => STATUS_LABELS[status || 'NOT_STARTED'] || status.replaceAll('_', ' ');

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const formatFileSize = (bytes) => {
  if (typeof bytes !== 'number') return 'Size unavailable';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const LoadingState = () => (
  <div className="rounded-lg border border-[#DCE5DF] bg-white p-5" aria-live="polite" aria-busy="true">
    <div className="space-y-3">
      <div className="h-4 w-2/3 animate-pulse rounded bg-[#E8EFEA]" />
      <div className="h-3 w-full animate-pulse rounded bg-[#F1F5F2]" />
      <p className="text-xs text-[#687A73]">Loading your uploaded resumes...</p>
    </div>
  </div>
);

const ExtractionDetails = ({ result }) => (
  <div className="mt-5 border-t border-[#E8EFEA] pt-4">
    <h3 className="text-sm font-semibold text-[#10221E]">Extracted information</h3>
    <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div>
        <dt className="text-xs text-[#687A73]">Skills added</dt>
        <dd className="mt-1 text-sm font-semibold text-[#10221E]">{result.skills_added_count}</dd>
      </div>
      <div>
        <dt className="text-xs text-[#687A73]">Average confidence</dt>
        <dd className="mt-1 text-sm font-semibold text-[#10221E]">
          {typeof result.confidence_avg === 'number' ? result.confidence_avg.toFixed(2) : 'Not returned'}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-[#687A73]">Document ID</dt>
        <dd className="mt-1 text-sm font-semibold text-[#10221E]">{result.document_id}</dd>
      </div>
    </dl>
    <div className="mt-4">
      <p className="text-xs font-medium text-[#42544E]">Extracted skills</p>
      {result.skills_extracted.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {result.skills_extracted.map((skill, index) => (
            <li key={`${skill}-${index}`}><Badge variant="primary">{skill}</Badge></li>
          ))}
        </ul>
      ) : <p className="mt-1 text-sm text-[#687A73]">No skills were returned.</p>}
    </div>
    <div className="mt-4">
      <p className="text-xs font-medium text-[#42544E]">Experience keywords</p>
      {result.experience_keywords.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {result.experience_keywords.map((keyword, index) => (
            <li key={`${keyword}-${index}`}><Badge variant="default">{keyword}</Badge></li>
          ))}
        </ul>
      ) : <p className="mt-1 text-sm text-[#687A73]">No experience keywords were returned.</p>}
    </div>
  </div>
);

export const EmployeeResumeSection = () => {
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [extractionResults, setExtractionResults] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');

    documentService.listMyDocuments()
      .then((items) => {
        if (!cancelled) setDocuments(items.filter((item) => item.document_type === 'RESUME'));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error, 'Your resumes could not be loaded.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [reloadCount]);

  const uploadResume = async (event) => {
    event.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setActionError('');
    setMessage('');
    try {
      const document = await documentService.uploadDocument(selectedFile, 'RESUME');
      setDocuments((current) => [document, ...current.filter((item) => item.id !== document.id)]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage('Resume uploaded. Process it when you are ready.');
    } catch (error) {
      setActionError(errorMessage(error, 'The resume could not be uploaded.'));
    } finally {
      setUploading(false);
    }
  };

  const processResume = async (documentId) => {
    setProcessingId(documentId);
    setActionError('');
    setMessage('');
    try {
      const result = await documentService.processDocument(documentId);
      setExtractionResults((current) => ({ ...current, [documentId]: result }));
      setDocuments((current) => current.map((item) => item.id === documentId
        ? { ...item, extraction_status: 'COMPLETED', processing_status: 'COMPLETED' }
        : item));
      setMessage('Resume processing completed.');
    } catch (error) {
      setActionError(errorMessage(error, 'The resume could not be processed.'));
      try {
        const items = await documentService.listMyDocuments();
        setDocuments(items.filter((item) => item.document_type === 'RESUME'));
      } catch {
        // Keep the original processing error visible if refreshing also fails.
      }
    } finally {
      setProcessingId(null);
    }
  };

  const deleteResume = async (document) => {
    if (!window.confirm(`Delete uploaded resume "${document.file_name}"?`)) return;
    setDeletingId(document.id);
    setActionError('');
    setMessage('');
    try {
      await documentService.deleteDocument(document.id);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setExtractionResults((current) => {
        const next = { ...current };
        delete next[document.id];
        return next;
      });
      setMessage('Resume document deleted.');
    } catch (error) {
      setActionError(errorMessage(error, 'The resume could not be deleted.'));
    } finally {
      setDeletingId(null);
    }
  };

  const resumes = documents.filter((item) => item.document_type === 'RESUME');

  return (
    <section aria-labelledby="employee-resume-heading" className="space-y-4">
      <div>
        <h2 id="employee-resume-heading" className="text-base font-semibold text-[#10221E]">Resume</h2>
        <p className="mt-1 text-sm text-[#687A73]">Upload a resume and review information returned by document processing.</p>
      </div>

      <Card title="Upload resume" subtitle="PDF, DOCX, and TXT files are accepted.">
        <form onSubmit={uploadResume} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-xs font-medium text-[#42544E]">
            Resume file
            <input
              ref={fileInputRef}
              className="mt-1 block w-full cursor-pointer rounded-md border border-[#CAD8D0] bg-white text-sm text-[#42544E] file:mr-3 file:border-0 file:bg-[#DFF2EA] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#063C32] hover:file:bg-[#C3E7D8]"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              required
            />
          </label>
          <Button type="submit" icon={Upload} loading={uploading} disabled={!selectedFile || processingId !== null}>
            Upload resume
          </Button>
        </form>
      </Card>

      {actionError && <p role="alert" className="text-sm text-rose-700">{actionError}</p>}
      {message && <p role="status" className="text-sm text-[#075E4F]">{message}</p>}

      <section aria-labelledby="uploaded-resumes-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 id="uploaded-resumes-heading" className="text-sm font-semibold text-[#10221E]">Uploaded resumes</h3>
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            disabled={loading || uploading || processingId !== null}
            onClick={() => setReloadCount((count) => count + 1)}
            aria-label="Refresh uploaded resumes"
            title="Refresh uploaded resumes"
          >
            Refresh
          </Button>
        </div>

        {loading ? <LoadingState /> : loadError ? (
          <Card>
            <div role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-rose-700">{loadError}</p>
              <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => setReloadCount((count) => count + 1)}>
                Retry
              </Button>
            </div>
          </Card>
        ) : resumes.length === 0 ? (
          <Card className="py-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-[#9BB0A6]" />
            <p className="mt-3 text-sm font-semibold text-[#10221E]">No resume uploaded</p>
            <p className="mt-1 text-xs text-[#687A73]">Your uploaded resumes will appear here.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {resumes.map((document) => {
              const result = extractionResults[document.id];
              const isProcessing = processingId === document.id;
              return (
                <Card key={document.id}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-md bg-[#DFF2EA] p-2 text-[#075E4F]">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold text-[#10221E]">{document.file_name}</h3>
                        <p className="mt-1 text-xs text-[#687A73]">
                          Uploaded {formatDate(document.uploaded_at)} · {formatFileSize(document.file_size_bytes)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(isProcessing ? 'IN_PROGRESS' : document.extraction_status)} dot>
                        {isProcessing ? 'PROCESSING' : formatStatus(document.extraction_status)}
                      </Badge>
                      <Button
                        size="sm"
                        icon={Sparkles}
                        loading={isProcessing}
                        disabled={processingId !== null || deletingId !== null || document.extraction_status === 'IN_PROGRESS'}
                        onClick={() => processResume(document.id)}
                      >
                        {document.extraction_status === 'COMPLETED' ? 'Process again' : 'Process resume'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        loading={deletingId === document.id}
                        disabled={processingId !== null || deletingId !== null}
                        onClick={() => deleteResume(document)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  {result && <ExtractionDetails result={result} />}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
};

// Certificates are stored as evidence and attached to certification
// records -- they are never run through skill extraction, so their
// status is about attachment, not processing.
export const EmployeeCertificateSection = ({ certifications = [], onDocumentsChange }) => {
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');

    documentService.listMyDocuments()
      .then((items) => {
        if (!cancelled) setDocuments(items.filter((item) => item.document_type === 'CERTIFICATE'));
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorMessage(error, 'Your certificate documents could not be loaded.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [reloadCount]);

  useEffect(() => {
    onDocumentsChange?.(documents);
  }, [documents]); // eslint-disable-line react-hooks/exhaustive-deps

  const attachedTo = (documentId) => certifications.filter((certification) => certification.documentId === documentId);

  const viewCertificate = async (documentId) => {
    setActionError('');
    try {
      const response = await documentService.downloadDocument(documentId);
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      setActionError(errorMessage(error, 'The certificate file could not be opened.'));
    }
  };

  const uploadCertificate = async (event) => {
    event.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setActionError('');
    setMessage('');
    try {
      const document = await documentService.uploadDocument(selectedFile, 'CERTIFICATE');
      setDocuments((current) => [document, ...current.filter((item) => item.id !== document.id)]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage('Certificate uploaded. Attach it to a certification above so managers can see it.');
    } catch (error) {
      setActionError(errorMessage(error, 'The certificate document could not be uploaded.'));
    } finally {
      setUploading(false);
    }
  };

  const deleteCertificate = async (document) => {
    if (!window.confirm(`Delete uploaded certificate file "${document.file_name}"?`)) return;
    setDeletingId(document.id);
    setActionError('');
    setMessage('');
    try {
      await documentService.deleteDocument(document.id);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setMessage('Certificate document deleted.');
    } catch (error) {
      setActionError(errorMessage(error, 'The certificate document could not be deleted.'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section aria-labelledby="employee-certificates-heading" className="space-y-4">
      <div>
        <h2 id="employee-certificates-heading" className="text-base font-semibold text-[#10221E]">Certificate documents</h2>
        <p className="mt-1 text-sm text-[#687A73]">Upload certificate files, then attach each one to its certification above. Managers can open attached files from your profile.</p>
      </div>

      <Card title="Upload certificate" subtitle="PDF, DOCX, and TXT files are accepted.">
        <form onSubmit={uploadCertificate} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-xs font-medium text-[#42544E]">
            Certificate file
            <input
              ref={fileInputRef}
              className="mt-1 block w-full cursor-pointer rounded-md border border-[#CAD8D0] bg-white text-sm text-[#42544E] file:mr-3 file:border-0 file:bg-[#DFF2EA] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#063C32] hover:file:bg-[#C3E7D8]"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              required
            />
          </label>
          <Button type="submit" icon={Upload} loading={uploading} disabled={!selectedFile || deletingId !== null}>
            Upload certificate
          </Button>
        </form>
      </Card>

      {actionError && <p role="alert" className="text-sm text-rose-700">{actionError}</p>}
      {message && <p role="status" className="text-sm text-[#075E4F]">{message}</p>}

      <Card title="Uploaded certificate documents" subtitle={`${documents.length} uploaded`}>
        <div className="mb-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            disabled={loading || uploading || deletingId !== null}
            onClick={() => setReloadCount((count) => count + 1)}
            aria-label="Refresh certificate documents"
            title="Refresh certificate documents"
          >
            Refresh
          </Button>
        </div>
        {loading ? (
          <LoadingState />
        ) : loadError ? (
          <div role="alert" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-rose-700">{loadError}</p>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => setReloadCount((count) => count + 1)}>
              Retry
            </Button>
          </div>
        ) : documents.length === 0 ? (
          <p className="py-5 text-center text-sm text-[#687A73]">No certificate documents uploaded.</p>
        ) : (
          <ul className="divide-y divide-[#E8EFEA]">
            {documents.map((document) => (
              <li key={document.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-md bg-[#DFF2EA] p-2 text-[#075E4F]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-[#10221E]">{document.file_name}</p>
                    <p className="mt-1 text-xs text-[#687A73]">
                      Uploaded {formatDate(document.uploaded_at)} · {formatFileSize(document.file_size_bytes)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {attachedTo(document.id).length > 0 ? (
                    <Badge variant="success" dot>Attached to {attachedTo(document.id).map((item) => item.name).join(', ')}</Badge>
                  ) : (
                    <Badge variant="primary" dot>Uploaded · not attached</Badge>
                  )}
                  <Button variant="outline" size="sm" icon={FileText} onClick={() => viewCertificate(document.id)}>View</Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    loading={deletingId === document.id}
                    disabled={uploading || deletingId !== null}
                    onClick={() => deleteCertificate(document)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
};

export default EmployeeResumeSection;
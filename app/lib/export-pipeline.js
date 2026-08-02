import { DOCUMENT_REGISTRY } from "./documents";
import { renderOfficialDocxInBrowser } from "./browser-template";

const EXPORTERS = {
  parallelReview: {
    docx: renderOfficialDocxInBrowser
  }
};

export async function exportDocument({ documentId, format, formData }) {
  const documentDefinition = DOCUMENT_REGISTRY[documentId];
  if (!documentDefinition) {
    throw new Error(`Unknown document: ${documentId}`);
  }

  const exporter = EXPORTERS[documentId]?.[format];
  if (!exporter) {
    throw new Error(`Unsupported export format ${format} for ${documentId}`);
  }

  const buffer = await exporter(formData);
  return {
    buffer,
    contentType:
      format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/octet-stream",
    fileName: documentDefinition.fileName
  };
}

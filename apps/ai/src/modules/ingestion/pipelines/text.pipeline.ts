import { DocumentJob } from "../ingestion.types";
import { ContentStreamItem, streamFromText } from "../services/content-stream";
import { processIngestion } from "../services/process-ingestion";
import { setDocStatus } from "../../../shared/db/db";

export interface KnowledgeTableData {
  columns: string[];
  rows: string[][];
}

export async function* tableJsonToItems(
  table: KnowledgeTableData,
  documentId: string,
  baseMetadata: Record<string, unknown>
): AsyncGenerator<ContentStreamItem> {
  const { columns, rows } = table;
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const rowData: Record<string, string> = {};

    let text = "";
    for (let i = 0; i < columns.length; i += 1) {
      const col = columns[i];
      const value = row[i] ?? "";
      rowData[col] = value;

      if (text.length > 0) {
        text += " and ";
      }
      text += `${col} is ${value}`.trim();
    }

    yield {
      sourceRef: `table:${documentId}:row:${rowIndex}`,
      text: `${text}.`,
      metadata: { ...baseMetadata, documentId, rowIndex, rowData, sourceType: "table" }
    };
  }
}

/**
 * Plain-text ingestion pipeline:
 *   1. status → "indexing"
 *   2. Chunk the raw content string
 *   3. Embed chunks in batches
 *   4. Upsert into Qdrant (idempotent)
 *   5. status → "indexed"
 */
export async function runTextIngestionPipeline(job: DocumentJob): Promise<void> {
  const {
    organizationId,
    documentId,
    content = "",
    fileName,
    metadata = {},
    source,
  } = job;

  if (!content.trim()) {
    await setDocStatus(organizationId, documentId, {
      status: "failed",
      errorMessage: "Content is empty",
    });
    return;
  }

  let contentStream: AsyncGenerator<ContentStreamItem>;

  if (source === "table") {
    try {
      const tableData = JSON.parse(content) as KnowledgeTableData;
      contentStream = tableJsonToItems(tableData, documentId, metadata);
    } catch (err: any) {
      await setDocStatus(organizationId, documentId, {
        status: "failed",
        errorMessage: "Failed to parse table JSON content",
      });
      return;
    }
  } else {
    contentStream = streamFromText(content, `text:${documentId}`, {
      ...metadata,
      sourceType: source,
    });
  }

  await setDocStatus(organizationId, documentId, { status: "indexing" });
  console.log(`[Text Ingestion] Starting: ${fileName}`);

  try {
    const result = await processIngestion({
      organizationId,
      documentId,
      sourceType: source,
      fileName,
      fileKey: "",
      metadata,
      contentStream,
    });

    await setDocStatus(organizationId, documentId, {
      status: "indexed",
      wordCount: result.wordCount,
      chunkCount: result.chunksSucceeded,
      totalChunkCount: result.chunksTotal,
      failedChunkCount: result.chunksFailed,
      lastIndexed: new Date(),
      ...(result.chunksFailed > 0
        ? { errorMessage: `Partial ingestion: ${result.chunksFailed} chunks failed` }
        : {}),
    });

    console.log(
      `[Text Ingestion] Done: ${result.chunksSucceeded} chunks for document ${documentId}`,
    );
  } catch (err: any) {
    await setDocStatus(organizationId, documentId, {
      status: "failed",
      errorMessage: err.message ?? "Unknown error",
    });
    throw err;
  }
}

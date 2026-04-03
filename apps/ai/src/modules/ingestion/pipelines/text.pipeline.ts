import { DocumentJob } from "../ingestion.types";
import { ContentStreamItem, streamFromText } from "../services/content-stream";
import { processIngestion } from "../services/process-ingestion";
import { setDocStatus } from "../../../shared/db/db";

export interface KnowledgeTableData {
  columns: string[];
  rows: string[][];
}

export function tableJsonToItems(
  table: KnowledgeTableData,
  documentId: string,
  baseMetadata: Record<string, unknown>
): ContentStreamItem[] {
  const { columns, rows } = table;
  return rows.map((row, rowIndex) => {
    const parts = columns.map((col, i) => `${col} is ${row[i] || ""}`.trim());
    const text = parts.join(" and ") + ".";
    
    const rowData: Record<string, string> = {};
    columns.forEach((col, i) => {
       rowData[col] = row[i] || "";
    });

    return {
      sourceRef: `table:${documentId}:row:${rowIndex}`,
      text,
      metadata: { ...baseMetadata, documentId, rowIndex, rowData, sourceType: "table" }
    };
  });
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
      const items = tableJsonToItems(tableData, documentId, metadata);
      
      async function* generateItems() {
        for (const item of items) yield item;
      }
      contentStream = generateItems();
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

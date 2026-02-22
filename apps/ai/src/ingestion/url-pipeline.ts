import { randomUUID } from "crypto";
import { DocumentJob } from "./types";
import { FetchedPage, fetchSinglePage, crawlPages } from "./url-fetcher";
import { chunkText } from "./chunker";
import { getEmbeddingProvider, vectorStore } from "../embeddings";
import { setDocStatus } from "../shared/db";

/** Embed a batch of pages and upsert the resulting vectors into Qdrant */
async function embedAndUpsertPages(
  pages: FetchedPage[],
  opts: {
    documentId: string;
    teamId: string;
    fileName: string | undefined;
    metadata: Record<string, unknown>;
    provider: ReturnType<typeof getEmbeddingProvider>;
    stats: { chunks: number; words: number };
  },
): Promise<void> {
  const { documentId, teamId, fileName, metadata, provider, stats } = opts;
  const EMBED_BATCH = 25; // chunks sent to embedding provider at once

  for (const page of pages) {
    const chunks = chunkText(page.text);
    stats.words += page.text.split(/\s+/).length;

    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);

      const points = await Promise.all(
        batch.map(async (chunk) => {
          const vector = await provider.embed(chunk.text);
          return {
            id: randomUUID(),
            vector,
            payload: {
              documentId,
              teamId,
              fileKey: "",
              sourceUrl: page.url,
              fileName: fileName ?? "",
              chunkIndex: chunk.index,
              text: chunk.text,
              ...metadata,
            },
          };
        }),
      );

      await vectorStore.upsert(points);
      stats.chunks += batch.length;
    }
  }
}

/** Number of crawled pages to accumulate before flushing to Qdrant */
const PAGE_FLUSH_SIZE = 20;

/**
 * URL ingestion pipeline:
 *   1. status → "indexing"
 *   2. Fetch page(s) — single or crawl
 *      • crawl: pages are streamed from the async generator and flushed to
 *        Qdrant every PAGE_FLUSH_SIZE pages so memory stays bounded
 *   3. Chunk each page
 *   4. Embed chunks in batches
 *   5. Upsert into Qdrant (idempotent — deletes old vectors first)
 *   6. status → "indexed"  (or "failed" on error)
 */
export async function runUrlIngestionPipeline(job: DocumentJob): Promise<void> {
  const {
    documentId,
    sourceUrl,
    fetchMode = "single",
    crawlDepth = 1,
    teamId = "",
    fileName,
    metadata = {},
  } = job;

  if (!sourceUrl) {
    throw new Error(`[URL Ingestion] sourceUrl missing for document ${documentId}`);
  }

  await setDocStatus(documentId, { status: "indexing" });
  console.log(
    `[URL Ingestion] Starting ${fetchMode} of ${sourceUrl} (depth: ${crawlDepth})`,
  );

  try {
    const provider = getEmbeddingProvider();
    await vectorStore.ensureCollection(provider.dimensions);
    await vectorStore.deleteByDocumentId(documentId); // idempotent re-ingestion

    const stats = { chunks: 0, words: 0 };
    const embedOpts = { documentId, teamId, fileName, metadata, provider, stats };
    let totalPages = 0;

    if (fetchMode === "crawl") {
      // ── Stream pages from the BFS generator, flush every PAGE_FLUSH_SIZE ──
      let pageBuffer: FetchedPage[] = [];

      for await (const page of crawlPages(sourceUrl, crawlDepth)) {
        pageBuffer.push(page);
        totalPages++;

        if (pageBuffer.length >= PAGE_FLUSH_SIZE) {
          console.log(
            `[URL Ingestion] Flushing ${pageBuffer.length} pages to Qdrant (total so far: ${totalPages})`,
          );
          await embedAndUpsertPages(pageBuffer, embedOpts);
          pageBuffer = [];
        }
      }

      // flush any remaining pages
      if (pageBuffer.length > 0) {
        console.log(
          `[URL Ingestion] Flushing final ${pageBuffer.length} pages to Qdrant`,
        );
        await embedAndUpsertPages(pageBuffer, embedOpts);
      }
    } else {
      // ── Single-page fetch ─────────────────────────────────────────────────
      const pages = await fetchSinglePage(sourceUrl);
      totalPages = pages.length;
      await embedAndUpsertPages(pages, embedOpts);
    }

    if (totalPages === 0) {
      await setDocStatus(documentId, {
        status: "failed",
        errorMessage: "No HTML content could be extracted from the URL",
      });
      return;
    }

    // ── Mark done ─────────────────────────────────────────────────────────────
    await setDocStatus(documentId, {
      status: "indexed",
      wordCount: stats.words,
      chunkCount: stats.chunks,
      lastIndexed: new Date(),
    });

    console.log(
      `[URL Ingestion] Done: ${stats.chunks} chunks across ${totalPages} page(s) — document ${documentId}`,
    );
  } catch (err: any) {
    await setDocStatus(documentId, {
      status: "failed",
      errorMessage: err.message ?? "Unknown error",
    });
    throw err; // re-throw so BullMQ marks the job as failed
  }
}

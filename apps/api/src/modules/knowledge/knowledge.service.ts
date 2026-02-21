import StorageService from "@modules/storage/storage.service";
import { Knowledge } from "@shared/models";
import { ingestionQueue } from "@shared/config/queue";
import logger from "@shared/utils/logger";

class KnowledgeService {
  /**
   * Step 1 of the file upload flow.
   * Creates the DB record (status: "pending") and returns a presigned PUT URL.
   * The client uploads the file directly to MinIO — the API server never buffers it.
   */
  async requestFileUpload(
    meta: {
      title: string;
      description?: string;
      catalog?: string;
      source: "pdf" | "docx";
      fileName: string;
      fileSize: number;
      mimeType: string;
      teamId?: string;
    },
    uploadedBy: string,
  ) {
    // Delegate presigned URL + fileKey generation to StorageService
    const { uploadUrl: presignedUrl, fileKey } =
      await StorageService.generatePresignedUploadUrl(meta.fileName, meta.mimeType, 600);

    const doc = await Knowledge.create({
      title: meta.title,
      description: meta.description,
      catalog: meta.catalog,
      source: meta.source,
      status: "pending",
      fileName: meta.fileName,
      fileKey,
      fileSize: meta.fileSize,
      mimeType: meta.mimeType,
      teamId: meta.teamId,
      uploadedBy,
    });

    logger.info("📄 Knowledge upload requested", {
      documentId: String(doc._id),
      title: doc.title,
      fileKey,
      fileName: meta.fileName,
      mimeType: meta.mimeType,
      sizeKB: (meta.fileSize / 1024).toFixed(2) + " KB",
      uploadedBy,
    });

    return { documentId: String(doc._id), presignedUrl, fileKey };
  }

  /**
   * Step 2 of the file upload flow.
   * Called after the client successfully PUT the file to MinIO.
   * Marks the record as "queued" and enqueues the ingestion BullMQ job.
   */
  async confirmUpload(documentId: string) {
    const doc = await Knowledge.findByIdAndUpdate(
      documentId,
      { status: "queued" },
      { new: true },
    );

    if (!doc) return null;

    await ingestionQueue.add("ingest", {
      documentId: String(doc._id),
      source: doc.source,
      fileKey: doc.fileKey!,
      mimeType: doc.mimeType!,
      fileName: doc.fileName!,
      title: doc.title,
      catalog: doc.catalog,
      teamId: doc.teamId,
    });

    logger.info("✅ Knowledge document confirmed & queued", {
      documentId,
      fileKey: doc.fileKey,
      title: doc.title,
    });

    return doc;
  }

  /**
   * Create a text/URL knowledge entry and immediately enqueue for indexing.
   */
  async createTextEntry(
    data: {
      title: string;
      description?: string;
      catalog?: string;
      source: "text" | "url";
      content?: string;
      url?: string;
      fetchMode?: "single" | "crawl";
      crawlDepth?: number;
      syncFrequency?: string;
      teamId?: string;
    },
    createdBy: string,
  ) {
    const doc = await Knowledge.create({
      title: data.title,
      description: data.description,
      catalog: data.catalog,
      source: data.source,
      status: "queued",
      content: data.content,
      sourceUrl: data.url,
      fetchMode: data.fetchMode,
      crawlDepth: data.crawlDepth,
      syncFrequency: data.syncFrequency,
      teamId: data.teamId,
      uploadedBy: createdBy,
    });

    await ingestionQueue.add("ingest", {
      documentId: String(doc._id),
      source: data.source,
      fileKey: "",
      mimeType: "text/plain",
      fileName: data.title,
      title: data.title,
      catalog: data.catalog,
      teamId: data.teamId,
      sourceUrl: data.url,
      content: data.content,
      fetchMode: data.fetchMode,
      crawlDepth: data.crawlDepth,
      syncFrequency: data.syncFrequency,
    });

    logger.info("📝 Knowledge text/URL entry created & queued", {
      documentId: String(doc._id),
      title: doc.title,
      source: doc.source,
      ...(data.content ? { contentLength: data.content.length } : {}),
      ...(data.url ? { url: data.url } : {}),
      catalog: data.catalog || "(none)",
      createdBy,
    });

    return doc;
  }

  async getItems(teamId?: string) {
    const filter = teamId ? { teamId } : {};
    const items = await Knowledge.find(filter).sort({ createdAt: -1 }).lean();
    return { items, total: items.length };
  }

  /**
   * Get a short-lived presigned GET URL so the client can view/download the file.
   */
  async getViewUrl(documentId: string) {
    const doc = await Knowledge.findById(documentId).lean();
    if (!doc || !doc.fileKey) return null;
    const url = await StorageService.generatePresignedDownloadUrl(doc.fileKey, 300);
    return { url, fileName: doc.fileName, mimeType: doc.mimeType };
  }

  /**
   * Re-enqueue an existing knowledge item for ingestion (used by "Re-index" and "Retry" actions).
   * Sets status back to "queued" and adds a new BullMQ ingestion job.
   */
  async reindexItem(documentId: string) {
    const doc = await Knowledge.findByIdAndUpdate(
      documentId,
      { status: "queued", errorMessage: undefined },
      { new: true },
    );
    if (!doc) return null;

    await ingestionQueue.add("ingest", {
      documentId: String(doc._id),
      source: doc.source,
      fileKey: doc.fileKey ?? "",
      mimeType: doc.mimeType ?? "text/plain",
      fileName: doc.fileName ?? doc.title,
      title: doc.title,
      catalog: doc.catalog,
      teamId: doc.teamId,
      sourceUrl: doc.sourceUrl,
      content: doc.content,
      fetchMode: doc.fetchMode,
      crawlDepth: doc.crawlDepth,
      syncFrequency: doc.syncFrequency,
    });

    logger.info("🔄 Knowledge item re-queued for reindex", {
      documentId,
      title: doc.title,
      source: doc.source,
    });

    return doc;
  }

  /**
   * Partial-update a knowledge record (e.g. pause/resume URL sources, change syncFrequency).
   * When isPaused=true, also cancels any queued/delayed ingestion jobs for the document
   * so the next scheduled re-crawl doesn't fire.
   */
  async updateItem(
    documentId: string,
    patch: {
      isPaused?: boolean;
      syncFrequency?: "manual" | "1hour" | "6hours" | "daily";
      status?: "queued" | "indexed" | "failed" | "pending";
    },
  ) {
    const doc = await Knowledge.findByIdAndUpdate(documentId, { $set: patch }, { new: true });
    if (!doc) return null;

    // When pausing, cancel any waiting/delayed re-crawl jobs so the next scheduled
    // run doesn't fire while the source is paused.
    if (patch.isPaused === true) {
      try {
        const [waiting, delayed] = await Promise.all([
          ingestionQueue.getWaiting(),
          ingestionQueue.getDelayed(),
        ]);
        const toCancel = [...waiting, ...delayed].filter(
          (j) => j.data.documentId === documentId,
        );
        await Promise.all(toCancel.map((j) => j.remove()));
        if (toCancel.length) {
          logger.info(`⏸  Cancelled ${toCancel.length} scheduled job(s) for paused source`, {
            documentId,
          });
        }
      } catch (err) {
        logger.warn("Could not cancel queued ingestion jobs on pause", { documentId, err });
      }
    }

    logger.info("✏️  Knowledge item updated", { documentId, patch });
    return doc;
  }

  /**
   * Delete a knowledge record from MongoDB and remove its file from MinIO (if any).
   * Also cancels any queued/delayed BullMQ ingestion jobs for this document and
   * enqueues a "delete-vectors" job so the AI worker purges Qdrant points.
   */
  async deleteItem(documentId: string) {
    const doc = await Knowledge.findByIdAndDelete(documentId);
    if (!doc) return null;

    // ── 1. Remove the MinIO file if present ────────────────────────────────
    if (doc.fileKey) {
      try {
        await StorageService.deleteFile(doc.fileKey);
      } catch (err) {
        logger.warn("Could not delete MinIO object (may already be removed)", {
          fileKey: doc.fileKey,
        });
      }
    }

    // ── 2. Cancel any waiting/delayed ingestion jobs for this documentId ───
    try {
      const [waiting, delayed] = await Promise.all([
        ingestionQueue.getWaiting(),
        ingestionQueue.getDelayed(),
      ]);
      const toCancel = [...waiting, ...delayed].filter(
        (j) => j.data.documentId === documentId,
      );
      await Promise.all(toCancel.map((j) => j.remove()));
      if (toCancel.length) {
        logger.info(`🗑️  Cancelled ${toCancel.length} queued/delayed ingestion job(s)`, {
          documentId,
        });
      }
    } catch (err) {
      logger.warn("Could not cancel queued ingestion jobs", { documentId, err });
    }

    // ── 3. Enqueue a delete-vectors job so the AI worker purges Qdrant ─────
    await ingestionQueue.add("delete-vectors", {
      jobType: "delete-vectors",
      documentId,
      // Dummy required fields — the worker only needs documentId for this job type
      source: doc.source,
      fileKey: "",
      mimeType: "",
      fileName: doc.title,
      title: doc.title,
    });

    logger.info("🗑️  Knowledge item deleted", {
      documentId,
      title: doc.title,
      source: doc.source,
      fileKey: doc.fileKey ?? "(none)",
    });

    return doc;
  }
}

export default new KnowledgeService();


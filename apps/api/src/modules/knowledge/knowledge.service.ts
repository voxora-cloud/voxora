import StorageService from "@modules/storage/storage.service";
import { Knowledge } from "@shared/models";
import { ingestionQueue } from "@shared/config/queue";
import logger from "@shared/utils/logger";

class KnowledgeService {
  /**
   * Step 1 of the file upload flow.
   * Creates the DB record and returns a presigned PUT URL.
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
    },
    uploadedBy: string,
    organizationId: string,
  ) {
    const { uploadUrl: presignedUrl, fileKey } =
      await StorageService.generatePresignedUploadUrl(meta.fileName, meta.mimeType, 600);

    const doc = await Knowledge.create({
      organizationId,
      title: meta.title,
      description: meta.description,
      catalog: meta.catalog,
      source: meta.source,
      status: "pending",
      fileName: meta.fileName,
      fileKey,
      fileSize: meta.fileSize,
      mimeType: meta.mimeType,
      uploadedBy,
    });

    logger.info("📄 Knowledge upload requested", {
      documentId: String(doc._id),
      organizationId,
      title: doc.title,
      fileKey,
    });

    return { documentId: String(doc._id), presignedUrl, fileKey };
  }

  /**
   * Step 2 of the file upload flow.
   * Marks the record as "queued" and enqueues the ingestion BullMQ job.
   */
  async confirmUpload(documentId: string, organizationId: string) {
    const doc = await Knowledge.findOneAndUpdate(
      { _id: documentId, organizationId },
      { status: "queued" },
      { new: true },
    );

    if (!doc) return null;

    await ingestionQueue.add("ingest", {
      documentId: String(doc._id),
      organizationId,
      source: doc.source,
      fileKey: doc.fileKey!,
      mimeType: doc.mimeType!,
      fileName: doc.fileName!,
      title: doc.title,
      catalog: doc.catalog,
    });

    logger.info("✅ Knowledge document confirmed & queued", { documentId, organizationId });
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
      source: "text" | "url" | "table";
      content?: string;
      url?: string;
      fetchMode?: "single" | "crawl";
      crawlDepth?: number;
      syncFrequency?: string;
    },
    createdBy: string,
    organizationId: string,
  ) {
    const doc = await Knowledge.create({
      organizationId,
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
      uploadedBy: createdBy,
    });

    await ingestionQueue.add("ingest", {
      documentId: String(doc._id),
      organizationId,
      source: data.source,
      fileKey: "",
      mimeType: "text/plain",
      fileName: data.title,
      title: data.title,
      catalog: data.catalog,
      sourceUrl: data.url,
      content: data.content,
      fetchMode: data.fetchMode,
      crawlDepth: data.crawlDepth,
      syncFrequency: data.syncFrequency,
    });

    logger.info("📝 Knowledge text/URL entry created & queued", { documentId: String(doc._id), organizationId, title: doc.title });
    return doc;
  }

  async getItems(organizationId: string) {
    const filter: any = { organizationId };
    const items = await Knowledge.find(filter).sort({ createdAt: -1 }).lean();
    return { items, total: items.length };
  }

  async getViewUrl(documentId: string, organizationId: string) {
    const doc = await Knowledge.findOne({ _id: documentId, organizationId }).lean();
    if (!doc || !doc.fileKey) return null;
    const url = await StorageService.generatePresignedDownloadUrl(doc.fileKey, 300);
    return { url, fileName: doc.fileName, mimeType: doc.mimeType };
  }

  async reindexItem(documentId: string, organizationId: string) {
    const doc = await Knowledge.findOneAndUpdate(
      { _id: documentId, organizationId },
      { status: "queued", errorMessage: undefined },
      { new: true },
    );
    if (!doc) return null;

    await ingestionQueue.add("ingest", {
      documentId: String(doc._id),
      organizationId,
      source: doc.source,
      fileKey: doc.fileKey ?? "",
      mimeType: doc.mimeType ?? "text/plain",
      fileName: doc.fileName ?? doc.title,
      title: doc.title,
      catalog: doc.catalog,
      sourceUrl: doc.sourceUrl,
      content: doc.content,
      fetchMode: doc.fetchMode,
      crawlDepth: doc.crawlDepth,
      syncFrequency: doc.syncFrequency,
    });

    logger.info("🔄 Knowledge item re-queued for reindex", { documentId, organizationId });
    return doc;
  }

  async updateItem(
    documentId: string,
    organizationId: string,
    patch: { isPaused?: boolean; syncFrequency?: "manual" | "1hour" | "6hours" | "daily"; status?: "queued" | "indexed" | "failed" | "pending"; content?: string },
  ) {
    const doc = await Knowledge.findOneAndUpdate(
      { _id: documentId, organizationId },
      { $set: patch },
      { new: true },
    );
    if (!doc) return null;

    if (patch.isPaused === true) {
      try {
        const [waiting, delayed] = await Promise.all([ingestionQueue.getWaiting(), ingestionQueue.getDelayed()]);
        const toCancel = [...waiting, ...delayed].filter((j) => j.data.documentId === documentId);
        await Promise.all(toCancel.map((j) => j.remove()));
      } catch (err) {
        logger.warn("Could not cancel queued ingestion jobs on pause", { documentId, err });
      }
    }

    logger.info("✏️  Knowledge item updated", { documentId, organizationId, patch });
    return doc;
  }

  async deleteItem(documentId: string, organizationId: string) {
    const doc = await Knowledge.findOneAndDelete({ _id: documentId, organizationId });
    if (!doc) return null;

    if (doc.fileKey) {
      try {
        await StorageService.deleteFile(doc.fileKey);
      } catch (err) {
        logger.warn("Could not delete MinIO object", { fileKey: doc.fileKey });
      }
    }

    try {
      const [waiting, delayed] = await Promise.all([ingestionQueue.getWaiting(), ingestionQueue.getDelayed()]);
      const toCancel = [...waiting, ...delayed].filter((j) => j.data.documentId === documentId);
      await Promise.all(toCancel.map((j) => j.remove()));
    } catch (err) {
      logger.warn("Could not cancel queued ingestion jobs", { documentId, err });
    }

    await ingestionQueue.add("delete-vectors", {
      jobType: "delete-vectors",
      documentId,
      organizationId,
      source: doc.source,
      fileKey: "",
      mimeType: "",
      fileName: doc.title,
      title: doc.title,
    });

    logger.info("🗑️  Knowledge item deleted", { documentId, organizationId, title: doc.title });
    return doc;
  }
}

export default new KnowledgeService();

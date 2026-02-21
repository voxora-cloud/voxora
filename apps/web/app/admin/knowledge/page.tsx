"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Plus, BookOpen } from "lucide-react";
import KnowledgeTable from "@/components/admin/knowledge/KnowledgeTable";
import AddKnowledgeModal from "@/components/admin/knowledge/AddKnowledgeModal";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { KnowledgeBase, AddKnowledgeFormData } from "@/lib/interfaces/knowledge";
import { apiService } from "@/lib/api";
import { useAppToast } from "@/lib/hooks/useAppToast";

export default function KnowledgePage() {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeBase | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<KnowledgeBase | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewUrlLoading, setViewUrlLoading] = useState<boolean>(false);

  const { toastSuccess, toastError } = useAppToast();

  useEffect(() => {
    fetchKnowledgeItems();
  }, []);

  // Fetch presigned view URL whenever the view modal opens with a file-type item
  useEffect(() => {
    if (!showViewModal || !selectedItem) {
      setViewUrl(null);
      return;
    }
    if (selectedItem.source === "pdf" || selectedItem.source === "docx") {
      setViewUrlLoading(true);
      apiService
        .getKnowledgeViewUrl(selectedItem._id)
        .then((res) => setViewUrl(res.data.url))
        .catch(() => setViewUrl(null))
        .finally(() => setViewUrlLoading(false));
    }
  }, [showViewModal, selectedItem]);

  const fetchKnowledgeItems = async () => {
    setLoading(true);
    try {
      const res = await apiService.getKnowledgeItems();
      setKnowledgeItems(res.data.items);
    } catch (err) {
      console.error("Error fetching knowledge items:", err);
      toastError("Failed to load knowledge items");
    } finally {
      setLoading(false);
    }
  };

  const handleAddKnowledge = async (data: AddKnowledgeFormData) => {
    setIsSubmitting(true);
    try {
      let newItem: KnowledgeBase;

      if ((data.source === "pdf" || data.source === "docx") && data.file) {
        const { data: uploadMeta } = await apiService.requestKnowledgeUpload({
          title: data.title,
          description: data.description,
          catalog: data.catalog,
          source: data.source,
          fileName: data.file.name,
          fileSize: data.file.size,
          mimeType: data.file.type,
        });
        await apiService.uploadFileToMinIO(uploadMeta.presignedUrl, data.file);
        const { data: confirmed } = await apiService.confirmKnowledgeUpload(uploadMeta.documentId);
        newItem = confirmed;
      } else {
        const { data: created } = await apiService.createTextKnowledge({
          title: data.title,
          description: data.description,
          catalog: data.catalog,
          source: "text",
          content: data.content,
        });
        newItem = created;
      }

      setKnowledgeItems((prev) => [newItem, ...prev]);
      setShowAddModal(false);
      toastSuccess("Knowledge added successfully", `"${data.title}" has been queued for indexing`);
    } catch (err: any) {
      console.error("Error adding knowledge:", err);
      toastError(err.message || "Failed to add knowledge item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewItem = (item: KnowledgeBase) => {
    setSelectedItem(item);
    setShowViewModal(true);
  };

  const handleReindexItem = async (item: KnowledgeBase) => {
    try {
      console.log("Re-indexing:", item.title);
      // Update status to indexing
      setKnowledgeItems((prev) =>
        prev.map((k) =>
          k._id === item._id ? { ...k, status: "indexing" as const } : k
        )
      );

      // Simulate re-indexing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setKnowledgeItems((prev) =>
        prev.map((k) =>
          k._id === item._id
            ? {
                ...k,
                status: "indexed" as const,
                lastIndexed: new Date(),
              }
            : k
        )
      );
    } catch (err) {
      console.error("Error re-indexing:", err);
    }
  };

  const handleRetryItem = async (item: KnowledgeBase) => {
    try {
      console.log("Retrying:", item.title);
      setKnowledgeItems((prev) =>
        prev.map((k) =>
          k._id === item._id ? { ...k, status: "indexing" as const } : k
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));

      setKnowledgeItems((prev) =>
        prev.map((k) =>
          k._id === item._id
            ? {
                ...k,
                status: "indexed" as const,
                lastIndexed: new Date(),
              }
            : k
        )
      );
    } catch (err) {
      console.error("Error retrying:", err);
    }
  };

  const openDeleteDialog = (item: KnowledgeBase) => {
    setItemToDelete(item);
    setShowDeleteDialog(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      await apiService.deleteKnowledgeItem(itemToDelete._id);
      setKnowledgeItems((prev) => prev.filter((k) => k._id !== itemToDelete._id));
      setShowDeleteDialog(false);
      setItemToDelete(null);
      toastSuccess("Knowledge item deleted successfully");
    } catch (err) {
      console.error("Error deleting item:", err);
      toastError("Failed to delete knowledge item");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your support knowledge and documentation
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Add Knowledge
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader size="lg" />
            <p className="text-muted-foreground mt-4">Loading knowledge base...</p>
          </div>
        </div>
      ) : knowledgeItems.length > 0 ? (
        <KnowledgeTable
          knowledgeItems={knowledgeItems}
          onViewItem={handleViewItem}
          onReindexItem={handleReindexItem}
          onDeleteItem={openDeleteDialog}
          onRetryItem={handleRetryItem}
        />
      ) : (
        <div className="p-12 text-center border rounded-lg border-dashed">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            No knowledge items yet
          </h3>
          <p className="text-muted-foreground mt-1">
            Add your first knowledge item to help agents answer questions
          </p>
          <Button className="mt-4 cursor-pointer" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Knowledge
          </Button>
        </div>
      )}

      {/* Add Knowledge Modal */}
      <AddKnowledgeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddKnowledge}
        isSubmitting={isSubmitting}
      />

      {/* View Knowledge Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className={selectedItem?.source === "pdf" ? "sm:max-w-[1000px]" : "sm:max-w-[700px]"}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedItem?.title}
            </h2>
          </div>

          {selectedItem && (
            selectedItem.source === "pdf" ? (
              /* ── PDF: landscape two-column layout ── */
              <div className="flex gap-6 min-h-[520px]">
                {/* Left: info panel */}
                <div className="w-64 shrink-0 space-y-4 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-3 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Source</p>
                      <p className="text-sm font-medium text-foreground uppercase">{selectedItem.source}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className="text-sm font-medium text-foreground capitalize">{selectedItem.status}</p>
                    </div>
                    {selectedItem.lastIndexed && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Last Indexed</p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(selectedItem.lastIndexed).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {selectedItem.wordCount && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Word Count</p>
                        <p className="text-sm font-medium text-foreground">{selectedItem.wordCount} words</p>
                      </div>
                    )}
                    {selectedItem.fileName && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">File Name</p>
                        <p className="text-sm font-medium text-foreground break-all">{selectedItem.fileName}</p>
                      </div>
                    )}
                  </div>

                  {selectedItem.description && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Description</p>
                      <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                    </div>
                  )}

                  {selectedItem.errorMessage && (
                    <div className="p-3 bg-red-500/10 rounded-lg">
                      <p className="text-sm font-medium text-red-500 mb-1">Error</p>
                      <p className="text-sm text-red-400">{selectedItem.errorMessage}</p>
                    </div>
                  )}
                </div>

                {/* Right: PDF preview */}
                <div className="flex-1 flex flex-col">
                  <p className="text-sm font-medium text-foreground mb-2">Preview</p>
                  {viewUrlLoading ? (
                    <div className="flex items-center justify-center flex-1">
                      <Loader size="sm" />
                    </div>
                  ) : viewUrl ? (
                    <iframe
                      src={viewUrl}
                      title="PDF Preview"
                      className="w-full flex-1 rounded border border-border min-h-[480px]"
                    />
                  ) : (
                    <div className="flex items-center justify-center flex-1 text-sm text-muted-foreground border border-dashed rounded-lg">
                      Preview unavailable
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ── Non-PDF: original stacked layout ── */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Source</p>
                    <p className="text-sm font-medium text-foreground uppercase">
                      {selectedItem.source}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <p className="text-sm font-medium text-foreground capitalize">
                      {selectedItem.status}
                    </p>
                  </div>
                  {selectedItem.lastIndexed && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Last Indexed
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(selectedItem.lastIndexed).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedItem.wordCount && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Word Count
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedItem.wordCount} words
                      </p>
                    </div>
                  )}
                </div>

                {selectedItem.description && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      Description
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.description}
                    </p>
                  </div>
                )}

                {selectedItem.content && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      Content Preview
                    </p>
                    <div className="p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {selectedItem.content.substring(0, 500)}
                        {selectedItem.content.length > 500 ? "..." : ""}
                      </p>
                    </div>
                  </div>
                )}

                {selectedItem.sourceUrl && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">URL</p>
                    <a
                      href={selectedItem.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {selectedItem.sourceUrl}
                    </a>
                  </div>
                )}

                {selectedItem.fileName && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      File Name
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.fileName}
                    </p>
                  </div>
                )}

                {/* DOCX download link */}
                {selectedItem.source === "docx" && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Download</p>
                    {viewUrlLoading ? (
                      <div className="flex items-center justify-center h-8">
                        <Loader size="sm" />
                      </div>
                    ) : viewUrl ? (
                      <a
                        href={viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Download {selectedItem.fileName ?? "file"}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">Download link unavailable</p>
                    )}
                  </div>
                )}

                {selectedItem.errorMessage && (
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <p className="text-sm font-medium text-red-500 mb-1">
                      Error Message
                    </p>
                    <p className="text-sm text-red-400">
                      {selectedItem.errorMessage}
                    </p>
                  </div>
                )}
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDeleteItem}
        title="Delete Knowledge Item"
        itemName={itemToDelete?.title}
        isDeleting={isDeleting}
      />
    </div>
  );
}

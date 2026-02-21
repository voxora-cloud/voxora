"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Plus, BookOpen, X } from "lucide-react";
import KnowledgeTable from "@/components/admin/knowledge/KnowledgeTable";
import AddKnowledgeModal from "@/components/admin/knowledge/AddKnowledgeModal";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { KnowledgeBase, AddKnowledgeFormData } from "@/lib/interfaces/knowledge";
import { apiService } from "@/lib/api";

export default function StaticKnowledgePage() {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeBase | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<KnowledgeBase | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewUrlLoading, setViewUrlLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchKnowledgeItems();
  }, []);

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
      // Static page only shows non-URL items (pdf, docx, text)
      setKnowledgeItems(res.data.items.filter((k) => k.source !== "url"));
    } catch (err) {
      console.error("Error fetching knowledge items:", err);
      setError("Failed to load knowledge items");
    } finally {
      setLoading(false);
    }
  };

  const handleAddKnowledge = async (data: AddKnowledgeFormData) => {
    setIsSubmitting(true);
    setError(null);
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
    } catch (err: any) {
      console.error("Error adding knowledge:", err);
      setError(err.message || "Failed to add knowledge item");
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
      setKnowledgeItems((prev) =>
        prev.map((k) => (k._id === item._id ? { ...k, status: "queued" as const } : k))
      );
      const { data } = await apiService.reindexKnowledgeItem(item._id);
      setKnowledgeItems((prev) =>
        prev.map((k) => (k._id === item._id ? { ...k, ...data } : k))
      );
    } catch (err) {
      console.error("Error re-indexing:", err);
      setError("Failed to re-index item");
    }
  };

  const handleRetryItem = async (item: KnowledgeBase) => {
    try {
      setKnowledgeItems((prev) =>
        prev.map((k) => (k._id === item._id ? { ...k, status: "queued" as const } : k))
      );
      const { data } = await apiService.reindexKnowledgeItem(item._id);
      setKnowledgeItems((prev) =>
        prev.map((k) => (k._id === item._id ? { ...k, ...data } : k))
      );
    } catch (err) {
      console.error("Error retrying:", err);
      setError("Failed to retry item");
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
    } catch (err) {
      console.error("Error deleting item:", err);
      setError("Failed to delete knowledge item");
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
            PDFs, DOCX files and plain text entries indexed into your vector database
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Add Knowledge
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

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
          <h3 className="text-lg font-medium text-foreground">No knowledge items yet</h3>
          <p className="text-muted-foreground mt-1">
            Add your first knowledge item to help agents answer questions
          </p>
          <Button className="mt-4 cursor-pointer" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Knowledge
          </Button>
        </div>
      )}

      <AddKnowledgeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddKnowledge}
        isSubmitting={isSubmitting}
      />

      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-[700px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">{selectedItem?.title}</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowViewModal(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
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
              </div>

              {selectedItem.description && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Description</p>
                  <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                </div>
              )}

              {selectedItem.content && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Content Preview</p>
                  <div className="p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {selectedItem.content.substring(0, 500)}
                      {selectedItem.content.length > 500 ? "..." : ""}
                    </p>
                  </div>
                </div>
              )}

              {selectedItem.fileName && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">File Name</p>
                  <p className="text-sm text-muted-foreground">{selectedItem.fileName}</p>
                </div>
              )}

              {selectedItem.source === "pdf" && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Preview</p>
                  {viewUrlLoading ? (
                    <div className="flex items-center justify-center h-24">
                      <Loader size="sm" />
                    </div>
                  ) : viewUrl ? (
                    <iframe
                      src={viewUrl}
                      title="PDF Preview"
                      className="w-full h-96 rounded border border-border"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Preview unavailable</p>
                  )}
                </div>
              )}

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
                  <p className="text-sm font-medium text-red-500 mb-1">Error Message</p>
                  <p className="text-sm text-red-400">{selectedItem.errorMessage}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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

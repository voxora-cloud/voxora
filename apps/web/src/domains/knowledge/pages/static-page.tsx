import { useMemo, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Loader } from "@/shared/ui/loader";
import { Plus, BookOpen } from "lucide-react";
import { KnowledgeTable } from "../components/knowledge-table";
import { AddKnowledgeModal } from "../components/add-knowledge-modal";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import type { KnowledgeBase, AddKnowledgeFormData } from "../types";
import {
  useAddKnowledge,
  useDeleteKnowledgeItem,
  useKnowledgeItems,
  useKnowledgeViewUrl,
  useReindexKnowledgeItem,
} from "../hooks";
import { toast } from "sonner";

export function KnowledgeStaticPage() {
  const { data: items = [], isLoading } = useKnowledgeItems();
  const knowledgeItems = useMemo(
    () => items.filter((item) => item.source !== "url"),
    [items],
  );
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<KnowledgeBase | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<KnowledgeBase | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const addKnowledge = useAddKnowledge();
  const deleteKnowledge = useDeleteKnowledgeItem();
  const reindexKnowledge = useReindexKnowledgeItem();
  const canLoadViewUrl =
    showViewModal &&
    !!selectedItem &&
    (selectedItem.source === "pdf" || selectedItem.source === "docx");
  const { data: viewUrl = null, isLoading: viewUrlLoading } = useKnowledgeViewUrl(
    selectedItem?._id || "",
    canLoadViewUrl,
  );

  const handleAddKnowledge = async (data: AddKnowledgeFormData) => {
    try {
      setIsSubmitting(true);
      await addKnowledge.mutateAsync(data);
      setShowAddModal(false);
      toast.success("Knowledge added successfully", {
        description: "Your content has been queued for indexing.",
      });
    } catch (err: any) {
      console.error("Error adding knowledge:", err);
      toast.error("Failed to add knowledge item", {
        description: err?.message,
      });
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
      await reindexKnowledge.mutateAsync(item._id);
    } catch (err) {
      console.error("Error re-indexing:", err);
      toast.error("Failed to re-index item");
    }
  };

  const handleRetryItem = async (item: KnowledgeBase) => {
    try {
      await reindexKnowledge.mutateAsync(item._id);
    } catch (err) {
      console.error("Error retrying:", err);
      toast.error("Failed to retry item");
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
      await deleteKnowledge.mutateAsync(itemToDelete._id);
      setShowDeleteDialog(false);
      setItemToDelete(null);
      toast.success("Knowledge deleted successfully");
    } catch (err) {
      console.error("Error deleting item:", err);
      toast.error("Failed to delete knowledge item");
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

      {isLoading ? (
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
          <Button
            className="mt-4 cursor-pointer"
            onClick={() => setShowAddModal(true)}
          >
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
        <DialogContent
          className={
            selectedItem?.source === "pdf"
              ? "sm:max-w-[1000px] max-h-[90vh] overflow-y-auto"
              : "sm:max-w-[700px]"
          }
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedItem?.title}
            </h2>
          </div>

          {selectedItem && selectedItem.source === "pdf" ? (
            <div className="flex gap-6">
              <div className="w-56 shrink-0 space-y-4">
                <div className="grid grid-cols-1 gap-3 p-4 bg-muted rounded-lg">
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
                      <p className="text-xs text-muted-foreground mb-1">Last Indexed</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(selectedItem.lastIndexed).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedItem.wordCount && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Word Count</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedItem.wordCount} words
                      </p>
                    </div>
                  )}
                  {selectedItem.fileName && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">File Name</p>
                      <p className="text-sm font-medium text-foreground break-all">
                        {selectedItem.fileName}
                      </p>
                    </div>
                  )}
                </div>

                {selectedItem.description && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Description</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.description}
                    </p>
                  </div>
                )}

                {selectedItem.errorMessage && (
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <p className="text-sm font-medium text-red-500 mb-1">Error</p>
                    <p className="text-sm text-red-400">
                      {selectedItem.errorMessage}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-2">Preview</p>
                {viewUrlLoading ? (
                  <div className="flex items-center justify-center h-[600px] bg-muted rounded border border-border">
                    <Loader size="sm" />
                  </div>
                ) : viewUrl ? (
                  <iframe
                    src={viewUrl}
                    title="PDF Preview"
                    className="w-full h-[600px] rounded border border-border"
                  />
                ) : (
                  <div className="flex items-center justify-center h-[600px] bg-muted rounded border border-border">
                    <p className="text-sm text-muted-foreground">Preview unavailable</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            selectedItem && (
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
                      <p className="text-xs text-muted-foreground mb-1">Last Indexed</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(selectedItem.lastIndexed).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedItem.wordCount && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Word Count</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedItem.wordCount} words
                      </p>
                    </div>
                  )}
                </div>

                {selectedItem.description && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Description</p>
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

                {selectedItem.fileName && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">File Name</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.fileName}
                    </p>
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

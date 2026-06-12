import { useMemo, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Loader } from "@/shared/ui/loader";
import {
  Plus,
  BookOpen,
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle,
  Trash2,
  Eye,
  RefreshCw,
} from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";

export function KnowledgeStaticPage() {
  const { data: items = [], isLoading } = useKnowledgeItems();

  const documents = useMemo(
    () => items.filter((item) => item.source !== "url" && item.source !== "faq"),
    [items],
  );

  const faqs = useMemo(
    () => items.filter((item) => item.source === "faq"),
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "indexed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-semibold border border-green-500/20">
            <CheckCircle className="h-3 w-3" />
            Indexed
          </span>
        );
      case "indexing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-semibold animate-pulse border border-yellow-500/20">
            <Clock className="h-3 w-3 animate-spin" />
            Indexing
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-semibold border border-red-500/20">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-500/10 text-gray-500 text-xs font-semibold border border-gray-500/20">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case "queued":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-xs font-semibold border border-blue-500/20">
            <Clock className="h-3 w-3" />
            Queued
          </span>
        );
      default:
        return null;
    }
  };

  const formatLastIndexed = (date?: Date) => {
    if (!date) return "—";
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground mt-1">
            PDFs, DOCX files, plain text, and curated FAQs indexed into your vector database
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Add Knowledge
        </Button>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-80 grid-cols-2 mb-6">
          <TabsTrigger value="documents" className="cursor-pointer">
            Documents
          </TabsTrigger>
          <TabsTrigger value="faqs" className="cursor-pointer">
            FAQ Directory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <Loader size="lg" />
                <p className="text-muted-foreground mt-4">Loading documents...</p>
              </div>
            </div>
          ) : documents.length > 0 ? (
            <KnowledgeTable
              knowledgeItems={documents}
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
              <h3 className="text-lg font-medium text-foreground">No documents yet</h3>
              <p className="text-muted-foreground mt-1">
                Upload PDFs, DOCX, or text files to build your knowledge base
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
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <Loader size="lg" />
                <p className="text-muted-foreground mt-4">Loading FAQs...</p>
              </div>
            </div>
          ) : faqs.length > 0 ? (
            <div className="border rounded-lg overflow-hidden bg-card">
              <div className="divide-y divide-border">
                {faqs.map((faq) => (
                  <div
                    key={faq._id}
                    onClick={() => handleViewItem(faq)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-emerald-500/20">
                          Q
                        </div>
                        <h4 className="font-semibold text-foreground text-base tracking-tight leading-tight">
                          {faq.title}
                        </h4>
                      </div>
                      <div className="flex items-start gap-2.5 pl-7">
                        <div className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {faq.content}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 pl-7 pt-1">
                        {faq.catalog && (
                          <span className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary font-medium border border-primary/20">
                            {faq.catalog}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Added {new Date(faq.createdAt).toLocaleDateString()}
                        </span>
                        {faq.lastIndexed && (
                          <span className="text-xs text-muted-foreground">
                            Indexed {formatLastIndexed(faq.lastIndexed)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-2 pl-7 md:pl-0 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="mr-2">{getStatusBadge(faq.status)}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewItem(faq)}
                        className="h-8 cursor-pointer"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {faq.status === "failed" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRetryItem(faq)}
                          className="h-8 text-yellow-600 hover:text-yellow-700 cursor-pointer"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Retry
                        </Button>
                      ) : faq.status === "indexed" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReindexItem(faq)}
                          className="h-8 cursor-pointer"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Re-index
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(faq)}
                        className="h-8 text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center border rounded-lg border-dashed">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <HelpCircle className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-lg font-medium text-foreground">No FAQs yet</h3>
              <p className="text-muted-foreground mt-1">
                Add curated Question & Answer pairs to intercept messages and reply instantly
              </p>
              <Button
                className="mt-4 cursor-pointer"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add FAQ Entry
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddKnowledgeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddKnowledge}
        isSubmitting={isSubmitting}
      />

      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent
          className={
            selectedItem?.source === "pdf" || selectedItem?.source === "faq"
              ? "sm:max-w-[1000px] max-h-[90vh] overflow-y-auto"
              : "sm:max-w-[700px]"
          }
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedItem?.source === "faq" ? "FAQ Details" : selectedItem?.title}
            </h2>
          </div>

          {selectedItem && selectedItem.source === "faq" ? (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left Column: Metadata & Organization */}
              <div className="w-full md:w-64 shrink-0 space-y-4">
                <div className="grid grid-cols-1 gap-3 p-4 bg-muted rounded-lg border border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
                      Source
                    </p>
                    <p className="text-sm font-bold text-emerald-500 uppercase tracking-tight flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4" /> FAQ
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
                      Status
                    </p>
                    <p className="text-sm font-medium">
                      {getStatusBadge(selectedItem.status)}
                    </p>
                  </div>
                  {selectedItem.catalog && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
                        Catalog
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedItem.catalog}
                      </p>
                    </div>
                  )}
                  {selectedItem.lastIndexed && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
                        Last Indexed
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(selectedItem.lastIndexed).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedItem.createdAt && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">
                        Created
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(selectedItem.createdAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {selectedItem.description && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      Description
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedItem.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Full Q&A Display */}
              <div className="flex-1 space-y-4">
                <div className="p-5 bg-muted/40 rounded-lg border border-border space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Question
                    </h4>
                    <p className="text-lg font-bold text-foreground leading-snug">
                      {selectedItem.title}
                    </p>
                  </div>
                  <hr className="border-border" />
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Curated Answer
                    </h4>
                    <div className="p-4 bg-card rounded-md border border-border shadow-sm min-h-[150px] max-h-[350px] overflow-y-auto">
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {selectedItem.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedItem && selectedItem.source === "pdf" ? (
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
                    <p className="text-sm font-medium text-foreground mb-1">
                      Description
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.description}
                    </p>
                  </div>
                )}

                {selectedItem.errorMessage && (
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <p className="text-sm font-medium text-red-500 mb-1">Error</p>
                    <p className="text-sm text-red-400">{selectedItem.errorMessage}</p>
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
                      <p className="text-sm text-muted-foreground">
                        Download link unavailable
                      </p>
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

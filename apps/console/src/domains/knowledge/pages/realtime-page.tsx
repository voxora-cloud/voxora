import { useMemo, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Loader } from "@/shared/ui/loader";
import { Plus, Radio } from "lucide-react";
import { LiveSourceTable } from "../components/live-source-table";
import { AddLiveSourceModal } from "../components/add-live-source-modal";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { LiveSource, AddLiveSourceFormData, SyncFrequency } from "../types";
import {
  useCreateLiveSource,
  useDeleteKnowledgeItem,
  useKnowledgeItems,
  useReindexKnowledgeItem,
  useUpdateKnowledgeItem,
} from "../hooks";
import { toast } from "sonner";

export function KnowledgeRealtimePage() {
  const { data: items = [], isLoading } = useKnowledgeItems();
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [selectedSource, setSelectedSource] = useState<LiveSource | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [sourceToDelete, setSourceToDelete] = useState<LiveSource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const createLiveSource = useCreateLiveSource();
  const deleteKnowledge = useDeleteKnowledgeItem();
  const reindexKnowledge = useReindexKnowledgeItem();
  const updateKnowledge = useUpdateKnowledgeItem();

  const mapStatus = (status: string): LiveSource["status"] => {
    if (status === "indexed") return "synced";
    if (status === "indexing") return "fetching";
    if (status === "failed") return "failed";
    return "pending";
  };

  const detectType = (url: string): LiveSource["type"] => {
    if (url.includes("/blog")) return "blog";
    if (url.includes("/docs")) return "docs";
    return "website";
  };

  const sources = useMemo(() => {
    const urlItems = items.filter((item) => item.source === "url");
    return urlItems.map((item) => ({
      _id: item._id,
      url: item.sourceUrl ?? item.title,
      type: detectType(item.sourceUrl ?? item.title),
      fetchMode: item.fetchMode ?? "single",
      crawlDepth: item.crawlDepth,
      syncFrequency: item.syncFrequency ?? "manual",
      status: mapStatus(item.status),
      isPaused: item.isPaused ?? false,
      lastFetch: item.lastIndexed ? new Date(item.lastIndexed) : undefined,
      errorMessage: item.errorMessage,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }));
  }, [items]);

  const handleAddSource = async (data: AddLiveSourceFormData) => {
    try {
      setIsSubmitting(true);
      await createLiveSource.mutateAsync(data);
      setShowAddModal(false);
      toast.success("Live source added successfully", {
        description: "The URL has been queued for ingestion.",
      });
    } catch (err) {
      console.error("Error adding source:", err);
      toast.error("Failed to add live source");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewSource = (source: LiveSource) => {
    setSelectedSource(source);
    setShowViewModal(true);
  };

  const handlePauseSource = async (source: LiveSource) => {
    try {
      await updateKnowledge.mutateAsync({
        documentId: source._id,
        payload: { isPaused: true },
      });
      toast.success("Live source paused", {
        description: "Syncing has been paused for this source.",
      });
    } catch (err) {
      console.error("Error pausing source:", err);
      toast.error("Failed to pause source");
    }
  };

  const handleResumeSource = async (source: LiveSource) => {
    try {
      await updateKnowledge.mutateAsync({
        documentId: source._id,
        payload: { isPaused: false },
      });
      await reindexKnowledge.mutateAsync(source._id);
      toast.success("Live source resumed", {
        description: "The source has been queued for re-sync.",
      });
    } catch (err) {
      console.error("Error resuming source:", err);
      toast.error("Failed to resume source");
    }
  };

  const handleRetrySource = async (source: LiveSource) => {
    try {
      await reindexKnowledge.mutateAsync(source._id);
    } catch (err) {
      console.error("Error retrying source:", err);
      toast.error("Failed to retry source");
    }
  };

  const handleUpdateSyncFrequency = async (
    source: LiveSource,
    freq: SyncFrequency,
  ) => {
    try {
      if (selectedSource?._id === source._id) {
        setSelectedSource((prev) => (prev ? { ...prev, syncFrequency: freq } : prev));
      }
      await updateKnowledge.mutateAsync({
        documentId: source._id,
        payload: { syncFrequency: freq },
      });
    } catch (err) {
      console.error("Error updating sync frequency:", err);
      toast.error("Failed to update sync schedule");
    }
  };

  const openDeleteDialog = (source: LiveSource) => {
    setSourceToDelete(source);
    setShowDeleteDialog(true);
  };

  const handleDeleteSource = async () => {
    if (!sourceToDelete) return;

    setIsDeleting(true);
    try {
      await deleteKnowledge.mutateAsync(sourceToDelete._id);
      setShowDeleteDialog(false);
      setSourceToDelete(null);
      toast.success("Live source deleted successfully");
    } catch (err) {
      console.error("Error deleting source:", err);
      toast.error("Failed to delete live source");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Realtime Knowledge</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-sync live URLs with your vector database
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Add Live Source
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader size="lg" />
            <p className="text-muted-foreground mt-4">Loading live sources...</p>
          </div>
        </div>
      ) : sources.length > 0 ? (
        <LiveSourceTable
          sources={sources}
          onViewSource={handleViewSource}
          onPauseSource={handlePauseSource}
          onResumeSource={handleResumeSource}
          onRetrySource={handleRetrySource}
          onDeleteSource={openDeleteDialog}
        />
      ) : (
        <div className="p-12 text-center border rounded-lg border-dashed">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Radio className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">No live sources yet</h3>
          <p className="text-muted-foreground mt-1">
            Add a URL to start auto-syncing content with your vector database
          </p>
          <Button className="mt-4 cursor-pointer" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Live Source
          </Button>
        </div>
      )}

      <AddLiveSourceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSource}
        isSubmitting={isSubmitting}
      />

      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-[700px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Source Details</h2>
          </div>

          {selectedSource && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">URL</p>
                  <a
                    href={selectedSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline break-all"
                  >
                    {selectedSource.url}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Type</p>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {selectedSource.type}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Fetch Mode</p>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {selectedSource.fetchMode}
                    {selectedSource.crawlDepth && ` (depth: ${selectedSource.crawlDepth})`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sync Frequency</p>
                  <Select
                    value={selectedSource.syncFrequency}
                    onValueChange={(val) =>
                      handleUpdateSyncFrequency(selectedSource, val as SyncFrequency)
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="1hour">Every 1 hour</SelectItem>
                      <SelectItem value="6hours">Every 6 hours</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {selectedSource.status}
                    {selectedSource.isPaused && " (Paused)"}
                  </p>
                </div>
                {selectedSource.lastFetch && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Last Fetch</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(selectedSource.lastFetch).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedSource.nextFetch && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Next Fetch</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(selectedSource.nextFetch).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedSource.changesSummary && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Changes</p>
                    <p className="text-sm font-medium text-foreground">
                      {selectedSource.changesSummary}
                    </p>
                  </div>
                )}
              </div>

              {selectedSource.errorMessage && (
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <p className="text-sm font-medium text-red-500 mb-1">Error Message</p>
                  <p className="text-sm text-red-400">{selectedSource.errorMessage}</p>
                </div>
              )}

              <div className="p-4 bg-blue-500/10 rounded-lg">
                <p className="text-sm text-blue-400">
                  💡 This source is automatically synced with your vector database. Content
                  changes are detected and updated automatically.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSourceToDelete(null);
        }}
        onConfirm={handleDeleteSource}
        title="Delete Live Source"
        itemName={sourceToDelete?.url}
        isDeleting={isDeleting}
      />
    </div>
  );
}

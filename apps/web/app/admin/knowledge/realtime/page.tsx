"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Plus, Radio, Eye, X } from "lucide-react";
import LiveSourceTable from "@/components/admin/knowledge/LiveSourceTable";
import AddLiveSourceModal from "@/components/admin/knowledge/AddLiveSourceModal";
import DeleteConfirmDialog from "@/components/admin/DeleteConfirmDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LiveSource, AddLiveSourceFormData } from "@/lib/interfaces/liveSource";

export default function RealtimePage() {
  const [sources, setSources] = useState<LiveSource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [selectedSource, setSelectedSource] = useState<LiveSource | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [sourceToDelete, setSourceToDelete] = useState<LiveSource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Mock data
      const mockData: LiveSource[] = [
        {
          _id: "1",
          url: "https://company.com/docs",
          type: "website",
          fetchMode: "crawl",
          crawlDepth: 2,
          syncFrequency: "6hours",
          status: "synced",
          lastFetch: new Date(Date.now() - 10 * 60 * 1000),
          changesSummary: "+2 sections",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: "2",
          url: "https://company.com/pricing",
          type: "page",
          fetchMode: "single",
          syncFrequency: "1hour",
          status: "fetching",
          lastFetch: new Date(Date.now() - 2 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: "3",
          url: "https://company.com/blog",
          type: "blog",
          fetchMode: "crawl",
          crawlDepth: 1,
          syncFrequency: "daily",
          status: "failed",
          errorMessage: "Failed to fetch content: Connection timeout",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      setSources(mockData);
    } catch (err) {
      console.error("Error fetching sources:", err);
      setError("Failed to load live sources");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = async (data: AddLiveSourceFormData) => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Adding live source:", data);

      // Detect type from URL
      let type: LiveSource["type"] = "website";
      if (data.url.includes("/blog")) type = "blog";
      else if (data.url.includes("/docs")) type = "docs";
      else if (data.fetchMode === "single") type = "page";

      const newSource: LiveSource = {
        _id: String(Date.now()),
        url: data.url,
        type,
        fetchMode: data.fetchMode,
        crawlDepth: data.crawlDepth,
        syncFrequency: data.syncFrequency,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setSources((prev) => [newSource, ...prev]);
      setShowAddModal(false);

      // Simulate auto-fetch
      setTimeout(() => {
        setSources((prev) =>
          prev.map((s) =>
            s._id === newSource._id ? { ...s, status: "fetching" as const } : s
          )
        );
      }, 500);
    } catch (err) {
      console.error("Error adding source:", err);
      setError("Failed to add live source");
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
      console.log("Pausing source:", source.url);
      setSources((prev) =>
        prev.map((s) => (s._id === source._id ? { ...s, isPaused: true } : s))
      );
    } catch (err) {
      console.error("Error pausing source:", err);
    }
  };

  const handleResumeSource = async (source: LiveSource) => {
    try {
      console.log("Resuming source:", source.url);
      setSources((prev) =>
        prev.map((s) =>
          s._id === source._id
            ? { ...s, isPaused: false, status: "fetching" as const }
            : s
        )
      );

      // Simulate fetch completion
      setTimeout(() => {
        setSources((prev) =>
          prev.map((s) =>
            s._id === source._id
              ? {
                  ...s,
                  status: "synced" as const,
                  lastFetch: new Date(),
                  changesSummary: "+1 section",
                }
              : s
          )
        );
      }, 2000);
    } catch (err) {
      console.error("Error resuming source:", err);
    }
  };

  const handleRetrySource = async (source: LiveSource) => {
    try {
      console.log("Retrying source:", source.url);
      setSources((prev) =>
        prev.map((s) =>
          s._id === source._id ? { ...s, status: "fetching" as const } : s
        )
      );

      setTimeout(() => {
        setSources((prev) =>
          prev.map((s) =>
            s._id === source._id
              ? {
                  ...s,
                  status: "synced" as const,
                  lastFetch: new Date(),
                  changesSummary: "Content synced",
                }
              : s
          )
        );
      }, 2000);
    } catch (err) {
      console.error("Error retrying source:", err);
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
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSources((prev) => prev.filter((s) => s._id !== sourceToDelete._id));
      setShowDeleteDialog(false);
      setSourceToDelete(null);
    } catch (err) {
      console.error("Error deleting source:", err);
      setError("Failed to delete live source");
    } finally {
      setIsDeleting(false);
    }
  };

  const getSyncFrequencyLabel = (freq: string) => {
    switch (freq) {
      case "manual":
        return "Manual";
      case "1hour":
        return "Every 1 hour";
      case "6hours":
        return "Every 6 hours";
      case "daily":
        return "Daily";
      default:
        return freq;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Realtime Knowledge
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auto-sync live URLs with your vector database
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Live Source
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
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
          <h3 className="text-lg font-medium text-foreground">
            No live sources yet
          </h3>
          <p className="text-muted-foreground mt-1">
            Add a URL to start auto-syncing content with your vector database
          </p>
          <Button
            className="mt-4 cursor-pointer"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Live Source
          </Button>
        </div>
      )}

      {/* Add Live Source Modal */}
      <AddLiveSourceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddSource}
        isSubmitting={isSubmitting}
      />

      {/* View Source Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-[700px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Source Details
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowViewModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
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
                  <p className="text-xs text-muted-foreground mb-1">
                    Fetch Mode
                  </p>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {selectedSource.fetchMode}
                    {selectedSource.crawlDepth &&
                      ` (depth: ${selectedSource.crawlDepth})`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Sync Frequency
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {getSyncFrequencyLabel(selectedSource.syncFrequency)}
                  </p>
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
                    <p className="text-xs text-muted-foreground mb-1">
                      Last Fetch
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(selectedSource.lastFetch).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedSource.nextFetch && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Next Fetch
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(selectedSource.nextFetch).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedSource.changesSummary && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Changes
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {selectedSource.changesSummary}
                    </p>
                  </div>
                )}
              </div>

              {selectedSource.errorMessage && (
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <p className="text-sm font-medium text-red-500 mb-1">
                    Error Message
                  </p>
                  <p className="text-sm text-red-400">
                    {selectedSource.errorMessage}
                  </p>
                </div>
              )}

              <div className="p-4 bg-blue-500/10 rounded-lg">
                <p className="text-sm text-blue-400">
                  💡 This source is automatically synced with your vector
                  database. Content changes are detected and updated
                  automatically.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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

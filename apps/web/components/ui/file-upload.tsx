"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { X, Upload } from "lucide-react";
import { apiService } from "@/lib/api";

export interface FileUploadProps {
  /**
   * Accepted file types (e.g., "image/*", "application/pdf", ".png,.jpg")
   */
  accept?: string;
  
  /**
   * Maximum file size in bytes (default: 2MB)
   */
  maxSize?: number;
  
  /**
   * Custom validation function
   */
  validate?: (file: File) => string | null;
  
  /**
   * Callback when upload is successful
   */
  onUploadSuccess?: (data: {
    fileKey: string;
    downloadUrl: string;
    fileName: string;
  }) => void;
  
  /**
   * Callback when upload fails
   */
  onUploadError?: (error: string) => void;
  
  /**
   * Callback when file is removed
   */
  onRemove?: () => void;
  
  /**
   * Initial preview URL (for editing existing files)
   */
  initialPreview?: string;
  
  /**
   * Initial file name (for editing existing files)
   */
  initialFileName?: string;
  
  /**
   * Show preview of uploaded file
   */
  showPreview?: boolean;
  
  /**
   * Custom button text
   */
  buttonText?: string;
  
  /**
   * Button variant
   */
  buttonVariant?: "default" | "outline" | "ghost" | "secondary";
  
  /**
   * Custom className for the container
   */
  className?: string;
  
  /**
   * Presigned URL expiry time in seconds (default: 1 year for permanent files)
   */
  downloadUrlExpiry?: number;
  
  /**
   * Disable the upload button
   */
  disabled?: boolean;
  
  /**
   * Helper text shown below the button
   */
  helperText?: string;
}

export interface UploadedFile {
  fileKey: string;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
}

export function FileUpload({
  accept = "*/*",
  maxSize = 2 * 1024 * 1024, // 2MB default
  validate,
  onUploadSuccess,
  onUploadError,
  onRemove,
  initialPreview,
  initialFileName,
  showPreview = true,
  buttonText = "Choose File",
  buttonVariant = "outline",
  className = "",
  downloadUrlExpiry = 900, // 15 minutes
  disabled = false,
  helperText,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(initialPreview || "");
  const [uploadedFileKey, setUploadedFileKey] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle file selection and upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file size
    if (file.size > maxSize) {
      const errorMsg = `File size must be less than ${formatFileSize(maxSize)}`;
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    // Custom validation
    if (validate) {
      const validationError = validate(file);
      if (validationError) {
        setError(validationError);
        onUploadError?.(validationError);
        return;
      }
    }

    setSelectedFile(file);
    setIsUploading(true);

    try {
      // Generate presigned URL for upload
      const presignedResponse = await apiService.generatePresignedUploadUrl(
        file.name,
        file.type,
        3600 // 1 hour expiry for upload URL
      );

      if (!presignedResponse.data) {
        throw new Error("Failed to generate upload URL");
      }

      const { uploadUrl, fileKey } = presignedResponse.data;

      // Upload file directly to MinIO using presigned URL
      await apiService.uploadFileWithPresignedUrl(uploadUrl, file);

      // Generate download URL for the uploaded file
      const downloadResponse = await apiService.generatePresignedDownloadUrl(
        fileKey,
        downloadUrlExpiry
      );

      if (!downloadResponse.data) {
        throw new Error("Failed to generate download URL");
      }

      const { downloadUrl } = downloadResponse.data;

      // Set state
      setUploadedFileKey(fileKey);
      setPreviewUrl(downloadUrl);
      setError(null);

      // Callback
      onUploadSuccess?.({
        fileKey,
        downloadUrl,
        fileName: file.name,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Failed to upload file";
      setError(errorMsg);
      onUploadError?.(errorMsg);
      setSelectedFile(null);
      setPreviewUrl("");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle file removal
  const handleRemove = async () => {
    // Delete the file from MinIO if it exists
    if (uploadedFileKey) {
      try {
        await apiService.deleteStorageFile(uploadedFileKey);
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    }

    setSelectedFile(null);
    setPreviewUrl("");
    setUploadedFileKey("");
    setError(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    onRemove?.();
  };

  // Check if file is an image
  const isImage = (fileName: string): boolean => {
    return /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(fileName);
  };

  const displayFileName = selectedFile?.name || initialFileName || "";
  const displayFileSize = selectedFile?.size || 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="hidden"
          id="file-upload-input"
        />
        <Button
          type="button"
          variant={buttonVariant}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="w-full h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm cursor-pointer transition-all"
        >
          {isUploading ? (
            <>
              <Loader size="sm" className="mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {displayFileName || buttonText}
            </>
          )}
        </Button>
        
        {/* Helper Text */}
        {helperText && (
          <p className="text-xs text-muted-foreground mt-2">{helperText}</p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Preview */}
      {showPreview && previewUrl && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Preview Image or File Icon */}
            <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
              {isImage(displayFileName) ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.parentElement?.classList.add(
                      'after:content-["📄"]',
                      "after:text-2xl"
                    );
                  }}
                />
              ) : (
                <span className="text-2xl">📄</span>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {displayFileName || "File Preview"}
              </div>
              <div className="text-xs text-muted-foreground">
                {displayFileSize > 0
                  ? formatFileSize(displayFileSize)
                  : "Uploaded"}
              </div>
            </div>

            {/* Remove Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={isUploading}
              className="cursor-pointer hover:bg-white/10 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Export hook for programmatic access
export function useFileUpload() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (
    file: File,
    downloadUrlExpiry: number = 31536000
  ): Promise<UploadedFile | null> => {
    setIsUploading(true);
    setError(null);

    try {
      // Generate presigned URL for upload
      const presignedResponse = await apiService.generatePresignedUploadUrl(
        file.name,
        file.type,
        3600
      );

      if (!presignedResponse.data) {
        throw new Error("Failed to generate upload URL");
      }

      const { uploadUrl, fileKey } = presignedResponse.data;

      // Upload file
      await apiService.uploadFileWithPresignedUrl(uploadUrl, file);

      // Generate download URL
      const downloadResponse = await apiService.generatePresignedDownloadUrl(
        fileKey,
        downloadUrlExpiry
      );

      if (!downloadResponse.data) {
        throw new Error("Failed to generate download URL");
      }

      const { downloadUrl } = downloadResponse.data;

      const result: UploadedFile = {
        fileKey,
        downloadUrl,
        fileName: file.name,
        fileSize: file.size,
      };

      setUploadedFile(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setError(errorMsg);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (fileKey: string): Promise<boolean> => {
    try {
      await apiService.deleteStorageFile(fileKey);
      setUploadedFile(null);
      return true;
    } catch (err) {
      console.error("Error deleting file:", err);
      return false;
    }
  };

  const reset = () => {
    setUploadedFile(null);
    setError(null);
    setIsUploading(false);
  };

  return {
    uploadedFile,
    isUploading,
    error,
    uploadFile,
    deleteFile,
    reset,
  };
}

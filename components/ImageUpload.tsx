"use client";

import { toast } from "sonner";
import config from "@/lib/config";
import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import {
  ImageKitProvider,
  upload,
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitServerError,
  ImageKitUploadNetworkError,
} from "@imagekit/next";
import { Button } from "@/components/ui/button";
import { Upload, X, Check, Eye, EyeOff } from "lucide-react";

const {
  env: {
    imagekit: { urlEndpoint, publicKey },
  },
} = config;

const authenticator = async () => {
  try {
    const baseUrl = config.env.apiEndpoint.replace(/\/api$/, '');
    const authUrl = `${baseUrl}/api/auth/imagekit`;
    
    const res = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      let errorText;
      try {
        const errorData = await res.json();
        errorText = errorData.error || errorData.details || JSON.stringify(errorData);
      } catch {
        errorText = await res.text();
      }
      throw new Error(`Auth failed (status ${res.status}): ${errorText}`);
    }
    
    const authData = await res.json();
    
    if (!authData.signature || !authData.expire || !authData.token) {
      throw new Error("Invalid authentication response from server");
    }
    
    return authData;
  } catch (error) {
    console.error("Authentication error:", error);
    
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      throw new Error(`Cannot connect to authentication server. Please check if the server is running.`);
    }
    
    throw error;
  }
};

export interface ImageUploadRef {
  uploadFile: () => Promise<string>;
  hasFile: () => boolean;
  reset: () => void;
}

interface ImageUploadProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
}

const ImageUpload = forwardRef<ImageUploadRef, ImageUploadProps>(({ 
  value, 
  onChange, 
  onBlur, 
  disabled 
}, ref) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(value || null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update internal state when value prop changes
  useEffect(() => {
    setUploadedUrl(value || null);
  }, [value]);

  const handleUpload = async (file: File): Promise<string> => {
    try {
      setIsUploading(true);
      
      const { signature, expire, token } = await authenticator();
      
      const result = await upload({
        file,
        fileName: file.name,
        signature,
        expire,
        token,
        publicKey,
      });
      
      if (!result.url) {
        throw new Error("Upload completed but no URL returned");
      }
      
      setUploadedUrl(result.url);
      
      // Update the form field value
      if (onChange) {
        onChange(result.url);
      }
      
      toast.success("University ID uploaded successfully!");
      return result.url;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      toast.error(`Upload failed: ${errorMessage}`);
      throw new Error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    uploadFile: async (): Promise<string> => {
      if (!selectedFile) {
        throw new Error("No file selected");
      }
      return await handleUpload(selectedFile);
    },
    hasFile: () => !!selectedFile || !!uploadedUrl,
    reset: () => {
      setSelectedFile(null);
      setUploadedUrl(null);
      setPreviewUrl(null);
      setShowPreview(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (onChange) {
        onChange('');
      }
    }
  }));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select a valid image file");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      
      setSelectedFile(file);
      setUploadedUrl(null);
      
      // Create preview URL for the selected file
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      
      // Auto-upload when file is selected
      try {
        await handleUpload(file);
      } catch (error) {
        // Error is already handled in handleUpload
        console.error("Auto-upload failed:", error);
      }
      
      // Cleanup previous preview URL
      return () => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      };
    }
  };

  const handleButtonClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadedUrl(null);
    setShowPreview(false);
    
    // Cleanup preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Update form field
    if (onChange) {
      onChange('');
    }
    
    toast.success("File removed successfully");
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  const getButtonContent = () => {
    if (isUploading) {
      return (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Uploading...
        </>
      );
    }
    
    if (uploadedUrl) {
      return (
        <>
          <Check className="w-4 h-4" />
          University ID Uploaded
        </>
      );
    }
    
    if (selectedFile) {
      return (
        <>
          <Upload className="w-4 h-4" />
          {selectedFile.name}
        </>
      );
    }
    
    return (
      <>
        <Upload className="w-4 h-4" />
        Select University ID
      </>
    );
  };

  const displayImageUrl = uploadedUrl || previewUrl;

  return (
    <ImageKitProvider urlEndpoint={urlEndpoint}>
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          onBlur={onBlur}
          className="hidden"
          disabled={disabled || isUploading}
        />
        
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={uploadedUrl ? "default" : "outline"}
            onClick={handleButtonClick}
            disabled={disabled || isUploading}
            className={`flex-1 justify-start gap-2 ${
              uploadedUrl 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "form-input hover:bg-gray-50"
            }`}
          >
            {getButtonContent()}
          </Button>
          
          {/* Preview toggle button */}
          {displayImageUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={togglePreview}
              disabled={disabled || isUploading}
              className="px-2"
              title={showPreview ? "Hide preview" : "Show preview"}
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          )}
          
          {(selectedFile || uploadedUrl) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemoveFile}
              disabled={disabled || isUploading}
              className="px-2"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {selectedFile && !uploadedUrl && (
          <p className="text-sm text-gray-600">
            Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
          </p>
        )}
        
        {/* Image Preview */}
        {showPreview && displayImageUrl && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">
                {uploadedUrl ? "Uploaded Image" : "Preview"}
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={togglePreview}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="relative max-w-sm mx-auto">
              <img
                src={displayImageUrl}
                alt="University ID preview"
                className="w-full h-auto rounded-md border shadow-sm max-h-64 object-contain"
                onError={(e) => {
                  console.error("Image failed to load:", e);
                  toast.error("Failed to load image preview");
                }}
              />
              {uploadedUrl && (
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Uploaded
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ImageKitProvider>
  );
});

ImageUpload.displayName = "ImageUpload";

export default ImageUpload;
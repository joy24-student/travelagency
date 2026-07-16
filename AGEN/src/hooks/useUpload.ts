/**
 * useImageUpload Hook
 * Manages image upload with progress tracking
 */

import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { uploadImageToR2, R2UploadConfig } from "../services/r2UploadService";

interface UseImageUploadOptions extends R2UploadConfig {
  onSuccess?: (url: string, key: string) => void;
  onError?: (error: string) => void;
}

export function useImageUpload(options: UseImageUploadOptions) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadImage({
          uri: asset.uri,
          name: asset.uri.split("/").pop() || "image.jpg",
          type: asset.type ? `image/${asset.type}` : "image/jpeg",
        });
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to pick image";
      setError(errorMsg);
      options.onError?.(errorMsg);
    }
  }, [options]);

  const uploadImage = useCallback(
    async (file: { uri: string; name: string; type: string }) => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

        const response = await uploadImageToR2(file, {
          entityType: options.entityType,
          entityId: options.entityId,
          onProgress: setProgress,
        });

        if (response.success && response.url) {
          setUrl(response.url);
          options.onSuccess?.(response.url, response.key);
        } else {
          const errorMsg = response.error || "Upload failed";
          setError(errorMsg);
          options.onError?.(errorMsg);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Upload error";
        setError(errorMsg);
        options.onError?.(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [options],
  );

  return {
    pickImage,
    uploadImage,
    loading,
    progress,
    error,
    url,
  };
}

/**
 * useVideoUpload Hook
 * Manages video upload with progress tracking
 */

import { uploadVideoToR2 } from "../services/r2UploadService";

interface UseVideoUploadOptions extends R2UploadConfig {
  onSuccess?: (url: string, key: string) => void;
  onError?: (error: string) => void;
  quality?: "low" | "medium" | "high";
}

export function useVideoUpload(options: UseVideoUploadOptions) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const pickVideo = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality:
          options.quality === "high"
            ? 1
            : options.quality === "medium"
              ? 0.7
              : 0.4,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadVideo({
          uri: asset.uri,
          name: asset.uri.split("/").pop() || "video.mp4",
          type: "video/mp4",
        });
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to pick video";
      setError(errorMsg);
      options.onError?.(errorMsg);
    }
  }, [options]);

  const takeVideo = useCallback(async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality:
          options.quality === "high"
            ? 1
            : options.quality === "medium"
              ? 0.7
              : 0.4,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadVideo({
          uri: asset.uri,
          name: `video_${Date.now()}.mp4`,
          type: "video/mp4",
        });
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to record video";
      setError(errorMsg);
      options.onError?.(errorMsg);
    }
  }, [options]);

  const uploadVideo = useCallback(
    async (file: { uri: string; name: string; type: string }) => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

        const response = await uploadVideoToR2(file, {
          entityType: options.entityType,
          entityId: options.entityId,
          onProgress: setProgress,
        });

        if (response.success && response.url) {
          setUrl(response.url);
          options.onSuccess?.(response.url, response.key);
        } else {
          const errorMsg = response.error || "Upload failed";
          setError(errorMsg);
          options.onError?.(errorMsg);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Upload error";
        setError(errorMsg);
        options.onError?.(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [options],
  );

  return {
    pickVideo,
    takeVideo,
    uploadVideo,
    loading,
    progress,
    error,
    url,
  };
}

/**
 * useFileUpload Hook
 * Generic file upload with progress tracking
 */

export function useFileUpload(options: UseImageUploadOptions) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: { uri: string; name: string; type: string }) => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);

        // Choose handler based on file type
        if (file.type.startsWith("image/")) {
          const response = await uploadImageToR2(file, {
            entityType: options.entityType,
            entityId: options.entityId,
            onProgress: setProgress,
          });

          if (response.success && response.url) {
            setUrl(response.url);
            options.onSuccess?.(response.url, response.key);
          } else {
            const errorMsg = response.error || "Upload failed";
            setError(errorMsg);
            options.onError?.(errorMsg);
          }
        } else if (file.type.startsWith("video/")) {
          const response = await uploadVideoToR2(file, {
            entityType: options.entityType,
            entityId: options.entityId,
            onProgress: setProgress,
          });

          if (response.success && response.url) {
            setUrl(response.url);
            options.onSuccess?.(response.url, response.key);
          } else {
            const errorMsg = response.error || "Upload failed";
            setError(errorMsg);
            options.onError?.(errorMsg);
          }
        } else {
          throw new Error("Unsupported file type");
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Upload error";
        setError(errorMsg);
        options.onError?.(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [options],
  );

  const pickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadFile({
          uri: asset.uri,
          name: asset.name || `document_${Date.now()}`,
          type: asset.mimeType || "application/octet-stream",
        });
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to pick file";
      setError(errorMsg);
      options.onError?.(errorMsg);
    }
  }, [options, uploadFile]);

  return {
    pickFile,
    uploadFile,
    loading,
    progress,
    error,
    url,
  };
}

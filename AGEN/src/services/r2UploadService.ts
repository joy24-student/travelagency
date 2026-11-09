/**
 * Cloudflare R2 Upload Service
 * Handles image and video uploads with progress tracking
 */

import { supabase } from "./supabaseClient";

export interface R2UploadConfig {
  entityType: "agency" | "document" | "post" | "profile" | "story";
  entityId: string;
  onProgress?: (progress: number) => void;
}

export interface UploadResponse {
  success: boolean;
  key: string;
  url: string;
  message?: string;
  error?: string;
}

// API base URL - update this to your backend
const R2_API_BASE =
  process.env.EXPO_PUBLIC_R2_API_BASE || "https://your-backend.com";

/**
 * Generate pre-signed URL for uploading to R2
 * This keeps R2 credentials secure on the server
 */
export async function getPresignedUrl(
  fileName: string,
  mimeType: string,
  size: number,
  config: R2UploadConfig,
): Promise<{
  presignedUrl: string;
  key: string;
  url: string;
  expiresIn: number;
}> {
  try {
    // Get auth token from Supabase
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${R2_API_BASE}/api/r2/presigned-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        fileName,
        mimeType,
        size,
        entityType: config.entityType,
        entityId: config.entityId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to generate presigned URL");
    }

    return response.json();
  } catch (error) {
    console.error("Error getting presigned URL:", error);
    throw error;
  }
}

/**
 * Upload file to R2 using pre-signed URL
 */
export async function uploadToR2(
  presignedUrl: string,
  file: {
    uri: string;
    name: string;
    type: string;
  },
  onProgress?: (progress: number) => void,
): Promise<void> {
  try {
    // For React Native, we need to handle file upload differently
    // Using XMLHttpRequest for progress tracking

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress?.(progress);
        }
      });

      // Handle completion
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Handle error
      xhr.addEventListener("error", () => {
        reject(new Error("Upload error"));
      });

      // Handle abort
      xhr.addEventListener("abort", () => {
        reject(new Error("Upload aborted"));
      });

      // Setup request
      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", file.type);

      // Read and upload file
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as ArrayBuffer | string;
        xhr.send(data);
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      // For React Native with Expo, use different approach
      if (typeof fetch !== "undefined") {
        uploadFileWithFetch(presignedUrl, file, onProgress)
          .then(resolve)
          .catch(reject);
      }
    });
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw error;
  }
}

/**
 * Alternative upload using fetch (for Expo)
 */
async function uploadFileWithFetch(
  presignedUrl: string,
  file: {
    uri: string;
    name: string;
    type: string;
  },
  onProgress?: (progress: number) => void,
): Promise<void> {
  try {
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        onProgress?.(Math.round(percentComplete));
      }
    });

    return new Promise((resolve, reject) => {
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Upload error")));

      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", file.type);

      // Send file blob
      const uri = file.uri;
      if (uri.startsWith("file://")) {
        // Handle file:// URI (local file)
        fetch(uri)
          .then((res) => res.blob())
          .then((blob) => {
            xhr.send(blob);
          })
          .catch(reject);
      } else if (uri.startsWith("data:")) {
        // Handle data URI
        const arr = uri.split(",");
        const mime = arr[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
        const str = atob(arr[1]);
        const n = str.length;
        const u8arr = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          u8arr[i] = str.charCodeAt(i);
        }
        xhr.send(u8arr);
      } else {
        // Handle http/https URI
        fetch(uri)
          .then((res) => res.blob())
          .then((blob) => {
            xhr.send(blob);
          })
          .catch(reject);
      }
    });
  } catch (error) {
    console.error("Error uploading with fetch:", error);
    throw error;
  }
}

/**
 * Delete file from R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${R2_API_BASE}/api/r2/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ key }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete file");
    }
  } catch (error) {
    console.error("Error deleting from R2:", error);
    throw error;
  }
}

/**
 * Complete upload process: get presigned URL, upload file, and save metadata to Supabase
 */
export async function uploadImageToR2(
  file: { uri: string; name: string; type: string },
  config: R2UploadConfig,
): Promise<UploadResponse> {
  try {
    // Validate image
    if (!file.type.startsWith("image/")) {
      throw new Error("Invalid image type");
    }

    // Get file size
    const size = await getFileSize(file.uri);
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

    if (size > MAX_IMAGE_SIZE) {
      throw new Error(
        `Image too large (max 10MB, got ${(size / 1024 / 1024).toFixed(2)}MB)`,
      );
    }

    // Step 1: Get presigned URL
    const { presignedUrl, key, url, expiresIn } = await getPresignedUrl(
      file.name,
      file.type,
      size,
      config,
    );

    console.log("Got presigned URL, starting upload...");

    // Step 2: Upload to R2
    await uploadToR2(presignedUrl, file, (progress) => {
      console.log(`Upload progress: ${progress}%`);
    });

    console.log("File uploaded to R2, key:", key);

    // Step 3: Save metadata to Supabase
    await saveFileMetadata(key, url, config);

    return {
      success: true,
      key,
      url,
      message: "Image uploaded successfully",
    };
  } catch (error) {
    console.error("Error uploading image:", error);
    return {
      success: false,
      key: "",
      url: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Upload video to R2
 */
export async function uploadVideoToR2(
  file: { uri: string; name: string; type: string },
  config: R2UploadConfig,
): Promise<UploadResponse> {
  try {
    // Validate video
    if (!file.type.startsWith("video/")) {
      throw new Error("Invalid video type");
    }

    // Get file size
    const size = await getFileSize(file.uri);
    const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

    if (size > MAX_VIDEO_SIZE) {
      throw new Error(
        `Video too large (max 500MB, got ${(size / 1024 / 1024).toFixed(2)}MB)`,
      );
    }

    // Step 1: Get presigned URL
    const { presignedUrl, key, url } = await getPresignedUrl(
      file.name,
      file.type,
      size,
      config,
    );

    console.log("Got presigned URL, starting video upload...");

    // Step 2: Upload to R2
    await uploadToR2(presignedUrl, file, (progress) => {
      console.log(`Video upload progress: ${progress}%`);
    });

    console.log("Video uploaded to R2, key:", key);

    // Step 3: Save metadata to Supabase
    await saveFileMetadata(key, url, config);

    return {
      success: true,
      key,
      url,
      message: "Video uploaded successfully",
    };
  } catch (error) {
    console.error("Error uploading video:", error);
    return {
      success: false,
      key: "",
      url: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get file size from URI
 */
async function getFileSize(uri: string): Promise<number> {
  try {
    if (uri.startsWith("file://")) {
      // Local file
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob.size;
    } else if (uri.startsWith("data:")) {
      // Data URI
      const arr = uri.split(",");
      const str = atob(arr[1]);
      return str.length;
    } else {
      // Remote URL
      const response = await fetch(uri, { method: "HEAD" });
      const contentLength = response.headers.get("content-length");
      return contentLength ? parseInt(contentLength, 10) : 0;
    }
  } catch (error) {
    console.error("Error getting file size:", error);
    return 0;
  }
}

/**
 * Save file metadata to Supabase
 */
async function saveFileMetadata(
  key: string,
  url: string,
  config: R2UploadConfig,
): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();

    // Insert into files table
    const { error } = await supabase.from("files").insert({
      user_id: userData.user?.id,
      r2_key: key,
      r2_url: url,
      entity_type: config.entityType,
      entity_id: config.entityId,
      file_type: key.split("/")[0], // 'images' or 'videos'
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.warn("Failed to save file metadata:", error.message);
      // Don't throw - file is already uploaded, metadata is optional
    }
  } catch (error) {
    console.warn("Error saving file metadata:", error);
    // Don't throw - file is already uploaded
  }
}

/**
 * Get agency logo URL
 */
export async function getAgencyLogoUrl(
  agencyId: string,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("files")
      .select("r2_url")
      .eq("entity_type", "agency")
      .eq("entity_id", agencyId)
      .eq("file_type", "images")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return data?.r2_url || null;
  } catch (error) {
    console.warn("Error getting agency logo:", error);
    return null;
  }
}

/**
 * Get verification documents
 */
export async function getVerificationDocuments(
  agencyId: string,
): Promise<any[]> {
  try {
    const { data } = await supabase
      .from("files")
      .select("*")
      .eq("entity_type", "document")
      .eq("entity_id", agencyId)
      .order("created_at", { ascending: false });

    return data || [];
  } catch (error) {
    console.warn("Error getting verification documents:", error);
    return [];
  }
}

/**
 * Delete file and its metadata
 */
export async function deleteFileFromR2(
  key: string,
  entityId: string,
): Promise<void> {
  try {
    // Delete from R2
    await deleteFromR2(key);

    // Delete metadata from Supabase
    await supabase
      .from("files")
      .delete()
      .eq("r2_key", key)
      .eq("entity_id", entityId);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}


// ============================================================================
// AGENCY KYC DOCUMENT VERIFICATION UPLOAD APIS
// ============================================================================

export interface KycPresignResult {
  upload_url: string;
  key: string;
  expires_in: number;
  mime_type: string;
  size_bytes: number;
}

export interface KycSubmitDocItem {
  doc_type: "trade_licence" | "tin" | "owner_id" | "address_proof";
  r2_key: string;
  mime: string;
  size_bytes: number;
  sha256: string;
  expires_on?: string | null;
}

/**
 * Request ephemeral presigned PUT upload URL with 5-minute expiry for KYC documents
 */
export async function getKycPresignedUrl(
  fileName: string,
  mimeType: string,
  sizeBytes: number,
  docType: "trade_licence" | "tin" | "owner_id" | "address_proof"
): Promise<KycPresignResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Authentication required");

  const response = await fetch(`${R2_API_BASE}/api/v1/kyc/documents/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      doc_type: docType,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
    }),
  });

  const resJson = await response.json();
  if (!response.ok) {
    throw new Error(resJson.detail || resJson.message || "Failed to generate KYC upload URL");
  }
  return resJson.data || resJson;
}

/**
 * Upload raw file bytes directly to R2 using the ephemeral presigned PUT URL
 */
export async function uploadKycBinaryToR2(
  presignedUrl: string,
  fileUri: string,
  mimeType: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", mimeType);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`R2 PUT upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during R2 binary upload"));

    // Fetch local file as blob for React Native
    fetch(fileUri)
      .then((res) => res.blob())
      .then((blob) => xhr.send(blob))
      .catch((err) => reject(err));
  });
}

/**
 * Submit complete KYC application to backend
 */
export async function submitKycApplication(documents: KycSubmitDocItem[]): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Authentication required");

  const response = await fetch(`${R2_API_BASE}/api/v1/kyc/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ documents }),
  });

  const resJson = await response.json();
  if (!response.ok) {
    throw new Error(resJson.detail || resJson.message || "Failed to submit KYC application");
  }
  return resJson.data || resJson;
}

/**
 * Fetch current agency KYC status, documents, checks and decision notes
 */
export async function fetchMyKycSubmission(): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Authentication required");

  const response = await fetch(`${R2_API_BASE}/api/v1/kyc/my-submission`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const resJson = await response.json();
  if (!response.ok) {
    throw new Error(resJson.detail || resJson.message || "Failed to fetch KYC submission");
  }
  return resJson.data || resJson;
}

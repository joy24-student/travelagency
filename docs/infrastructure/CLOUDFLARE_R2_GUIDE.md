# Cloudflare R2 Integration Guide

## 🚀 Overview

This guide covers the complete Cloudflare R2 integration for file uploads (images, videos) with Supabase URL storage and reusable upload hooks.

### Components Created

1. **R2 Service** (`src/services/r2.ts`) - File upload/delete operations
2. **File Repository** (`src/repositories/fileRepository.ts`) - Database operations
3. **Upload Hooks** - Reusable React hooks for file uploads
   - `useImageUpload.ts` - Image uploads
   - `useVideoUpload.ts` - Video uploads
   - `useFileUpload.ts` - Generic file uploads
   - `useFileDelete.ts` - File deletion
4. **SQL Migration** - Supabase files table with RLS policies

---

## 📋 Prerequisites

### 1. Cloudflare Account

- Create account at [cloudflare.com](https://cloudflare.com)
- Set up Cloudflare R2 bucket
- Get credentials:
  - Account ID
  - Access Key ID
  - Secret Access Key
  - Bucket name

### 2. Backend API (For Security)

- Create pre-signed URL endpoint
- Implement CORS headers
- Secure credential handling

---

## ⚙️ Configuration

### 1. Environment Variables

Update `.env.local`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your_publishable_key

# Cloudflare R2 Configuration
EXPO_PUBLIC_R2_ACCOUNT_ID=your_account_id
EXPO_PUBLIC_R2_ACCESS_KEY=your_access_key_id
EXPO_PUBLIC_R2_SECRET_KEY=your_secret_access_key
EXPO_PUBLIC_R2_BUCKET_NAME=travel-app
EXPO_PUBLIC_R2_CUSTOM_DOMAIN=cdn.travel-app.com
```

### 2. Supabase Migration

Run the migration to create the files table:

```bash
supabase migration up
```

Or execute the SQL manually in Supabase console:

```sql
-- See supabase/migrations/20260603_create_files_table.sql
```

---

## 🎯 Usage Examples

### Upload Image

```typescript
import { useImageUpload } from '../hooks/useImageUpload';
import * as ImagePicker from 'expo-image-picker';

export function PhotoUploadScreen() {
  const { upload, loading, progress, error, url } = useImageUpload({
    entityType: 'hotel',
    entityId: 'hotel-123',
    altText: 'Hotel exterior',
    isPublic: true,
    onProgress: (p) => console.log(`${p}% uploaded`),
    onSuccess: (metadata) => console.log('Uploaded:', metadata.url),
    onError: (error) => console.error(error),
  });

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.cancelled) {
      const file = result.assets[0];
      await upload({
        uri: file.uri,
        name: file.fileName || 'image.jpg',
        type: file.type,
      });
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={handlePickImage} disabled={loading}>
        <Text>{loading ? `Uploading: ${progress}%` : 'Pick Image'}</Text>
      </TouchableOpacity>
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      {url && <Image source={{ uri: url }} style={{ width: 200, height: 200 }} />}
    </View>
  );
}
```

### Upload Video

```typescript
import { useVideoUpload } from '../hooks/useVideoUpload';
import * as DocumentPicker from 'expo-document-picker';

export function VideoUploadScreen() {
  const { upload, loading, progress, error } = useVideoUpload({
    entityType: 'post',
    entityId: 'post-456',
    description: 'Travel vlog',
    onSuccess: (metadata) => console.log('Video uploaded:', metadata.url),
  });

  const handlePickVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
    });

    if (result.type === 'success') {
      await upload({
        uri: result.uri,
        name: result.name,
        type: result.mimeType,
      });
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={handlePickVideo} disabled={loading}>
        <Text>{loading ? `Uploading: ${progress}%` : 'Pick Video'}</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Generic File Upload

```typescript
import { useFileUpload } from "../hooks/useFileUpload";

export function GenericUploadScreen() {
  const imageUpload = useFileUpload({
    fileType: "image",
    entityType: "review",
  });

  const videoUpload = useFileUpload({
    fileType: "video",
  });

  // Use imageUpload.upload() or videoUpload.upload()
}
```

### Delete File

```typescript
import { useFileDelete } from '../hooks/useFileDelete';

export function DeleteFileExample() {
  const { deleteByKey, deleteMultiple, loading, error } = useFileDelete({
    onSuccess: () => console.log('File deleted'),
    onError: (error) => console.error(error),
  });

  // Delete single file
  const handleDelete = async (key: string) => {
    await deleteByKey(key);
  };

  // Delete multiple files
  const handleDeleteMultiple = async (keys: string[]) => {
    const result = await deleteMultiple(keys);
    console.log(`Deleted ${result.successCount}/${result.total} files`);
  };

  return (
    <View>
      {loading && <Text>Deleting...</Text>}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
```

### Retrieve Files by Entity

```typescript
import { useEffect, useState } from 'react';
import { getEntityFiles } from '../repositories/fileRepository';

export function HotelPhotosScreen({ hotelId }: { hotelId: string }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const files = await getEntityFiles('hotel', hotelId);
        setPhotos(files);
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, [hotelId]);

  return (
    <ScrollView>
      {photos.map((file) => (
        <Image
          key={file.id}
          source={{ uri: file.url }}
          style={{ width: '100%', height: 200 }}
        />
      ))}
    </ScrollView>
  );
}
```

### User Profile Picture Upload

```typescript
import { useImageUpload } from "../hooks/useImageUpload";
import { updateFileMetadata } from "../repositories/fileRepository";

export function ProfilePictureUpload({ userId }: { userId: string }) {
  const { upload, loading } = useImageUpload({
    entityType: "user_profile",
    entityId: userId,
    altText: "Profile picture",
    isPublic: true,
    onSuccess: async (metadata) => {
      // Update user profile with new picture URL
      // This depends on your user table structure
      console.log("Profile picture updated:", metadata.url);
    },
  });

  // Implementation...
}
```

---

## 🏗️ Architecture

### File Upload Flow

```
┌─────────────────────────┐
│   React Component       │
│   (useImageUpload)      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   R2 Service            │
│   (uploadImage)         │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Cloudflare R2         │
│   (File Storage)        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   File Repository       │
│   (saveFileMetadata)    │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Supabase Database     │
│   (files table)         │
└─────────────────────────┘
```

### Data Storage

```
Supabase (files table)
├── File Metadata
│   ├── id: UUID
│   ├── url: string (R2 public URL)
│   ├── key: string (R2 key: "images/timestamp-uuid.jpg")
│   ├── fileName: string
│   ├── fileType: "image" | "video" | "document"
│   ├── mimeType: string
│   ├── size: number
│   ├── altText: string (optional)
│   └── description: string (optional)
│
├── Entity Link (for grouping)
│   ├── entityType: string ("hotel", "post", "review", etc.)
│   ├── entityId: UUID
│   └── Allows querying all files for a specific entity
│
├── Visibility
│   └── isPublic: boolean
│
└── Relationships
    └── userId (who uploaded)

Cloudflare R2 (actual files)
├── images/
│   ├── 1717410000000-abc123.jpg
│   ├── 1717410001000-def456.jpg
│   └── ...
│
└── videos/
    ├── 1717410002000-ghi789.mp4
    └── ...
```

---

## 🔐 Security Considerations

### 1. Pre-signed URLs (Recommended)

```typescript
// Backend endpoint to generate pre-signed URLs
// This prevents exposing R2 credentials to the client
app.post("/api/r2/presigned-url", async (req, res) => {
  const { key, mimeType } = req.body;

  // Verify user is authenticated
  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  // Generate pre-signed URL using Cloudflare SDK
  const presignedUrl = await generatePresignedUrl(key, mimeType);

  res.json({ presignedUrl });
});
```

### 2. Row Level Security (RLS)

The migration includes RLS policies:

```sql
-- Users can only see their own files
CREATE POLICY "Users can view their own files"
  ON files FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only delete their own files
CREATE POLICY "Users can delete their own files"
  ON files FOR DELETE
  USING (auth.uid() = user_id);
```

### 3. File Size Limits

```typescript
// In your hook
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

if (file.size > MAX_IMAGE_SIZE) {
  throw new Error("Image too large");
}
```

### 4. MIME Type Validation

```typescript
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];

if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
  throw new Error("Invalid file type");
}
```

---

## 📚 API Reference

### R2 Service (`src/services/r2.ts`)

```typescript
uploadImage(file, onProgress): Promise<UploadResult>
uploadVideo(file, onProgress): Promise<UploadResult>
deleteFile(key): Promise<{ success, error? }>
```

### File Repository (`src/repositories/fileRepository.ts`)

```typescript
saveFileMetadata(metadata): Promise<FileMetadata>
getFileMetadata(fileId): Promise<FileMetadata | null>
getFileByKey(key): Promise<FileMetadata | null>
listFiles(params): Promise<FileMetadata[]>
getUserFiles(userId, fileType?, limit?): Promise<FileMetadata[]>
getEntityFiles(entityType, entityId): Promise<FileMetadata[]>
deleteFileMetadata(fileId): Promise<boolean>
deleteFileMetadataByKey(key): Promise<boolean>
updateFileMetadata(fileId, updates): Promise<FileMetadata>
```

### Upload Hooks

```typescript
useImageUpload(options)
  .upload(file)
  .reset()
  .loading, .progress, .error, .url, .fileMetadata

useVideoUpload(options)
  .upload(file)
  .reset()
  .loading, .progress, .error, .url, .fileMetadata

useFileUpload(options)
  .upload(file)
  .reset()
  .loading, .progress, .error, .url, .fileMetadata

useFileDelete(options)
  .deleteByKey(key)
  .deleteMultiple(keys)
  .reset()
  .loading, .error, .deleted
```

---

## 🔄 Workflow Patterns

### Pattern 1: Upload with Progress

```typescript
const { upload, progress, loading } = useImageUpload({
  onProgress: (p) => updateProgressBar(p),
});

const handleUpload = async (file) => {
  await upload(file);
  showSuccessMessage();
};
```

### Pattern 2: Batch Upload

```typescript
async function uploadMultipleImages(files) {
  const results = [];

  for (const file of files) {
    const result = await upload(file);
    results.push(result);
  }

  return results;
}
```

### Pattern 3: Replace Existing File

```typescript
async function replaceProfilePicture(newFile, oldKey) {
  // Delete old file
  await deleteByKey(oldKey);

  // Upload new file
  const result = await upload(newFile);

  return result.url;
}
```

### Pattern 4: List and Display

```typescript
useEffect(() => {
  const loadFiles = async () => {
    const files = await getEntityFiles("hotel", hotelId);
    setGallery(files.map((f) => ({ uri: f.url, title: f.altText })));
  };

  loadFiles();
}, [hotelId]);
```

---

## 🚀 Deployment Checklist

### Before Production

- ✅ Set up Cloudflare R2 bucket
- ✅ Create backend API for pre-signed URLs
- ✅ Configure CORS on R2
- ✅ Set environment variables
- ✅ Run Supabase migration
- ✅ Test uploads on all platforms
- ✅ Implement file size validation
- ✅ Add error handling and retry logic
- ✅ Set up file cleanup jobs (delete orphaned files)
- ✅ Configure R2 object lifecycle policies

### Cloudflare R2 Setup

```bash
# Create bucket
wrangler r2 bucket create travel-app

# Configure CORS
# Set custom domain in Cloudflare dashboard
# Enable public access if needed
```

### Supabase Setup

```bash
# Run migration
supabase migration up

# Verify RLS policies
select * from pg_policies where tablename = 'files';
```

---

## 🐛 Troubleshooting

### Upload Fails with CORS Error

**Solution:** Configure CORS in Cloudflare R2:

```json
{
  "AllowedOrigins": ["https://your-domain.com"],
  "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": ["ETag"]
}
```

### File Metadata Not Saving

**Solution:** Check Supabase migration ran and user is authenticated:

```typescript
// Verify user exists
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) throw new Error("User not authenticated");
```

### Pre-signed URL Expired

**Solution:** Generate URLs with sufficient TTL:

```typescript
// Set expiration to 1 hour
const presignedUrl = generatePresignedUrl(key, { expiresIn: 3600 });
```

### Large File Upload Timeout

**Solution:** Implement chunked upload:

```typescript
// Upload in 5MB chunks
const chunkSize = 5 * 1024 * 1024;
for (let i = 0; i < file.size; i += chunkSize) {
  const chunk = file.slice(i, i + chunkSize);
  await uploadChunk(chunk, i / chunkSize);
}
```

---

## 📊 Monitoring

### Track Upload Metrics

```typescript
const { upload, progress, loading } = useImageUpload({
  onProgress: (p) => {
    analytics.trackEvent("file_upload_progress", {
      progress: p,
      timestamp: Date.now(),
    });
  },
  onSuccess: (metadata) => {
    analytics.trackEvent("file_upload_complete", {
      fileSize: metadata.size,
      uploadTime: Date.now() - startTime,
    });
  },
  onError: (error) => {
    analytics.trackEvent("file_upload_error", {
      error,
      timestamp: Date.now(),
    });
  },
});
```

### Monitor File Storage

```sql
-- Check storage usage by user
SELECT
  user_id,
  COUNT(*) as file_count,
  SUM(size) as total_size,
  file_type
FROM files
GROUP BY user_id, file_type;

-- Find large files
SELECT
  id, file_name, size, created_at
FROM files
WHERE size > 100 * 1024 * 1024
ORDER BY size DESC;
```

---

## 🎁 Complete Implementation Example

```typescript
// screens/HotelPhotosUpload.tsx
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Image, ProgressBarAndroid } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useImageUpload } from '../hooks/useImageUpload';

export function HotelPhotosUploadScreen({ hotelId }: { hotelId: string }) {
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  const { upload, loading, progress, error, url } = useImageUpload({
    entityType: 'hotel',
    entityId: hotelId,
    isPublic: true,
    onSuccess: (metadata) => {
      setUploadedUrls([...uploadedUrls, metadata.url]);
    },
    onError: (error) => {
      alert(`Upload failed: ${error}`);
    },
  });

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.cancelled && result.assets.length > 0) {
      const file = result.assets[0];
      await upload({
        uri: file.uri,
        name: file.fileName || `hotel-${Date.now()}.jpg`,
        type: file.type,
      });
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      {/* Upload Section */}
      <TouchableOpacity
        style={{ padding: 16, backgroundColor: '#007AFF', borderRadius: 8 }}
        onPress={handlePickImage}
        disabled={loading}
      >
        <Text style={{ color: '#FFF', textAlign: 'center', fontSize: 16, fontWeight: 'bold' }}>
          {loading ? `Uploading: ${progress}%` : 'Add Photo'}
        </Text>
      </TouchableOpacity>

      {/* Progress Bar */}
      {loading && (
        <ProgressBarAndroid
          styleAttr="Horizontal"
          indeterminate={false}
          progress={progress / 100}
          style={{ marginVertical: 16 }}
        />
      )}

      {/* Error Message */}
      {error && (
        <Text style={{ color: 'red', marginVertical: 12 }}>
          Error: {error}
        </Text>
      )}

      {/* Gallery */}
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginVertical: 16 }}>
        Gallery ({uploadedUrls.length})
      </Text>
      {uploadedUrls.map((url, index) => (
        <Image
          key={index}
          source={{ uri: url }}
          style={{ width: '100%', height: 200, marginBottom: 12, borderRadius: 8 }}
        />
      ))}
    </ScrollView>
  );
}
```

---

## 📞 Support

For issues or questions:

1. Check `.env.local` configuration
2. Verify Supabase migration ran
3. Check Cloudflare R2 bucket settings
4. Review authentication status
5. Check file permissions and RLS policies

---

**Status:** ✅ Complete and ready for implementation

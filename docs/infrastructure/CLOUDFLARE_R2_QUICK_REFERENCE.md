# Cloudflare R2 - Quick Reference

## 🚀 Setup (5 minutes)

### 1. Get Credentials

```bash
# From Cloudflare Dashboard:
# 1. Go to R2 → API Tokens
# 2. Create new token (S3 API token)
# 3. Copy: Account ID, Access Key, Secret Key
```

### 2. Update .env.local

```bash
EXPO_PUBLIC_R2_ACCOUNT_ID=your_id
EXPO_PUBLIC_R2_ACCESS_KEY=your_key
EXPO_PUBLIC_R2_SECRET_KEY=your_secret
EXPO_PUBLIC_R2_BUCKET_NAME=travel-app
EXPO_PUBLIC_R2_CUSTOM_DOMAIN=cdn.travel-app.com
```

### 3. Run Supabase Migration

```bash
# Apply migration to create files table
supabase migration up
```

---

## 📱 Usage (3 Ways)

### Option 1: Upload Image

```typescript
import { useImageUpload } from '../hooks/useImageUpload';

const MyComponent = () => {
  const { upload, loading, progress, error } = useImageUpload({
    entityType: 'hotel',
    entityId: 'hotel-123',
  });

  return (
    <TouchableOpacity onPress={() => upload({ uri, name, type })}>
      <Text>{loading ? `${progress}%` : 'Upload'}</Text>
    </TouchableOpacity>
  );
};
```

### Option 2: Upload Video

```typescript
import { useVideoUpload } from '../hooks/useVideoUpload';

const MyComponent = () => {
  const { upload, loading } = useVideoUpload({
    entityType: 'post',
  });

  return (
    <TouchableOpacity onPress={() => upload(file)}>
      <Text>{loading ? 'Uploading...' : 'Pick Video'}</Text>
    </TouchableOpacity>
  );
};
```

### Option 3: Delete File

```typescript
import { useFileDelete } from '../hooks/useFileDelete';

const MyComponent = () => {
  const { deleteByKey, loading } = useFileDelete();

  return (
    <TouchableOpacity onPress={() => deleteByKey('images/123.jpg')}>
      <Text>{loading ? 'Deleting...' : 'Delete'}</Text>
    </TouchableOpacity>
  );
};
```

---

## 🎯 Common Patterns

### Upload with Progress Bar

```typescript
const { upload, progress, loading } = useImageUpload({
  onProgress: (p) => console.log(`${p}% done`),
});
```

### Show Success/Error

```typescript
const { upload, error, url } = useImageUpload({
  onSuccess: (metadata) => {
    alert("Uploaded!");
    console.log(metadata.url);
  },
  onError: (error) => {
    alert(`Error: ${error}`);
  },
});
```

### Link to Entity

```typescript
const { upload } = useImageUpload({
  entityType: "hotel", // Required
  entityId: hotelId, // Required
  altText: "Hotel photo", // Optional
});
```

### Get Entity Files

```typescript
import { getEntityFiles } from "../repositories/fileRepository";

const files = await getEntityFiles("hotel", hotelId);
files.forEach((f) => console.log(f.url));
```

---

## 📁 Files Created

```
src/
├── services/
│   └── r2.ts                          ← Main R2 service
│
├── repositories/
│   └── fileRepository.ts              ← Database operations
│
└── hooks/
    ├── useImageUpload.ts              ← Image upload hook
    ├── useVideoUpload.ts              ← Video upload hook
    ├── useFileUpload.ts               ← Generic file hook
    └── useFileDelete.ts               ← File deletion hook

supabase/
└── migrations/
    └── 20260603_create_files_table.sql ← Database schema

.env.local                              ← Configuration (updated)
CLOUDFLARE_R2_GUIDE.md                  ← Full documentation
```

---

## 🔐 Security Checklist

- ✅ Use environment variables (not hardcoded credentials)
- ✅ Generate pre-signed URLs on backend (don't expose credentials)
- ✅ Validate file size before upload
- ✅ Check MIME types
- ✅ Enable RLS policies (already configured)
- ✅ Use HTTPS only
- ✅ Verify user authentication before upload

---

## ⚙️ API Summary

### R2 Service

```typescript
uploadImage(file, onProgress); // Returns: UploadResult
uploadVideo(file, onProgress); // Returns: UploadResult
deleteFile(key); // Returns: { success, error? }
```

### File Repository

```typescript
saveFileMetadata(metadata); // Save to Supabase
getFileMetadata(fileId); // Get by ID
getFileByKey(key); // Get by R2 key
listFiles(params); // List with filters
getUserFiles(userId, fileType, limit); // Get user's files
getEntityFiles(entityType, entityId); // Get entity's files
deleteFileMetadata(fileId); // Delete metadata
updateFileMetadata(fileId, updates); // Update metadata
```

### Hooks

```typescript
useImageUpload(options); // { upload, loading, progress, error, url, reset }
useVideoUpload(options); // { upload, loading, progress, error, url, reset }
useFileUpload(options); // { upload, loading, progress, error, url, reset }
useFileDelete(options); // { deleteByKey, deleteMultiple, loading, error, reset }
```

---

## 🚨 Troubleshooting

| Issue               | Solution                                         |
| ------------------- | ------------------------------------------------ |
| CORS error          | Configure CORS in Cloudflare R2                  |
| Auth error          | Check user is logged in                          |
| Upload timeout      | Check file size, implement chunked upload        |
| Metadata not saving | Verify Supabase migration ran                    |
| File not found      | Check R2 key format: "images/timestamp-uuid.ext" |

---

## 💡 Best Practices

1. **Always validate files** before upload
2. **Show progress** for better UX
3. **Handle errors gracefully** with user feedback
4. **Clean up files** when deleting entities
5. **Use entity linking** to organize files
6. **Test on all platforms** (iOS, Android, Web)

---

## 📊 Supabase Files Table

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  url TEXT,                    -- Public R2 URL
  key TEXT UNIQUE,             -- R2 key (images/timestamp-uuid.jpg)
  file_name TEXT,
  file_type TEXT,              -- 'image' | 'video' | 'document'
  mime_type TEXT,
  size INTEGER,
  entity_type VARCHAR(50),     -- 'hotel' | 'post' | etc.
  entity_id UUID,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🎁 Example: Complete Upload Component

```typescript
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, ProgressBarAndroid } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useImageUpload } from '../hooks/useImageUpload';

export function PhotoUpload() {
  const [photos, setPhotos] = useState<string[]>([]);
  const { upload, loading, progress, error } = useImageUpload({
    entityType: 'hotel',
    entityId: 'hotel-123',
    onSuccess: (metadata) => {
      setPhotos([...photos, metadata.url]);
    },
  });

  const handlePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.cancelled) {
      const file = result.assets[0];
      await upload({
        uri: file.uri,
        name: file.fileName || 'photo.jpg',
        type: file.type,
      });
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <TouchableOpacity
        style={{ padding: 12, backgroundColor: '#007AFF', borderRadius: 8 }}
        onPress={handlePick}
        disabled={loading}
      >
        <Text style={{ color: '#FFF', textAlign: 'center' }}>
          {loading ? `${progress}%` : 'Upload Photo'}
        </Text>
      </TouchableOpacity>
      {loading && <ProgressBarAndroid progress={progress / 100} />}
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
    </View>
  );
}
```

---

## 📞 Next Steps

1. ✅ Update `.env.local` with R2 credentials
2. ✅ Run Supabase migration
3. ✅ Try `useImageUpload` hook
4. ✅ Implement backend pre-signed URL endpoint (for production)
5. ✅ Deploy to production

---

**Status:** ✅ Ready to use

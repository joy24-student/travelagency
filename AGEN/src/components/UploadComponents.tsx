/**
 * Reusable Upload Components for R2 Integration
 */

import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFileUpload,
  useImageUpload,
  useVideoUpload,
} from "../hooks/useUpload";
import { COLORS } from "../config/theme";

/**
 * ImagePickerComponent
 * Allows user to pick and upload image to R2
 */
interface ImagePickerComponentProps {
  entityType: "agency" | "document" | "post" | "profile" | "story";
  entityId: string;
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
  label?: string;
  initialImage?: string;
}

export function ImagePickerComponent({
  entityType,
  entityId,
  onSuccess,
  onError,
  label = "Upload Image",
  initialImage,
}: ImagePickerComponentProps) {
  const { pickImage, uploadImage, loading, progress, error, url } =
    useImageUpload({
      entityType,
      entityId,
      onSuccess,
      onError,
    });

  const displayUrl = url || initialImage;

  return (
    <View style={{ marginVertical: 12 }}>
      {displayUrl ? (
        <View>
          <Image
            source={{ uri: displayUrl }}
            style={{
              width: "100%",
              height: 200,
              borderRadius: 12,
              marginBottom: 8,
              backgroundColor: COLORS.surface,
            }}
            resizeMode="cover"
          />
          <TouchableOpacity
            onPress={() => pickImage()}
            disabled={loading}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: COLORS.primary,
              borderStyle: "dashed",
              backgroundColor: `${COLORS.primary}10`,
            }}
          >
            <MaterialCommunityIcons
              name="image-plus"
              size={20}
              color={COLORS.primary}
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
              {loading ? "Uploading..." : "Change Image"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => pickImage()}
          disabled={loading}
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 20,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: COLORS.primary,
            borderStyle: "dashed",
            backgroundColor: `${COLORS.primary}10`,
          }}
        >
          {loading ? (
            <>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text
                style={{
                  color: COLORS.primary,
                  marginTop: 8,
                  fontWeight: "600",
                }}
              >
                {progress}%
              </Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons
                name="image-plus"
                size={48}
                color={COLORS.primary}
              />
              <Text
                style={{
                  color: COLORS.primary,
                  marginTop: 8,
                  fontWeight: "600",
                  fontSize: 16,
                }}
              >
                {label}
              </Text>
              <Text
                style={{
                  color: `${COLORS.primary}99`,
                  marginTop: 4,
                  fontSize: 12,
                }}
              >
                Max 10MB
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {error && (
        <View
          style={{
            marginTop: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: `${COLORS.danger}20`,
          }}
        >
          <Text
            style={{ color: COLORS.danger, fontSize: 12, fontWeight: "500" }}
          >
            ❌ {error}
          </Text>
        </View>
      )}

      {progress > 0 && progress < 100 && (
        <View
          style={{
            marginTop: 8,
            height: 4,
            borderRadius: 2,
            backgroundColor: COLORS.surface,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: COLORS.primary,
            }}
          />
        </View>
      )}
    </View>
  );
}

/**
 * VideoPickerComponent
 * Allows user to pick or record video and upload to R2
 */
interface VideoPickerComponentProps {
  entityType: "agency" | "document" | "post" | "profile" | "story";
  entityId: string;
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
  label?: string;
  allowRecord?: boolean;
}

export function VideoPickerComponent({
  entityType,
  entityId,
  onSuccess,
  onError,
  label = "Upload Video",
  allowRecord = true,
}: VideoPickerComponentProps) {
  const { pickVideo, takeVideo, loading, progress, error, url } =
    useVideoUpload({
      entityType,
      entityId,
      onSuccess,
      onError,
    });

  return (
    <View style={{ marginVertical: 12 }}>
      {url ? (
        <View>
          <View
            style={{
              width: "100%",
              height: 200,
              borderRadius: 12,
              marginBottom: 8,
              backgroundColor: COLORS.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons
              name="play-circle"
              size={64}
              color={COLORS.primary}
            />
          </View>
          <TouchableOpacity
            onPress={() => pickVideo()}
            disabled={loading}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 10,
              paddingHorizontal: 16,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: COLORS.primary,
              borderStyle: "dashed",
              backgroundColor: `${COLORS.primary}10`,
            }}
          >
            <MaterialCommunityIcons
              name="video-plus"
              size={20}
              color={COLORS.primary}
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
              {loading ? "Uploading..." : "Change Video"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => pickVideo()}
            disabled={loading}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 16,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: COLORS.primary,
              borderStyle: "dashed",
              backgroundColor: `${COLORS.primary}10`,
            }}
          >
            {loading ? (
              <>
                <ActivityIndicator color={COLORS.primary} size="large" />
                <Text
                  style={{
                    color: COLORS.primary,
                    marginTop: 8,
                    fontWeight: "600",
                  }}
                >
                  {progress}%
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="folder-open"
                  size={32}
                  color={COLORS.primary}
                />
                <Text
                  style={{
                    color: COLORS.primary,
                    marginTop: 8,
                    fontWeight: "600",
                  }}
                >
                  Pick Video
                </Text>
              </>
            )}
          </TouchableOpacity>

          {allowRecord && (
            <TouchableOpacity
              onPress={() => takeVideo()}
              disabled={loading}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 16,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: COLORS.secondary,
                borderStyle: "dashed",
                backgroundColor: `${COLORS.secondary}10`,
              }}
            >
              <MaterialCommunityIcons
                name="camcorder"
                size={32}
                color={COLORS.secondary}
              />
              <Text
                style={{
                  color: COLORS.secondary,
                  marginTop: 8,
                  fontWeight: "600",
                }}
              >
                Record
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {error && (
        <View
          style={{
            marginTop: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: `${COLORS.danger}20`,
          }}
        >
          <Text
            style={{ color: COLORS.danger, fontSize: 12, fontWeight: "500" }}
          >
            ❌ {error}
          </Text>
        </View>
      )}

      {progress > 0 && progress < 100 && (
        <View
          style={{
            marginTop: 8,
            height: 4,
            borderRadius: 2,
            backgroundColor: COLORS.surface,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: COLORS.secondary,
            }}
          />
        </View>
      )}
    </View>
  );
}

/**
 * DocumentUploadComponent
 * For uploading verification documents
 */
interface DocumentUploadComponentProps {
  entityId: string;
  documentType: string;
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
}

export function DocumentUploadComponent({
  entityId,
  documentType,
  onSuccess,
  onError,
}: DocumentUploadComponentProps) {
  const { pickFile, loading, progress, error, url } = useFileUpload({
    entityType: "document",
    entityId,
    onSuccess,
    onError,
  });

  return (
    <View style={{ marginVertical: 8 }}>
      {url ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: `${COLORS.success}20`,
            marginBottom: 8,
          }}
        >
          <MaterialCommunityIcons
            name="file-check"
            size={20}
            color={COLORS.success}
          />
          <Text
            style={{
              flex: 1,
              marginLeft: 8,
              color: COLORS.success,
              fontWeight: "500",
            }}
          >
            Document Uploaded
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={pickFile}
          disabled={loading}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: COLORS.primary,
            backgroundColor: `${COLORS.primary}10`,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          {loading ? (
            <>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text
                style={{
                  marginLeft: 8,
                  color: COLORS.primary,
                  fontWeight: "600",
                }}
              >
                {progress}% Uploading...
              </Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons
                name="file-upload"
                size={20}
                color={COLORS.primary}
              />
              <Text
                style={{
                  marginLeft: 8,
                  color: COLORS.primary,
                  fontWeight: "600",
                }}
              >
                Upload {documentType}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {error && (
        <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>
          {error}
        </Text>
      )}
    </View>
  );
}

/**
 * MultiImagePickerComponent
 * Upload multiple images
 */
interface MultiImagePickerComponentProps {
  entityType: "agency" | "document" | "post" | "profile" | "story";
  entityId: string;
  maxImages?: number;
  onSuccess?: (urls: string[]) => void;
  onError?: (error: string) => void;
}

export function MultiImagePickerComponent({
  entityType,
  entityId,
  maxImages = 5,
  onSuccess,
  onError,
}: MultiImagePickerComponentProps) {
  const [images, setImages] = useState<string[]>([]);
  const { pickImage, loading, progress, error } = useImageUpload({
    entityType,
    entityId,
    onSuccess: (url: string) => {
      const newImages = [...images, url];
      setImages(newImages);
      onSuccess?.(newImages);
    },
    onError,
  });

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
  };

  return (
    <View style={{ marginVertical: 12 }}>
      <Text style={{ color: COLORS.text, fontWeight: "600", marginBottom: 8 }}>
        Images ({images.length}/{maxImages})
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 8 }}
      >
        {images.map((image, index) => (
          <View key={index} style={{ marginRight: 8 }}>
            <Image
              source={{ uri: image }}
              style={{
                width: 100,
                height: 100,
                borderRadius: 8,
              }}
            />
            <TouchableOpacity
              onPress={() => removeImage(index)}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: COLORS.danger,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons name="close" size={16} color="white" />
            </TouchableOpacity>
          </View>
        ))}

        {images.length < maxImages && (
          <TouchableOpacity
            onPress={() => pickImage()}
            disabled={loading}
            style={{
              width: 100,
              height: 100,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: COLORS.primary,
              borderStyle: "dashed",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${COLORS.primary}10`,
            }}
          >
            <MaterialCommunityIcons
              name="plus"
              size={32}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        )}
      </ScrollView>

      {loading && (
        <View style={{ marginVertical: 8 }}>
          <Text
            style={{ color: COLORS.primary, fontSize: 12, marginBottom: 4 }}
          >
            Uploading: {progress}%
          </Text>
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: COLORS.surface,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${progress}%`,
                backgroundColor: COLORS.primary,
              }}
            />
          </View>
        </View>
      )}

      {error && (
        <Text style={{ color: COLORS.danger, fontSize: 12 }}>{error}</Text>
      )}
    </View>
  );
}

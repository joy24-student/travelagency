/**
 * Verification Screen
 * Document uploads and verification status
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "../../App";
import { Card, SectionHeader, Badge } from "../ui/UIComponents";
import { MultiImagePickerComponent } from "../../components/UploadComponents";
import { agencyVerificationService } from "../../services/agencyService";

interface Document {
  id: string;
  name: string;
  status: "pending" | "verified" | "rejected";
  uploadDate?: string;
  r2_url?: string;
}

export default function VerificationScreen({ navigation }: any) {
  const [agencyId] = useState("AGENCY_123"); // Get from context/params
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "1",
      name: "Trade License",
      status: "verified",
      uploadDate: "2024-01-15",
    },
    {
      id: "2",
      name: "Tax Certificate",
      status: "verified",
      uploadDate: "2024-01-15",
    },
    {
      id: "3",
      name: "Bank Statement",
      status: "pending",
    },
    {
      id: "4",
      name: "Insurance Certificate",
      status: "pending",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await agencyVerificationService.getDocuments(agencyId);
      // Map API response to local state
      setDocuments(docs);
    } catch (error) {
      console.warn("Failed to load documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (url: string, documentType: string) => {
    try {
      // Save document metadata to database
      await agencyVerificationService.uploadDocument(agencyId, {
        document_type: documentType,
        file_url: url,
        verification_status: "pending",
      });

      // Update local state
      const newDoc: Document = {
        id: Date.now().toString(),
        name: documentType,
        status: "pending",
        r2_url: url,
        uploadDate: new Date().toISOString().split("T")[0],
      };
      setDocuments([...documents, newDoc]);
      Alert.alert("Success", `${documentType} uploaded successfully`);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to upload",
      );
    }
  };

  const handleDeleteDocument = (docId: string) => {
    Alert.alert("Delete Document", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setDocuments(documents.filter((d) => d.id !== docId));
        },
      },
    ]);
  };

  const statusColors: Record<string, "active" | "pending" | "error"> = {
    verified: "active",
    pending: "pending",
    rejected: "error",
  };

  const verifiedCount = documents.filter((d) => d.status === "verified").length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={COLORS.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification Documents</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Verification Status */}
        <View style={styles.section}>
          <SectionHeader title="Verification Status" />
          <Card gradient>
            <View style={styles.statusBox}>
              <MaterialCommunityIcons
                name="check-circle"
                size={32}
                color={COLORS.success}
              />
              <Text style={styles.statusTitle}>
                License, certificates, and tax info
              </Text>
              <Text style={styles.statusText}>
                You have {verifiedCount} verified documents. Please upload
                remaining documents for full verification.
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.round((verifiedCount / documents.length) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {verifiedCount} of {documents.length} documents verified
              </Text>
            </View>
          </Card>
        </View>

        {/* Upload New Document */}
        <View style={styles.section}>
          <SectionHeader title="Upload Documents" />
          <Card>
            <View style={styles.uploadSection}>
              <MultiImagePickerComponent
                entityType="document"
                entityId={agencyId}
                maxImages={3}
                onSuccess={(urls: string[]) => {
                  setUploadedImages(urls);
                  Alert.alert("Success", `${urls.length} documents uploaded`);
                }}
                onError={(error: string) => Alert.alert("Error", error)}
              />
            </View>
          </Card>
        </View>

        {/* Documents List */}
        <View style={styles.section}>
          <SectionHeader title={`Documents (${documents.length})`} />
          {loading ? (
            <ActivityIndicator
              color={COLORS.primary}
              size="large"
              style={{ marginVertical: 20 }}
            />
          ) : documents.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>No documents uploaded yet</Text>
            </Card>
          ) : (
            documents.map((doc) => (
              <Card key={doc.id}>
                <View style={styles.documentItem}>
                  <View style={styles.docIcon}>
                    <MaterialCommunityIcons
                      name={doc.r2_url ? "file-check" : "file-document"}
                      size={24}
                      color={
                        doc.status === "verified"
                          ? COLORS.success
                          : doc.status === "pending"
                            ? COLORS.warning
                            : COLORS.danger
                      }
                    />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    {doc.uploadDate && (
                      <Text style={styles.docDate}>
                        Uploaded: {doc.uploadDate}
                      </Text>
                    )}
                  </View>
                  <View style={styles.docActions}>
                    <Badge
                      label={
                        doc.status.charAt(0).toUpperCase() + doc.status.slice(1)
                      }
                      status={statusColors[doc.status]}
                      size="small"
                    />
                    <TouchableOpacity
                      onPress={() => handleDeleteDocument(doc.id)}
                      style={styles.deleteBtn}
                    >
                      <MaterialCommunityIcons
                        name="delete-outline"
                        size={18}
                        color={COLORS.danger}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  section: {
    marginBottom: 24,
  },

  statusBox: {
    alignItems: "center",
    gap: 12,
  },

  statusTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    textAlign: "center",
  },

  statusText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: "center",
    lineHeight: 18,
  },

  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 12,
  },

  progressFill: {
    height: "100%",
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },

  progressText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: "600",
  },

  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },

  docInfo: {
    flex: 1,
  },

  docName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },

  docDate: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
  },

  docActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  deleteBtn: {
    padding: 6,
  },

  uploadSection: {
    padding: 8,
  },

  emptyText: {
    textAlign: "center",
    color: COLORS.textTertiary,
    fontSize: 14,
    paddingVertical: 20,
  },
});

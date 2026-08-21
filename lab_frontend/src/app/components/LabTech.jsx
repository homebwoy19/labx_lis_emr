import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Microscope, Activity, CheckCircle, Upload, RefreshCw, AlertCircle, FileText } from "lucide-react";
import {
  StatCard,
  SearchBar,
  Card,
  Table,
  Badge,
  StatusBadge,
  Btn,
  Modal,
  FormField,
  Alert,
} from "./UIComponents";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

// Largest attachment we send. The upload travels as base64 JSON (~33% larger
// than the file), and the API caps the JSON body — keep raw files comfortably
// under that ceiling and give a friendly error instead of a cryptic 413.
const MAX_UPLOAD_MB = 10;

// Read a File into a base64 data URL, which the /documents/upload endpoint
// accepts (it strips the data: prefix server-side).
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

export function LabTechDashboard() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [results, setResults] = useState([]);
  const [catalogTests, setCatalogTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const [showUpload, setShowUpload] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [comments, setComments] = useState("");
  const [testValues, setTestValues] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Fetch live orders, results, and test catalog
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [ordersRes, resultsRes, testsRes] = await Promise.all([
        api.listOrders({ limit: 100 }),
        api.listResults({ limit: 100 }).catch(() => ({ data: { data: [] } })),
        api.listTests({ limit: 100 }).catch(() => ({ data: { data: [] } })),
      ]);

      const fetchedOrders = ordersRes?.data?.data || ordersRes?.data?.orders || [];
      const fetchedResults = resultsRes?.data?.data || resultsRes?.data?.results || [];
      const fetchedTests = testsRes?.data?.data || testsRes?.data?.tests || [];

      setOrders(fetchedOrders);
      setResults(fetchedResults);
      setCatalogTests(fetchedTests);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to load laboratory queue from server",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Catalog tests lookup
  const testMap = useMemo(() => {
    const map = new Map();
    catalogTests.forEach((t) => map.set(t.id, t));
    return map;
  }, [catalogTests]);

  // Results lookup by orderItemId
  const resultMap = useMemo(() => {
    const map = new Map();
    results.forEach((r) => map.set(r.orderItemId, r));
    return map;
  }, [results]);

  // Flatten actionable laboratory queue
  const queue = useMemo(() => {
    const items = [];
    orders.forEach((o) => {
      if (o.status === "CANCELLED") return;

      const patientName = o.patient
        ? `${o.patient.firstName || ""} ${o.patient.lastName || ""}`.trim()
        : "Patient";
      const orderDate = o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—";

      (o.items || []).forEach((item) => {
        const catTest = testMap.get(item.testId);
        // Exclude radiology imaging tests from the wet lab bench queue if test type is RADIOLOGY
        if (catTest && catTest.type === "RADIOLOGY") return;

        const resultRecord = resultMap.get(item.id);

        items.push({
          id: item.id,
          orderItemId: item.id,
          orderId: o.id,
          orderCode: o.orderCode || o.id.slice(0, 8),
          patientName,
          patientCode: o.patient?.patientCode || "—",
          testId: item.testId,
          testName: item.testName || "Laboratory Test",
          categoryName: catTest?.category?.name || "General Lab",
          status: item.status,
          orderStatus: o.status,
          resultStatus: resultRecord?.status || null,
          resultId: resultRecord?.id || null,
          interpretation: resultRecord?.interpretation || "",
          date: orderDate,
          createdAt: o.createdAt,
        });
      });
    });
    return items;
  }, [orders, testMap, resultMap]);

  // Filter queue by search
  const filteredQueue = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return queue;
    return queue.filter(
      (item) =>
        item.orderCode.toLowerCase().includes(s) ||
        item.patientName.toLowerCase().includes(s) ||
        item.testName.toLowerCase().includes(s) ||
        item.patientCode.toLowerCase().includes(s) ||
        item.categoryName.toLowerCase().includes(s)
    );
  }, [queue, search]);

  // Aggregate stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const assigned = queue.filter(
      (q) => q.status === "SAMPLE_COLLECTED" || q.status === "IN_PROGRESS" || q.status === "ORDERED"
    ).length;

    const processing = queue.filter(
      (q) => q.status === "IN_PROGRESS" || q.status === "SAMPLE_COLLECTED"
    ).length;

    const completedToday = queue.filter((q) => {
      if (q.status === "RESULT_ENTERED" || q.status === "APPROVED") {
        return q.createdAt && new Date(q.createdAt).toDateString() === today;
      }
      return false;
    }).length;

    return {
      assigned,
      processing,
      completedToday,
    };
  }, [queue]);

  const handleOpenUpload = (item, isReupload = false) => {
    setUploadError("");
    setUploadedFile(null);
    setComments(item.interpretation || "");
    setTestValues("");
    setShowUpload({
      ...item,
      isReupload,
    });
  };

  const handleSubmitResult = async () => {
    if (!uploadedFile && !testValues.trim() && !comments.trim()) {
      setUploadError("Please provide test findings, values, or upload a result document.");
      return;
    }
    if (uploadedFile && uploadedFile.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setUploadError(`The attached file is too large (max ${MAX_UPLOAD_MB} MB).`);
      return;
    }

    if (!showUpload) return;
    setIsSubmitting(true);
    setUploadError("");

    try {
      // If a document was attached, upload the actual bytes first and reference
      // the stored document on the result. (Previously only the file name was
      // recorded in `data` and the file itself was discarded.)
      let documentId;
      if (uploadedFile) {
        const dataUrl = await fileToDataUrl(uploadedFile);
        const uploaded = await api.uploadDocument({
          fileName: uploadedFile.name,
          mimeType: uploadedFile.type || "application/octet-stream",
          kind: "RESULT_UPLOAD",
          data: dataUrl,
        });
        documentId = uploaded?.data?.document?.id;
        if (!documentId) {
          throw new Error("The document upload did not return a reference.");
        }
      }

      const payload = {
        orderItemId: showUpload.id,
        type: "STRUCTURED",
        data: {
          testName: showUpload.testName,
          orderCode: showUpload.orderCode,
          testValues: testValues.trim() || undefined,
          fileName: uploadedFile ? uploadedFile.name : undefined,
          enteredBy: user?.fullName || "Lab Scientist",
          timestamp: new Date().toISOString(),
        },
        interpretation: comments.trim() || testValues.trim() || "Result entered and verified in laboratory.",
        documentId,
      };

      await api.enterResult(payload);

      setFeedback({
        type: "success",
        message: `Result for Order ${showUpload.orderCode} (${showUpload.testName}) submitted for approval!`,
      });

      setShowUpload(null);
      setUploadedFile(null);
      setComments("");
      setTestValues("");
      await fetchData(true);
    } catch (err) {
      setUploadError(err.message || "Failed to submit result to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {feedback && (
        <Alert
          type={feedback.type === "success" ? "success" : "danger"}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={Microscope}
          label="Assigned Tests"
          value={loading ? "…" : `${stats.assigned}`}
          color="bg-blue-500"
        />
        <StatCard
          icon={Activity}
          label="In Processing"
          value={loading ? "…" : `${stats.processing}`}
          color="bg-amber-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed Today"
          value={loading ? "…" : `${stats.completedToday}`}
          color="bg-emerald-500"
        />
      </div>

      {/* Laboratory Processing Queue */}
      <Card>
        <div className="px-5 py-3 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold whitespace-nowrap">
              Laboratory Analysis & Processing Queue
            </h3>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
              title="Refresh queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:w-64 md:w-80">
              <SearchBar
                placeholder="Search queue..."
                value={search}
                onChange={(e) => setSearch(e.target ? e.target.value : e)}
              />
            </div>
            <Badge variant="info">
              {filteredQueue.filter((p) => p.status !== "APPROVED").length} active
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
            Loading laboratory bench queue…
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
            {search ? "No test items match your search." : "No laboratory tests currently queued for processing."}
          </div>
        ) : (
          <Table
            headers={[
              "Order ID",
              "Patient",
              "Test",
              "Category",
              "Status",
              "Date",
              "Actions",
            ]}
          >
            {filteredQueue.map((item) => {
              const isEntered = item.status === "RESULT_ENTERED" || item.resultStatus === "PENDING_APPROVAL";
              const isApproved = item.status === "APPROVED" || item.resultStatus === "APPROVED";

              return (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-primary font-medium">
                    {item.orderCode}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    <div>{item.patientName}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{item.patientCode}</div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{item.testName}</td>
                  <td className="px-4 py-3">
                    <Badge variant="info">{item.categoryName}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {item.date}
                  </td>
                  <td className="px-4 py-3">
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md cursor-default">
                        <CheckCircle className="w-3 h-3" />
                        Approved
                      </span>
                    ) : isEntered ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-md cursor-default">
                          <CheckCircle className="w-3 h-3" />
                          Pending Approval
                        </span>
                        <Btn
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenUpload(item, true)}
                        >
                          <Upload className="w-3 h-3" />
                          Re-upload
                        </Btn>
                      </div>
                    ) : item.status === "ORDERED" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md cursor-default">
                        Awaiting Sample
                      </span>
                    ) : (
                      <Btn
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenUpload(item, false)}
                      >
                        <Upload className="w-3 h-3" />
                        Enter / Upload Result
                      </Btn>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {/* Result Entry / Upload Modal */}
      {showUpload && (
        <Modal
          title={showUpload.isReupload ? "Re-upload Laboratory Result" : "Enter Laboratory Result"}
          onClose={() => !isSubmitting && setShowUpload(null)}
        >
          <div className="space-y-4">
            {uploadError && (
              <Alert
                type="warning"
                message={uploadError}
                onClose={() => setUploadError("")}
              />
            )}

            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Order Code:</span>{" "}
                <span className="font-mono text-primary font-semibold">{showUpload.orderCode}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Patient:</span>{" "}
                <strong>{showUpload.patientName}</strong> ({showUpload.patientCode})
              </p>
              <p>
                <span className="text-muted-foreground">Investigation:</span>{" "}
                <strong>{showUpload.testName}</strong>
              </p>
            </div>

            {/* Test Values / Analyte Measurements */}
            <FormField label="Test Findings / Measured Values">
              <textarea
                value={testValues}
                onChange={(e) => setTestValues(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none font-mono"
                rows={3}
                placeholder="e.g. Haemoglobin: 14.2 g/dL, WBC: 6.8 x10^9/L, Platelets: 240 x10^9/L"
              />
            </FormField>

            {/* File Upload (Optional / Supplementary Document) */}
            <FormField label="Attach Result Document (PDF / Image)">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".pdf,.png,.jpeg,.jpg"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadedFile(e.target.files[0]);
                    setUploadError("");
                  }
                }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  uploadedFile
                    ? "border-emerald-500 bg-emerald-50/10"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <div className="text-center">
                  <Upload
                    className={`w-5 h-5 mx-auto mb-1 ${uploadedFile ? "text-emerald-500" : "text-muted-foreground"}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    {uploadedFile ? (
                      <span className="font-medium text-emerald-600">
                        {uploadedFile.name}
                      </span>
                    ) : (
                      "Click to select instrument printout or PDF report"
                    )}
                  </p>
                </div>
              </div>
            </FormField>

            <FormField label="Clinical Interpretation & Comments">
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                rows={2}
                placeholder="Clinical remarks, reference range interpretation, technician notes…"
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-2">
              <Btn
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => setShowUpload(null)}
              >
                Cancel
              </Btn>
              <Btn
                variant="primary"
                disabled={isSubmitting}
                onClick={handleSubmitResult}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {isSubmitting ? "Submitting…" : "Submit for Approval"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default LabTechDashboard;

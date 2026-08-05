import React, { useState } from "react";
import { Microscope, Activity, CheckCircle, Upload } from "lucide-react";
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
} from "./UIComponents";
import { TEST_ORDERS, TESTS } from "./sharedData";

export function LabTechDashboard() {
  const [showUpload, setShowUpload] = useState(null);
  const [search, setSearch] = useState("");
  const fileInputRef = React.useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedItemIds, setSubmittedItemIds] = useState([]);
  const [uploadError, setUploadError] = useState("");
  const assigned = TEST_ORDERS.flatMap((o) =>
    o.items
      .filter((i) => i.status === "collected" || i.status === "processing")
      .map((i) => ({
        ...i,
        orderId: o.orderId,
        patientName: o.patientName,
        date: o.date,
      })),
  );

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={Microscope}
          label="Assigned Tests"
          value={`${assigned.length}`}
          color="bg-blue-500"
        />
        <StatCard
          icon={Activity}
          label="Processing"
          value={`${assigned.filter((a) => a.status === "processing").length}`}
          color="bg-amber-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed Today"
          value="14"
          color="bg-emerald-500"
        />
      </div>
      <Card>
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Processing Queue</h3>
          <div className="w-36">
            <SearchBar
              placeholder="Search queue..."
              value={search}
              onChange={(e) => setSearch(e.target ? e.target.value : e)}
            />
          </div>
        </div>
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
          {assigned
            .filter((item) => {
              const searchLower = search.toLowerCase();
              return (
                item.orderId.toLowerCase().includes(searchLower) ||
                item.patientName.toLowerCase().includes(searchLower) ||
                item.testName.toLowerCase().includes(searchLower)
              );
            })
            .map((item) => (
              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-primary">
                  {item.orderId}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  {item.patientName}
                </td>
                <td className="px-4 py-3 text-sm">{item.testName}</td>
                <td className="px-4 py-3">
                  <Badge variant="info">
                    {TESTS.find((t) => t.id === item.testId)?.category}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {item.date}
                </td>
                <td className="px-4 py-3">
                  {submittedItemIds.includes(item.id) ? (
                    <div className="flex items-center gap-2">
                      {/* Non-clickable status badge */}
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md cursor-default">
                        <CheckCircle className="w-3 h-3" />
                        Result Uploaded
                      </span>

                      {/* Re-upload button side-by-side to trigger modal */}
                      <Btn
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setShowUpload({
                            id: item.id,
                            orderId: item.orderId,
                            testName: item.testName,
                            isReupload: true,
                          })
                        }
                      >
                        <Upload className="w-3 h-3" />
                        Re-upload Result
                      </Btn>
                    </div>
                  ) : (
                    /* Standard Upload Result button */
                    <Btn
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        setShowUpload({
                          id: item.id,
                          orderId: item.orderId,
                          testName: item.testName,
                          isReupload: false,
                        })
                      }
                    >
                      <Upload className="w-3 h-3" />
                      Upload Result
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
        </Table>
      </Card>
      {showUpload && (
        <Modal title="Upload Result" onClose={() => setShowUpload(null)}>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Order:</span>{" "}
                <span className="font-mono text-primary">
                  {showUpload.orderId}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Test:</span>{" "}
                <strong>{showUpload.testName}</strong>
              </p>
            </div>
            <FormField label="Upload Result PDF" required>
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
                className={`flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
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
                      "Click to upload result (PDF/Images)"
                    )}
                  </p>
                </div>
              </div>
              {uploadError && (
                <p className="text-xs text-red-500 mt-1">{uploadError}</p>
              )}
            </FormField>
            <FormField label="Comments">
              <textarea
                className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                rows={3}
                placeholder="Clinical notes, interpretation…"
              />
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <Btn
                variant="secondary"
                onClick={() => {
                  setShowUpload(null);
                  setUploadedFile(null);
                  setIsSubmitted(false);
                }}
              >
                Cancel
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  if (!uploadedFile) {
                    setUploadError(
                      "Please upload a result file before submitting.",
                    );
                    return;
                  }

                  // Add item ID to submitted state to update table buttons
                  if (
                    showUpload?.id &&
                    !submittedItemIds.includes(showUpload.id)
                  ) {
                    setSubmittedItemIds((prev) => [...prev, showUpload.id]);
                  }

                  // Close modal and reset form
                  setShowUpload(null);
                  setUploadedFile(null);
                  setUploadError("");
                }}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Submit Result
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

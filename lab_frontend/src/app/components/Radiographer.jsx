import React, { useState } from "react";
import { RadioTower, Activity, CheckCircle, Upload } from "lucide-react";
import {
  StatCard,
  Card,
  Table,
  StatusBadge,
  Btn,
  Modal,
  FormField,
  SearchBar,
} from "./UIComponents";
import { TEST_ORDERS } from "./sharedData";

export function RadiographerDashboard() {
  const [showUpload, setShowUpload] = useState(null);
  const [search, setSearch] = useState("");
  const [submittedItemIds, setSubmittedItemIds] = useState([]);
  const scanFileInputRef = React.useRef(null);
  const pdfFileInputRef = React.useRef(null);
  const [uploadedPdfFile, setUploadedPdfFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const imaging = TEST_ORDERS.flatMap((o) =>
    o.items
      .filter((i) => i.testId === "t7" || i.testId === "t8")
      .map((i) => ({
        ...i,
        orderId: o.orderId,
        patientName: o.patientName,
        date: o.date,
      })),
  );

  const filteredImaging = imaging.filter(
    (item) =>
      item.orderId.toLowerCase().includes(search.toLowerCase()) ||
      item.patientName.toLowerCase().includes(search.toLowerCase()) ||
      item.testName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={RadioTower}
          label="Pending Imaging"
          value={`${imaging.filter((i) => i.status === "pending").length}`}
          color="bg-violet-500"
        />
        <StatCard
          icon={Activity}
          label="In Progress"
          value="2"
          color="bg-amber-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Reports Today"
          value="5"
          color="bg-emerald-500"
        />
      </div>
      <Card>
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold whitespace-nowrap">
            Imaging Queue
          </h3>
          <div className="flex-1 max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target ? e.target.value : e)}
              placeholder="Search by Order ID, Patient, or Imaging Type"
            />
          </div>
        </div>
        <Table
          headers={[
            "Order ID",
            "Patient",
            "Imaging Type",
            "Status",
            "Date",
            "Actions",
          ]}
        >
          {imaging.map((item) => (
            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-primary">
                {item.orderId}
              </td>
              <td className="px-4 py-3 text-sm font-medium">
                {item.patientName}
              </td>
              <td className="px-4 py-3 text-sm">{item.testName}</td>
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
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md cursor-default">
                      <CheckCircle className="w-3 h-3" />
                      Report Uploaded
                    </span>

                    {/* Re-upload button side-by-side */}
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
                      Re-upload Report
                    </Btn>
                  </div>
                ) : (
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
                    Upload Report
                  </Btn>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      {showUpload && (
        <Modal
          title="Upload Imaging Report"
          onClose={() => {
            setShowUpload(null);
            setUploadedPdfFile(null);
            setUploadError("");
          }}
        >
          <div className="space-y-4">
            {uploadError && (
              <p className="text-xs text-red-500 font-medium">{uploadError}</p>
            )}

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
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

            {/* Upload Report PDF (Clickable) */}
            <FormField label="Upload Report">
              <input
                type="file"
                ref={pdfFileInputRef}
                className="hidden"
                accept=".pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadedPdfFile(e.target.files[0]);
                    setUploadError("");
                  }
                }}
              />
              <div
                onClick={() => pdfFileInputRef.current?.click()}
                className={`flex items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  uploadedPdfFile
                    ? "border-emerald-500 bg-emerald-50/10"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <p className="text-xs text-muted-foreground">
                  {uploadedPdfFile ? (
                    <span className="font-medium text-emerald-600">
                      {uploadedPdfFile.name}
                    </span>
                  ) : (
                    "Click to upload report"
                  )}
                </p>
              </div>
            </FormField>

            <FormField label="Radiologist Report / Findings">
              <textarea
                className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                rows={4}
                placeholder="Describe imaging findings…"
              />
            </FormField>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Btn
                variant="secondary"
                onClick={() => {
                  setShowUpload(null);
                  setUploadedPdfFile(null);
                  setUploadError("");
                }}
              >
                Cancel
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  // Require at least scan image or PDF report
                  if (!uploadedPdfFile) {
                    setUploadError("Please upload a report before submitting.");
                    return;
                  }

                  // Update submitted IDs array to switch table buttons
                  if (
                    showUpload?.id &&
                    !submittedItemIds.includes(showUpload.id)
                  ) {
                    setSubmittedItemIds((prev) => [...prev, showUpload.id]);
                  }

                  // Close modal & reset files
                  setShowUpload(null);
                  setUploadedPdfFile(null);
                  setUploadError("");
                }}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Submit Report
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Clock, Droplets, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";
import {
  StatCard,
  Card,
  Badge,
  Alert,
  Table,
  StatusBadge,
  Btn,
  Modal,
  FormField,
  Input,
  Select,
  SearchBar,
} from "./UIComponents";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

export function PhlebotomistDashboard({ currentUser }) {
  const { user } = useAuth();
  const effectiveUser = currentUser || user;

  const [orders, setOrders] = useState([]);
  const [samples, setSamples] = useState([]);
  const [catalogTests, setCatalogTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const [showCollection, setShowCollection] = useState(null);
  const [collectionTime, setCollectionTime] = useState("");
  const [sampleType, setSampleType] = useState("");
  const [collectorName, setCollectorName] = useState("");
  const [containerType, setContainerType] = useState("EDTA (Purple)");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Fetch live orders, samples, and test catalog from backend
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [ordersRes, samplesRes, testsRes] = await Promise.all([
        api.listOrders({ limit: 100 }),
        api.listSamples({ limit: 100 }).catch(() => ({ data: { data: [] } })),
        api.listTests({ limit: 100 }).catch(() => ({ data: { data: [] } })),
      ]);

      const fetchedOrders = ordersRes?.data?.data || ordersRes?.data?.orders || [];
      const fetchedSamples = samplesRes?.data?.data || samplesRes?.data?.samples || [];
      const fetchedTests = testsRes?.data?.data || testsRes?.data?.tests || [];

      setOrders(fetchedOrders);
      setSamples(fetchedSamples);
      setCatalogTests(fetchedTests);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message || "Failed to load phlebotomy queue from server",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build a lookup map of catalog tests for sample types
  const testMap = useMemo(() => {
    const map = new Map();
    catalogTests.forEach((t) => map.set(t.id, t));
    return map;
  }, [catalogTests]);

  // Flatten order items into actionable queue
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
        const sampleTypeHint = catTest?.type === "LABORATORY" ? "Whole Blood" : "Serum";

        items.push({
          id: item.id,
          orderItemId: item.id,
          orderId: o.id,
          orderCode: o.orderCode || o.id.slice(0, 8),
          patientName,
          patientCode: o.patient?.patientCode || "—",
          testId: item.testId,
          testName: item.testName || "Test",
          status: item.status,
          orderStatus: o.status,
          date: orderDate,
          createdAt: o.createdAt,
          sampleTypeHint,
        });
      });
    });
    return items;
  }, [orders, testMap]);

  // Filtered queue items by search
  const filteredQueue = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return queue;
    return queue.filter(
      (item) =>
        item.orderCode.toLowerCase().includes(s) ||
        item.patientName.toLowerCase().includes(s) ||
        item.testName.toLowerCase().includes(s) ||
        item.patientCode.toLowerCase().includes(s)
    );
  }, [queue, search]);

  // Aggregate stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const pending = queue.filter(
      (q) => q.status === "ORDERED" || q.orderStatus === "AWAITING_SAMPLE"
    ).length;

    const collectedToday = queue.filter((q) => {
      if (q.status === "SAMPLE_COLLECTED" || q.status === "IN_PROGRESS" || q.status === "RESULT_ENTERED" || q.status === "APPROVED") {
        return q.createdAt && new Date(q.createdAt).toDateString() === today;
      }
      return false;
    }).length;

    const completedToday = queue.filter((q) => {
      if (q.status === "RESULT_ENTERED" || q.status === "APPROVED") {
        return q.createdAt && new Date(q.createdAt).toDateString() === today;
      }
      return false;
    }).length;

    return {
      pending,
      collectedToday,
      completedToday,
    };
  }, [queue]);

  const handleOpenModal = (item) => {
    setSampleType(item.sampleTypeHint || "Whole Blood");
    setCollectorName(effectiveUser?.fullName || effectiveUser?.name || "Phlebotomist");
    setCollectionTime(new Date().toISOString().slice(0, 16));
    setContainerType("EDTA (Purple)");
    setFormError("");
    setShowCollection(item);
  };

  const handleMarkCollected = async () => {
    if (
      !collectionTime.trim() ||
      !sampleType.trim() ||
      !collectorName.trim() ||
      !containerType.trim()
    ) {
      setFormError(
        "Please fill out all required fields (Collection Time, Sample Type, Collector Name, and Container Type)."
      );
      return;
    }

    if (!showCollection) return;
    setIsSubmitting(true);
    setFormError("");

    try {
      // 1. Find or create a sample accession for this order
      const existingSample = samples.find(
        (s) => s.orderId === showCollection.orderId && s.status === "PENDING"
      );

      let targetSample = existingSample;
      if (!targetSample) {
        // Register sample accession
        const createRes = await api.createSample({
          orderId: showCollection.orderId,
          sampleType: sampleType.trim(),
        });
        targetSample = createRes?.data?.sample || createRes?.data;
      }

      // 2. Mark sample collected
      if (targetSample?.id) {
        await api.collectSample(targetSample.id, {
          sampleType: sampleType.trim(),
        });
      }

      setFeedback({
        type: "success",
        message: `Sample for Order ${showCollection.orderCode} (${showCollection.testName}) collected successfully!`,
      });

      setShowCollection(null);
      await fetchData(true);
    } catch (err) {
      setFormError(
        err.message || "Failed to mark sample as collected. Make sure the order has been paid."
      );
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
          icon={Clock}
          label="Pending Collections"
          value={loading ? "…" : `${stats.pending}`}
          color="bg-amber-500"
        />
        <StatCard
          icon={Droplets}
          label="Collected Today"
          value={loading ? "…" : `${stats.collectedToday}`}
          color="bg-teal-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed Today"
          value={loading ? "…" : `${stats.completedToday}`}
          color="bg-emerald-500"
        />
      </div>

      {/* Patient Queue Card */}
      <Card>
        <div className="px-5 py-3 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold whitespace-nowrap">
              Phlebotomy & Sample Collection Queue
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
                placeholder="Search by Order ID, Patient, or Test"
                value={search}
                onChange={(e) => setSearch(e.target ? e.target.value : e)}
              />
            </div>
            <Badge variant="warning">
              {filteredQueue.filter((p) => p.status === "ORDERED").length} pending
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
            Loading clinical collection queue…
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-40" />
            {search ? "No test orders match your search." : "No orders awaiting sample collection."}
          </div>
        ) : (
          <Table
            headers={[
              "Order ID",
              "Patient",
              "Test",
              "Sample Type",
              "Status",
              "Date",
              "Actions",
            ]}
          >
            {filteredQueue.map((item) => {
              const isCollected =
                item.status === "SAMPLE_COLLECTED" ||
                item.status === "IN_PROGRESS" ||
                item.status === "RESULT_ENTERED" ||
                item.status === "APPROVED";

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
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {item.sampleTypeHint || "Whole Blood"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {item.date}
                  </td>
                  <td className="px-4 py-3">
                    {isCollected ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 px-3 py-1.5 rounded-md cursor-default">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Sample Collected
                      </span>
                    ) : item.orderStatus === "PENDING_PAYMENT" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-md cursor-default">
                        <Clock className="w-3 h-3" />
                        Awaiting Payment
                      </span>
                    ) : (
                      <Btn
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenModal(item)}
                      >
                        <Droplets className="w-3.5 h-3.5" />
                        Collect
                      </Btn>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      {/* Sample Collection Modal */}
      {showCollection && (
        <Modal
          title="Sample Collection Form"
          onClose={() => !isSubmitting && setShowCollection(null)}
        >
          <div className="space-y-4">
            {formError && (
              <Alert
                type="warning"
                message={formError}
                onClose={() => setFormError("")}
              />
            )}

            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Patient:</span>{" "}
                <strong>{showCollection.patientName}</strong> ({showCollection.patientCode})
              </p>
              <p>
                <span className="text-muted-foreground">Test:</span>{" "}
                <strong>{showCollection.testName}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Order Code:</span>{" "}
                <span className="font-mono text-primary font-semibold">
                  {showCollection.orderCode}
                </span>
              </p>
            </div>

            <FormField label="Collection Time" required>
              <Input
                type="datetime-local"
                value={collectionTime}
                onChange={(e) => setCollectionTime(e.target.value)}
              />
            </FormField>

            <FormField label="Sample Type" required>
              <Input
                value={sampleType}
                onChange={(e) => setSampleType(e.target.value)}
                placeholder="e.g. Whole Blood, Serum, Plasma, Urine"
              />
            </FormField>

            <FormField label="Collector Name" required>
              <Input
                value={collectorName}
                onChange={(e) => setCollectorName(e.target.value)}
                placeholder="Enter collector's name"
              />
            </FormField>

            <FormField label="Tube / Container Type" required>
              <Select
                value={containerType}
                onChange={(e) => setContainerType(e.target.value)}
              >
                <option value="EDTA (Purple)">EDTA (Purple)</option>
                <option value="Serum (Red / Gold)">Serum (Red / Gold)</option>
                <option value="Urine Cup">Urine Container</option>
                <option value="Heparin (Green)">Heparin (Green)</option>
                <option value="Fluoride Oxalate (Grey)">Fluoride Oxalate (Grey)</option>
                <option value="Sodium Citrate (Blue)">Sodium Citrate (Blue)</option>
                <option value="Swab / Transport Medium">Swab / Transport Medium</option>
              </Select>
            </FormField>

            <FormField label="Notes">
              <textarea
                className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                rows={2}
                placeholder="Any special collection notes, site of draw, fasting status…"
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-2">
              <Btn
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => setShowCollection(null)}
              >
                Cancel
              </Btn>
              <Btn
                variant="primary"
                disabled={isSubmitting}
                onClick={handleMarkCollected}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {isSubmitting ? "Recording…" : "Mark Collected"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default PhlebotomistDashboard;

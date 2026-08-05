import React, { useState } from "react";
import { Clock, Droplets, CheckCircle } from "lucide-react";
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
import { TEST_ORDERS, TESTS } from "./sharedData";

export function PhlebotomistDashboard({ currentUser = { name: "" } }) {
  const [showCollection, setShowCollection] = useState(null);
  const [search, setSearch] = useState("");
  const [collectIds, setCollectIds] = useState([]);
  const [collectionTime, setCollectionTime] = useState("");
  const [sampleType, setSampleType] = useState("");
  const [collectorName, setCollectorName] = useState(currentUser?.name || "");
  const [containerType, setContainerType] = useState("EDTA (Purple)");
  const [formError, setFormError] = useState("");
  const pending = TEST_ORDERS.flatMap((o) =>
    o.items
      .filter((i) => i.status === "pending" || i.status === "collected")
      .map((i) => ({
        ...i,
        orderId: o.orderId,
        patientName: o.patientName,
        date: o.date,
      })),
  );

  const handleOpenModal = (item) => {
    const defaultSample =
      TESTS.find((t) => t.id === item.testId)?.sampleType || "Serum";
    setSampleType(defaultSample);
    setCollectorName(currentUser?.name || "");
    setCollectionTime(new Date().toISOString().slice(0, 16)); // Auto-sets current date-time
    setContainerType("EDTA (Purple)");
    setFormError("");
    setShowCollection(item);
  };

  const filteredPending = pending.filter(
    (item) =>
      item.orderId.toLowerCase().includes(search.toLowerCase()) ||
      item.patientName.toLowerCase().includes(search.toLowerCase()) ||
      item.testName.toLowerCase().includes(search.toLowerCase()),
  );

  const handleMarkCollected = () => {
    // Guard clause: enforce all mandatory fields
    if (
      !collectionTime.trim() ||
      !sampleType.trim() ||
      !collectorName.trim() ||
      !containerType.trim()
    ) {
      setFormError(
        "Please fill out all required fields (Collection Time, Sample Type, Collector Name, and Tube/Container Type).",
      );
      return;
    }

    // 1. Add item ID to collectIds state array
    if (showCollection?.id) {
      setCollectIds((prev) => [...(prev || []), showCollection.id]);
    }

    // 2. Reset modal state and close
    setShowCollection(null);
    setFormError("");
  };

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={Clock}
          label="Pending Collections"
          value={`${pending.filter((p) => p.status === "pending").length}`}
          color="bg-amber-500"
        />
        <StatCard
          icon={Droplets}
          label="Collected Today"
          value="12"
          color="bg-teal-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed Today"
          value="8"
          color="bg-emerald-500"
        />
      </div>
      <Card>
        <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold whitespace-nowrap">
            Patient Queue
          </h3>
          <div className="flex-1 max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl">
            <SearchBar
              placeholder="Search by Order ID, Patient, or Test"
              value={search}
              onChange={(e) => setSearch(e.target ? e.target.value : e)}
            />
          </div>
          <Badge variant="warning">
            {
              pending.filter(
                (p) => p.status === "pending" && !collectIds.includes(p.id),
              ).length
            }
            pending
          </Badge>
        </div>
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
          {pending.map((item) => (
            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-primary">
                {item.orderId}
              </td>
              <td className="px-4 py-3 text-sm font-medium">
                {item.patientName}
              </td>
              <td className="px-4 py-3 text-sm">{item.testName}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {TESTS.find((t) => t.id === item.testId)?.sampleType ?? "N/A"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {item.date}
              </td>
              <td className="px-4 py-3">
                {item.status === "collected" ||
                collectIds?.includes(item.id) ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 px-3 py-1.5 rounded-md cursor-default">
                    <CheckCircle className="w-3 h-3" />
                    Sample Collected
                  </span>
                ) : (
                  <Btn
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenModal(item)}
                  >
                    <Droplets className="w-3 h-3" />
                    Collect
                  </Btn>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      {showCollection && (
        <Modal
          title="Sample Collection Form"
          onClose={() => setShowCollection(null)}
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
                <strong>{showCollection.patientName}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Test:</span>{" "}
                <strong>{showCollection.testName}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Order:</span>{" "}
                <span className="font-mono text-primary">
                  {showCollection.orderId}
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
                placeholder="e.g. Serum, Urine, Whole Blood"
              />
            </FormField>

            <FormField label="Collector Name" required>
              <Input
                value={collectorName}
                onChange={(e) => setCollectorName(e.target.value)}
                placeholder="Enter collector's name"
              />
            </FormField>

            <FormField label="Tube/Container Type" required>
              <Select
                value={containerType}
                onChange={(e) => setContainerType(e.target.value)}
              >
                <option value="EDTA (Purple)">EDTA (Purple)</option>
                <option value="Serum (Red)">Serum (Red)</option>
                <option value="Urine Cup">Urine Cup</option>
                <option value="Heparin (Green)">Heparin (Green)</option>
              </Select>
            </FormField>

            <FormField label="Notes">
              <textarea
                className="w-full px-3 py-2 text-sm bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                rows={2}
                placeholder="Any notes about collection…"
              />
            </FormField>

            <div className="flex justify-end gap-3">
              <Btn variant="secondary" onClick={() => setShowCollection(null)}>
                Cancel
              </Btn>
              <Btn variant="primary" onClick={handleMarkCollected}>
                <CheckCircle className="w-3.5 h-3.5" />
                Mark Collected
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

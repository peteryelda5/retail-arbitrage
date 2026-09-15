import DeviceForm from "@/components/DeviceForm";

export default function NewDevicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Register a device</h1>
        <p className="text-sm text-muted mt-1">
          Add a new phone before it can start sending scans
        </p>
      </div>
      <DeviceForm />
    </div>
  );
}
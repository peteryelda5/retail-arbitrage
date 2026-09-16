import StoreForm from "@/components/StoreForm";

export default function NewStorePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Add a store</h1>
        <p className="text-sm text-muted mt-1">Register a store location for a retailer</p>
      </div>
      <StoreForm />
    </div>
  );
}
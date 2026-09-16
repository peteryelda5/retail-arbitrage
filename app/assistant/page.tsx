import ChatInterface from "@/components/ChatInterface";

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Arbiter Assistant</h1>
        <p className="text-sm text-muted mt-1">
          Chat interface — not yet connected to live opportunity data
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}

"use client";

import { useState } from "react";

interface Narrative {
  whyLikes: string;
  whatCanGoWrong: string;
  whyQuantity: string;
}

export default function NarrativeSection({ narrative }: { narrative: Narrative }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2 pt-2 border-t border-border">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-accent hover:underline"
      >
        {expanded ? "Hide AI analysis \u2212" : "Show AI analysis +"}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 text-xs">
          <div>
            <span className="text-muted font-medium">Why Arbiter likes it: </span>
            <span className="text-gray-200">{narrative.whyLikes}</span>
          </div>
          <div>
            <span className="text-muted font-medium">What can go wrong: </span>
            <span className="text-gray-200">{narrative.whatCanGoWrong}</span>
          </div>
          <div>
            <span className="text-muted font-medium">Why this quantity: </span>
            <span className="text-gray-200">{narrative.whyQuantity}</span>
          </div>
        </div>
      )}
    </div>
  );
}

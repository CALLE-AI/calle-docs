import { type ReactNode, useEffect, useState } from "react";
import { Markdown } from "zudoku/components";
import { fetchRegions } from "../regions.mjs";

export const RegionsTable = ({
  children,
  snapshotDate,
}: {
  children: ReactNode;
  snapshotDate: string;
}) => {
  const [coverage, setCoverage] = useState<string | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchRegions()
      .then((content) => {
        if (active) setCoverage(content);
      })
      .catch(() => {
        if (active) setRefreshFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      className="overflow-x-auto"
      role="region"
      aria-label="Region and language coverage"
      tabIndex={0}
    >
      {refreshFailed && (
        <p role="status">
          Could not refresh coverage. Showing the published snapshot from{" "}
          {snapshotDate}.
        </p>
      )}
      {coverage ? <Markdown content={coverage} /> : children}
    </div>
  );
};

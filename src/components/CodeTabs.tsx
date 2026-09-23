import { type ComponentProps, useEffect, useState } from "react";
import { CodeTabs as ZudokuCodeTabs } from "zudoku/ui/CodeTabs";

export function CodeTabs(props: ComponentProps<typeof ZudokuCodeTabs>) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  // Prerendered controls must stay disabled until their handlers are attached.
  return (
    <fieldset disabled={!ready} aria-busy={!ready} className="min-w-0">
      <ZudokuCodeTabs {...props} />
    </fieldset>
  );
}

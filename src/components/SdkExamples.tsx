import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "zudoku/ui/Tabs.js";

type Language = "typescript" | "python";
const ExampleLanguage = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  ready: boolean;
} | null>(null);

export function SdkExamples({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<Language>("typescript");
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  return (
    <ExampleLanguage.Provider value={{ language, setLanguage, ready }}>
      {children}
    </ExampleLanguage.Provider>
  );
}

export function SdkExample({ label, children }: PropsWithChildren<{ label: string }>) {
  const selection = useContext(ExampleLanguage);
  if (!selection) throw new Error("SdkExample requires SdkExamples");
  return (
    <fieldset disabled={!selection.ready} aria-busy={!selection.ready}
      aria-label={label} className="sdk-example-fieldset">
      <Tabs className="sdk-example" value={selection.language} onValueChange={(value) => {
        if (value === "typescript" || value === "python") selection.setLanguage(value);
      }}>
        <TabsList className="sdk-example-tabs" aria-label="Example language">
          <TabsTrigger value="typescript">TypeScript</TabsTrigger>
          <TabsTrigger value="python">Python</TabsTrigger>
        </TabsList>
        {children}
      </Tabs>
    </fieldset>
  );
}

export function SdkExamplePanel({ language, children }: PropsWithChildren<{ language: Language }>) {
  return <TabsContent value={language} className="sdk-example-panel">{children}</TabsContent>;
}

import { useState } from "react";
import { ThresholdProvider } from "./context/ThresholdContext";
import { PortfolioView } from "./components/PortfolioView";
import { SkuDetail } from "./components/SkuDetail";
import type { SkuHealth } from "./engine/types";
import "./styles.css";

function App() {
  const [selectedSku, setSelectedSku] = useState<SkuHealth | null>(null);

  return (
    <ThresholdProvider>
      <PortfolioView onSelectSku={setSelectedSku} />
      {selectedSku && (
        <SkuDetail health={selectedSku} onBack={() => setSelectedSku(null)} />
      )}
    </ThresholdProvider>
  );
}

export default App;

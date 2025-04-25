import { TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export function Results() {
  return (
    <TabsContent key="results" value="results" asChild>
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6"
    >
      <h2 className="text-xl text-gray-01 mb-4">
        Resultatöversikt
      </h2>
      <p className="text-gray-02">
        Här kommer resultaten att visas när bearbetningen är klar.
      </p>
    </motion.div>
  </TabsContent>
  );
}

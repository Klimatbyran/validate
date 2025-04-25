import { QueueGrid } from "@/components/ui/queue-grid";
import { TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export function JobStatus() {
  return (
    <TabsContent key="grid" value="grid" asChild>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="space-y-6"
      >
        <QueueGrid />
      </motion.div>
    </TabsContent>
  );
}

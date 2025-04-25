import { QueueStatus } from "@/components/ui/queue-status";
import { TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export function Processing() {
  return (
    <TabsContent key="processing" value="processing" asChild>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="space-y-6"
      >
        <QueueStatus />
      </motion.div>
    </TabsContent>
  );
}

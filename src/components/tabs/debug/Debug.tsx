import { DebugView } from "@/components/ui/debug-view";
import { TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export function Debug() {
  return (
    <TabsContent key="debug" value="debug" asChild>
      <motion.div>
        <DebugView />
      </motion.div>
    </TabsContent>
  );
}

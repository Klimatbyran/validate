import { TabsContent } from "@/components/ui/tabs";
import { WorkflowDiagram } from "@/components/ui/workflow-diagram";
import { motion } from "framer-motion";

export function ProcessFlow() {
  return (
    <TabsContent key="workflow" value="workflow" asChild>
      <motion.div>
        <WorkflowDiagram />
      </motion.div>
    </TabsContent>
  );
}

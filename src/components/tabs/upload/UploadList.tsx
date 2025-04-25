import { Button } from "@/components/ui/button";
import { UploadedFile, UrlInput } from "./Upload";
import { motion } from "framer-motion";
import { ArrowRight, File, Link2 } from "lucide-react";

export interface UploadListProps {
  uploadedFiles: UploadedFile[];
  processedUrls: UrlInput[];
  uploadMode: "file" | "url";
  handleContinue: () => void;
}

export function UploadList({
  uploadedFiles,
  processedUrls,
  uploadMode,
  handleContinue,
}: UploadListProps) {
  return (
    <>
      {(uploadedFiles.length > 0 || processedUrls.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-04/80 backdrop-blur-sm rounded-lg"
        >
          <div className="p-4 border-b border-gray-03 flex justify-between items-center">
            <h2 className="text-lg text-gray-01">
              {uploadMode === "file"
                ? `Uploaded files (${uploadedFiles.length})`
                : `Added links (${processedUrls.length})`}
            </h2>
            <Button variant="primary" onClick={handleContinue}>
              See results
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <ul className="divide-y divide-gray-03">
            {uploadMode === "file"
              ? uploadedFiles.map(({ file, id, company }) => (
                  <motion.li
                    key={id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 flex items-center space-x-4"
                  >
                    <File className="w-6 h-6 text-orange-03" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-01">{file.name}</p>
                      <p className="text-sm text-gray-02">
                        Company: {company} •{" "}
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </motion.li>
                ))
              : processedUrls.map(({ url, id, company }) => (
                  <motion.li
                    key={id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 flex items-center space-x-4"
                  >
                    <Link2 className="w-6 h-6 text-orange-03" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-01 break-all">{url}</p>
                      <p className="text-sm text-gray-02">Company: {company}</p>
                    </div>
                  </motion.li>
                ))}
          </ul>
        </motion.div>
      )}
    </>
  );
}

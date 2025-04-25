import { FileText, FileUp, Link2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { motion } from 'framer-motion';
import { Button } from "../../ui/button";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { UploadList } from "./UploadList";

export interface UploadedFile {
  file: File;
  id: string;
  company: string;
}

export interface UrlInput {
  url: string;
  id: string;
  company: string;
}

interface UploadProps {
  changeTab: (tab: string) => void;
  refresh: () => void;
}


export function Upload({changeTab, refresh}: UploadProps) {
  const [isDragging, setIsDragging] = useState(false);  
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [processedUrls, setProcessedUrls] = useState<UrlInput[]>([]);
  const [autoApprove, setAutoApprove] = useState(true);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );

    if (files.length === 0) {
      toast.error('Only PDF files are allowed');
      return;
    }

    const newFiles = files.map(file => ({
      file,
      id: crypto.randomUUID(),
      company: file.name.split('_')[0]
    }));

    setUploadedFiles(prev => {
      const updatedFiles = [...prev, ...newFiles];
      toast.success(`${files.length} file${files.length === 1 ? '' : 's'} uploaded`);
      return updatedFiles;
    });
  }, []);

  const handleUrlSubmit = useCallback(async () => {
    // Split the input by newlines and filter out empty lines
    const urls = urlInput.split('\n')
      .map(url => url.trim())
      .filter(url => url)
      // ignorera om filerna slutar på pdf eller ej- vissa kommer inte göra det men ändå vara giltiga pdf:er.

    if (urls.length === 0) {
      toast.error('No valid PDF links found');
      return;
    }

    // Create jobs for each URL
    const jobs = urls.map(url => ({
      name: 'process-pdf',
      data: {
        url,
        threadId: crypto.randomUUID().replace(/-/g, ''),
        autoApprove: Boolean(autoApprove), // Use boolean instead of string
        messageId: crypto.randomUUID().replace(/-/g, '')
      },
      options: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    }));

    // Send jobs to the API
    try {
      const responses = await Promise.all(jobs.map(async job => {
        console.log('Sending job:', job);

        const response = await fetch('/api/queues/nlmParsePDF/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(job)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Job submission error:', errorText);
          throw new Error(`Failed to add job: ${errorText}`);
        }

        return response.json();
      }));

      console.log('Queue responses:', responses);

      const newUrls = urls.map(url => ({
        url,
        id: crypto.randomUUID(),
        company: new URL(url).hostname.split('.')[0]
      }));

      setProcessedUrls(prev => {
        const updatedUrls = [...prev, ...newUrls];
        toast.success(`${urls.length} link${urls.length === 1 ? '' : 's'} added`);
        return updatedUrls;
      });

      // Clear the input field
      setUrlInput('');
    } catch (error) {
      console.error('Failed to add jobs:', error);
      toast.error(`Could not add jobs: ${error.message}`);
    }
  }, [urlInput, autoApprove]);

  const handleContinue = useCallback(() => {
    const totalItems = uploadedFiles.length + processedUrls.length;
    if (totalItems === 0) {
      toast.error('Add files or links first');
      return;
    }

    changeTab('processing');
    refresh(); // Refresh data when switching to processing tab
    toast('Start processing...', {
      description: `${totalItems} ${uploadMode === 'file' ? 'file' : 'link'}${totalItems === 1 ? '' : 's'} are processed`,
    });
  }, [uploadedFiles.length, processedUrls.length, uploadMode, refresh, changeTab]);

  return (
    <>
      <TabsContent key="upload" value="upload" asChild>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
        >
          <div className="space-y-6">
            {/* Upload Mode Tabs */}
            <Tabs
              value={uploadMode}
              onValueChange={setUploadMode as (value: string) => void}
              className="w-full"
            >
              <TabsList className="inline-flex bg-gray-04/50 p-1 rounded-full">
                <TabsTrigger value="file" className="rounded-full">
                  <FileText className="w-4 h-4 mr-2" />
                  Files
                </TabsTrigger>
                <TabsTrigger value="url" className="rounded-full">
                  <Link2 className="w-4 h-4 mr-2" />
                  Links
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                          border-2 border-dashed rounded-lg p-12
                          flex flex-col items-center justify-center
                          transition-all duration-200
                          bg-gray-04/50 backdrop-blur-sm
                          ${
                            isDragging
                              ? "border-orange-03 bg-orange-05/10"
                              : "border-gray-03 hover:border-gray-02"
                          }
                        `}
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FileUp
                      className={`w-12 h-12 mb-4 ${
                        isDragging ? "text-orange-03" : "text-gray-02"
                      }`}
                    />
                  </motion.div>
                  <p className="text-lg text-gray-01 text-center">
                      Drag and drop PDF files here
                    <br />
                    <span className="text-sm text-gray-02">
                      or click to select files
                    </span>
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="url">
                <div className="space-y-4">
                  <div className="bg-gray-04/50 backdrop-blur-sm rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-medium text-gray-01">
                        Paste PDF links (one per line)
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-02">
                          Auto-approve
                        </span>
                        <button
                          onClick={() => setAutoApprove(!autoApprove)}
                          className={`
                                  relative inline-flex h-6 w-11 items-center rounded-full
                                  transition-colors focus-visible:outline-none
                                  focus-visible:ring-2 focus-visible:ring-ring
                                  focus-visible:ring-offset-2
                                  ${autoApprove ? "bg-green-03" : "bg-gray-03"}
                                `}
                        >
                          <span
                            className={`
                                    inline-block h-4 w-4 transform rounded-full
                                    bg-white transition-transform
                                    ${
                                      autoApprove
                                        ? "translate-x-6"
                                        : "translate-x-1"
                                    }
                                  `}
                          />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/rapport.pdf&#10;https://example.com/rapport2.pdf"
                      className="w-full h-32 bg-gray-03/20 border border-gray-03 rounded-lg p-3 text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
                    />
                    <div className="mt-4 flex justify-end">
                      <Button
                        onClick={handleUrlSubmit}
                        disabled={!urlInput.trim()}
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        Add links
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <UploadList uploadedFiles={uploadedFiles} processedUrls={processedUrls} uploadMode={uploadMode} handleContinue={handleContinue}/>           
          </div>
        </motion.div>
      </TabsContent>
    </>
  );
}

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/ui/header';
import { Toaster } from '@/components/ui/sonner';
import { Upload } from './components/tabs/upload/Upload';
import { Processing } from './components/tabs/processing/Processing';
import { JobStatus } from './components/tabs/job-status/JobStatus';
import { ProcessFlow } from './components/tabs/process-flow/ProcessFlow';
import { Results } from './components/tabs/results/Results';
import { Debug } from './components/tabs/debug/Debug';


function App() {
  const [currentTab, setCurrentTab] = useState('upload');

  return (
    <div className="min-h-screen bg-gray-05 p-8">
      <Toaster />
      <div className="max-w-[1400px] mx-auto">
        <Header />

        <Tabs 
          value={currentTab} 
          onValueChange={(value) => {
            setCurrentTab(value);
          }} 
          className="space-y-6"
        >
          <TabsList className="bg-gray-04/50 backdrop-blur-sm">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="grid">Job Status</TabsTrigger>
            <TabsTrigger value="workflow">Process Flow</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait" initial={false}>
            <Upload changeTab={setCurrentTab}/>
            <Processing/>
            <JobStatus/>
            <ProcessFlow/>
            <Debug/>
            <Results />           
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
}

export default App;

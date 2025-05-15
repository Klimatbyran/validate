import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WORKFLOW_STAGES } from "@/lib/constants";
import { toast } from "sonner";
import { JobDetailsDialog } from "./job-details-dialog";
import type { Job } from "@/lib/types";
import { useCompanyProcesses } from "@/hooks/useCompanyProcesses";

export function QueueGrid() {
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(
    new Set()
  );
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { companies, isLoading, refresh, error, isError } =
    useCompanyProcesses();

  // Function to toggle company expansion
  const toggleCompanyExpansion = (companyKey: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(companyKey)) {
        next.delete(companyKey);
      } else {
        next.add(companyKey);
      }
      return next;
    });
  };

  // Function to toggle all companies
  const toggleAllCompanies = () => {
    if (expandedCompanies.size === companies.length) {
      setExpandedCompanies(new Set());
      toast.info("Minimerade alla företag");
    } else {
      setExpandedCompanies(
        new Set(companies.map((c) => c.company || "unknown"))
      );
      toast.info("Expanderade alla företag");
    }
  };

  const handleRefresh = () => {
    toast.promise(refresh(), {
      loading: "Uppdaterar jobbstatus...",
      success: "Jobbstatus uppdaterad",
      error: "Kunde inte uppdatera jobbstatus",
    });
  };

  // Function to handle job approval
  const handleApprove = (approved: boolean) => {
    toast.promise(
      // This would be your actual API call
      new Promise((resolve) => setTimeout(resolve, 1000)),
      {
        loading: "Sparar beslut...",
        success: `Jobb ${approved ? "godkänt" : "avvisat"}`,
        error: "Kunde inte spara beslut",
      }
    );
  };

  // Function to handle job retry
  const handleRetry = () => {
    toast.promise(
      // This would be your actual API call
      new Promise((resolve) => setTimeout(resolve, 1000)),
      {
        loading: "Startar om jobb...",
        success: "Jobb omstartat",
        error: "Kunde inte starta om jobb",
      }
    );
  };

  const openJob = (job: Job) => {
    setSelectedJob(job);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 text-gray-02 animate-spin" />
      </div>
    );
  }

  if (companies) {
    const allExpanded = expandedCompanies.size === companies.length;

    const getJobStatusIcon = (job: Job) => {
      const needsApproval = false; // !job.data.approved && !job.data.autoApprove;

      if (needsApproval) {
        return <HelpCircle className="w-5 h-5 text-blue-03" />;
      }
      if (job.finishedOn) {
        if (job.isFailed) {
          return <XCircle className="w-5 h-5 text-pink-03" />;
        }
        return <CheckCircle2 className="w-5 h-5 text-green-03" />;
      }
      if (job.processedOn) {
        return <Clock className="w-5 h-5 text-blue-03 animate-spin" />;
      }
      return <Clock className="w-5 h-5 text-gray-02" />;
    };

    const getJobStatusColor = (job: Job) => {
      const needsApproval = false; // !job.data.approved && !job.data.autoApprove;

      if (needsApproval) return "text-blue-03";
      if (job.finishedOn) {
        return job.isFailed ? "text-pink-03" : "text-green-03";
      }
      if (job.processedOn) return "text-blue-03";
      return "text-gray-02";
    };

    const getJobStatusText = (job: Job) => {
      const needsApproval = false; // !job.data.approved && !job.data.autoApprove;

      if (needsApproval) return "Väntar på godkännande";
      if (job.finishedOn) {
        return job.isFailed ? "Misslyckad" : "Klar";
      }
      if (job.processedOn) return "Bearbetar";
      return "Väntar";
    };

    return (
      <div className="space-y-6">
        <JobDetailsDialog
          jobId={selectedJob?.id ?? "0"}
          queueName={selectedJob?.queue ?? ""}
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onApprove={handleApprove}
          onRetry={handleRetry}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h3 className="text-3xl text-gray-01">Process Overview</h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  className="text-gray-02 hover:text-gray-01"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllCompanies}
                  className="text-gray-02 hover:text-gray-01"
                >
                  {allExpanded ? (
                    <>
                      <ChevronsUp className="w-4 h-4 mr-2" />
                      Minimize all
                    </>
                  ) : (
                    <>
                      <ChevronsDown className="w-4 h-4 mr-2" />
                      Expand all
                    </>
                  )}
                </Button>
                <div className="text-sm text-gray-02">
                  {companies.length} companies
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-gray-03">
                  <th className="text-left p-4 text-gray-02 w-[300px]">
                    Company
                  </th>
                  <th className="text-left p-4 text-gray-02 w-[100px]">Year</th>
                  {WORKFLOW_STAGES.map((stage) => (
                    <th
                      key={stage.id}
                      className="text-center p-4 text-gray-02"
                      style={{ minWidth: "100px" }}
                    >
                      <div className="transform -rotate-45 origin-left translate-x-4">
                        {stage.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-03">
                {companies.map((company) => (
                  <React.Fragment key={company.company ?? "unknown"}>
                    {/* Company header row */}
                    <tr
                      className={`
                      transition-colors duration-200
                      ${
                        expandedCompanies.has(company.company ?? "unknown")
                          ? "bg-gray-03/10"
                          : ""
                      }
                      hover:bg-gray-03/5 cursor-pointer
                    `}
                      onClick={() =>
                        toggleCompanyExpansion(company.company ?? "unknown")
                      }
                    >
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 flex items-center justify-center">
                            {expandedCompanies.has(
                              company.company ?? "unknown"
                            ) ? (
                              <ChevronDown className="w-4 h-4 text-gray-02" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-02" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-01">
                              {company.company ?? "unknown"}
                            </div>
                            <div className="text-sm text-gray-02">
                              {company.processes.length} attempts
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-02">{2023 /*TODO */}</td>
                      {/* Summary status for all attempts */}
                      {WORKFLOW_STAGES.map((stage) => {
                        const allStatuses = company.processes.map(
                          (process) =>
                            process.jobs.find((job) => job.queue === stage.id)
                              ?.state || "pending"
                        );

                        const hasCompleted = allStatuses.includes("completed");
                        const hasFailed = allStatuses.includes("failed");
                        const hasProcessing =
                          allStatuses.includes("processing");

                        let icon;
                        let bgColor;

                        if (hasCompleted) {
                          icon = (
                            <CheckCircle2 className="w-5 h-5 text-green-03" />
                          );
                          bgColor = "bg-green-03/10";
                        } else if (hasFailed) {
                          icon = <XCircle className="w-5 h-5 text-pink-03" />;
                          bgColor = "bg-pink-03/10";
                        } else if (hasProcessing) {
                          icon = (
                            <Clock className="w-5 h-5 text-blue-03 animate-spin" />
                          );
                          bgColor = "bg-blue-03/10";
                        } else {
                          icon = <Clock className="w-5 h-5 text-gray-02" />;
                          bgColor = "";
                        }

                        return (
                          <td
                            key={stage.id}
                            className={`p-4 text-center ${bgColor}`}
                          >
                            <div className="flex items-center justify-center">
                              {icon}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Expanded content */}
                    {expandedCompanies.has(company.company ?? "unknown") && (
                      <tr>
                        <td
                          colSpan={WORKFLOW_STAGES.length + 2}
                          className="p-0"
                        >
                          <div className="bg-gray-03/5 p-4">
                            {/* Company description */}
                            {
                              <div className="mb-4 text-gray-02 bg-gray-04/50 p-4 rounded-lg">
                                <h4 className="text-gray-01 font-medium mb-2">
                                  Om företaget
                                </h4>
                                <p>Add Description</p>
                              </div>
                            }

                            {/* Attempts */}
                            <div className="space-y-4">
                              {company.processes.map((process, index) => (
                                <div
                                  key={process.id}
                                  className="bg-gray-04/50 rounded-lg overflow-hidden"
                                >
                                  <div className="p-4 border-b border-gray-03/20">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-gray-01 font-medium">
                                        Försök {index + 1} (2025)
                                      </h4>
                                    </div>
                                  </div>

                                  {/* Stage details */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                                    {WORKFLOW_STAGES.map((stage) => {
                                      const job = process.jobs?.find(
                                        (j) => j.queue === stage.id
                                      );
                                      if (!job) return null;

                                      const needsApproval = false; //!job.data.approved && !job.data.autoApprove;
                                      const statusColor = needsApproval
                                        ? "bg-blue-03/10"
                                        : job.state === "failed"
                                        ? "bg-pink-03/10"
                                        : job.state === "completed"
                                        ? "bg-green-03/10"
                                        : job.state === "active"
                                        ? "bg-blue-03/10"
                                        : "bg-gray-03/10";

                                      return (
                                        <button
                                          key={stage.id}
                                          className={`
                                          ${statusColor} rounded-lg p-4 text-left
                                          transition-colors duration-200
                                          hover:bg-gray-03/20
                                        `}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            console.log(job);
                                            setSelectedJob(job);
                                            setIsDialogOpen(true);
                                          }}
                                        >
                                          <div className="flex items-center space-x-2 mb-2">
                                            <span
                                              className={getJobStatusColor(job)}
                                            >
                                              {getJobStatusIcon(job)}
                                            </span>
                                            <h5 className="font-medium text-gray-01">
                                              {stage.name}
                                            </h5>
                                          </div>
                                          <div className="text-sm text-gray-02">
                                            {getJobStatusText(job)}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    );
  }
}

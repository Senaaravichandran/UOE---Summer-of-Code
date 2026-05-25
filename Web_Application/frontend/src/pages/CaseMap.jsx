import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Clock,
  FileText,
  Shield,
  ChevronRight,
  X,
  Activity,
  User,
  Layers,
  Archive,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Tag,
  Loader,
} from "lucide-react";

// Detailed ABI for CrimeLifeCycle contract functions we need
const contractABI = [
  "function getDetailedActivityLog(uint256 _caseId) view returns (tuple(uint256 activityId, uint256 timestamp, uint8 activityType, string details, address actor, uint256 caseId, bool hasEvidence, tuple(uint256 evidenceId, string mediaHash, string description, string dateTime) evidence, bool hasQuery, tuple(uint256 queryId, string question, string answer) query, bool hasAuthority, address authorityAddress)[])",
  "function getCase(uint256 _caseId) view returns (uint256, string, string, string, bool)",
  "function getActivityCount(uint256 _caseId) view returns (uint256)",
  "function getTotalCases() view returns (uint256)",
];

// Activity type enum to match Solidity contract
const ActivityType = {
  0: "CASE_CREATED",
  1: "EVIDENCE_ADDED",
  2: "QUERY_ADDED",
  3: "CASE_CLOSED",
  4: "AUTHORITY_ASSIGNED",
};

// Icon mapping for activity types
const ActivityIcon = {
  0: <Layers className="text-blue-400" />,
  1: <Archive className="text-green-400" />,
  2: <HelpCircle className="text-purple-400" />,
  3: <CheckCircle className="text-green-400" />,
  4: <Shield className="text-yellow-400" />,
};

function CaseMap() {
  const location = useLocation();
  const navigate = useNavigate();

  // Get caseId from location state or query params
  const caseId =
    location.state?.caseId ||
    new URLSearchParams(location.search).get("caseId");

  // State variables
  const [activities, setActivities] = useState([]);
  const [evidences, setEvidences] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [caseDetails, setCaseDetails] = useState({
    caseId: 0,
    location: "",
    videoHash: "",
    dateTime: "",
    isCaseOpen: true,
  });

  // Smart contract connection
  const contractAddress = "0xA89eD77B141bB54AdD78d6a5d809D11010F278d7";

  useEffect(() => {
    // If no caseId, redirect back to the overview page
    if (!caseId) {
      navigate("/");
      return;
    }

    fetchCaseData();
    fetchEvidenceData();

    // Listen for evidence updates
    const handleEvidenceUpdate = (event) => {
      if (event.detail && event.detail.caseId === parseInt(caseId)) {
        fetchEvidenceData();
      }
    };

    window.addEventListener('evidenceAdded', handleEvidenceUpdate);

    return () => {
      window.removeEventListener('evidenceAdded', handleEvidenceUpdate);
    };
  }, [caseId]);

  const fetchEvidenceData = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/cases/case/${caseId}/evidence`
      );

      if (!response.ok) return;

      const result = await response.json();
      
      console.log("📋 Evidence data from API:", result);
      
      if (result.success) {
        const evidences = result.data.evidences || [];
        console.log("📋 Evidence array:", evidences);
        evidences.forEach((ev, idx) => {
          console.log(`Evidence ${idx}:`, {
            id: ev.id,
            mediaUrl: ev.mediaUrl,
            firebaseUrl: ev.firebaseUrl,
            description: ev.description
          });
        });
        setEvidences(evidences);
      }
    } catch (error) {
      console.error("Error fetching evidence:", error);
    }
  };

  const fetchCaseData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get user's wallet address
      const storedAccount = localStorage.getItem("walletAccount");
      
      if (!storedAccount) {
        setError("Please connect your wallet first");
        setIsLoading(false);
        return;
      }

      // Use backend API to fetch case data with auto-authorization
      const response = await fetch(
        `http://localhost:5000/api/cases/case/${caseId}/basic?userAddress=${storedAccount}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch case data");
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Failed to fetch case data");
      }

      const { case: caseData, authorities } = result.data;

      // Set case details
      setCaseDetails({
        caseId: Number(caseData[0]),
        location: caseData[1],
        videoHash: caseData[2],
        dateTime: caseData[3],
        isCaseOpen: caseData[4],
      });

      // For now, set empty activities since we're having RPC issues
      // You can expand this later when RPC issues are resolved
      setActivities([]);
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching case data:", err);
      setError(err.message || "Failed to fetch case data");
      setIsLoading(false);
    }
  };

  // Function to format timestamp to readable date
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  // Function to truncate addresses/hashes
  const truncateHash = (hash) => {
    if (!hash) return "";
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  // Function to open activity details modal
  const openActivityDetails = (activity) => {
    setSelectedActivity(activity);
    setIsDetailModalOpen(true);
  };

  // Function to close activity details modal
  const closeActivityDetails = () => {
    setIsDetailModalOpen(false);
    setSelectedActivity(null);
  };

  // Function to get appropriate badge color based on activity type
  const getBadgeColorClass = (activityType) => {
    switch (parseInt(activityType)) {
      case 0:
        return "bg-blue-900 text-blue-200"; // CASE_CREATED
      case 1:
        return "bg-green-900 text-green-200"; // EVIDENCE_ADDED
      case 2:
        return "bg-purple-900 text-purple-200"; // QUERY_ADDED
      case 3:
        return "bg-[rgba(0,230,143,0.3)] text-green-300"; // CASE_CLOSED
      case 4:
        return "bg-yellow-900 text-yellow-200"; // AUTHORITY_ASSIGNED
      default:
        return "bg-gray-900 text-gray-200";
    }
  };

  // Display loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader className="animate-spin h-10 w-10 text-green-500 mb-4" />
          <h2 className="text-xl font-medium">
            Loading case data from blockchain...
          </h2>
          <p className="text-gray-400 mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  // Display error state
  if (error) {
    // Function to extract user-friendly message from blockchain error
    const extractErrorMessage = (errorString) => {
      // Check if it's a blockchain error with a reason
      const reasonMatch = errorString.match(/reason="([^"]+)"/);
      if (reasonMatch && reasonMatch[1]) {
        return reasonMatch[1]; // Return the human-readable reason
      }

      // Check for other common error patterns
      const revertMatch = errorString.match(/execution reverted: "([^"]+)"/);
      if (revertMatch && revertMatch[1]) {
        return revertMatch[1];
      }

      // If no specific pattern found, return the original error
      // but truncate if too long
      return errorString;
    };

    // Format technical details with ellipsis for long hexadecimal values
    const formatTechnicalDetails = (errorString) => {
      // Replace long hex data with truncated version
      return errorString.replace(
        /(0x[a-f0-9]{10})[a-f0-9]+(data=|to:|")/g,
        "$1...$2"
      );
    };

    const userFriendlyMessage = extractErrorMessage(error);
    const technicalDetails = formatTechnicalDetails(error);

    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-[rgba(0,230,143,0.1)] border border-green-500 rounded-lg p-6 max-w-md mx-4">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle size={24} className="text-green-500" />
            <h2 className="text-xl font-medium">Error Loading Case</h2>
          </div>

          {/* User-friendly error message */}
          <p className="mb-2 font-medium text-green-400">{userFriendlyMessage}</p>

          {/* Technical details with ellipsis */}
          <details className="mb-4">
            <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
              Technical details
            </summary>
            <div className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-300 overflow-x-auto">
              <code className="break-all whitespace-pre-wrap">
                {technicalDetails}
              </code>
            </div>
          </details>

          <p className="text-gray-300 mb-6">
            Please check your connection to the blockchain and ensure you have
            the proper permissions to access this case.
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg mr-2"
            >
              Back to Overview
            </button>
            <button
              onClick={fetchCaseData}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg flex items-center space-x-1"
            >
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow border-b border-gray-700">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl">
              <span className="bg-gradient-to-tr from-green-400 via-green-500 to-green-600 bg-clip-text text-transparent">
                Case #{caseDetails.caseId || "Loading"}
              </span>{" "}
              <span className="text-gray-300 text-xl">Activity Blockchain</span>
            </h1>
            <div className="flex items-center space-x-2">
              <div className="bg-gray-700 text-gray-200 rounded-lg px-3 py-1 text-sm flex items-center space-x-1">
                <Activity size={16} />
                <span>Synced</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex flex-col space-y-4">
          {/* Blockchain stats */}
          <div className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">Smart Contract</span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="font-mono text-green-400">
                    {truncateHash(contractAddress)}
                  </span>
                  <Tag size={16} className="text-gray-500" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">Latest Activity</span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="font-mono">
                    {activities.length > 0 ? activities[0].activityId : 0}
                  </span>
                  <Clock size={16} className="text-gray-500" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400 text-sm">Case Status</span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="font-medium">
                    {caseDetails.isCaseOpen ? "Active" : "Closed"}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      caseDetails.isCaseOpen
                        ? "bg-green-500 animate-pulse"
                        : "bg-[rgba(0,230,143,0.5)]"
                    }`}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Section */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <FileText className="mr-2" size={20} />
              Evidence ({evidences.length})
            </h3>
            
            {evidences.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {evidences.map((evidence, index) => (
                  <div key={evidence.id || index} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Evidence #{evidence.id || index + 1}</span>
                      <span className="text-xs text-gray-500">{new Date(evidence.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm mb-2">{evidence.description}</p>
                    {(evidence.firebaseUrl || evidence.mediaUrl) && (
                      <div className="text-xs">
                        {(() => {
                          const url = evidence.firebaseUrl || evidence.mediaUrl;
                          // Check if it's a full URL or just a filename
                          const isFullUrl = url && (url.startsWith('http://') || url.startsWith('https://'));
                          const finalUrl = isFullUrl ? url : `http://localhost:5173/${url}`;
                          
                          return (
                            <a 
                              href={finalUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 break-all"
                            >
                              View File {!isFullUrl && <span className="text-xs text-gray-500">(Legacy)</span>}
                            </a>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>No evidence added yet</p>
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Clock className="mr-2" size={20} />
              Activity Timeline ({activities.length})
            </h3>

          {/* Blockchain visualization */}
          <div className="relative">
            {/* Connection lines */}
            <div className="absolute left-6 top-10 bottom-10 w-1 bg-gradient-to-b from-gray-600 to-gray-800 z-0"></div>

            {/* Activity blocks */}
            <div className="space-y-6 relative z-10">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div
                    key={activity.activityId}
                    className="flex"
                    onClick={() => openActivityDetails(activity)}
                  >
                    {/* Block number indicator */}
                    <div className="w-12 h-12 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center mr-4 shadow-lg">
                      <span className="font-bold">{activity.activityId}</span>
                    </div>

                    {/* Block content */}
                    <div className="flex-1 bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-700 overflow-hidden">
                      {/* Block header */}
                      <div className="bg-gray-700 px-4 py-2 flex justify-between items-center border-b border-gray-600">
                        <div className="flex items-center space-x-2">
                          {ActivityIcon[activity.activityType]}
                          <span className="font-medium">
                            {ActivityType[activity.activityType]}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-400 text-sm">
                          <Clock size={14} />
                          <span>{formatTimestamp(activity.timestamp)}</span>
                        </div>
                      </div>

                      {/* Block content */}
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-400 mb-1">
                              Transaction
                            </p>
                            <p className="font-mono text-green-400">
                              {truncateHash(activity.txHash)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-1">
                              Initiator
                            </p>
                            <p className="font-mono">
                              {truncateHash(activity.actor)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-sm text-gray-400 mb-1">Details</p>
                          <p className="text-gray-300">{activity.details}</p>
                        </div>

                        {/* Activity-specific preview */}
                        {activity.activityType === 2 && activity.hasQuery && (
                          <div className="mt-4 bg-gray-900 p-3 rounded-lg border border-gray-700">
                            <p className="text-sm text-purple-400 mb-1">
                              Query #{activity.query.queryId}
                            </p>
                            <p className="text-gray-300">
                              "{activity.query.question}"
                            </p>
                          </div>
                        )}

                        {activity.activityType === 1 &&
                          activity.hasEvidence && (
                            <div className="mt-4 bg-gray-900 p-3 rounded-lg border border-gray-700">
                              <p className="text-sm text-green-400 mb-1">
                                Evidence #{activity.evidence.evidenceId}
                              </p>
                              <p className="text-gray-300">
                                {activity.evidence.description}
                              </p>
                            </div>
                          )}

                        {activity.activityType === 4 &&
                          activity.hasAuthority && (
                            <div className="mt-4 bg-gray-900 p-3 rounded-lg border border-gray-700">
                              <p className="text-sm text-yellow-400 mb-1">
                                New Authority
                              </p>
                              <p className="text-gray-300 font-mono">
                                {truncateHash(activity.authorityAddress)}
                              </p>
                            </div>
                          )}
                      </div>

                      {/* Block footer */}
                      <div className="bg-gray-700 px-4 py-2 flex justify-between items-center border-t border-gray-600">
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <span>Block #{activity.activityId}</span>
                          <span>•</span>
                          <span>Case #{activity.caseId}</span>
                        </div>
                        <button className="text-gray-400 hover:text-white">
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-gray-800 rounded-lg p-6 text-center">
                  <AlertTriangle
                    size={36}
                    className="mx-auto mb-4 text-yellow-400"
                  />
                  <h3 className="text-xl font-medium mb-2">
                    No activities found
                  </h3>
                  <p className="text-gray-400">
                    There are no activities recorded for this case yet, or you
                    may not have permission to view them.
                  </p>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      </main>

      {/* Detailed Activity Modal */}
      {isDetailModalOpen && selectedActivity && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4">
            {/* Modal header */}
            <div className="bg-gray-700 px-6 py-4 flex justify-between items-center border-b border-gray-600 sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                {ActivityIcon[selectedActivity.activityType]}
                <div>
                  <h3 className="text-lg font-medium">
                    {ActivityType[selectedActivity.activityType]}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Activity #{selectedActivity.activityId} | Case #
                    {selectedActivity.caseId}
                  </p>
                </div>
              </div>
              <button
                className="text-gray-400 hover:text-white"
                onClick={closeActivityDetails}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal content */}
            <div className="p-6">
              {/* Transaction info */}
              <div className="border border-gray-700 rounded-lg overflow-hidden mb-6">
                <div className="bg-gray-700 px-4 py-2 border-b border-gray-600">
                  <h4 className="font-medium">Transaction Details</h4>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">
                        Transaction Hash
                      </p>
                      <p className="font-mono text-green-400 break-all">
                        {selectedActivity.txHash}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Timestamp</p>
                      <p className="font-mono">
                        {formatTimestamp(selectedActivity.timestamp)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400 mb-1">
                      Initiator Address
                    </p>
                    <p className="font-mono break-all">
                      {selectedActivity.actor}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400 mb-1">
                      Contract Address
                    </p>
                    <p className="font-mono break-all">{contractAddress}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400 mb-1">Activity Type</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${getBadgeColorClass(
                          selectedActivity.activityType
                        )}`}
                      >
                        {ActivityType[selectedActivity.activityType]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity specific details */}
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <div className="bg-gray-700 px-4 py-2 border-b border-gray-600">
                  <h4 className="font-medium">Activity Details</h4>
                </div>
                <div className="p-4">
                  <p className="mb-4">{selectedActivity.details}</p>

                  {/* CASE_CREATED specific details */}
                  {selectedActivity.activityType === 0 && (
                    <div className="bg-blue-900 bg-opacity-20 border border-blue-800 rounded-lg p-4">
                      <h5 className="text-blue-400 font-medium mb-2 flex items-center">
                        <Layers size={18} className="mr-2" /> Case Created
                      </h5>
                      <p className="text-gray-300">
                        A new case was created in the system at location:{" "}
                        {caseDetails.location}.
                      </p>
                      <p className="mt-2 text-gray-400 text-sm">
                        This is the genesis block for Case #
                        {selectedActivity.caseId}.
                      </p>
                    </div>
                  )}

                  {/* EVIDENCE_ADDED specific details */}
                  {selectedActivity.activityType === 1 &&
                    selectedActivity.hasEvidence && (
                      <div className="bg-green-900 bg-opacity-20 border border-green-800 rounded-lg p-4">
                        <h5 className="text-green-400 font-medium mb-2 flex items-center">
                          <Archive size={18} className="mr-2" /> Evidence #
                          {selectedActivity.evidence.evidenceId}
                        </h5>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-400">Description</p>
                            <p>{selectedActivity.evidence.description}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Date/Time</p>
                            <p>{selectedActivity.evidence.dateTime}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">
                              Media Hash (IPFS)
                            </p>
                            <p className="font-mono text-green-400 break-all">
                              {selectedActivity.evidence.mediaHash}
                            </p>
                          </div>
                          <div className="mt-4 flex justify-center">
                            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center w-full">
                              <FileText
                                size={48}
                                className="mx-auto mb-2 text-gray-500"
                              />
                              <p className="text-gray-400">
                                Evidence Media Preview
                              </p>
                              <button
                                className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-white text-sm"
                                onClick={() =>
                                  window.open(
                                    selectedActivity.evidence.mediaHash,
                                    "_blank"
                                  )
                                }
                              >
                                View Media
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* QUERY_ADDED specific details */}
                  {selectedActivity.activityType === 2 &&
                    selectedActivity.hasQuery && (
                      <div className="bg-purple-900 bg-opacity-20 border border-purple-800 rounded-lg p-4">
                        <h5 className="text-purple-400 font-medium mb-2 flex items-center">
                          <HelpCircle size={18} className="mr-2" /> Query #
                          {selectedActivity.query.queryId}
                        </h5>
                        <div className="space-y-4">
                          <div className="bg-gray-800 p-3 rounded-lg">
                            <p className="text-sm text-gray-400">Question</p>
                            <p className="mt-1 text-white">
                              {selectedActivity.query.question}
                            </p>
                          </div>
                          <div className="bg-gray-800 p-3 rounded-lg">
                            <p className="text-sm text-gray-400">Answer</p>
                            <p className="mt-1 text-white">
                              {selectedActivity.query.answer}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* AUTHORITY_ASSIGNED specific details */}
                  {selectedActivity.activityType === 4 &&
                    selectedActivity.hasAuthority && (
                      <div className="bg-yellow-900 bg-opacity-20 border border-yellow-800 rounded-lg p-4">
                        <h5 className="text-yellow-400 font-medium mb-2 flex items-center">
                          <Shield size={18} className="mr-2" /> Authority
                          Assignment
                        </h5>
                        <div>
                          <p className="text-sm text-gray-400">
                            New Authority Address
                          </p>
                          <p className="font-mono break-all">
                            {selectedActivity.authorityAddress}
                          </p>
                          <div className="mt-4 bg-gray-800 p-3 rounded-lg flex items-center space-x-3">
                            <User size={24} className="text-yellow-400" />
                            <div>
                              <p className="text-sm text-gray-400">
                                Assigned By
                              </p>
                              <p className="font-mono">
                                {truncateHash(selectedActivity.actor)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* CASE_CLOSED specific details */}
                  {selectedActivity.activityType === 3 && (
                    <div className="bg-[rgba(0,230,143,0.1)] border border-green-500 rounded-lg p-4">
                      <h5 className="text-green-400 font-medium mb-2 flex items-center">
                        <CheckCircle size={18} className="mr-2" /> Case Closed
                      </h5>
                      <p>
                        This case has been officially closed and secured on the
                        blockchain.
                      </p>
                      <div className="mt-4 bg-gray-800 p-3 rounded-lg flex items-center space-x-3">
                        <AlertTriangle size={24} className="text-green-400" />
                        <div>
                          <p className="text-sm text-gray-400">Note</p>
                          <p>
                            Once a case is closed, no further evidence or
                            queries can be added.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div className="mt-6 flex justify-end space-x-2">
                <button
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                  onClick={closeActivityDetails}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CaseMap;

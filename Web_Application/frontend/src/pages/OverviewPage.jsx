import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Camera,
  CameraOff,
  Cctv,
  CheckCircle,
  Zap,
  PlusCircle,
  MinusCircle,
  FileImage,
  UserPlus,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { FiRefreshCcw } from "react-icons/fi";
import { FaEdit } from "react-icons/fa";
import StatCard from "../components/common/StatCard";
import AlertOverviewChart from "../components/overview/AlertOverviewChart";
import CategoryDistributionChart from "../components/overview/CategoryDistributionChart";
import SalesChannelChart from "../components/overview/AlertSourcesChart";
import dashboardStats from "../../../backend/data/dashboardStats.json";
import { Player } from "@lottiefiles/react-lottie-player";
import crypto from "crypto";
import CaseMap from "./CaseMap";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";

const OverviewPage = () => {
  const navigate = useNavigate();

  const [showCaseMap, setShowCaseMap] = useState(false);

  const [stats, setStats] = useState(dashboardStats);
  const [isEditing, setIsEditing] = useState(false);
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [caseCount, setCaseCount] = useState(0);
  const [availableCases, setAvailableCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");

  // States for modals
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceImage, setEvidenceImage] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [contractWithSigner, setContractWithSigner] = useState(null);

  // Smart contract setuphttps
  const provider = new ethers.JsonRpcProvider(
    "https://open-campus-codex-sepolia.drpc.org"
  );
  const contractAddress = "0xA89eD77B141bB54AdD78d6a5d809D11010F278d7";
  const contractABI = [
    "function getTotalCases() view returns (uint256)",
    "function addEvidence(string _mediaHash, string _description, string _datetime, uint256 _caseId) public",
    "function assignAuthority(uint256 _caseId, address _authority) public",
    "function closeCase(uint256 _caseId) public",
  ];
  const contract = new ethers.Contract(contractAddress, contractABI, provider);

  const connectWallet = async () => {
    if (!window.ethereum)
      return alert("MetaMask not detected. Please install it");

    setIsLoading(true);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const providerInstance = new ethers.BrowserProvider(window.ethereum);
      const signer = await providerInstance.getSigner();
      const connectedContract = contract.connect(signer);

      // Store in state
      setContractWithSigner(connectedContract);

      const balance = await providerInstance.getBalance(accounts[0]);

      setAccount(accounts[0]);
      setBalance(ethers.formatEther(balance));

      localStorage.setItem("walletAccount", accounts[0]);
      localStorage.setItem("walletBalance", ethers.formatEther(balance));
    } catch (err) {
      console.error("Connection error:", err);
      alert("Connection Failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedAccount = localStorage.getItem("walletAccount");
    const savedBalance = localStorage.getItem("walletBalance");

    const initializeWallet = async () => {
      if (savedAccount && window.ethereum) {
        setAccount(savedAccount);
        setBalance(savedBalance);

        try {
          const providerInstance = new ethers.BrowserProvider(window.ethereum);
          const signer = await providerInstance.getSigner();
          const connectedContract = contract.connect(signer);
          setContractWithSigner(connectedContract);
        } catch (error) {
          console.error("Error initializing wallet:", error);
          // If there's an error, clear the saved data to force a fresh connection
          localStorage.removeItem("walletAccount");
          localStorage.removeItem("walletBalance");
          setAccount(null);
          setBalance(null);
        }
      }
    };

    initializeWallet();

    const fetchCaseCount = async () => {
      try {
        console.log("🔄 Fetching cases from backend...");
        
        // Fetch alerts from MongoDB to see which cases actually exist
        const alertsResponse = await fetch('http://localhost:5000/api/alerts/fetch-alerts');
        if (!alertsResponse.ok) {
          console.error("❌ Failed to fetch alerts:", alertsResponse.status);
          setAvailableCases([]);
          return;
        }
        
        const alertsData = await alertsResponse.json();
        console.log("📋 Total alerts fetched:", alertsData.length);
        
        // Filter alerts that have createdContract = "true" (string) and have blockchainCaseId
        const casesWithAlerts = alertsData
          .filter(alert => {
            const hasContract = alert.createdContract === "true" || alert.createdContract === true;
            const hasCaseId = alert.blockchainCaseId !== null && alert.blockchainCaseId !== undefined;
            if (hasContract || hasCaseId) {
              console.log(`✅ Alert ${alert._id}: createdContract="${alert.createdContract}", blockchainCaseId=${alert.blockchainCaseId}`);
            }
            return hasContract && hasCaseId;
          })
          .map(alert => alert.blockchainCaseId); // Use the actual blockchain case IDs
        
        console.log("🎯 Available cases:", casesWithAlerts);
        console.log("📊 Total cases:", casesWithAlerts.length);
        
        setAvailableCases(casesWithAlerts);
        setCaseCount(casesWithAlerts.length);
        
        if (casesWithAlerts.length > 0) {
          console.log("✅ Cases loaded successfully!");
        } else {
          console.log("⚠️ No cases found with createdContract='true' and blockchainCaseId");
        }
      } catch (error) {
        console.error("❌ Error fetching cases:", error);
        setAvailableCases([]);
      }
    };

    fetchCaseCount();
    
    // Auto-refresh cases every 5 seconds
    const intervalId = setInterval(fetchCaseCount, 5000);

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => {
        // Force reconnect when accounts change
        localStorage.removeItem("walletAccount");
        localStorage.removeItem("walletBalance");
        setAccount(null);
        setBalance(null);
        setContractWithSigner(null);
      });
    }

    return () => {
      // Clean up interval and listeners
      clearInterval(intervalId);
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged");
      }
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEvidenceFile(file); // Store the actual file object
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidenceImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const [evidenceFile, setEvidenceFile] = useState(null);

  // Modified handleEvidenceSubmit to upload to IPFS first
  const handleEvidenceSubmit = async (e) => {
    e.preventDefault();

    if (!contractWithSigner) {
      alert("Please connect your wallet first");
      return;
    }

    if (!selectedCaseId) {
      alert("Please select a Case ID");
      return;
    }

    if (!evidenceFile) {
      alert("Please select a file to upload as evidence");
      return;
    }

    try {
      setIsLoading(true);
      
      const formData = new FormData();
      formData.append("image", evidenceFile);

      // Upload to IPFS
      const uploadRes = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData
      });

      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        throw new Error(uploadData.message || "Upload failed");
      }

      // Use firebaseUrl (new) or cid (legacy) as the media hash
      const mediaHash = uploadData.firebaseUrl || uploadData.url || uploadData.cid;
      console.log("Uploaded evidence URL:", mediaHash);

      // Add to blockchain
      const blockchainRes = await fetch(
        `http://localhost:5000/api/cases/case/${selectedCaseId}/evidence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaHash,
            description: evidenceDescription,
            dateTime: new Date().toISOString()
          })
        }
      );

      const blockchainData = await blockchainRes.json();
      
      if (!blockchainData.success) {
        throw new Error(blockchainData.message || "Blockchain failed");
      }

      alert("Evidence added successfully!");
      
      // Notify CaseMap
      window.dispatchEvent(new CustomEvent('evidenceAdded', { 
        detail: { caseId: selectedCaseId } 
      }));
      
      setShowEvidenceModal(false);
      setEvidenceDescription("");
      setEvidenceImage(null);
      setEvidenceFile(null);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };
  const handleAssignSubmit = async (e) => {
    e.preventDefault();

    const storedAccount = localStorage.getItem("walletAccount");
    
    if (!storedAccount) {
      alert("Please connect your wallet first");
      return;
    }

    if (!selectedCaseId) {
      alert("Please select a Case ID");
      return;
    }

    if (!ethers.isAddress(walletAddress)) {
      alert("Please enter a valid Ethereum address");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/cases/case/${selectedCaseId}/assign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            authorityAddress: walletAddress,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to assign authority");
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Failed to assign authority");
      }

      alert(`Authority successfully assigned to: ${walletAddress}`);
      setWalletAddress("");
      setShowAssignModal(false);
    } catch (error) {
      console.error("Error assigning authority:", error);
      alert("Failed to assign authority: " + error.message);
    }
  };

  const handleCloseCase = async () => {
    const storedAccount = localStorage.getItem("walletAccount");
    
    if (!storedAccount) {
      alert("Please connect your wallet first");
      return;
    }

    if (!selectedCaseId) {
      alert("Please select a Case ID");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/cases/case/${selectedCaseId}/close`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to close case");
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Failed to close case");
      }

      alert("Case closed successfully!");
    } catch (error) {
      console.error("Error closing case:", error);
      alert("Failed to close case: " + error.message);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  };

  const pulseTitleVariants = {
    initial: { textShadow: "0 0 8px rgba(66, 153, 225, 0)" },
    animate: {
      textShadow: [
        "0 0 8px rgba(66, 153, 225, 0)",
        "0 0 15px rgba(66, 153, 225, 0.7)",
        "0 0 8px rgba(66, 153, 225, 0)",
      ],
      transition: {
        duration: 2.5,
        repeat: Infinity,
        repeatType: "loop",
      },
    },
  };

  const buttonHoverAnimation = {
    scale: 1.05,
    boxShadow: "0 0 15px rgba(59, 130, 246, 0.5)",
    transition: { duration: 0.2 },
  };

  function getFirstFourDecimalDigits(num) {
    let decimalPart = num.toString().split(".")[1] || "0000";
    decimalPart = (decimalPart + "0000").substring(0, 4);
    return `0.${decimalPart}`;
  }

  return (
    <div className="flex-1 overflow-auto relative z-10 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-100 min-h-screen">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-60 -left-60 w-96 h-96 bg-blue-500 opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-purple-500 opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/4 w-64 h-64 bg-cyan-500 opacity-10 rounded-full blur-3xl"></div>
      </div>

      <div className="flex justify-between items-center p-6 bg-gray-800/95 backdrop-blur-xl shadow-2xl border-b border-gray-700/90 sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <motion.div
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.6, type: "spring", bounce: 0.6 }}
            className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 rounded-xl shadow-lg ring-4 ring-blue-400/40"
          >
            <Cctv className="h-7 w-7 text-white drop-shadow-lg" />
          </motion.div>
          <div>
            <motion.h1
              className="text-3xl ml-4 font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-cyan-200 drop-shadow-md"
              variants={pulseTitleVariants}
              initial="initial"
              animate="animate"
            >
              Dashboard
            </motion.h1>
          </div>
        </div>
        <div className="flex items-center space-x-5">
          <div className="relative mr-2">
            <select
              className="bg-gray-700/90 text-white px-5 py-2.5 rounded-xl border border-gray-600 shadow-xl appearance-none cursor-pointer pr-12 hover:border-blue-500/70 focus:ring-2 focus:ring-blue-400/50 focus:outline-none transition-all"
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
            >
              <option value="">
                {availableCases.length === 0 ? 'No Cases Available' : 'Select Case ID'}
              </option>
              {availableCases.map((caseId, index) => (
                <option key={caseId} value={caseId}>
                  Case {index + 1}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-blue-400">
              <svg
                className="h-5 w-5 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
          {account ? (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-gradient-to-br from-gray-700/90 to-gray-800/90 text-white p-4 rounded-xl border border-gray-600/90 shadow-xl flex flex-col items-center hover:shadow-blue-900/30 hover:shadow-xl transition-all"
              whileHover={{ scale: 1.03 }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-md shadow-green-400/50"></div>
                <p className="text-xs font-bold text-green-400">Connected</p>
              </div>
              <p className="text-sm font-mono tracking-wide">
                {account.slice(0, 6)}...{account.slice(-4)}
              </p>
              <p className="text-sm font-semibold bg-clip-text text-transparent bg-gradient-to-r from-green-300 to-blue-300 mt-1">
                {getFirstFourDecimalDigits(balance)} EDU
              </p>
            </motion.div>
          ) : (
            <motion.button
              onClick={connectWallet}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white px-6 py-3 rounded-xl shadow-lg border border-blue-400/30 font-medium"
              whileHover={{
                scale: 1.05,
                boxShadow: "0px 0px 20px rgba(59, 130, 246, 0.5)",
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.95 }}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="mr-2"
                  >
                    <FiRefreshCcw className="h-5 w-5" />
                  </motion.div>
                  <span>Connecting...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <Zap className="mr-2 h-5 w-5" />
                  <span>Connect Wallet</span>
                </div>
              )}
            </motion.button>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-8 px-6 lg:px-8 relative z-10">
        <motion.div
          className="flex flex-wrap gap-5 justify-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.button
            onClick={() => setShowEvidenceModal(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-7 py-4 rounded-xl shadow-xl border border-green-400/40 flex items-center font-medium relative overflow-hidden group"
            whileHover={{
              scale: 1.05,
              boxShadow: "0px 0px 25px rgba(16, 185, 129, 0.5)",
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-green-400/30 to-transparent transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
            <FileImage className="mr-3 h-6 w-6" />
            <span className="text-lg">Add Evidence</span>
          </motion.button>

          <motion.button
            onClick={() => setShowAssignModal(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-7 py-4 rounded-xl shadow-xl border border-blue-400/40 flex items-center font-medium relative overflow-hidden group"
            whileHover={{
              scale: 1.05,
              boxShadow: "0px 0px 25px rgba(59, 130, 246, 0.5)",
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-400/30 to-transparent transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
            <UserPlus className="mr-3 h-6 w-6" />
            <span className="text-lg">Assign Authority</span>
          </motion.button>

          <motion.button
            onClick={handleCloseCase}
            className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-7 py-4 rounded-xl shadow-xl border border-red-400/40 flex items-center font-medium relative overflow-hidden group"
            whileHover={{
              scale: 1.05,
              boxShadow: "0px 0px 25px rgba(244, 63, 94, 0.5)",
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-[rgba(226,8,19,0.3)] to-transparent transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
            <XCircle className="mr-3 h-6 w-6" />
            <span className="text-lg">Close Case</span>
          </motion.button>

          <motion.button
            onClick={() => {
              if (!selectedCaseId) {
                alert("Please select a Case ID");
                return;
              }

              navigate("/case-map", { state: { caseId: selectedCaseId } });
            }}
            className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white px-7 py-4 rounded-xl shadow-xl border border-purple-400/40 flex items-center font-medium relative overflow-hidden group"
            whileHover={{
              scale: 1.05,
              boxShadow: "0px 0px 25px rgba(139, 92, 246, 0.5)",
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400/30 to-transparent transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-in-out"></div>
            <MapPin className="mr-3 h-6 w-6" />
            <span className="text-lg">View Case Map</span>
          </motion.button>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-12 mt-5"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {stats.map((stat, index) => {
            const icons = {
              "Total Alerts Today": Zap,
              "Resolved Alerts": CheckCircle,
              "Pending Alerts": AlertTriangle,
              "Critical Alerts": AlertOctagon,
              "Total Cameras": Cctv,
              "Active Cameras": Camera,
              "Offline Cameras": CameraOff,
              "Cameras with Active Alerts": AlertCircle,
            };

            const Icon = icons[stat.name] || Zap;

            const getCardStyle = () => {
              if (
                stat.name.includes("Critical") ||
                stat.name.includes("Offline")
              ) {
                return "bg-gradient-to-br from-gray-700/90 to-gray-800/90 border-green-500/30";
              } else if (
                stat.name.includes("Resolved") ||
                stat.name.includes("Active")
              ) {
                return "bg-gradient-to-br from-gray-700/90 to-gray-800/90 border-green-500/30";
              } else if (stat.name.includes("Pending")) {
                return "bg-gradient-to-br from-gray-700/90 to-gray-800/90 border-yellow-500/30";
              } else {
                return "bg-gradient-to-br from-gray-700/90 to-gray-800/90 border-blue-500/30";
              }
            };

            return (
              <motion.div
                key={index}
                className={`relative p-5 rounded-xl backdrop-blur-sm shadow-xl border ${getCardStyle()}`}
                variants={itemVariants}
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                  transition: { duration: 0.2 },
                }}
              >
                <StatCard name={stat.name} icon={Icon} value={stat.value} />

                <div className="absolute inset-0 -z-10 rounded-xl overflow-hidden">
                  <div className="absolute -inset-x-1/2 -bottom-1/2 w-full h-40 bg-blue-500/10 blur-3xl"></div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <motion.div
            className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 shadow-xl overflow-hidden"
            whileHover={{ boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)" }}
          >
            <AlertOverviewChart />
          </motion.div>

          <motion.div
            className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 shadow-xl overflow-hidden"
            whileHover={{ boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)" }}
          >
            <CategoryDistributionChart />
          </motion.div>

          <motion.div
            className="bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700 shadow-xl overflow-hidden lg:col-span-2"
            whileHover={{ boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)" }}
          >
            <SalesChannelChart />
          </motion.div>
        </motion.div>
      </main>
      {showEvidenceModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
          >
            <h3 className="text-xl font-bold mb-4 text-blue-400">
              Add Evidence
            </h3>
            <form onSubmit={handleEvidenceSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Upload Media
                </label>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="media-upload"
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="media-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <FileImage className="h-10 w-10 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-400">
                      {evidenceImage
                        ? "Image selected"
                        : "Click to select an image"}
                    </span>
                  </label>
                </div>
                {evidenceImage && (
                  <div className="mt-4 relative">
                    <img
                      src={evidenceImage}
                      alt="Selected evidence"
                      className="rounded-lg max-h-40 mx-auto border border-gray-700"
                    />
                  </div>
                )}
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  rows="4"
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                  placeholder="Describe the evidence..."
                  required
                  disabled={isLoading}
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3">
                <motion.button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLoading}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  className={`px-4 py-2 ${
                    isLoading ? "bg-blue-700" : "bg-blue-600 hover:bg-blue-700"
                  } rounded-lg text-white flex items-center justify-center min-w-[80px]`}
                  whileHover={isLoading ? {} : { scale: 1.05 }}
                  whileTap={isLoading ? {} : { scale: 0.95 }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <FiRefreshCcw className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    "Submit"
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
          >
            <h3 className="text-xl font-bold mb-4 text-blue-400">
              Assign Authority
            </h3>
            <form onSubmit={handleAssignSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-mono"
                  placeholder="0x..."
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <motion.button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Assign
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default OverviewPage;

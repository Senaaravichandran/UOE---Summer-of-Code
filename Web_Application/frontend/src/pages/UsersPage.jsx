import { motion } from "framer-motion";
import { useState } from "react";
import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import {
  UsersIcon,
  UserPlus,
  UserCheck,
  UserX,
  AlertCircle,
  Clock,
  CheckCircle,
  BarChart2,
  Calendar,
  Filter,
  Search,
  Map,
  TrendingUp,
  Shield,
  Briefcase,
} from "lucide-react";
import { Player } from "@lottiefiles/react-lottie-player";

// Mock data for the table
const caseStats = {
  totalCases: 120,
  resolvedCases: 85,
  pendingCases: 25,
  underInvestigationCases: 10,
  highPriorityCases: 8,
  casesLastMonth: 42,
  averageResolutionTime: "4.2 days",
  successRate: "78%",
};

const caseData = [
  {
    officerName: "Duraisingam",
    officerId: "PO-1234",
    locality: "Thoothukudi",
    caseType: "Theft",
    description: "Stolen vehicle found in the locality.",
    status: "Resolved",
    date: "2025-04-02",
    priority: "Medium",
  },
  {
    officerName: "Prabakaran",
    officerId: "PO-5678",
    locality: "Lawspet",
    caseType: "Assault",
    description: "Physical assault case near the market.",
    status: "Investigating",
    date: "2025-04-10",
    priority: "High",
  },
  {
    officerName: "Rajavelu",
    officerId: "PO-9012",
    locality: "Muthailpet",
    caseType: "Fraud",
    description: "Online fraud involving stolen credit card information.",
    status: "Pending",
    date: "2025-04-08",
    priority: "Low",
  },
  {
    officerName: "Balaji Venkatesh",
    officerId: "PO-3456",
    locality: "Theni",
    caseType: "Missing Person",
    description: "A person went missing in the local park.",
    status: "Resolved",
    date: "2025-03-25",
    priority: "High",
  },
  {
    officerName: "Arun Kumar",
    officerId: "PO-7890",
    locality: "Chennai",
    caseType: "Burglary",
    description: "Break-in at a local convenience store.",
    status: "Resolved",
    date: "2025-04-01",
    priority: "Medium",
  },
  {
    officerName: "Vishnu Priya",
    officerId: "PO-2345",
    locality: "Coimbatore",
    caseType: "Cybercrime",
    description: "Hacking attempt on local business network.",
    status: "Investigating",
    date: "2025-04-12",
    priority: "High",
  },
];

// Mock data for officer performance
const officerPerformance = [
  { name: "Duraisingam", resolved: 28, pending: 5, efficiency: 92 },
  { name: "Prabakaran", resolved: 22, pending: 8, efficiency: 85 },
  { name: "Rajavelu", resolved: 18, pending: 6, efficiency: 79 },
  { name: "Balaji Venkatesh", resolved: 24, pending: 3, efficiency: 94 },
];

// Mock data for case distribution
const caseDistribution = [
  { type: "Theft", count: 38 },
  { type: "Assault", count: 21 },
  { type: "Fraud", count: 15 },
  { type: "Missing Person", count: 12 },
  { type: "Cybercrime", count: 18 },
  { type: "Others", count: 16 },
];

// New CaseActivityTimeline component
const CaseActivityTimeline = () => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-md">
    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
      <Calendar className="mr-2 h-5 w-5 text-indigo-500" />
      Recent Case Activities
    </h3>
    <div className="space-y-4">
      {[
        {
          time: "Today, 9:45 AM",
          event: "New theft case reported in Chennai West",
          officer: "Vishnu Priya",
        },
        {
          time: "Yesterday, 4:30 PM",
          event: "Missing person case resolved in Theni",
          officer: "Balaji Venkatesh",
        },
        {
          time: "Yesterday, 11:20 AM",
          event: "Evidence collected for fraud case in Muthailpet",
          officer: "Rajavelu",
        },
        {
          time: "Apr 12, 2:15 PM",
          event: "Witness interviewed for assault case in Lawspet",
          officer: "Prabakaran",
        },
        {
          time: "Apr 11, 10:00 AM",
          event: "Vehicle theft suspect apprehended in Thoothukudi",
          officer: "Duraisingam",
        },
      ].map((activity, index) => (
        <div key={index} className="flex">
          <div className="mr-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-500">
              <div className="h-3 w-3 rounded-full bg-indigo-500"></div>
            </div>
            <div className="w-0.5 h-full bg-indigo-100 mx-auto mt-1"></div>
          </div>
          <div className="flex-1 mb-4">
            <div className="text-sm font-medium text-gray-400">
              {activity.time}
            </div>
            <div className="font-medium text-white">
              {activity.event}
            </div>
            <div className="text-sm text-gray-300">
              Officer: {activity.officer}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// New PerformanceMetrics component
const PerformanceMetrics = ({ data }) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-md">
    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
      <Shield className="mr-2 h-5 w-5 text-indigo-500" />
      Officer Performance
    </h3>
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
            <th className="px-4 py-2">Officer</th>
            <th className="px-4 py-2">Resolved</th>
            <th className="px-4 py-2">Pending</th>
            <th className="px-4 py-2">Efficiency</th>
            <th className="px-4 py-2">Rating</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {data.map((officer, index) => (
            <tr key={index}>
              <td className="px-4 py-2 text-sm font-medium text-white">
                {officer.name}
              </td>
              <td className="px-4 py-2 text-sm text-gray-300">
                {officer.resolved}
              </td>
              <td className="px-4 py-2 text-sm text-gray-300">
                {officer.pending}
              </td>
              <td className="px-4 py-2 text-sm text-gray-300">
                {officer.efficiency}%
              </td>
              <td className="px-4 py-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(officer.efficiency / 20)
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// New CaseDistribution component
const CaseDistribution = ({ data }) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-md h-full">
    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
      <Briefcase className="mr-2 h-5 w-5 text-indigo-500" />
      Case Distribution by Type
    </h3>
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index}>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-300">
              {item.type}
            </span>
            <span className="text-sm font-medium text-gray-300">
              {item.count}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-indigo-600 h-2.5 rounded-full"
              style={{ width: `${(item.count / caseStats.totalCases) * 100}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// New MapOverview component placeholder
const MapOverview = () => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-md flex flex-col items-center justify-center h-full">
    <Map className="h-12 w-12 text-indigo-500 mb-4" />
    <h3 className="text-lg font-semibold text-white mb-2">
      Case Geographic Distribution
    </h3>
    <p className="text-gray-400 text-center mb-4">
      Interactive map showing case distribution across regions
    </p>
    <div className="w-full h-52 bg-gray-700 rounded-lg flex items-center justify-center">
      <span className="text-gray-500">
        Map visualization would appear here
      </span>
    </div>
  </div>
);

// Enhanced UsersPage component
const UsersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Filter cases based on search term and status filter
  const filteredCases = caseData.filter((caseItem) => {
    const matchesSearch =
      caseItem.officerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.locality.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.caseType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || caseItem.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 overflow-auto relative z-10">
      <Header title="Case Management Dashboard" />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8">
        {/* Primary Stats */}
        <motion.div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <StatCard
            name="Total Cases"
            icon={BarChart2}
            value={caseStats.totalCases}
            color="#6366F1"
          />
          <StatCard
            name="Resolved Cases"
            icon={CheckCircle}
            value={caseStats.resolvedCases}
            color="#10B981"
          />
          <StatCard
            name="Pending Cases"
            icon={Clock}
            value={caseStats.pendingCases}
            color="#F59E0B"
          />
          <StatCard
            name="Under Investigation"
            icon={AlertCircle}
            value={caseStats.underInvestigationCases}
            color="#00E68F"
          />
        </motion.div>

        {/* Secondary Stats */}
        <motion.div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <StatCard
            name="High Priority Cases"
            icon={AlertCircle}
            value={caseStats.highPriorityCases}
            color="#8B5CF6"
          />
          <StatCard
            name="Cases Last Month"
            icon={Calendar}
            value={caseStats.casesLastMonth}
            color="#3B82F6"
          />
          <StatCard
            name="Avg. Resolution Time"
            icon={Clock}
            value={caseStats.averageResolutionTime}
            color="#EC4899"
          />
          <StatCard
            name="Success Rate"
            icon={TrendingUp}
            value={caseStats.successRate}
            color="#14B8A6"
          />
        </motion.div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full p-2 pl-10 text-sm text-white border border-gray-600 rounded-lg bg-gray-700 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
              placeholder="Search cases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-4 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2 placeholder-gray-400"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Resolved">Resolved</option>
              <option value="Investigating">Investigating</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Surveillance Cases Table */}
        <motion.div
          className="overflow-x-auto shadow-md sm:rounded-lg mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <table className="min-w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Officer Name
                </th>
                <th scope="col" className="px-6 py-3">
                  Officer ID
                </th>
                <th scope="col" className="px-6 py-3">
                  Locality
                </th>
                <th scope="col" className="px-6 py-3">
                  Case Type
                </th>
                <th scope="col" className="px-6 py-3">
                  Date
                </th>
                <th scope="col" className="px-6 py-3">
                  Description
                </th>
                <th scope="col" className="px-6 py-3">
                  Priority
                </th>
                <th scope="col" className="px-6 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((caseItem, index) => (
                <tr
                  key={index}
                  className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700"
                >
                  <td className="px-6 py-4 font-medium text-white">
                    {caseItem.officerName}
                  </td>
                  <td className="px-6 py-4">{caseItem.officerId}</td>
                  <td className="px-6 py-4">{caseItem.locality}</td>
                  <td className="px-6 py-4">{caseItem.caseType}</td>
                  <td className="px-6 py-4">{caseItem.date}</td>
                  <td className="px-6 py-4">{caseItem.description}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        caseItem.priority === "High"
                          ? "bg-[rgba(0,230,143,0.3)] text-green-300"
                          : caseItem.priority === "Medium"
                          ? "bg-blue-900 text-blue-300"
                          : "bg-gray-600 text-gray-300"
                      }`}
                    >
                      {caseItem.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        caseItem.status === "Resolved"
                          ? "bg-green-900 text-green-300"
                          : caseItem.status === "Investigating"
                          ? "bg-yellow-900 text-yellow-300"
                          : "bg-[rgba(0,230,143,0.3)] text-green-300"
                      }`}
                    >
                      {caseItem.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Additional Dashboard Content */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          <CaseActivityTimeline />
          <PerformanceMetrics data={officerPerformance} />
        </motion.div>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
        >
          <CaseDistribution data={caseDistribution} />
          <MapOverview />
        </motion.div>
      </main>
    </div>
  );
};

export default UsersPage;

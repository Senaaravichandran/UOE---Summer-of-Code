import React, { useState, useEffect } from "react";
import {
  FaUserPlus,
  FaEnvelope,
  FaUserShield,
  FaSearch,
  FaMapMarkerAlt,
  FaBell,
  FaHistory,
} from "react-icons/fa";
import {
  IoPeople,
  IoShieldCheckmark,
  IoStatsChart,
  IoSettingsSharp,
  IoNotificationsSharp,
} from "react-icons/io5";
import axios from "axios";
import Header from "../components/common/Header";
import { Player } from "@lottiefiles/react-lottie-player";
import CustomerSupport from "../../assets/lottie/CustomerSupport.json";

const ContentWithLottie = () => {
  return (
    <div className="bg-gray-800 rounded-xl p-6 mb-8 shadow-lg">
      <div className="flex items-center justify-between flex-col md:flex-row">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-white mb-4">
            Emergency Alert System
          </h2>
          <p className="text-gray-300 text-lg mb-6">
            The Notify Service sends instantaneous mail alerts to the concerned
            authorities in affected localities, ensuring rapid response during
            emergencies.
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-md transition-all hover:scale-105 flex items-center gap-2">
            <IoNotificationsSharp className="w-5 h-5" />
            Alert Window
          </button>
        </div>
        <Player autoplay loop src={CustomerSupport} className="w-64 h-64" />
      </div>
    </div>
  );
};

const AddUserModal = ({ userType, setShowModal }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [locality, setLocality] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email || !locality) {
      alert("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = { name, email, locality };
      const endpoint =
        userType === "resident"
          ? "/api/residents/add-resident"
          : "/api/authorities/add-authority";

      const response = await axios.post(
        `http://localhost:5000${endpoint}`,
        user
      );
      if (response.status === 200) {
        alert(
          `${
            userType === "resident" ? "Resident" : "Authority"
          } added successfully!`
        );
        setShowModal(false);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to add user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 text-white rounded-lg p-8 w-96 shadow-xl border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold">
            Add {userType === "resident" ? "Resident" : "Authority"} User
          </h3>
          <button
            onClick={() => setShowModal(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <label className="block mb-2 text-gray-300">Name</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter full name"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2 text-gray-300">Email</label>
          <input
            type="email"
            className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2 text-gray-300">Locality</label>
          <div className="relative">
            <input
              type="text"
              className="w-full p-3 pl-10 border border-gray-600 rounded-lg bg-gray-800 text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder="Select locality"
            />
            <FaMapMarkerAlt className="absolute left-3 top-3.5 text-gray-400" />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg shadow-md transition-all hover:scale-105"
            onClick={() => setShowModal(false)}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-md transition-all hover:scale-105 flex items-center gap-2 ${
              isSubmitting ? "opacity-75 cursor-not-allowed" : ""
            }`}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add User"}
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => (
  <div
    className={`bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-${color}-500`}
  >
    <div className="flex justify-between items-center">
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <h4 className="text-2xl font-bold text-white mt-2">{value}</h4>
      </div>
      <div className={`p-3 rounded-lg bg-${color}-500 bg-opacity-20`}>
        {icon}
      </div>
    </div>
  </div>
);

const UserCard = ({ user }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg hover:bg-gray-700 transition-all border border-gray-700">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-xl font-bold text-white">{user.name}</h4>
          <div className="flex items-center text-gray-300 mt-2">
            <FaEnvelope className="mr-2 text-sm" />
            <span>{user.email}</span>
          </div>
          <div className="flex items-center text-gray-400 mt-1">
            <FaMapMarkerAlt className="mr-2 text-sm" />
            <span>{user.locality}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between">
        <button className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Edit
        </button>
        <button className="text-green-400 hover:text-green-300 text-sm flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Remove
        </button>
      </div>
    </div>
  );
};

const UserTable = ({ users, userType }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.locality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-semibold flex items-center gap-2 text-white">
          {userType === "resident" ? (
            <IoPeople className="w-6 h-6 text-blue-500" />
          ) : (
            <IoShieldCheckmark className="w-6 h-6 text-green-500" />
          )}
          {userType === "resident" ? "Resident Users" : "Authority Users"}
          <span className="ml-2 text-gray-400 text-sm font-normal">
            ({filteredUsers.length})
          </span>
        </h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FaSearch className="absolute left-3 top-2.5 text-gray-400" />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No users found matching your search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <UserCard key={user.email} user={user} />
          ))}
        </div>
      )}
    </div>
  );
};

const AlertHistory = () => (
  <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-8">
    <h3 className="text-2xl font-semibold flex items-center gap-2 text-white mb-4">
      <FaHistory className="w-6 h-6 text-purple-500" />
      Recent Alert History
    </h3>

    <div className="space-y-4">
      <div className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
        <div>
          <div className="text-white font-semibold">Burglary - Adayar</div>
          <div className="text-gray-400 text-sm">Sent to 5 authorities</div>
        </div>
        <div className="text-gray-400 text-sm">12-04-2025, 10:25 AM</div>
      </div>

      <div className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
        <div>
          <div className="text-white font-semibold">Assault - Perungudi</div>
          <div className="text-gray-400 text-sm">Sent to 3 authorities</div>
        </div>
        <div className="text-gray-400 text-sm">10-04-2025, 6:15 PM</div>
      </div>

      <div className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
        <div>
          <div className="text-white font-semibold">Riot - Sriperumbudur</div>
          <div className="text-gray-400 text-sm">Sent to 8 authorities</div>
        </div>
        <div className="text-gray-400 text-sm">02-04-2025, 2025</div>
      </div>
    </div>
  </div>
);

const NotifyPage = () => {
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userType, setUserType] = useState("");
  const [residentUsers, setResidentUsers] = useState([]);
  const [authorityUsers, setAuthorityUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [residentsRes, authoritiesRes] = await Promise.all([
          axios.get("http://localhost:5000/api/residents/get-residents"),
          axios.get("http://localhost:5000/api/authorities/get-authorities"),
        ]);

        setResidentUsers(residentsRes.data);
        setAuthorityUsers(authoritiesRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [showAddUserModal]);

  const handleAddUserClick = (type) => {
    setUserType(type);
    setShowAddUserModal(true);
  };

  // Add this state at the top of your NotifyPage component
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Then replace your handleSendEmail function with this
  const handleSendEmail = () => {
    setIsSendingEmail(true);

    axios
      .post("http://localhost:5000/api/mail/send-authority-alert")
      .then((response) => {
        alert(response.data.message);
      })
      .catch(() => {
        alert("Failed to send email to authorities");
      })
      .finally(() => {
        setIsSendingEmail(false);
      });
  };

  const stats = [
    {
      title: "Total Residents",
      value: residentUsers.length,
      icon: <IoPeople className="w-6 h-6 text-blue-500" />,
      color: "blue",
    },
    {
      title: "Total Authorities",
      value: authorityUsers.length,
      icon: <IoShieldCheckmark className="w-6 h-6 text-green-500" />,
      color: "green",
    },
    {
      title: "Alerts Sent",
      value: "24",
      icon: <FaBell className="w-6 h-6 text-yellow-500" />,
      color: "yellow",
    },
    {
      title: "Localities Covered",
      value: "8",
      icon: <FaMapMarkerAlt className="w-6 h-6 text-purple-500" />,
      color: "purple",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br  to-gray-900 justify-center items-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-900 via-indigo-800 to-gray-900">
      {/* Main Content */}
      <div className="flex-1 bg-gray-900 p-6 space-y-6 overflow-auto">
        <Header title="Emergency Alert System" />

        <ContentWithLottie />

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          ))}
        </div>

        {/* Alert Action Section */}
        <div className="bg-gradient-to-r from-red-500 to-red-700 rounded-xl p-6 shadow-lg mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-2xl font-bold text-white">
                Send Emergency Alert
              </h3>
              <p className="text-white text-opacity-80">
                Notify all authorities in affected areas about emergencies
              </p>
            </div>
            <button
              className={`bg-white text-red-600 hover:bg-gray-100 px-6 py-3 rounded-lg shadow-md transition-all hover:scale-105 flex items-center gap-2 font-semibold ${
                isSendingEmail ? "opacity-75 cursor-not-allowed" : ""
              }`}
              onClick={handleSendEmail}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <>
                  <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <FaEnvelope className="w-5 h-5" /> Send Authority Alert Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Alert History */}
        <AlertHistory />

        {/* Authority Users Section */}
        <UserTable users={authorityUsers} userType="authority" />
      </div>

      {/* Modal */}
      {showAddUserModal && (
        <AddUserModal userType={userType} setShowModal={setShowAddUserModal} />
      )}
    </div>
  );
};

export default NotifyPage;

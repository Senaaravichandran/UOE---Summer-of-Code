const express = require("express");
const router = express.Router();
const {
  getCase,
  getEvidences,
  getQueries,
  getAuthorities,
  getTotalCases,
  assignAuthority,
  addEvidence,
  closeCase,
} = require("../services/caseService");

// Get case details with auto-authorization (simplified version)
router.get("/case/:caseId/basic", async (req, res) => {
  try {
    const { caseId } = req.params;
    const { userAddress } = req.query;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        message: "User wallet address is required",
      });
    }

    // First try to get case details
    const caseDetails = await getCase(caseId);
    
    if (!caseDetails) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // Get current authorities
    const authorities = await getAuthorities(caseId);
    
    // Check if user is already authorized
    const isAuthorized = authorities.some(
      (auth) => auth.toLowerCase() === userAddress.toLowerCase()
    );

    // If not authorized, automatically assign them
    if (!isAuthorized) {
      try {
        await assignAuthority(caseId, userAddress);
        console.log(`✅ Auto-assigned authority ${userAddress} to case ${caseId}`);
      } catch (error) {
        console.error("Error auto-assigning authority:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to assign user access to case",
        });
      }
    }

    // Convert BigInt values to strings for JSON serialization
    const convertBigIntToString = (obj) => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return obj.toString();
      if (Array.isArray(obj)) return obj.map(convertBigIntToString);
      if (typeof obj === 'object') {
        const converted = {};
        for (const [key, value] of Object.entries(obj)) {
          converted[key] = convertBigIntToString(value);
        }
        return converted;
      }
      return obj;
    };

    res.json({
      success: true,
      data: {
        case: convertBigIntToString(caseDetails),
        authorities: authorities,
      },
    });
  } catch (error) {
    console.error("Error fetching basic case data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get case details with auto-authorization
router.get("/case/:caseId", async (req, res) => {
  try {
    const { caseId } = req.params;
    const { userAddress } = req.query;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        message: "User wallet address is required",
      });
    }

    // First try to get case details
    const caseDetails = await getCase(caseId);
    
    if (!caseDetails) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // Get current authorities
    const authorities = await getAuthorities(caseId);
    
    // Check if user is already authorized
    const isAuthorized = authorities.some(
      (auth) => auth.toLowerCase() === userAddress.toLowerCase()
    );

    // If not authorized, automatically assign them
    if (!isAuthorized) {
      try {
        await assignAuthority(caseId, userAddress);
        console.log(`✅ Auto-assigned authority ${userAddress} to case ${caseId}`);
      } catch (error) {
        console.error("Error auto-assigning authority:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to assign user access to case",
        });
      }
    }

    // Now get all case data (sequentially with delays to avoid batch request limits)
    let evidences = [];
    let queries = [];
    let updatedAuthorities = [];

    try {
      evidences = await getEvidences(caseId);
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
    } catch (error) {
      console.error("Error fetching evidences:", error.message);
    }

    try {
      queries = await getQueries(caseId);
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
    } catch (error) {
      console.error("Error fetching queries:", error.message);
    }

    try {
      updatedAuthorities = await getAuthorities(caseId);
    } catch (error) {
      console.error("Error fetching authorities:", error.message);
    }

    // Convert BigInt values to strings for JSON serialization
    const convertBigIntToString = (obj) => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return obj.toString();
      if (Array.isArray(obj)) return obj.map(convertBigIntToString);
      if (typeof obj === 'object') {
        const converted = {};
        for (const [key, value] of Object.entries(obj)) {
          converted[key] = convertBigIntToString(value);
        }
        return converted;
      }
      return obj;
    };

    res.json({
      success: true,
      data: {
        case: convertBigIntToString(caseDetails),
        evidences: convertBigIntToString(evidences),
        queries: convertBigIntToString(queries),
        authorities: updatedAuthorities,
      },
    });
  } catch (error) {
    console.error("Error fetching case data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get case evidence
router.get("/case/:caseId/evidence", async (req, res) => {
  try {
    const { caseId } = req.params;

    const evidences = await getEvidences(caseId);

    // Transform evidence arrays into objects and convert BigInt values to strings
    const transformedEvidences = evidences.map((evidence) => ({
      id: evidence[0].toString(),
      mediaUrl: evidence[1], // This is now a Firebase URL
      firebaseUrl: evidence[1], // Explicitly label as Firebase URL
      description: evidence[2],
      timestamp: evidence[3]
    }));

    res.json({
      success: true,
      data: {
        evidences: transformedEvidences,
      },
    });
  } catch (error) {
    console.error("Error fetching evidence:", error);
    res.json({
      success: true,
      data: {
        evidences: [],
      },
    });
  }
});

// Add evidence to case
router.post("/case/:caseId/evidence", async (req, res) => {
  try {
    const { caseId } = req.params;
    const { mediaHash, description, dateTime } = req.body;

    if (!mediaHash || !description || !dateTime) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: mediaHash, description, dateTime",
      });
    }

    await addEvidence(caseId, mediaHash, description, dateTime);

    res.json({
      success: true,
      message: "Evidence added successfully",
    });
  } catch (error) {
    console.error("Error adding evidence:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add evidence",
    });
  }
});

// Assign authority to case
router.post("/case/:caseId/assign", async (req, res) => {
  try {
    const { caseId } = req.params;
    const { authorityAddress } = req.body;

    if (!authorityAddress) {
      return res.status(400).json({
        success: false,
        message: "Authority address is required",
      });
    }

    await assignAuthority(caseId, authorityAddress);

    res.json({
      success: true,
      message: "Authority assigned successfully",
    });
  } catch (error) {
    console.error("Error assigning authority:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign authority",
    });
  }
});

// Close case
router.post("/case/:caseId/close", async (req, res) => {
  try {
    const { caseId } = req.params;

    await closeCase(caseId);

    res.json({
      success: true,
      message: "Case closed successfully",
    });
  } catch (error) {
    console.error("Error closing case:", error);
    res.status(500).json({
      success: false,
      message: "Failed to close case",
    });
  }
});

// Get total cases
router.get("/cases/total", async (req, res) => {
  try {
    const totalCases = await getTotalCases();
    res.json({
      success: true,
      data: { totalCases: Number(totalCases) },
    });
  } catch (error) {
    console.error("Error fetching total cases:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch total cases",
    });
  }
});

module.exports = router;
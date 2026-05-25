// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CrimeLifeCycle {
    uint256 private caseCounter = 0;

    mapping(uint256 => CrimeCase) public caseIdToCrime;

    struct CrimeCase {
        uint256 caseId;
        string location;
        string videoHash;
        string dateTime;
        bool isCaseOpen;
        Evidence[] evidences;
        Query[] queries;
        address[] authorities;
        uint256 evidenceCounter;
        uint256 queryCounter;
        ActivityRecord[] activityLog; // Chronological activity log
    }

    struct Evidence {
        uint256 evidenceId;
        string mediaHash;
        string description;
        string dateTime;
    }

    struct Query {
        uint256 queryId;
        string question;
        string answer;
    }

    // Activity types as enum for better standardization
    enum ActivityType {
        CASE_CREATED,
        EVIDENCE_ADDED,
        QUERY_ADDED,
        CASE_CLOSED,
        AUTHORITY_ASSIGNED
    }

    // Enhanced activity record with object references
    struct ActivityRecord {
        uint256 activityId;
        uint256 timestamp;
        ActivityType activityType;
        string details;
        address actor;
        // Reference identifiers to related objects
        uint256 caseId;
        uint256 evidenceId; // If activity relates to evidence
        uint256 queryId; // If activity relates to query
        address authorityAddress; // If activity relates to authority assignment
    }

    // Events for better tracking
    event CaseCreated(
        uint256 indexed caseId,
        address creator,
        uint256 timestamp,
        uint256 activityId
    );
    event EvidenceAdded(
        uint256 indexed caseId,
        uint256 evidenceId,
        address adder,
        uint256 timestamp,
        uint256 activityId
    );
    event QueryAdded(
        uint256 indexed caseId,
        uint256 queryId,
        address adder,
        uint256 timestamp,
        uint256 activityId
    );
    event CaseClosed(
        uint256 indexed caseId,
        address closer,
        uint256 timestamp,
        uint256 activityId
    );
    event AuthorityAssigned(
        uint256 indexed caseId,
        address newAuthority,
        address assigner,
        uint256 timestamp,
        uint256 activityId
    );

    // MODIFIER TO CHECK AUTHORITY
    modifier onlyAuthorized(uint256 _caseId) {
        require(_caseId < caseCounter, "Invalid case ID");
        bool isAuthorized = false;
        for (uint i = 0; i < caseIdToCrime[_caseId].authorities.length; i++) {
            if (caseIdToCrime[_caseId].authorities[i] == msg.sender) {
                isAuthorized = true;
                break;
            }
        }
        require(isAuthorized, "Not an authorized user for this case");
        _;
    }

    function testLog() public pure returns (string memory) {
        return "Hello solidity";
    }

    // Internal function to log activity with object references
    function _logActivity(
        uint256 _caseId,
        ActivityType _activityType,
        string memory _details,
        uint256 _evidenceId,
        uint256 _queryId,
        address _authorityAddress
    ) internal returns (uint256) {
        CrimeCase storage currentCase = caseIdToCrime[_caseId];

        uint256 activityId = currentCase.activityLog.length;

        ActivityRecord memory newActivity = ActivityRecord({
            activityId: activityId,
            timestamp: block.timestamp,
            activityType: _activityType,
            details: _details,
            actor: msg.sender,
            caseId: _caseId,
            evidenceId: _evidenceId,
            queryId: _queryId,
            authorityAddress: _authorityAddress
        });

        currentCase.activityLog.push(newActivity);
        return activityId;
    }

    // CREATE A NEW CASE
    function createCase(
        string memory _location,
        string memory _videoHash,
        string memory _dateTime
    ) public {
        CrimeCase storage newCase = caseIdToCrime[caseCounter];
        newCase.caseId = caseCounter;
        newCase.location = _location;
        newCase.videoHash = _videoHash;
        newCase.dateTime = _dateTime;
        newCase.isCaseOpen = true;
        newCase.evidenceCounter = 0;
        newCase.queryCounter = 0;
        newCase.authorities.push(msg.sender);

        // Log this activity with references
        uint256 activityId = _logActivity(
            caseCounter,
            ActivityType.CASE_CREATED,
            string(abi.encodePacked("Case created at location: ", _location)),
            0, // No evidence reference
            0, // No query reference
            address(0) // No authority reference (other than creator)
        );

        // Emit event
        emit CaseCreated(caseCounter, msg.sender, block.timestamp, activityId);

        caseCounter++;
    }

    // ADD EVIDENCE
    function addEvidence(
        string memory _mediaHash,
        string memory _description,
        string memory _dateTime,
        uint256 _caseId
    ) public onlyAuthorized(_caseId) {
        require(caseIdToCrime[_caseId].isCaseOpen, "Case is closed");

        CrimeCase storage currentCase = caseIdToCrime[_caseId];
        uint256 evidenceId = currentCase.evidenceCounter;

        Evidence memory newEvidence = Evidence({
            evidenceId: evidenceId,
            mediaHash: _mediaHash,
            description: _description,
            dateTime: _dateTime
        });

        currentCase.evidences.push(newEvidence);

        // Log this activity with reference to the evidence
        uint256 activityId = _logActivity(
            _caseId,
            ActivityType.EVIDENCE_ADDED,
            string(abi.encodePacked("Evidence added: ", _description)),
            evidenceId,
            0, // No query reference
            address(0) // No authority reference
        );

        // Emit event
        emit EvidenceAdded(
            _caseId,
            evidenceId,
            msg.sender,
            block.timestamp,
            activityId
        );

        currentCase.evidenceCounter++;
    }

    // ADD QUERY
    function addQuery(
        string memory _question,
        string memory _answer,
        uint256 _caseId
    ) public onlyAuthorized(_caseId) {
        CrimeCase storage currentCase = caseIdToCrime[_caseId];
        uint256 queryId = currentCase.queryCounter;

        Query memory newQuery = Query({
            queryId: queryId,
            question: _question,
            answer: _answer
        });

        currentCase.queries.push(newQuery);

        // Log this activity with reference to the query
        uint256 activityId = _logActivity(
            _caseId,
            ActivityType.QUERY_ADDED,
            string(abi.encodePacked("Query added: ", _question)),
            0, // No evidence reference
            queryId,
            address(0) // No authority reference
        );

        // Emit event
        emit QueryAdded(
            _caseId,
            queryId,
            msg.sender,
            block.timestamp,
            activityId
        );

        currentCase.queryCounter++;
    }

    // CLOSE CASE
    function closeCase(uint256 _caseId) public onlyAuthorized(_caseId) {
        require(caseIdToCrime[_caseId].isCaseOpen, "Case already closed");
        caseIdToCrime[_caseId].isCaseOpen = false;

        // Log this activity
        uint256 activityId = _logActivity(
            _caseId,
            ActivityType.CASE_CLOSED,
            "Case closed",
            0, // No evidence reference
            0, // No query reference
            address(0) // No authority reference
        );

        // Emit event
        emit CaseClosed(_caseId, msg.sender, block.timestamp, activityId);
    }

    // ASSIGN AUTHORITIES
    function assignAuthority(
        uint256 _caseId,
        address _authority
    ) public onlyAuthorized(_caseId) {
        caseIdToCrime[_caseId].authorities.push(_authority);

        // Log this activity with reference to the authority
        uint256 activityId = _logActivity(
            _caseId,
            ActivityType.AUTHORITY_ASSIGNED,
            "New authority assigned",
            0, // No evidence reference
            0, // No query reference
            _authority // Authority reference
        );

        // Emit event
        emit AuthorityAssigned(
            _caseId,
            _authority,
            msg.sender,
            block.timestamp,
            activityId
        );
    }

    // GET CASE DETAILS
    function getCase(
        uint256 _caseId
    )
        public
        view
        onlyAuthorized(_caseId)
        returns (uint256, string memory, string memory, string memory, bool)
    {
        CrimeCase storage c = caseIdToCrime[_caseId];
        return (c.caseId, c.location, c.videoHash, c.dateTime, c.isCaseOpen);
    }

    // GET EVIDENCES FOR A CASE
    function getEvidences(
        uint256 _caseId
    ) public view onlyAuthorized(_caseId) returns (Evidence[] memory) {
        return caseIdToCrime[_caseId].evidences;
    }

    // GET QUERIES FOR A CASE
    function getQueries(
        uint256 _caseId
    ) public view onlyAuthorized(_caseId) returns (Query[] memory) {
        return caseIdToCrime[_caseId].queries;
    }

    // GET AUTHORITIES ASSIGNED TO A CASE
    function getAuthorities(
        uint256 _caseId
    ) public view onlyAuthorized(_caseId) returns (address[] memory) {
        return caseIdToCrime[_caseId].authorities;
    }

    // GET ACTIVITY LOG FOR A CASE
    function getActivityLog(
        uint256 _caseId
    ) public view onlyAuthorized(_caseId) returns (ActivityRecord[] memory) {
        return caseIdToCrime[_caseId].activityLog;
    }

    // GET SPECIFIC ACTIVITY RECORD
    function getActivityRecord(
        uint256 _caseId,
        uint256 _activityId
    ) public view onlyAuthorized(_caseId) returns (ActivityRecord memory) {
        require(
            _activityId < caseIdToCrime[_caseId].activityLog.length,
            "Invalid activity ID"
        );
        return caseIdToCrime[_caseId].activityLog[_activityId];
    }

    // GET TOTAL CASE COUNT
    function getTotalCases() public view returns (uint256) {
        return caseCounter;
    }

    // GET ACTIVITY COUNT FOR A CASE
    function getActivityCount(
        uint256 _caseId
    ) public view onlyAuthorized(_caseId) returns (uint256) {
        return caseIdToCrime[_caseId].activityLog.length;
    }

    // Detailed activity struct including entity details
    struct DetailedActivity {
        // Activity information
        uint256 activityId;
        uint256 timestamp;
        ActivityType activityType;
        string details;
        address actor;
        // References to related entities
        uint256 caseId;
        // Evidence details (if applicable)
        bool hasEvidence;
        Evidence evidence;
        // Query details (if applicable)
        bool hasQuery;
        Query query;
        // Authority details (if applicable)
        bool hasAuthority;
        address authorityAddress;
    }

    // GET ALL ACTIVITIES WITH ENTITY DETAILS FOR A CASE
    function getDetailedActivityLog(
        uint256 _caseId
    ) public view onlyAuthorized(_caseId) returns (DetailedActivity[] memory) {
        CrimeCase storage currentCase = caseIdToCrime[_caseId];
        ActivityRecord[] memory activities = currentCase.activityLog;
        DetailedActivity[] memory detailedActivities = new DetailedActivity[](
            activities.length
        );

        for (uint i = 0; i < activities.length; i++) {
            ActivityRecord memory activity = activities[i];

            // Create detailed activity record
            DetailedActivity memory detailedActivity = DetailedActivity({
                activityId: activity.activityId,
                timestamp: activity.timestamp,
                activityType: activity.activityType,
                details: activity.details,
                actor: activity.actor,
                caseId: activity.caseId,
                // Initialize with defaults
                hasEvidence: false,
                evidence: Evidence(0, "", "", ""),
                hasQuery: false,
                query: Query(0, "", ""),
                hasAuthority: false,
                authorityAddress: address(0)
            });

            // Add evidence details if relevant
            if (
                activity.activityType == ActivityType.EVIDENCE_ADDED &&
                activity.evidenceId < currentCase.evidenceCounter
            ) {
                detailedActivity.hasEvidence = true;
                detailedActivity.evidence = currentCase.evidences[
                    activity.evidenceId
                ];
            }

            // Add query details if relevant
            if (
                activity.activityType == ActivityType.QUERY_ADDED &&
                activity.queryId < currentCase.queryCounter
            ) {
                detailedActivity.hasQuery = true;
                detailedActivity.query = currentCase.queries[activity.queryId];
            }

            // Add authority details if relevant
            if (
                activity.activityType == ActivityType.AUTHORITY_ASSIGNED &&
                activity.authorityAddress != address(0)
            ) {
                detailedActivity.hasAuthority = true;
                detailedActivity.authorityAddress = activity.authorityAddress;
            }

            detailedActivities[i] = detailedActivity;
        }

        return detailedActivities;
    }

    // GET SPECIFIC DETAILED ACTIVITY BY ID
    function getDetailedActivity(
        uint256 _caseId,
        uint256 _activityId
    ) public view onlyAuthorized(_caseId) returns (DetailedActivity memory) {
        require(
            _activityId < caseIdToCrime[_caseId].activityLog.length,
            "Invalid activity ID"
        );

        CrimeCase storage currentCase = caseIdToCrime[_caseId];
        ActivityRecord memory activity = currentCase.activityLog[_activityId];

        // Create detailed activity record
        DetailedActivity memory detailedActivity = DetailedActivity({
            activityId: activity.activityId,
            timestamp: activity.timestamp,
            activityType: activity.activityType,
            details: activity.details,
            actor: activity.actor,
            caseId: activity.caseId,
            // Initialize with defaults
            hasEvidence: false,
            evidence: Evidence(0, "", "", ""),
            hasQuery: false,
            query: Query(0, "", ""),
            hasAuthority: false,
            authorityAddress: address(0)
        });

        // Add evidence details if relevant
        if (
            activity.activityType == ActivityType.EVIDENCE_ADDED &&
            activity.evidenceId < currentCase.evidenceCounter
        ) {
            detailedActivity.hasEvidence = true;
            detailedActivity.evidence = currentCase.evidences[
                activity.evidenceId
            ];
        }

        // Add query details if relevant
        if (
            activity.activityType == ActivityType.QUERY_ADDED &&
            activity.queryId < currentCase.queryCounter
        ) {
            detailedActivity.hasQuery = true;
            detailedActivity.query = currentCase.queries[activity.queryId];
        }

        // Add authority details if relevant
        if (
            activity.activityType == ActivityType.AUTHORITY_ASSIGNED &&
            activity.authorityAddress != address(0)
        ) {
            detailedActivity.hasAuthority = true;
            detailedActivity.authorityAddress = activity.authorityAddress;
        }

        return detailedActivity;
    }
}

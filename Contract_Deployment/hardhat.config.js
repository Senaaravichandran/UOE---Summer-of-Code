require("@nomicfoundation/hardhat-toolbox")
require("dotenv").config()

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL
const EDUCHAIN_RPC_URL = process.env.EDUCHAIN_RPC_URL_BACKUP || process.env.EDUCHAIN_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.19",
    defaultNetwork: "hardhat",
    networks: {
        sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 11155111,
            timeout: 60000, // 60 seconds
            gas: "auto",
            gasPrice: "auto",
            gasMultiplier: 1.2,
            blockConfirmations: 2,
        },
        educhain: {
            url: EDUCHAIN_RPC_URL,
            accounts: [PRIVATE_KEY],
            chainId: 656476,
            timeout: 60000, // 60 seconds
            gas: "auto",
            gasPrice: "auto",
            gasMultiplier: 1.2,
            blockConfirmations: 2,
        },
    },
    etherscan: {
        apiKey: {
            sepolia: ETHERSCAN_KEY,
        },
    },
}

const hre = require("hardhat")

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function deployWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`🔄 Deployment attempt ${i + 1}/${maxRetries}`)
            
            const [deployer] = await hre.ethers.getSigners()
            console.log("🚀 Deploying contracts with account:", await deployer.getAddress())

            // Check account balance
            const balance = await deployer.provider.getBalance(deployer.address)
            console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH")

            if (balance === 0n) {
                throw new Error("❌ Account has no balance for gas fees")
            }

            const CrimeLifeCycle = await hre.ethers.getContractFactory("CrimeLifeCycle")
            
            // Deploy with minimal configuration - let network decide gas
            console.log("📋 Deploying contract with auto gas calculation...")
            const contract = await CrimeLifeCycle.deploy()
            
            console.log("⏳ Waiting for deployment confirmation...")
            await contract.waitForDeployment()

            const contractAddress = await contract.getAddress()
            console.log("✅ Contract deployed at:", contractAddress)

            // Test the contract
            console.log("🧪 Testing contract functionality...")
            const message = await contract.testLog()
            console.log("📝 testLog() says:", message)

            return contract
        } catch (error) {
            console.log(`❌ Attempt ${i + 1} failed:`, error.message)
            
            if (i === maxRetries - 1) {
                throw error
            }
            
            console.log(`⏳ Waiting 5 seconds before retry...`)
            await sleep(5000)
        }
    }
}

async function main() {
    try {
        await deployWithRetry(3)
        console.log("🎉 Deployment completed successfully!")
    } catch (error) {
        console.error("❌ Final Error:", error.message)
        
        // Provide troubleshooting tips
        console.log("\n🔧 Troubleshooting tips:")
        console.log("1. Check your internet connection")
        console.log("2. Verify RPC endpoint is working")
        console.log("3. Ensure account has sufficient balance")
        console.log("4. Try again with a different RPC endpoint")
        
        throw error
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error)
        process.exit(1)
    })

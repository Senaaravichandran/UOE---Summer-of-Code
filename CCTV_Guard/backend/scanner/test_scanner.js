// Quick test script to verify the scanner functionality
const CCTVScanner = require('./advanced_scanner');

async function testScanner() {
  console.log('🔍 Testing CCTV Scanner...\n');
  
  const scanner = new CCTVScanner();
  
  // Test with a small local network range
  console.log('📡 Starting scan on 127.0.0.1/32 (localhost only)...');
  
  try {
    const results = await scanner.scan('127.0.0.1/32', {
      ports: [80, 443, 8080],
      manufacturer: null,
      batchSize: 1
    });
    
    console.log('\n✅ Scan Complete!');
    console.log(`📊 Results: ${JSON.stringify(results, null, 2)}`);
    
    if (results.length > 0) {
      console.log('\n🎯 Devices Found:');
      results.forEach(device => {
        console.log(`  - IP: ${device.ip}`);
        console.log(`    Status: ${device.status}`);
        console.log(`    Open Ports: ${device.openPorts.join(', ')}`);
        console.log(`    Risk Level: ${device.riskLevel}`);
        console.log(`    Vulnerabilities: ${device.vulnerabilities.length}`);
      });
    } else {
      console.log('\n⚠️ No devices found (this is expected for localhost test)');
    }
    
    console.log('\n✨ Scanner test completed successfully!');
    console.log('💡 Tip: Try scanning your local network with 192.168.1.0/24');
    
  } catch (error) {
    console.error('\n❌ Error during scan:', error.message);
  }
}

// Run the test
testScanner();

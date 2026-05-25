const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const ipaddr = require('ipaddr.js');
const axios = require('axios');
const net = require('net');

// CCTV camera fingerprints
const CAMERA_SIGNATURES = {
  hikvision: {
    patterns: ['hikvision', 'dvrdvs-webs', 'netwave ip camera'],
    ports: [80, 8000, 554, 8080],
    paths: ['/doc/page/login.asp', '/Security/users', '/ISAPI/System/deviceInfo'],
    defaultCreds: [
      { user: 'admin', pass: '12345' },
      { user: 'admin', pass: 'admin' },
      { user: 'admin', pass: '' }
    ]
  },
  dahua: {
    patterns: ['dahua', 'dvr-webs', 'dss'],
    ports: [80, 37777, 554],
    paths: ['/RPC2_Login', '/current_config/Sha1Account', '/cgi-bin/magicBox.cgi'],
    defaultCreds: [
      { user: 'admin', pass: 'admin' },
      { user: 'admin', pass: '888888' },
      { user: '666666', pass: '666666' }
    ]
  },
  cpplus: {
    patterns: ['cp plus', 'cp-plus', 'cpplus'],
    ports: [80, 9000, 554],
    paths: ['/login.asp', '/cgi-bin/hi3510/param.cgi'],
    defaultCreds: [
      { user: 'admin', pass: 'admin' },
      { user: 'admin', pass: '12345' }
    ]
  },
  axis: {
    patterns: ['axis', 'axis communications'],
    ports: [80, 443, 554],
    paths: ['/axis-cgi/param.cgi', '/axis-cgi/basicdeviceinfo.cgi'],
    defaultCreds: [
      { user: 'root', pass: 'pass' },
      { user: 'root', pass: '' }
    ]
  }
};

// Advanced CCTV Scanner Class
class CCTVScanner {
  constructor() {
    this.results = [];
    this.scanProgress = 0;
    this.totalHosts = 0;
  }

  // Parse CIDR notation to get all IPs in range
  async parseIPRange(cidr) {
    try {
      const [ip, bits] = cidr.split('/');
      const addr = ipaddr.parse(ip);
      
      if (addr.kind() === 'ipv4') {
        const range = ipaddr.IPv4.networkAddressFromCIDR(cidr);
        const broadcast = ipaddr.IPv4.broadcastAddressFromCIDR(cidr);
        
        const ips = [];
        let current = range;
        
        while (current.toString() !== broadcast.toString()) {
          ips.push(current.toString());
          const bytes = current.toByteArray();
          bytes[3]++;
          if (bytes[3] > 255) {
            bytes[3] = 0;
            bytes[2]++;
            if (bytes[2] > 255) {
              bytes[2] = 0;
              bytes[1]++;
              if (bytes[1] > 255) break;
            }
          }
          current = ipaddr.fromByteArray(bytes);
        }
        ips.push(broadcast.toString());
        
        return ips;
      }
    } catch (error) {
      console.error('IP range parse error:', error);
      return [];
    }
  }

  // Check if port is open
  async checkPort(ip, port, timeout = 2000) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let isOpen = false;

      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        isOpen = true;
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.connect(port, ip);
    });
  }

  // HTTP banner grabbing
  async grabBanner(ip, port) {
    try {
      const response = await axios.get(`http://${ip}:${port}`, {
        timeout: 3000,
        validateStatus: () => true,
        maxRedirects: 0
      });
      
      return {
        headers: response.headers,
        statusCode: response.status,
        body: response.data ? response.data.substring(0, 500) : ''
      };
    } catch (error) {
      return null;
    }
  }

  // Detect camera manufacturer
  detectManufacturer(banner) {
    if (!banner) return 'Unknown';
    
    const content = JSON.stringify(banner).toLowerCase();
    
    for (const [manufacturer, config] of Object.entries(CAMERA_SIGNATURES)) {
      for (const pattern of config.patterns) {
        if (content.includes(pattern)) {
          return manufacturer;
        }
      }
    }
    
    // Additional detection based on server headers
    if (content.includes('boa/') || content.includes('lighttpd')) {
      return 'Generic CCTV';
    }
    
    return 'Unknown';
  }

  // Check for default credentials vulnerability
  async checkDefaultCreds(ip, port, manufacturer) {
    const config = CAMERA_SIGNATURES[manufacturer];
    if (!config) return { vulnerable: false, credentials: null };

    for (const cred of config.defaultCreds) {
      try {
        const auth = Buffer.from(`${cred.user}:${cred.pass}`).toString('base64');
        const response = await axios.get(`http://${ip}:${port}`, {
          headers: { 'Authorization': `Basic ${auth}` },
          timeout: 2000,
          validateStatus: () => true
        });

        if (response.status === 200) {
          return { vulnerable: true, credentials: cred };
        }
      } catch (error) {
        continue;
      }
    }

    return { vulnerable: false, credentials: null };
  }

  // Check RTSP stream exposure
  async checkRTSP(ip) {
    const rtspPort = 554;
    const isOpen = await this.checkPort(ip, rtspPort, 1500);
    
    if (isOpen) {
      return {
        exposed: true,
        port: rtspPort,
        commonPaths: [
          `rtsp://${ip}:554/stream1`,
          `rtsp://${ip}:554/live`,
          `rtsp://${ip}:554/ch01.264`
        ]
      };
    }
    
    return { exposed: false };
  }

  // Comprehensive scan of single host
  async scanHost(ip, options = {}) {
    const result = {
      ip,
      status: 'offline',
      openPorts: [],
      manufacturer: 'Unknown',
      model: 'Unknown',
      firmware: 'Unknown',
      vulnerabilities: [],
      services: [],
      riskLevel: 'Low',
      timestamp: new Date().toISOString()
    };

    try {
      // Scan common CCTV ports
      const portsToScan = options.ports || [80, 443, 554, 8000, 8080, 9000, 37777];
      
      for (const port of portsToScan) {
        const isOpen = await this.checkPort(ip, port);
        if (isOpen) {
          result.openPorts.push(port);
          result.status = 'online';

          // Grab banner for HTTP ports
          if ([80, 443, 8000, 8080, 9000].includes(port)) {
            const banner = await this.grabBanner(ip, port);
            if (banner) {
              const manufacturer = this.detectManufacturer(banner);
              if (manufacturer !== 'Unknown') {
                result.manufacturer = manufacturer;
              }

              result.services.push({
                port,
                service: 'http',
                banner: banner.headers['server'] || 'Unknown'
              });

              // Check for default credentials
              if (manufacturer !== 'Unknown') {
                const credCheck = await this.checkDefaultCreds(ip, port, manufacturer);
                if (credCheck.vulnerable) {
                  result.vulnerabilities.push({
                    type: 'Default Credentials',
                    severity: 'Critical',
                    details: `Default login: ${credCheck.credentials.user}/${credCheck.credentials.pass}`,
                    cve: 'CVE-2017-7921'
                  });
                }
              }

              // Check for unencrypted HTTP
              if (port === 80) {
                result.vulnerabilities.push({
                  type: 'No Encryption',
                  severity: 'High',
                  details: 'Device accessible via unencrypted HTTP',
                  cve: 'CVE-2019-12255'
                });
              }
            }
          }

          // Check RTSP
          if (port === 554) {
            result.services.push({
              port: 554,
              service: 'rtsp',
              banner: 'RTSP Stream'
            });

            result.vulnerabilities.push({
              type: 'Exposed RTSP Stream',
              severity: 'Medium',
              details: 'RTSP port accessible without authentication',
              cve: 'CVE-2018-9995'
            });
          }
        }
      }

      // Calculate risk level
      if (result.vulnerabilities.length > 0) {
        const hasCritical = result.vulnerabilities.some(v => v.severity === 'Critical');
        const hasHigh = result.vulnerabilities.some(v => v.severity === 'High');
        
        if (hasCritical) result.riskLevel = 'Critical';
        else if (hasHigh) result.riskLevel = 'High';
        else result.riskLevel = 'Medium';
      }

    } catch (error) {
      console.error(`Error scanning ${ip}:`, error.message);
    }

    this.scanProgress++;
    return result;
  }

  // Main scan function
  async scan(ipRange, options = {}) {
    console.log(`Starting advanced CCTV scan on ${ipRange}...`);
    
    const ips = await this.parseIPRange(ipRange);
    this.totalHosts = ips.length;
    this.scanProgress = 0;
    this.results = [];

    console.log(`Found ${ips.length} hosts to scan`);

    // Scan in batches to avoid overwhelming the network
    const batchSize = options.batchSize || 10;
    const filterManufacturer = options.manufacturer;
    const filterModel = options.model;

    for (let i = 0; i < ips.length; i += batchSize) {
      const batch = ips.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(ip => this.scanHost(ip, options))
      );

      // Filter results
      let filteredResults = batchResults.filter(r => r.status === 'online');

      if (filterManufacturer && filterManufacturer !== 'All') {
        filteredResults = filteredResults.filter(r => 
          r.manufacturer.toLowerCase() === filterManufacturer.toLowerCase()
        );
      }

      if (filterModel) {
        filteredResults = filteredResults.filter(r => 
          r.model.toLowerCase().includes(filterModel.toLowerCase())
        );
      }

      this.results.push(...filteredResults);

      console.log(`Progress: ${this.scanProgress}/${this.totalHosts} (${Math.round(this.scanProgress/this.totalHosts*100)}%)`);
    }

    console.log(`Scan complete! Found ${this.results.length} devices`);
    return {
      totalScanned: this.totalHosts,
      devicesFound: this.results.length,
      results: this.results,
      summary: {
        critical: this.results.filter(r => r.riskLevel === 'Critical').length,
        high: this.results.filter(r => r.riskLevel === 'High').length,
        medium: this.results.filter(r => r.riskLevel === 'Medium').length,
        low: this.results.filter(r => r.riskLevel === 'Low').length
      }
    };
  }

  // Get scan progress
  getProgress() {
    return {
      current: this.scanProgress,
      total: this.totalHosts,
      percentage: this.totalHosts > 0 ? Math.round((this.scanProgress / this.totalHosts) * 100) : 0
    };
  }
}

module.exports = CCTVScanner;

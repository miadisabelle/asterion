export type DomainInfo = {
  full: string        // e.g., "asterion.example.com"
  subdomain: string   // e.g., "asterion"
  mainDomain: string  // e.g., "example.com"
  tld: string         // e.g., "com"
  isLocalhost: boolean
}

/**
 * Parse a hostname into its components
 * This is a pure function safe for both client and server
 */
export function parseDomain(hostname: string): DomainInfo {
  // Remove port if present
  const host = hostname.split(':')[0]
  
  // Handle localhost
  if (host === 'localhost' || host === '127.0.0.1') {
    return {
      full: host,
      subdomain: 'local',
      mainDomain: 'localhost',
      tld: '',
      isLocalhost: true
    }
  }
  
  // Handle Vercel preview URLs (e.g., project-abc123.vercel.app)
  if (host.endsWith('.vercel.app') || host.endsWith('.v0.build')) {
    const parts = host.split('.')
    return {
      full: host,
      subdomain: parts[0],
      mainDomain: parts.slice(1).join('.'),
      tld: parts[parts.length - 1],
      isLocalhost: false
    }
  }
  
  const parts = host.split('.')
  
  // Handle simple domains (e.g., example.com)
  if (parts.length === 2) {
    return {
      full: host,
      subdomain: '',
      mainDomain: host,
      tld: parts[1],
      isLocalhost: false
    }
  }
  
  // Handle subdomains (e.g., asterion.example.com)
  if (parts.length >= 3) {
    // Check for country-code TLDs like .co.uk
    const possibleCcTld = parts.slice(-2).join('.')
    const ccTlds = ['co.uk', 'com.au', 'co.nz', 'co.jp', 'com.br', 'co.in']
    
    if (ccTlds.includes(possibleCcTld)) {
      return {
        full: host,
        subdomain: parts.slice(0, -3).join('.'),
        mainDomain: parts.slice(-3).join('.'),
        tld: possibleCcTld,
        isLocalhost: false
      }
    }
    
    return {
      full: host,
      subdomain: parts.slice(0, -2).join('.'),
      mainDomain: parts.slice(-2).join('.'),
      tld: parts[parts.length - 1],
      isLocalhost: false
    }
  }
  
  // Fallback
  return {
    full: host,
    subdomain: '',
    mainDomain: host,
    tld: '',
    isLocalhost: false
  }
}

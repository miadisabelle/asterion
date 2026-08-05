'use client'

import { useEffect, useState } from 'react'
import { parseDomain, type DomainInfo } from '@/lib/domain-utils'

/**
 * Client-side hook to get domain information
 * Uses window.location.hostname
 */
export function useDomain(): DomainInfo | null {
  const [domain, setDomain] = useState<DomainInfo | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDomain(parseDomain(window.location.hostname))
    }
  }, [])

  return domain
}

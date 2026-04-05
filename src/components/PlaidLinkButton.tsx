'use client'

import { usePlaidLink, PlaidLinkOnSuccessMetadata } from 'react-plaid-link'
import { useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import MfaGate from './mfa-gate'

export interface PlaidAccountInfo {
  plaid_account_id: string
  name: string
  official_name: string | null
  logo_url: string | null
  type: string
  subtype: string | null
  mask: string | null
  balance_current: number | null
  balance_available: number | null
}

interface PlaidLinkButtonProps {
  businessId: string
  existingAccountId?: string
  onConnected: (data: {
    itemId: string
    institutionName: string
    institutionId: string
    plaidAccounts: PlaidAccountInfo[]
    existingAccountId?: string
  }) => void
  onExit?: () => void
  buttonLabel?: string
  buttonClassName?: string
}

export default function PlaidLinkButton({
  businessId,
  existingAccountId,
  onConnected,
  onExit,
  buttonLabel = 'Connect Bank',
  buttonClassName,
}: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showMfaGate, setShowMfaGate] = useState(false)

  useEffect(() => {
    const fetchLinkToken = async () => {
      setIsLoading(true)
      const res = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'user' }),
      })
      const data = await res.json()
      setLinkToken(data.link_token ?? null)
      setIsLoading(false)
    }
    fetchLinkToken()
  }, [])

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess: async (public_token: string, metadata: PlaidLinkOnSuccessMetadata) => {
      const institution = metadata.institution

      // Exchange the public token server-side. The response contains item_id and
      // account metadata — no access_token is ever sent to the browser.
      const exchangeRes = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token }),
      })
      const exchangeData = await exchangeRes.json()
      if (!exchangeData.success) return

      // exchange-token fetches accounts server-side and returns them directly.
      // No second round-trip to get-accounts is needed.
      onConnected({
        itemId: exchangeData.item_id,
        institutionName: institution?.name ?? '',
        institutionId: institution?.institution_id ?? '',
        plaidAccounts: exchangeData.accounts ?? [],
        existingAccountId,
      })
    },
    onExit: () => onExit?.(),
  })

  const handleClick = () => {
    setShowMfaGate(true)
  }

  const handleMfaVerified = () => {
    setShowMfaGate(false)
    open()
  }

  const handleMfaClose = () => {
    setShowMfaGate(false)
  }

  const defaultClassName =
    'flex items-center gap-2 px-4 py-2 bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors'

  return (
    <>
      <MfaGate
        isOpen={showMfaGate}
        onVerified={handleMfaVerified}
        onClose={handleMfaClose}
      />
      <button
        onClick={handleClick}
        disabled={!ready || isLoading}
        className={buttonClassName ?? defaultClassName}
      >
        <Link2 size={16} />
        {isLoading ? 'Loading...' : buttonLabel}
      </button>
    </>
  )
}

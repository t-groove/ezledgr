'use client'

import { usePlaidLink, PlaidLinkOnSuccessMetadata } from 'react-plaid-link'
import { useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import MfaGate from './mfa-gate'

interface PlaidLinkButtonProps {
  businessId: string
  existingAccountId?: string
  onSuccess: (data: {
    accountId?: string
    institutionName: string
    accountName: string
    accountMask: string
    accountSubtype: string
    plaidAccountId: string
    existingAccountId?: string
  }) => void
  onExit?: () => void
  buttonLabel?: string
  buttonClassName?: string
}

export default function PlaidLinkButton({
  businessId,
  existingAccountId,
  onSuccess,
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
      const account = metadata.accounts[0]
      const institution = metadata.institution

      const res = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_token,
          plaid_account_id: account.id,
          institution_name: institution?.name,
          institution_id: institution?.institution_id,
          account_name: account.name,
          account_mask: account.mask,
          account_subtype: account.subtype,
          existing_account_id: existingAccountId,
          business_id: businessId,
        }),
      })

      const data = await res.json()
      if (data.success) {
        onSuccess({
          accountId: data.account?.id,
          institutionName: institution?.name ?? '',
          accountName: account.name,
          accountMask: account.mask ?? '',
          accountSubtype: account.subtype ?? '',
          plaidAccountId: account.id,
          existingAccountId,
        })
      }
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

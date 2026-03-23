'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../supabase/client'
import { Shield, X, Lock } from 'lucide-react'

interface MfaGateProps {
  isOpen: boolean
  onVerified: () => void
  onClose: () => void
}

type GateStatus = 'loading' | 'prompt' | 'not-enrolled'

export default function MfaGate({ isOpen, onVerified, onClose }: MfaGateProps) {
  const [status, setStatus] = useState<GateStatus>('loading')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!isOpen) {
      // Reset state when closed
      setCode('')
      setError('')
      setStatus('loading')
      return
    }
    checkMfaStatus()
  }, [isOpen])

  const checkMfaStatus = async () => {
    setStatus('loading')
    const supabase = createClient()

    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

    if (aalData?.currentLevel === 'aal2') {
      onVerified()
      return
    }

    const { data: factorsData } = await supabase.auth.mfa.listFactors()
    const verifiedFactor = factorsData?.totp?.find((f) => f.status === 'verified')

    if (verifiedFactor) {
      setFactorId(verifiedFactor.id)
      setStatus('prompt')
    } else {
      setStatus('not-enrolled')
    }
  }

  const handleVerify = async () => {
    if (!factorId || code.length !== 6 || isVerifying) return
    setIsVerifying(true)
    setError('')

    const supabase = createClient()

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    })

    if (challengeError || !challengeData) {
      setError('Failed to start verification. Please try again.')
      setIsVerifying(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    })

    if (verifyError) {
      setError('Invalid code. Please check your authenticator app and try again.')
      setIsVerifying(false)
      setCode('')
      return
    }

    onVerified()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-sm bg-[#1e293b] border border-[#1E2A45] rounded-2xl shadow-2xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-[#6B7A99] hover:text-[#E8ECF4] transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Loading state */}
        {status === 'loading' && (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#3b82f6] border-t-transparent animate-spin" />
            <p className="text-sm text-[#6B7A99]">Checking security status…</p>
          </div>
        )}

        {/* Not enrolled — must set up 2FA first */}
        {status === 'not-enrolled' && (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center">
              <Shield size={24} className="text-[#3b82f6]" />
            </div>
            <div>
              <h2 className="font-semibold text-[#E8ECF4] text-base mb-1">
                Two-Factor Authentication Required
              </h2>
              <p className="text-sm text-[#6B7A99] leading-relaxed">
                Two-factor authentication is required to connect a bank account.
                This protects your financial data.
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/settings')}
              className="w-full px-4 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium text-sm rounded-lg transition-colors"
            >
              Enable 2FA in Settings
            </button>
            <button
              onClick={onClose}
              className="text-sm text-[#6B7A99] hover:text-[#E8ECF4] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* OTP prompt — 2FA enrolled, AAL1 session */}
        {status === 'prompt' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center shrink-0">
                <Lock size={20} className="text-[#3b82f6]" />
              </div>
              <div>
                <h2 className="font-semibold text-[#E8ECF4] text-base leading-tight">
                  Verify your identity
                </h2>
                <p className="text-xs text-[#6B7A99] mt-0.5">
                  Enter your authenticator code to connect your bank
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#6B7A99] mb-1.5">
                6-digit authentication code
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setCode(val)
                  setError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerify()
                }}
                className="w-full bg-[#0A0F1E] border border-[#1E2A45] text-[#E8ECF4] rounded-lg px-4 py-3 text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#3b82f6] placeholder:text-[#1E2A45]"
                autoFocus
              />
              {error && (
                <p className="text-xs text-[#EF4444] mt-1.5">{error}</p>
              )}
            </div>

            <button
              onClick={handleVerify}
              disabled={code.length !== 6 || isVerifying}
              className="w-full px-4 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors"
            >
              {isVerifying ? 'Verifying…' : 'Verify'}
            </button>

            <button
              onClick={onClose}
              className="text-sm text-[#6B7A99] hover:text-[#E8ECF4] transition-colors text-center"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

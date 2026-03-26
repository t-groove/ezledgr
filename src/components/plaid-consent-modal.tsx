'use client'

import { useState } from 'react'
import { createClient } from '../../supabase/client'

interface PlaidConsentModalProps {
  open: boolean
  onAccept: () => void
  onClose: () => void
}

export function PlaidConsentModal({ open, onAccept, onClose }: PlaidConsentModalProps) {
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleAccept = async () => {
    if (!checked) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('plaid_consents').insert({
          user_id: user.id,
          consented_at: new Date().toISOString(),
          consent_version: '1.0',
        })
      }
    } catch {
      // non-blocking — proceed even if insert fails
    } finally {
      setLoading(false)
    }
    onAccept()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Connect your bank account
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          EZ Ledgr uses{' '}
          <span className="font-medium">Plaid</span> to securely connect to your
          financial institution. By continuing, you authorize EZ Ledgr to access
          your account information (balances, transactions, and account details)
          for bookkeeping purposes.
        </p>
        <ul className="text-sm text-gray-600 mb-4 space-y-1 list-disc list-inside">
          <li>Your credentials are never stored by EZ Ledgr</li>
          <li>Read-only access to your account data</li>
          <li>You can disconnect at any time from Settings</li>
        </ul>
        <label className="flex items-start gap-3 mb-6 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#4F7FFF]"
          />
          <span className="text-sm text-gray-700">
            I agree to EZ Ledgr&apos;s{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4F7FFF] underline hover:text-[#3D6FEF]"
              onClick={(e) => e.stopPropagation()}
            >
              Terms of Service
            </a>{' '}
            and consent to connecting my bank account via Plaid.
          </span>
        </label>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAccept}
            disabled={!checked || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-[#4F7FFF] hover:bg-[#3D6FEF] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {loading ? 'Saving…' : 'Connect bank account →'}
          </button>
        </div>
      </div>
    </div>
  )
}

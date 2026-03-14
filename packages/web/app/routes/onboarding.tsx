import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from '../lib/auth-client'
import { apiFetch } from '../lib/api'

type ProfileResponse = {
  onboardingCompleted: boolean
  profile: {
    role: string | null
    companyName: string | null
    teamSize: string | null
    goals: string[]
  } | null
}

const roles = [
  { value: 'pm', label: 'Product Manager' },
  { value: 'designer', label: 'Designer' },
  { value: 'engineer', label: 'Engineer' },
  { value: 'founder', label: 'Founder' },
  { value: 'other', label: 'Other' },
]

const teamSizes = ['1-5', '6-20', '21-50', '50+']
const goalOptions = [
  'Analyze customer interviews',
  'Generate feature specs',
  'Prioritize features',
  'Collaborate with team',
]

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

export function OnboardingPage() {
  const navigate = useNavigate()
  const { data: session, isPending } = useSession()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [role, setRole] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [teamSize, setTeamSize] = useState('')
  const [goals, setGoals] = useState<string[]>([])

  // Field-specific validation errors per step
  const [roleError, setRoleError] = useState('')
  const [companyNameError, setCompanyNameError] = useState('')
  const [teamSizeError, setTeamSizeError] = useState('')
  const [goalsError, setGoalsError] = useState('')

  useEffect(() => {
    if (isPending) return

    if (!session) {
      navigate({ to: '/sign-in' })
      return
    }

    const loadStatus = async () => {
      try {
        const data = await apiFetch<ProfileResponse>('/api/onboarding/status')

        if (data.onboardingCompleted) {
          navigate({ to: '/dashboard' })
          return
        }

        if (data.profile) {
          setRole(data.profile.role || '')
          setCompanyName(data.profile.companyName || '')
          setTeamSize(data.profile.teamSize || '')
          setGoals(data.profile.goals || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load onboarding')
      } finally {
        setLoading(false)
      }
    }

    void loadStatus()
  }, [session, isPending, navigate])

  const stepComplete = useMemo(() => ([
    Boolean(role),
    Boolean(companyName.trim() && teamSize),
    goals.length > 0,
  ]), [role, companyName, teamSize, goals])

  const toggleGoal = (goal: string) => {
    setGoals((current) => current.includes(goal)
      ? current.filter((item) => item !== goal)
      : [...current, goal])
    setGoalsError('')
  }

  const handleContinue = () => {
    setRoleError('')
    setCompanyNameError('')
    setTeamSizeError('')
    setGoalsError('')
    setError('')

    if (step === 0) {
      if (!role) {
        setRoleError('Please select a role to continue')
        return
      }
    } else if (step === 1) {
      let valid = true
      if (!companyName.trim()) {
        setCompanyNameError('Company name is required')
        valid = false
      }
      if (!teamSize) {
        setTeamSizeError('Please select a team size')
        valid = false
      }
      if (!valid) return
    }

    setStep((current) => Math.min(current + 1, 2))
  }

  const handleSubmit = async () => {
    setGoalsError('')
    setError('')

    if (goals.length === 0) {
      setGoalsError('Please select at least one goal')
      return
    }

    if (!stepComplete.every(Boolean)) {
      setError('Please complete every onboarding step')
      return
    }

    setSubmitting(true)

    try {
      await apiFetch('/api/onboarding', {
        method: 'POST',
        body: JSON.stringify({ role, companyName, teamSize, goals }),
      })

      navigate({ to: '/dashboard/projects/new' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save onboarding')
      setSubmitting(false)
    }
  }

  if (isPending || loading) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <p className="auth-subtitle">Loading onboarding...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page onboarding-page">
      <div className="auth-container onboarding-container">
        <div className="auth-header">
          <Link to="/" className="auth-logo">Scope</Link>
          <h1 className="auth-title">Let’s set up your workspace</h1>
          <p className="auth-subtitle">A few quick questions so your dashboard feels useful from day one.</p>
        </div>

        <div className="onboarding-steps">
          {[1, 2, 3].map((item, index) => (
            <button
              key={item}
              type="button"
              className={`onboarding-step ${index === step ? 'is-active' : ''} ${stepComplete[index] ? 'is-complete' : ''}`}
              onClick={() => setStep(index)}
            >
              <span>{item}</span>
              <small>{index === 0 ? 'Role' : index === 1 ? 'Team' : 'Goals'}</small>
            </button>
          ))}
        </div>

        {error && <div className="auth-error">{error}</div>}

        {step === 0 && (
          <div className="onboarding-panel">
            <h2 className="onboarding-title">What best describes your role?</h2>
            <div className="choice-grid">
              {roles.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`choice-card ${role === item.value ? 'is-selected' : ''}`}
                  onClick={() => { setRole(item.value); setRoleError('') }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {roleError && <span className="field-error">{roleError}</span>}
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-panel">
            <h2 className="onboarding-title">Tell us about your team</h2>
            <div className="form-group">
              <label htmlFor="companyName" className="form-label">Company name</label>
              <input
                id="companyName"
                className={`form-input${companyNameError ? ' form-input--error' : ''}`}
                value={companyName}
                onChange={(event) => { setCompanyName(event.target.value); if (companyNameError) setCompanyNameError('') }}
                placeholder="Acme, Orbit, Linear..."
              />
              {companyNameError && <span className="field-error">{companyNameError}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Team size</label>
              <div className="choice-grid compact">
                {teamSizes.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`choice-card ${teamSize === item ? 'is-selected' : ''}`}
                    onClick={() => { setTeamSize(item); setTeamSizeError('') }}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {teamSizeError && <span className="field-error">{teamSizeError}</span>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-panel">
            <h2 className="onboarding-title">What do you want Scope to help with?</h2>
            <div className="choice-grid">
              {goalOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`choice-card ${goals.includes(item) ? 'is-selected' : ''}`}
                  onClick={() => toggleGoal(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            {goalsError && <span className="field-error">{goalsError}</span>}
          </div>
        )}

        <div className="onboarding-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setStep((current) => Math.max(current - 1, 0))}
            disabled={step === 0 || submitting}
          >
            Back
          </button>

          {step < 2 ? (
            <button type="button" className="btn-primary" onClick={handleContinue}>
              Continue
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Finish onboarding'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

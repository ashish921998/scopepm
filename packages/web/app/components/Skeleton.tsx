import React from 'react'

type SkeletonProps = {
  className?: string
  style?: React.CSSProperties
  width?: string | number
  height?: string | number
  borderRadius?: string | number
}

export function Skeleton({ className, style, width, height, borderRadius = '6px' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className ?? ''}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  )
}

/** A skeleton block that matches a stats-card */
export function SkeletonStatCard() {
  return (
    <div className="stats-card">
      <Skeleton height="14px" width="80px" style={{ marginBottom: '0.5rem' }} />
      <Skeleton height="40px" width="60px" borderRadius="4px" />
    </div>
  )
}

/** A skeleton row that matches an activity-item */
export function SkeletonActivityItem() {
  return (
    <div className="activity-item">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <Skeleton height="16px" width="60%" />
        <Skeleton height="13px" width="40%" />
      </div>
      <div className="activity-side">
        <Skeleton height="22px" width="64px" borderRadius="999px" />
        <Skeleton height="13px" width="72px" />
      </div>
    </div>
  )
}

/** A skeleton card that approximates a project-card */
export function SkeletonProjectCard() {
  return (
    <div className="project-card" style={{ cursor: 'default' }}>
      <div className="project-card-header">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <Skeleton height="22px" width="70%" borderRadius="6px" />
          <Skeleton height="15px" width="90%" />
          <Skeleton height="15px" width="60%" />
        </div>
        <Skeleton height="22px" width="72px" borderRadius="999px" />
      </div>
      <div className="project-metrics">
        <Skeleton height="14px" width="80px" />
        <Skeleton height="14px" width="60px" />
        <Skeleton height="14px" width="100px" />
      </div>
    </div>
  )
}

/** A skeleton card that approximates an interview-card */
export function SkeletonInterviewCard() {
  return (
    <div className="interview-card">
      <div className="interview-header">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <Skeleton height="22px" width="65%" borderRadius="6px" />
          <Skeleton height="14px" width="120px" />
        </div>
        <Skeleton height="22px" width="72px" borderRadius="999px" />
      </div>
      <Skeleton height="15px" width="95%" style={{ marginBottom: '0.5rem' }} />
      <Skeleton height="15px" width="80%" style={{ marginBottom: '1rem' }} />
      <div className="interview-meta">
        <Skeleton height="13px" width="100px" />
      </div>
      <div className="interview-actions">
        <Skeleton height="32px" width="128px" borderRadius="8px" />
        <Skeleton height="32px" width="64px" borderRadius="6px" />
      </div>
    </div>
  )
}

/** A skeleton card that approximates a spec-card */
export function SkeletonSpecCard() {
  return (
    <div className="spec-card">
      <div className="spec-header">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <Skeleton height="22px" width="65%" borderRadius="6px" />
          <Skeleton height="14px" width="100px" />
        </div>
        <div className="spec-badges">
          <Skeleton height="22px" width="56px" borderRadius="999px" />
          <Skeleton height="22px" width="64px" borderRadius="999px" />
        </div>
      </div>
      <Skeleton height="15px" width="95%" style={{ marginBottom: '0.5rem' }} />
      <Skeleton height="15px" width="85%" style={{ marginBottom: '0.5rem' }} />
      <Skeleton height="15px" width="70%" style={{ marginBottom: '1rem' }} />
      <div className="spec-meta">
        <Skeleton height="13px" width="100px" />
      </div>
      <div className="spec-actions">
        <Skeleton height="32px" width="160px" borderRadius="6px" />
        <Skeleton height="32px" width="64px" borderRadius="6px" />
      </div>
    </div>
  )
}

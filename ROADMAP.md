# Scope PM — Product Roadmap

## Product Loop

Scope PM should help a PM move through a clear workflow:

1. Ingest customer interviews quickly
2. Synthesize patterns across interviews
3. Turn evidence into prioritized specs
4. Hand specs off to execution tools
5. Track whether shipped work resolved the original pain points

The roadmap below is organized around completing and deepening that loop rather than collecting disconnected features.

## Planning Principles

- Prioritize features that shorten the path from raw interviews to shippable specs
- Preserve traceability so every insight and spec can be tied back to source evidence
- Ship thin vertical slices before broad platform work
- Defer polish features until the core workflow is clearly valuable

## Phase 1 — Foundation and Fast Time-to-Value

Goal: Make it easy for a single PM to get interviews into the product, analyze them, and navigate the resulting artifacts.

### Success Criteria
- A new user can create a project, upload interviews, and get usable analysis in one session
- Large projects remain navigable without manual cleanup
- Core data can be found, filtered, and safely retained over time

### MVP Scope

#### Interview Ingestion
- [ ] Upload multiple transcripts at once
- [ ] Batch AI analysis with progress tracking
- [ ] Basic failure handling and retry for analysis jobs

#### Search and Organization
- [ ] Global search across interviews, specs, and competitors
- [ ] Filter by status, priority, and date range
- [ ] Search within interview transcripts
- [ ] Archive projects instead of deleting them
- [ ] Filter archived vs. active projects

#### Core UX
- [ ] Onboarding checklist: create project, upload interview, generate spec
- [ ] One-click duplicate spec
- [ ] Keyboard shortcuts for navigation and quick actions

### Risks / Dependencies
- Background jobs and progress states need to be reliable before larger AI workflows depend on them
- Search quality will affect perceived product quality more than dashboard polish

## Phase 2 — Cross-Interview Synthesis MVP

Goal: Turn a set of interviews into trustworthy patterns a PM can act on.

### Success Criteria
- Users can identify top recurring pain points across a project in minutes
- Every synthesized claim links back to supporting interviews and quotes
- The system distinguishes broad patterns from one-off outliers

### MVP Scope

#### Synthesis Core
- [ ] Cluster themes and pain points across all interviews in a project
- [ ] Rank themes by frequency with project-level counts
- [ ] Generate an AI summary of top patterns
- [ ] Show supporting evidence for each theme

#### Trust and Review
- [ ] Surface consensus themes vs. outlier insights
- [ ] Let users inspect which interviews contributed to each synthesized pattern
- [ ] Add lightweight controls to merge, rename, or dismiss themes

#### Synthesis View
- [ ] Project-level synthesis dashboard
- [ ] Saved summary state so teams can revisit the latest synthesis

### Later Expansion
- [ ] Confidence scoring for themes
- [ ] Trend comparison across time periods or interview cohorts
- [ ] Competitor gap overlays in synthesis

### Risks / Dependencies
- This is the product's most important differentiator, so traceability matters as much as summary quality
- Poor evidence linking will make AI output feel untrustworthy even if summaries are accurate

## Phase 3 — Prioritization and Spec Workflow

Goal: Convert synthesized evidence into ranked product opportunities and editable specs.

### Success Criteria
- A PM can move from interview evidence to a prioritized spec without leaving the product
- Priority recommendations are explainable, not just generated
- Specs can evolve safely over time

### MVP Scope

#### Prioritization
- [ ] Impact vs. effort matrix view
- [ ] Auto-suggest priority using interview frequency and competitor gaps
- [ ] Explain the inputs behind each suggested score
- [ ] Drag-and-drop override for manual ranking

#### Spec Management
- [ ] Track spec edits over time
- [ ] Diff view between versions
- [ ] Restore previous versions

### Later Expansion
- [ ] Customizable scoring model weights
- [ ] Portfolio-level prioritization across projects
- [ ] Saved prioritization presets by team or product area

### Risks / Dependencies
- Priority recommendations need visible reasoning or users will ignore them
- Versioning becomes more important once collaboration and integrations are added

## Phase 4 — Handoff and Outcome Tracking

Goal: Close the loop between research, planning, execution, and outcomes.

### Success Criteria
- Specs can be exported or synced into the tools teams already use
- Shipped work remains linked to the customer evidence that justified it
- Teams can evaluate whether a release solved the original problem

### MVP Scope

#### Export and Integrations
- [ ] Export specs as Markdown
- [ ] Export specs as PDF
- [ ] Linear integration

#### Outcome Tracking
- [ ] Mark specs as shipped
- [ ] Link shipped specs back to source interviews
- [ ] Track whether pain points were resolved

### Later Expansion
- [ ] Jira integration
- [ ] Notion integration
- [ ] Outcome metrics dashboard
- [ ] CSV export of interviews, specs, and competitors
- [ ] Bulk export per project

### Risks / Dependencies
- Start with one strong integration before widening surface area
- Sync behavior, ownership, and failure handling should be defined before adding multiple external tools

## Phase 5 — Collaboration and Richer Input Types

Goal: Support team workflows once the single-player experience is strong.

### Success Criteria
- Multiple teammates can work in the same project without confusion
- Permissions are clear and audit-friendly
- Rich interview media is supported without degrading the rest of the workflow

### MVP Scope

#### Team Collaboration
- [ ] Multi-user projects with email invites
- [ ] Roles: viewer, editor, admin
- [ ] Comments on specs and interviews

#### Recording and Transcription
- [ ] Upload audio and video files
- [ ] Auto-transcription with Whisper or Deepgram
- [ ] Timestamped transcript with playback

### Later Expansion
- [ ] @mentions and activity feed per project
- [ ] Shared project dashboard
- [ ] Paste Zoom or Google Meet recording link
- [ ] Email notifications for analysis completion and spec changes
- [ ] Weekly digest of project activity

### Risks / Dependencies
- Collaboration requires clear permission boundaries and conflict handling
- Media upload and transcription introduce cost, privacy, and storage concerns

## Phase 6 — Expansion Bets and Polish

Goal: Add leverage once the core workflow is already winning.

### Candidate Features
- [ ] Customer persona builder
- [ ] Editable persona cards
- [ ] Share personas across projects
- [ ] Dashboard charts for interviews, specs, and analysis trends
- [ ] Dark mode

### Notes
- These features may improve completeness or presentation, but they should not outrank core workflow improvements
- Persona generation should only ship once synthesis quality is consistently strong

## Features to Treat as Cross-Cutting Requirements

These should not live in only one phase because they affect the product end to end.

### Traceability
- [ ] Every synthesized insight links to supporting interviews, quotes, or transcript spans
- [ ] Every prioritized spec links back to the evidence that informed it
- [ ] Every shipped outcome can be traced back to the original customer pain point

### Reliability
- [ ] Background jobs are observable and retryable
- [ ] Long-running analysis has clear progress states
- [ ] Failed imports and failed syncs are recoverable

### Trust and Explainability
- [ ] AI-generated summaries expose supporting evidence
- [ ] Priority recommendations explain why a score was assigned
- [ ] Users can override AI output without fighting the system

## What Not to Over-Invest In Yet

- Broad dashboarding before core workflow usage is proven
- Multiple external integrations before one integration works well
- Collaboration-heavy features before single-user value is strong
- Aesthetic polish that does not materially improve activation or retention

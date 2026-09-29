# SkyFreedom — UX research brief

> **Evidence boundary:** This is a desk review of the supplied hackathon brief and the current local prototype. No interviews, field observation, usability sessions, or responder feedback were supplied. Role profiles and ratings below are hypotheses to validate, not claims about real emergency-service personnel.

**Product:** emergency-response coordination demonstrator · **Audience:** three simulated operational roles and a first-time hackathon viewer · **Primary goal:** turn an observation from a drone into a verified, actionable ground-team alert.

## Role hypotheses

### Mission commander

- **Situation:** monitors several resources and receives reports while the operation is active.
- **Job to be done:** when a report arrives, decide whether it is credible and make the consequence for other teams explicit.
- **Needs:** clear urgency, source and location; an obvious verify/reject decision; a distinct activation step; a visible operation history.
- **Risks:** dense dashboards hide the decision; a premature alert sends unverified information to the field.

### Drone operator

- **Situation:** watches the simulated route and telemetry while observing the assigned sector.
- **Job to be done:** attach a useful, located report to an observation without losing track of the flight state.
- **Needs:** readable flight status, a direct report action, short fields, and clear submission feedback.
- **Risks:** ambiguous labels, long forms, or unclear airspace warnings distract from the assigned observation.

### Ground unit

- **Situation:** checks an alert on a phone or tablet while moving through the operation area.
- **Job to be done:** understand whether a route is safe and what alternative action is recommended.
- **Needs:** one clear hazard, its location, a direct instruction, and a way to acknowledge or report an update.
- **Risks:** a map pin without a verbal instruction, small touch targets, or color-only status is hard to use in motion.

## Primary journey hypothesis

| Stage | User question | Interface opportunity |
|---|---|---|
| Choose role | “Which view is for me?” | Explain each role in one plain sentence; make the choice reversible. |
| Observe | “What is happening now?” | Show operation, status, location, and current task before secondary data. |
| Report | “How do I pass on what I see?” | One prominent action, short form, location attached as a visible demo value. |
| Verify | “What needs my decision?” | Show source, description, location, urgency, and separate verify/reject actions. |
| Activate | “Who will receive this?” | State that activating the incident notifies the ground role; require a deliberate action. |
| Respond | “What should I do?” | Make the ground instruction the visual priority; keep the map as supporting context. |
| Clear / reset | “Is this still active?” | Distinguish resolved incident from demo reset; keep both outcomes visible in history. |

**Emotion arc hypothesis:** orientation → focused observation → decision confidence → clear action. The UI should reduce uncertainty at each transition rather than add more data to scan.

## Current prototype heuristic review

Ratings are a code-based heuristic estimate (1 = critical friction, 5 = strong support), not observed task performance.

| # | Heuristic | Rating | Evidence in current UI | Redesign response |
|---|---|---:|---|---|
| 1 | Visibility of system status | 2 | Statuses exist, but many labels are tiny and visually compete. | Give each role one prominent current-state area and immediate action feedback. |
| 2 | Match with the real world | 3 | The report/verify/activate flow is relevant; many labels use uppercase system terminology. | Use plain Polish and show what each status means to the person acting. |
| 3 | User control and freedom | 3 | Role changes and reset exist; reset and operational actions are not equally clear. | Keep role switching and reset findable; distinguish reversible view changes from operation changes. |
| 4 | Consistency and standards | 2 | Small control sizes and dense labels vary across panels. | Use one type scale, button system, spacing rhythm, and status vocabulary. |
| 5 | Error prevention | 2 | Activation is a consequential transition after verification. | Separate verify from activate and state who receives the alert before activation. |
| 6 | Recognition rather than recall | 2 | First-time viewers must infer the role switcher and the next step from the dashboard. | Start with a role choice and give each role one clear task path. |
| 7 | Flexibility and efficiency | 3 | Role simulation supports a demo; responsive layouts exist but compact controls remain difficult. | Keep the same workflow across screen sizes and adapt navigation to available space. |
| 8 | Aesthetic and minimalist design | 1 | Numerous micro-labels, panels, and competing status elements create visual density. | Remove dashboard clutter and use progressive disclosure for supporting detail. |
| 9 | Help users recover from errors | 2 | Toast feedback is temporary; no clear recovery guidance accompanies every state. | Keep durable status changes in the incident and timeline, not only in a toast. |
| 10 | Help and documentation | 1 | The interface provides little first-use explanation. | Make the role chooser and inline action descriptions serve as concise onboarding. |

## Proposed information architecture

```text
Role selection
├── Mission commander
│   ├── Current operation and priority incident
│   ├── Three illustrative camera views and selected drone sensors
│   ├── Verify / reject / activate
│   ├── Drone and ground-team status
│   ├── Airspace simulation
│   └── Operation timeline and reset
├── Drone operator
│   ├── Large illustrative camera, zoom and visual mode
│   ├── Flight simulation and telemetry
│   ├── Airspace status
│   └── Report an observation
└── Ground unit
    ├── Active route alert and instruction
    └── Supporting satellite-style map and source image
```

Role selection is simulated, not authentication. Shared operation context should remain available when the user switches roles.

The added cameras, satellite-style map, and sensor values are design hypotheses for the hackathon demonstration. The imagery is generated and the values are simulated; no operator or responder usability study has validated this layout.

## Stress-use requirements to validate

- Within a brief glance, a first-time user can identify the operation, selected role, current incident state, and next action.
- Each role has one dominant primary action; secondary controls do not compete with it.
- Ground alerts say what is blocked and what the team should do, in text as well as on the map.
- Critical status uses a label and icon as well as color.
- Interactive targets are at least 44 × 44 CSS px on touch layouts, with visible keyboard focus and logical tab order.
- The same end-to-end scenario remains usable at 375, 768, 1024, and 1440 CSS px without horizontal scrolling.
- Motion communicates changes only and respects reduced-motion preferences.

## Usability walkthrough for the rebuilt demo

Ask a first-time reviewer to complete these tasks without narration:

1. Choose the role that observes from the air and start the flight simulation.
2. Report a blocked road and identify whether the report reached the commander.
3. As commander, verify the report, then activate it for the ground unit.
4. As the ground unit, identify the hazard and recommended response.
5. Return to the commander, inspect the timeline, simulate an airspace restriction, and reset the demo.

Record where the reviewer hesitates, misreads a status, or asks what to do next. Use those observations to revise the hierarchy and copy before the final responsive pass.

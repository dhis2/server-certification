# DSCP Assessment Method

An organisation seeking to have their system assessed should reach out by email to <xxxx@dhis2.org> or complete the online form at https://...  

The process from there will follow the following steps:
- inception meeting/call to explain the process and requirements
- Access Agreement signed by both assessors and the System Owner
- Secure channel agreed for sharing results
- contacts shared for co-ordinating access and addressing queries
- online assessment is carried out by HISP UIO assessors
- detailed and summary results shared via secure channel
- meeting/call covened to discuss results and potential mitigations in the event of certification standard not achieved
- either certificate issued or
  - a period agreed (not more than one month) to address deficiencies
  - follow up assessment is carried out
  - certificate is issued
## Assessment

The assessment will be carried out remotely, requiring that the assessors have full ssh access to the system for the assessment period (typically less than 1 week)

The assessment will be guided by the list of controls in `controls.md`.  Though this is primarily a box-ticking execise, the assessors will also be required and expected to make subjective observations based on their experience. They may also reach out for additional clarifying information, documents etc as required.

## Who Performs the Assessment

- The assessing organization assigns two qualified assessors (primary and peer reviewer) with DHIS2 infrastructure and security expertise.
- Assessors work independently from implementation teams and coordinate with the System Owner’s appointed point of contact (POC).

## Access Provisioning
   - Named user accounts for each assessor on in-scope servers (no shared accounts).
   - SSH key–based access only
   - Sudo rights required for read/verify operations (e.g., service status, file permissions, config reads). Where prohibited, a custodian must run commands live with screen-share and provide artifacts.
   - Network allow‑listing or VPN/bastion access, with MFA where available.

## What We Will Access

- Application server(s) hosting DHIS2 (e.g., Tomcat or equivalent Java app service and reverse proxy).
- PostgreSQL server(s) used by DHIS2 (backups, retention, restore evidence).
- Reverse proxy/TLS termination and relevant network controls.
- Central logging/monitoring (where in scope) and governance documents.

## Detailed assessment concrete activities

1. Planning (1–3 days)

   - Kickoff with POC; confirm scope, timelines, contacts, maintenance windows.
   - Receive: architecture diagrams, inventories, network exposure list, prior assessments.
   - Test connectivity (SSH/VPN) and sudo ability; confirm evidence channel works.

2. Evidence Collection (remote unless on‑site requested)

   - Configuration review: OS hardening, SSH, firewall, TLS/reverse proxy, app service, PostgreSQL (`pg_hba.conf`, roles, backups).
   - Command outputs and logs: service status, permissions, update status, monitoring alerts, backup/restore logs.
   - Automated checks: TLS scan, external port scan from assessor network, backup integrity proof.
   - Interviews (time‑boxed) with SMEs: DB, OS, network, application, security/governance.

3. Validation & Sampling

   - Depth of sampling is based on Implementation Group level:
     - IG1: validate all baseline technical controls on production; sample last 3–6 months where time-bounded.
     - IG2: IG1 plus additional controls; increase sampling depth and include pre‑prod.
     - IG3: IG1+IG2 plus advanced controls; extend sampling window and include detection/response validation.
   - Cross‑validate artifacts (e.g., backup logs, actual backup files, and restore proofs).

4. Scoring & Gap Recording

   - For each control: Compliant / Partially Compliant / Non‑Compliant / Not Applicable / Not Tested.
   - Record evidence references, owners, and target remediation dates.

5. Reporting & Decision
   - Deliver detailed report and `summary_report.md` with scorecards and critical findings.
   - Present findings and prioritized remediation plan.
   - Certification determination per criteria below (IG1 is base certificate).

## Roles and Responsibilities

- Assessors: collect/validate evidence, score controls, document findings.
- System Owner: provision access, ensure accuracy, designate SMEs, own remediation.
- Custodians/SMEs (DB/OS/Network/App/Sec): provide configs, run commands if needed, clarify design.

## Methods by Control Type

- Technical controls (normative): shell verification, file and permission review, service status, configuration diff, log/event inspection, automated scans, and restore/runbook evidence.
- Organizational controls (informative): document review, interviews, ticket sampling, approval trail validation.

## Evidence Requirements

- Artifacts must directly satisfy each control’s Verification Method in `controls.md`.
- Include timestamps, hostname/system identifiers, and responsible owner per artifact.
- Screenshots must include context (hostname and timestamp); configuration files must include relevant sections.

## Evidence Handling and Security

- Use the agreed secure channel with access logging; encrypt data at rest in the repository.
- Minimize data: redact PII/credentials/keys; share config excerpts where feasible.
- Maintain an evidence register with file names, hashes (where practical), and source.
- Retain artifacts only for the contractually agreed period.

## Scoring Rules

- Compliant: meets all criteria in the control’s Description and Verification Method.
- Partially Compliant: most criteria met; gaps do not undermine intent; plan in place.
- Non‑Compliant: criteria not met or significant deficiencies.
- Not Applicable: outside scope; provide justification.
- Not Tested: evidence unavailable within the assessment window.

## Certification Criteria and IG Interpretation

- IG1 constitutes the baseline certification. All IG1 technical controls are normative.
- IG2 adds additional technical controls. Certification at IG2 requires IG1 + IG2 normative controls.
- IG3 adds advanced technical controls. Certification at IG3 requires IG1 + IG2 + IG3 normative controls (if opted).
- Organizational controls inform risk posture but are not pass/fail unless explicitly marked normative.
- Default thresholds (can be tailored per engagement):
  - IG1 technical controls: ≥ 95% Compliant; 0% Critical Non‑Compliant.
  - IG2 technical controls: ≥ 90% Compliant; ≤ 5% Partially Compliant; 0% Critical Non‑Compliant.
  - IG3 technical controls: ≥ 85% Compliant; ≤ 10% Partially Compliant; 0% Critical Non‑Compliant.
- Critical Non‑Compliant examples: no TLS; default admin active; no backups; unrestricted DB access.

## Remediation and Reassessment

- Gaps require an action plan with owners and target dates.
- Limited revalidation may be performed within 30 days for minor gaps.
- Significant changes or critical gaps trigger full reassessment.

## References

- `controls.md` (authoritative catalog and verification methods)

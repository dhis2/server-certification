# DSCP Assessment Method

## Objective

Define the standardized approach for assessing DHIS2 environments against the DSCP control catalog in controls.md, aligned with industry standards (CIS v8, NIST CSF, ISO/IEC 27001).

## Assessment Phases

1. Planning

   - Confirm scope, stakeholders, timelines, and access requirements
   - Collect architecture diagrams, inventories, and prior assessments
   - Establish evidence transfer, confidentiality, and change control

2. Evidence Collection

   - Document review: policies, standards, procedures, diagrams
   - Configuration review: OS, Tomcat, database, reverse proxy/WAF, TLS
   - Command outputs and logs: permissions, services, SIEM/HIDS/NIDS, backups
   - Interviews: SMEs for database, OS, network, application, and governance
   - Automated checks: TLS/SSL scan, service enumeration, backup test evidence

3. Validation & Sampling

   - Sample size and depth based on Implementation Group (IG1/IG2/IG3)
   - Time window: typically 3–12 months depending on the control (see controls.md)
   - Cross-validate evidence across systems and responsible owners

4. Scoring & Gaps

   - Score each control: Compliant / Partially Compliant / Non-Compliant / Not Applicable / Not Tested
   - Document evidence/findings and remediation needs with owners and target dates

5. Reporting & Decision
   - Produce detail report and summary report
   - Present findings, risks, and recommendations, including remediation priorities
   - Certification decision based on criteria below

## Roles and Responsibilities

- Assessor: performs assessment, validates evidence, documents results
- System Owner: ensures access, accuracy of information, and remediation ownership
- SMEs (DB/OS/Network/App/Security): provide configurations, run commands, interpret results

## Methods by Control Type

- Technical Controls (normative)

  - Configuration verification, command execution, log review, automated scans, test results
  - Examples: backup schedules and logs; pg_hba.conf; TLS configuration; HIDS/NIDS status

- Organizational Controls (informative)
  - Document review, interviews, process walkthroughs, sampling of tickets and approvals
  - Examples: incident response plan and tests; risk assessments; offboarding procedures

## Evidence Requirements

- Provide artifacts directly supporting each control’s Verification Method in controls.md
- Include timestamps, system identifiers, and responsible owner for each artifact
- Screenshots should show context (hostname, timestamp); configs must include relevant sections

## Scoring Rules

- Compliant: meets all criteria in the control’s Description and Verification Method
- Partially Compliant: some criteria met; limited gaps not undermining intent
- Non-Compliant: criteria not met or significant deficiencies exist
- Not Applicable: outside assessment scope with clear justification
- Not Tested: evidence unavailable during the assessment window

## Certification Criteria

- Technical controls are normative and must meet the minimum threshold for certification
- Organizational controls are informative and influence risk posture, not pass/fail
- Minimum thresholds (default):
  - IG1 technical controls: ≥ 95% Compliant, 0% Critical Non-Compliant
  - IG2 technical controls: ≥ 90% Compliant, ≤ 5% Partially Compliant, 0% Critical Non-Compliant
  - IG3 technical controls (if in scope): ≥ 85% Compliant, ≤ 10% Partially Compliant, 0% Critical Non-Compliant
- Critical Non-Compliant: any control that exposes high impact risk (e.g., no TLS, default admin active, no backups)

## Remediation and Reassessment

- Gaps require an action plan with owners and target dates
- Limited revalidation permitted for minor gaps within 30–60 days
- Full reassessment required if major changes or critical gaps are identified

## Confidentiality and Integrity of Evidence

- Use approved secure channels for evidence transfer
- Maintain evidence log with hashes for key files where practical
- Retain assessment artifacts for the agreed period per contract

## References

- controls.md (authoritative catalog and verification methods)
- CIS Controls v8, NIST CSF, ISO/IEC 27001

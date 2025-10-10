# DHIS2 Server Certification Controls

This document contains the list of controls for a system claiming compliance to the DSCP.
Each control is listed together with

- a control identifier
- mapping to CIS control
- a name
- a description/justification
- requirement/evidence for compliance
- ranking

Controls may be organisational or technical. Organisational controls are informative and will be
part of the final report. Technical controls are normative and compliance to them will determine
whether a certificate is awarded or not.

Legend

- SA-ID: Server Assessment Control Identifier
- CIS ID: CIS v8 Safeguard reference (when applicable)
- Status (Yes/No): Assessor result
- IG: Implementation Group
  - IG1: Basic controls for all organizations
  - IG2: For organizations with sensitive info and dedicated IT staff
  - IG3: For organizations with highly sensitive/regulatory data and advanced security needs

Note

- Rows marked as CHANGED/NEW indicate scope updates versus earlier drafts.

## Database

| SA-ID | CIS ID | Name                                                      | Status (Yes/No) | IG  | Guidance                                                                                    | Comments |
| ----- | ------ | --------------------------------------------------------- | --------------- | --- | ------------------------------------------------------------------------------------------- | -------- |
| DB-01 | 11.2   | Regular automated database backup performed               |                 | IG1 | Configure automated daily backups with defined retention and integrity checks.              |          |
| DB-02 | 11.5   | Regular database backup restore tested                    |                 | IG1 | Perform periodic restore tests to a non-production environment and document results.        |          |
| DB-03 | 11.4   | Off-site backup                                           |                 | IG2 | Store encrypted copies off-site or in separate region/account to protect against site loss. | CHANGED  |
| DB-04 | 5.4    | Database users with limited privileges                    |                 | IG1 | Enforce least privilege and separate admin/service accounts; regularly review roles.        |          |
| DB-05 |        | Database files correct permissions (unix mode 660)        |                 | IG1 | Restrict data directories and files to database user and group; verify umask.               |          |
| DB-06 |        | Database backup files correct permissions (unix mode 660) |                 | IG1 | Ensure backup artifacts inherit restrictive permissions and are not world-readable.         |          |
| DB-07 | 3.11   | Encryption at rest for database                           |                 | IG3 | Enable full-disk or tablespace encryption with secure key management.                       | CHANGED  |
| DB-08 | 3.11   | Encryption at rest for database backup                    |                 | IG3 | Encrypt backups at rest; manage keys separately from storage location.                      | CHANGED  |
| DB-09 | 5.1    | postgresql pg_hba.conf settings                           |                 | IG1 | Restrict host-based access, use TLS, and prefer SCRAM over MD5.                             |          |

## Deployment

| SA-ID | CIS ID | Name                                                     | Status (Yes/No) | IG  | Guidance                                                                         | Comments |
| ----- | ------ | -------------------------------------------------------- | --------------- | --- | -------------------------------------------------------------------------------- | -------- |
| DT-01 | 13.1   | DHIS2 exposed by web proxy (and not directly via Tomcat) |                 | IG1 | Place a reverse proxy/WAF in front of application servers; block direct access.  |          |
| DT-02 | 3.1    | SSL setup (min A from SSL Labs)                          |                 | IG1 | Enforce TLS 1.2+ with modern ciphers; HSTS; maintain A/A+ rating.                |          |
| DT-03 |        | Measures to test DHIS2 deployments on test instance      |                 | IG1 | Use staging/test environments and release checklists before production rollouts. |          |

## Operating System

| SA-ID | CIS ID              | Name                                                              | Status (Yes/No) | IG  | Guidance                                                                          | Comments |
| ----- | ------------------- | ----------------------------------------------------------------- | --------------- | --- | --------------------------------------------------------------------------------- | -------- |
| OS-01 | 5.4                 | SSH root access disabled                                          |                 | IG1 | Disable direct root login; require sudo with individual accounts.                 |          |
| OS-02 | 5.2.17              | SSH access with pub/priv keys                                     |                 | IG1 | Enforce key-based auth; rotate and manage keys; disable weak algorithms.          |          |
| OS-03 | 5.2.8               | SSH password login disabled                                       |                 | IG1 | Disable PasswordAuthentication; enforce strong KEX/MACs.                          |          |
| OS-04 | 5.3.1, 5.3.2, 5.3.3 | SSH correct permissions on critical configuration files           |                 | IG1 | Apply least-privilege file modes to config and key materials (e.g., 600/640/660). |          |
| OS-05 | 7.3                 | Unattended upgrades of OS level security patches                  |                 | IG1 | Enable automated security updates and reboot strategy; monitor patch status.      |          |
| OS-06 |                     | DHIS2 correct permissions on critical files (conf, logs)          |                 | IG1 | Limit ownership to service accounts; ensure configs/logs are non-world-readable.  |          |
| OS-07 |                     | Monitoring and alerting system enabled                            |                 | IG1 | Implement host/service monitoring (CPU, memory, disk, proxy, DB) with alerts.     |          |
| OS-08 | 3.11                | Encryption at rest for OS                                         |                 | IG3 | Enable full-disk encryption (LUKS/FileVault/BitLocker) for servers and volumes.   | CHANGED  |
| OS-09 | 5.4                 | OS users with limited privileges                                  |                 | IG1 | Enforce least privilege; use role separation; periodic access reviews.            |          |
| OS-10 | 4.4                 | Expose to the internet only limited/necessary services (firewall) |                 | IG1 | Use host/network firewalls; default-deny ingress; allow only required ports.      |          |
| OS-11 | 13.1                | Security alerts are sent to a central server (SIEM)               |                 | IG2 | Forward logs and security alerts with timestamps and integrity to SIEM.           | CHANGED  |
| OS-12 | 13.2                | Host-based intrusion detection system is deployed                 |                 | IG3 | Deploy HIDS/EDR with alerting and response playbooks.                             | CHANGED  |
| OS-13 | 13.3                | Network-based intrusion detection system is deployed              |                 | IG3 | Monitor network traffic with NIDS sensors and tuned signatures.                   | NEW      |

## DHIS2 Application

| SA-ID | CIS ID | Name                                                       | Status (Yes/No) | IG  | Guidance                                                                  | Comments |
| ----- | ------ | ---------------------------------------------------------- | --------------- | --- | ------------------------------------------------------------------------- | -------- |
| AP-01 |        | DHIS2 "admin" user disabled or default credentials changed |                 | IG1 | Remove/rename default accounts; enforce unique admin with strong auth.    |          |
| AP-02 |        | Limited amount of DHIS admin users (≈1% of total users)    |                 | IG1 | Restrict admin role assignments; review quarterly.                        |          |
| AP-03 |        | Multi-factor authentication enabled for DHIS2 admins       |                 | IG1 | Enforce MFA for privileged users; hardware or app-based tokens preferred. | CHANGED  |
| AP-04 |        | Multi-factor authentication enabled for DHIS2 users        |                 | IG2 | Offer/enforce MFA for all users where feasible; risk-based policies.      | CHANGED  |

## Tomcat (Application Server)

| SA-ID | CIS ID | Name                                               | Status (Yes/No) | IG  | Guidance                                                                    | Comments |
| ----- | ------ | -------------------------------------------------- | --------------- | --- | --------------------------------------------------------------------------- | -------- |
| TC-01 | 10.17  | Tomcat not running as root                         |                 | IG1 | Run under dedicated service account with minimal privileges.                |          |
| TC-02 | 3.2    | Disable the SHUTDOWN Port                          |                 | IG2 | Disable or firewall SHUTDOWN; require local-only if needed.                 |          |
| TC-03 | 9.2    | Disable auto-deployment of applications            |                 | IG2 | Disable auto-deploy; use controlled CI/CD releases.                         |          |
| TC-04 | 4.7    | Tomcat not able to modify webapp (restrict access) |                 | IG1 | Set file permissions to prevent runtime modification of deployed artifacts. |          |

## Network

| SA-ID | CIS ID | Name                                                    | Status (Yes/No) | IG  | Guidance                                                             | Comments |
| ----- | ------ | ------------------------------------------------------- | --------------- | --- | -------------------------------------------------------------------- | -------- |
| FW-01 | 9.1    | Firewall setup (perimeter, host based, container based) |                 | IG1 | Implement layered firewalls; default-deny; change control for rules. |          |

## Process

| SA-ID | CIS ID      | Name                                                    | Status (Yes/No) | IG  | Guidance                                                                  | Comments |
| ----- | ----------- | ------------------------------------------------------- | --------------- | --- | ------------------------------------------------------------------------- | -------- |
| PS-01 |             | Security manager appointed                              |                 | IG3 | Assign accountable security lead with clear responsibilities.             |          |
| PS-02 |             | Developed a security program                            |                 | IG3 | Define policies, standards, procedures, and training plan.                |          |
| PS-03 | 1.1         | Asset inventory performed                               |                 | IG1 | Maintain inventory of enterprise assets and owners.                       |          |
| PS-04 | 17.1 - 17.9 | Incident response plan developed                        |                 | IG1 | Document roles, runbooks, communications, and legal considerations.       |          |
| PS-05 |             | Data sharing agreement/NDA in place                     |                 | IG1 | Formalize data sharing with contractual safeguards and retention clauses. |          |
| PS-06 | 5.3         | Procedure to disable DHIS2 leavers' accounts            |                 | IG1 | Immediate deprovisioning workflow integrated with HR offboarding.         | CHANGED  |
| PS-07 | 5.3         | Procedure to disable OS leavers' accounts               |                 | IG1 | Revoke system access promptly; remove from sudoers and groups.            | CHANGED  |
| PS-08 |             | Risk assessment performed                               |                 | IG2 | Perform periodic risk assessments; track mitigations.                     |          |
| PS-09 |             | Regular internal security audit of the DHIS2 system     |                 | IG2 | Schedule internal audits; remediate findings with owners and dates.       |          |
| PS-10 |             | Regular external security audit of the DHIS2 system     |                 | IG3 | Commission periodic third-party audits/pen tests.                         | CHANGED  |
| PS-11 | 17.1 - 17.9 | Incident response plan tested at least annually         |                 | IG2 | Conduct tabletop/live exercises; capture lessons learned.                 |          |
| PS-12 | 7.1         | Develop and maintain a vulnerability management process |                 | IG2 | Regular scanning, triage SLAs, and patch verification.                    |          |
| PS-13 |             | Setup and report KPIs to management at least quarterly  |                 | IG3 | Track key security/compliance metrics and trends.                         |          |

## System

| SA-ID | CIS ID | Name                             | Status (Yes/No) | IG  | Guidance                                                                 | Comments |
| ----- | ------ | -------------------------------- | --------------- | --- | ------------------------------------------------------------------------ | -------- |
| SV-01 | 2.2    | Minimal required services active |                 | IG1 | Remove/disable unnecessary services and daemons; validate after updates. |          |

## Access

| SA-ID | CIS ID | Name                                       | Status (Yes/No) | IG  | Guidance                                                                     | Comments |
| ----- | ------ | ------------------------------------------ | --------------- | --- | ---------------------------------------------------------------------------- | -------- |
| AC-01 | 5.4    | More than one admin user (not more than 4) |                 | IG1 | Maintain multiple break-glass admins; limit total; monitor usage.            |          |
| AC-02 | 5.2    | SSH users not sharing same account         |                 | IG1 | Use named accounts; prohibit shared credentials; enforce MFA where possible. |          |
| AC-03 | 6.1    | User accounts home folders are clean       |                 | IG1 | Remove sensitive data and keys from home dirs; apply proper permissions.     |          |

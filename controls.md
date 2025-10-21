# DHIS2 Server Certification Controls

This document contains the list of controls for a system claiming compliance to the DSCP.
Each control is listed together with

- a control identifier
- mapping to CIS control
- a name
- a description/justification
- requirement/evidence for compliance
- ranking

## Checklist

**Document Version:** 1.0  
**Assessment Date:** **\*\*\*\***\_**\*\*\*\***  
**Assessor Name:** **\*\*\*\***\_**\*\*\*\***  
**Organization:** **\*\*\*\***\_**\*\*\*\***  
**System/Environment:** **\*\*\*\***\_**\*\*\*\***

---

## Assessment Overview

### Implementation Group Definitions

| Group   | Description             | Target Organization Profile                                                                                                       |
| ------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **IG1** | Essential Cyber Hygiene | All organizations; foundational security controls for basic cyber defense                                                         |
| **IG2** | Intermediate Security   | Organizations with IT resources managing sensitive data; includes all IG1 + additional controls                                   |
| **IG3** | Advanced Security       | Organizations with significant cybersecurity expertise; highly regulated environments; includes all IG1 + IG2 + advanced controls |

### Control Classification

- **Technical Controls:** Normative controls that directly determine certification eligibility
- **Organizational Controls:** Informative controls that support the security program and inform risk posture

### Assessment Scoring

| Status                  | Definition                                                |
| ----------------------- | --------------------------------------------------------- |
| **Compliant**           | Control fully implemented and verified                    |
| **Partially Compliant** | Control partially implemented; gaps identified            |
| **Non-Compliant**       | Control not implemented or significant deficiencies found |
| **Not Applicable**      | Control not applicable to this environment                |
| **Not Tested**          | Control not yet assessed                                  |

---

## Control Domains

### 1. POSTGRESQLDATABASE CONTROLS

| Control ID               | Control Name                                                                                                                                      | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **DB-01**                | Regular Automated Database Backup                                                                                                                 | Technical | IG1      | 11.2           |
| **Description**          | Automated daily backups must be configured with defined retention policies and integrity verification mechanisms.                                 |
| **Verification Method**  | Review backup configuration files; verify backup logs from past 30 days; confirm retention policy documentation; test backup integrity checksums. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                                   |
| **Evidence/Findings**    |                                                                                                                                                   |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                                    |

| Control ID               | Control Name                                                                                                                                   | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **DB-02**                | Database Backup Restore Testing                                                                                                                | Technical | IG1      | 11.5           |
| **Description**          | Periodic restore tests must be performed to a non-production environment to validate backup integrity and recovery procedures.                 |
| **Verification Method**  | Review restore test documentation from past 6 months; verify test results and lessons learned; confirm non-production test environment exists. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                                |
| **Evidence/Findings**    |                                                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                                 |

| Control ID               | Control Name                                                                                                   | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **DB-03**                | Off-Site Backup Storage                                                                                        | Technical | IG2      | 11.4           |
| **Description**          | Backup copies must be stored off-site or in a separate region/account to protect against site-wide disasters.  |
| **Verification Method**  | Verify off-site backup location.                                                                               |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                |
| **Evidence/Findings**    |                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\*** |

| Control ID               | Control Name                                                                                                                                          | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **DB-04**                | Database Least Privilege Access (move)                                                                                                                | Technical | IG1      | 5.4            |
| **Description**          | Database users must be assigned minimum necessary privileges; administrative and service accounts must be separated; regular access reviews required. |
| **Verification Method**  | Review database user roles and permissions; verify the DHIS2 user only has access to the reuired DHIS2 database, and from the DHIS2 IP address.       |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                                       |
| **Evidence/Findings**    |                                                                                                                                                       |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                                        |

| Control ID               | Control Name                                                                                                                    | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **DB-06**                | Database Backup File Permissions                                                                                                | Technical | IG1      | —              |
| **Description**          | Backup artifacts must inherit restrictive permissions (Unix mode 660) and must not be world-readable.                           |
| **Verification Method**  | Audit backup file permissions; verify backup scripts include proper permission settings; check for world-readable backup files. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                 |
| **Evidence/Findings**    |                                                                                                                                 |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                  |

| Control ID               | Control Name                                                                                                          | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **DB-07**                | Database Encryption at Rest                                                                                           | Technical | IG3      | 3.11           |
| **Description**          | Full-disk encryption must be enabled with secure key management practices separate from data storage.                 |
| **Verification Method**  | Verify encryption configuration; review key management procedures; confirm encryption status of all database volumes. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                       |
| **Evidence/Findings**    |                                                                                                                       |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***        |

| Control ID               | Control Name                                                                                                     | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **DB-08**                | Backup Encryption at Rest                                                                                        | Technical | IG3      | 3.11           |
| **Description**          | Backups must be encrypted at rest with encryption keys managed separately from the backup storage location.      |
| **Verification Method**  | Verify backup encryption configuration; confirm key storage separation; test encrypted backup restore procedure. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                  |
| **Evidence/Findings**    |                                                                                                                  |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***   |

| Control ID               | Control Name                                                                                                                                                                                                     | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **DB-09**                | PostgreSQL Host-Based Access Control                                                                                                                                                                             | Technical | IG1      | 5.1            |
| **Description**          | pg_hba.conf must restrict host-based access, enforce TLS connections, and use SCRAM-SHA-256 authentication over MD5.                                                                                             |
| **Verification Method**  | Review pg_hba.conf file; ensure the DHIS2 instance user only has access to the DHIS2 database, and from the DHIS2 IP address. Verify TLS enforcement; confirm SCRAM authentication enabled; check for MD5 usage. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                                                                                                  |
| **Evidence/Findings**    |                                                                                                                                                                                                                  |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                                                                                                   |

| Control ID               | Control Name                                                                                                      | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **DT-02**                | TLS/SSL Configuration                                                                                             | Technical | IG1      | 3.1            |
| **Description**          | TLS 1.2 or higher with modern cipher suites must be enforced; HSTS enabled; SSL Labs rating of A or A+ required.  |
| **Verification Method**  | Run SSL Labs scan; verify TLS version and cipher configuration; confirm HSTS header; review certificate validity. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                   |
| **Evidence/Findings**    |                                                                                                                   |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***    |

| Control ID               | Control Name                                                                                                            | Type           | IG Level | CIS v8 Mapping |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | -------------- | -------- | -------------- |
| **DT-03**                | Pre-Production Testing Environment                                                                                      | Organizational | IG1      | —              |
| **Description**          |                                                                                                                         |
| **Verification Method**  | Review deployment procedures; verify staging environment exists; examine release checklist documentation and sign-offs. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                         |
| **Evidence/Findings**    |                                                                                                                         |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***          |

---

### 3. OPERATING SYSTEM SECURITY

| Control ID               | Control Name                                                                                                        | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **OS-01**                | Disable Direct Root SSH Access                                                                                      | Technical | IG1      | 5.4            |
| **Description**          | Direct root login via SSH must be disabled; sudo with individual named accounts required for administrative access. |
| **Verification Method**  | Review sshd_config for PermitRootLogin setting; verify sudo configuration; check for individual admin accounts.     |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                     |
| **Evidence/Findings**    |                                                                                                                     |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***      |

| Control ID               | Control Name                                                                                                                      | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **OS-02**                | SSH Key-Based Authentication                                                                                                      | Technical | IG1      | 5.2.17         |
| **Description**          | SSH key-based authentication must be enforced; keys must be rotated regularly; weak algorithms disabled.                          |
| **Verification Method**  | Verify SSH key configuration; check for password authentication disabled; review authorized_keys; confirm algorithm restrictions. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                   |
| **Evidence/Findings**    |                                                                                                                                   |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                    |

| Control ID               | Control Name                                                                                                                | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **OS-03**                | SSH Password Authentication Disabled                                                                                        | Technical | IG1      | 5.2.8          |
| **Description**          | SSH password authentication must be disabled (PasswordAuthentication no); strong key exchange and MAC algorithms enforced.  |
| **Verification Method**  | Review sshd_config for PasswordAuthentication, KexAlgorithms, and MACs settings; test password login attempt (should fail). |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                             |
| **Evidence/Findings**    |                                                                                                                             |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***              |

| Control ID               | Control Name                                                                                                   | Type      | IG Level | CIS v8 Mapping      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------- | -------- | ------------------- |
| **OS-04**                | SSH Configuration File Permissions                                                                             | Technical | IG1      | 5.3.1, 5.3.2, 5.3.3 |
| **Description**          | SSH configuration and key files must have restrictive permissions (600/640/660) with proper ownership.         |
| **Verification Method**  | Audit permissions on /etc/ssh/sshd_config, private keys, authorized_keys; verify ownership; check umask.       |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                |
| **Evidence/Findings**    |                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\*** |

| Control ID               | Control Name                                                                                                                  | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **OS-05**                | Automated Security Patching                                                                                                   | Technical | IG1      | 7.3            |
| **Description**          | Unattended security updates must be enabled with defined reboot strategy; patch status monitoring required.                   |
| **Verification Method**  | Verify unattended-upgrades or equivalent service; review patch logs; confirm reboot policy; check patch compliance dashboard. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                               |
| **Evidence/Findings**    |                                                                                                                               |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                |

| Control ID               | Control Name                                                                                                          | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **OS-06**                | DHIS2 Application File Permissions                                                                                    | Technical | IG1      | —              |
| **Description**          | DHIS2 configuration files and logs must be owned by service accounts with non-world-readable permissions.             |
| **Verification Method**  | Audit DHIS2 conf/ and logs/ directories; verify ownership and permissions; confirm no world-readable sensitive files. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                       |
| **Evidence/Findings**    |                                                                                                                       |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***        |

| Control ID               | Control Name                                                                                                                     | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **OS-07**                | System Monitoring and Alerting                                                                                                   | Technical | IG1      | —              |
| **Description**          | Host and service monitoring must be implemented for CPU, memory, disk, web proxy, and database with alerting thresholds.         |
| **Verification Method**  | Review monitoring platform configuration; verify alert rules and thresholds; confirm notification channels; test alert delivery. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                  |
| **Evidence/Findings**    |                                                                                                                                  |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                   |

| Control ID               | Control Name                                                                                                        | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **OS-08**                | Operating System Encryption at Rest                                                                                 | Technical | IG3      | 3.11           |
| **Description**          | Full-disk encryption must be enabled on servers and volumes (LUKS/FileVault/BitLocker or equivalent).               |
| **Verification Method**  | Verify encryption status of system volumes; review key management procedures; confirm encryption is active at boot. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                     |
| **Evidence/Findings**    |                                                                                                                     |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***      |

| Control ID               | Control Name                                                                                                                 | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **OS-09**                | Operating System Least Privilege                                                                                             | Technical | IG1      | 5.4            |
| **Description**          | OS users must be assigned minimum necessary privileges with role separation; periodic access reviews required.               |
| **Verification Method**  | Review user accounts and group memberships; verify sudo configurations; check access review documentation from past quarter. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                              |
| **Evidence/Findings**    |                                                                                                                              |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***               |

| Control ID               | Control Name                                                                                                                    | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **OS-10**                | Network Service Exposure Control                                                                                                | Technical | IG1      | 4.4            |
| **Description**          | Host and network firewalls must implement default-deny ingress; only required services/ports exposed to internet.               |
| **Verification Method**  | Review firewall rules; perform port scan from external network; verify only necessary ports accessible; check default policies. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                 |
| **Evidence/Findings**    |                                                                                                                                 |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                  |

| Control ID               | Control Name                                                                                                                        | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **OS-11**                | Centralized Security Event Logging                                                                                                  | Technical | IG2      | 13.1           |
| **Description**          | Security alerts and logs must be forwarded to SIEM with accurate timestamps and integrity protection.                               |
| **Verification Method**  | Verify log forwarding configuration; confirm SIEM receiving logs; check timestamp synchronization; review log integrity mechanisms. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                     |
| **Evidence/Findings**    |                                                                                                                                     |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                      |

| Control ID               | Control Name                                                                                                                 | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **OS-12**                | Host-Based Intrusion Detection                                                                                               | Technical | IG3      | 13.2           |
| **Description**          | HIDS/EDR must be deployed with alerting enabled and documented response playbooks.                                           |
| **Verification Method**  | Verify HIDS/EDR agent installation and status; review alert configuration; confirm response playbooks exist and are current. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                              |
| **Evidence/Findings**    |                                                                                                                              |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***               |

| Control ID               | Control Name                                                                                                               | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **OS-13**                | Network-Based Intrusion Detection                                                                                          | Technical | IG3      | 13.3           |
| **Description**          | NIDS sensors must monitor network traffic with tuned signatures and alerting capabilities.                                 |
| **Verification Method**  | Verify NIDS deployment and coverage; review signature updates; check alert tuning documentation; confirm monitoring scope. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                            |
| **Evidence/Findings**    |                                                                                                                            |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***             |

| Control ID               | Control Name                                                                                                                 | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **OS-14**                | Minimal Service Footprint                                                                                                    | Technical | IG1      | 2.2            |
| **Description**          | Only required services and daemons must be active; unnecessary services removed/disabled; validation after system updates.   |
| **Verification Method**  | List running services; compare against approved baseline; verify service necessity; check post-update validation procedures. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                              |
| **Evidence/Findings**    |                                                                                                                              |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***               |

---

### 4. DHIS2 APPLICATION SECURITY

| Control ID               | Control Name                                                                                                                  | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **AP-01**                | Default Admin Account Security                                                                                                | Technical | IG1      | —              |
| **Description**          | DHIS2 default "admin" account must be disabled/renamed; unique administrator credentials with strong authentication required. |
| **Verification Method**  | Verify default admin account status; confirm unique admin usernames; review password complexity requirements.                 |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                               |
| **Evidence/Findings**    |                                                                                                                               |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                |

| Control ID               | Control Name                                                                                                                | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **AP-02**                | Administrative Access Limitation                                                                                            | Technical | IG1      | —              |
| **Description**          | DHIS2 administrative users must be limited to approximately 1% of total user population; quarterly access reviews required. |
| **Verification Method**  | Query admin role assignments; calculate percentage of admin users; review quarterly access review documentation.            |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                             |
| **Evidence/Findings**    |                                                                                                                             |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***              |

| Control ID               | Control Name                                                                                                   | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **AP-03**                | Multi-Factor Authentication (Admins)                                                                           | Technical | IG1      | —              |
| **Description**          | MFA must be enforced for all DHIS2 administrative accounts; hardware or app-based tokens preferred.            |
| **Verification Method**  | Verify MFA configuration for admin accounts; review MFA enrollment status; test MFA enforcement at login.      |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                |
| **Evidence/Findings**    |                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\*** |

| Control ID               | Control Name                                                                                                         | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **AP-04**                | Multi-Factor Authentication (Users)                                                                                  | Technical | IG2      | —              |
| **Description**          | MFA should be offered/enforced for all DHIS2 users where feasible; risk-based authentication policies recommended.   |
| **Verification Method**  | Review MFA availability and adoption rates; verify risk-based authentication policies; check MFA user documentation. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                      |
| **Evidence/Findings**    |                                                                                                                      |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***       |

---

### 5. TOMCAT APPLICATION SERVER

| Control ID               | Control Name                                                                                                   | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **TC-01**                | Tomcat Service Account                                                                                         | Technical | IG1      | 10.17          |
| **Description**          | Tomcat must run under a dedicated service account with minimal privileges; must not run as root.               |
| **Verification Method**  | Check Tomcat process ownership; verify service account configuration; confirm absence of root privileges.      |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                |
| **Evidence/Findings**    |                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\*** |

| Control ID               | Control Name                                                                                                   | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **TC-02**                | Tomcat Shutdown Port Security                                                                                  | Technical | IG2      | 3.2            |
| **Description**          | Tomcat SHUTDOWN port must be disabled or firewalled; if required, restrict to localhost only.                  |
| **Verification Method**  | Review server.xml for SHUTDOWN port configuration; verify firewall rules; test external accessibility.         |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                |
| **Evidence/Findings**    |                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\*** |

| Control ID               | Control Name                                                                                                     | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **TC-03**                | Application Auto-Deployment Disabled                                                                             | Technical | IG2      | 9.2            |
| **Description**          | Tomcat auto-deployment must be disabled; controlled CI/CD release processes required for application deployment. |
| **Verification Method**  | Review server.xml and Host configuration for autoDeploy setting; verify CI/CD deployment procedures exist.       |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                  |
| **Evidence/Findings**    |                                                                                                                  |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***   |

| Control ID               | Control Name                                                                                                    | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **TC-04**                | Webapp Modification Prevention                                                                                  | Technical | IG1      | 4.7            |
| **Description**          | File permissions must prevent Tomcat runtime from modifying deployed application artifacts (webapps directory). |
| **Verification Method**  | Audit webapps directory permissions; verify Tomcat user cannot write to deployment directories.                 |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                 |
| **Evidence/Findings**    |                                                                                                                 |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***  |

---

### 6. NETWORK SECURITY

| Control ID               | Control Name                                                                                                                                 | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **FW-01**                | Layered Firewall Architecture                                                                                                                | Technical | IG1      | 9.1            |
| **Description**          | Defense-in-depth firewall strategy required: perimeter, host-based, and container-based; default-deny with change control.                   |
| **Verification Method**  | Review firewall architecture documentation; verify multiple firewall layers; confirm default-deny policies; check change management process. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                              |
| **Evidence/Findings**    |                                                                                                                                              |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                               |

### 7. ACCESS CONTROL

| Control ID               | Control Name                                                                                                         | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **AC-01**                | Multiple Administrative Accounts                                                                                     | Technical | IG1      | 5.4            |
| **Description**          | Multiple break-glass admin accounts required (2-4 recommended); usage must be monitored and logged.                  |
| **Verification Method**  | Verify number of admin accounts; review admin account usage logs; confirm monitoring and alerting on admin activity. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                      |
| **Evidence/Findings**    |                                                                                                                      |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***       |

| Control ID               | Control Name                                                                                                            | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **AC-02**                | Individual SSH Account Accountability                                                                                   | Technical | IG1      | 5.2            |
| **Description**          | Each SSH user must have a unique, named account; shared credentials prohibited; MFA enforced where possible.            |
| **Verification Method**  | Review /etc/passwd for user accounts; verify no shared accounts exist; check SSH authentication methods and MFA status. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                         |
| **Evidence/Findings**    |                                                                                                                         |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***          |

| Control ID               | Control Name                                                                                                        | Type      | IG Level | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------- | -------- | -------------- |
| **AC-03**                | User Home Directory Hygiene                                                                                         | Technical | IG1      | 6.1            |
| **Description**          | User home directories must not contain sensitive data or unprotected keys; proper permissions enforced.             |
| **Verification Method**  | Audit home directories for sensitive files; check for SSH keys, credentials, configs; verify directory permissions. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                     |
| **Evidence/Findings**    |                                                                                                                     |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***      |

---

### 8. SECURITY GOVERNANCE & PROCESSES

| Control ID               | Control Name                                                                                                          | Type           | IG Level | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------- | -------- | -------------- |
| **PS-01**                | Security Leadership Accountability                                                                                    | Organizational | IG3      | —              |
| **Description**          | Designated security manager with defined responsibilities and authority must be appointed.                            |
| **Verification Method**  | Review organizational chart; verify security manager job description and responsibilities; confirm active engagement. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                       |
| **Evidence/Findings**    |                                                                                                                       |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***        |

| Control ID               | Control Name                                                                                                                           | Type           | IG Level | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------- | -------------- |
| **PS-02**                | Security Program Development                                                                                                           | Organizational | IG3      | —              |
| **Description**          | Formal security program with documented policies, standards, procedures, and training plan required.                                   |
| **Verification Method**  | Review security program documentation; verify policies are current and approved; check training records; confirm awareness activities. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                        |
| **Evidence/Findings**    |                                                                                                                                        |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                         |

| Control ID               | Control Name                                                                                                        | Type           | IG Level | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------- | -------- | -------------- |
| **PS-03**                | Enterprise Asset Inventory                                                                                          | Organizational | IG1      | 1.1            |
| **Description**          | Current inventory of enterprise assets with owners, locations, and configurations must be maintained.               |
| **Verification Method**  | Review asset inventory system; verify completeness and accuracy; confirm owner assignments; check update frequency. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                     |
| **Evidence/Findings**    |                                                                                                                     |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***      |

| Control ID               | Control Name                                                                                                           | Type           | IG Level | CIS v8 Mapping |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------- | -------- | -------------- |
| **PS-04**                | Incident Response Plan                                                                                                 | Organizational | IG1      | 17.1-17.9      |
| **Description**          | Documented incident response plan with defined roles, runbooks, communication procedures, and legal considerations.    |
| **Verification Method**  | Review IR plan documentation; verify contact lists current; check runbooks for common scenarios; confirm legal review. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                        |
| **Evidence/Findings**    |                                                                                                                        |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***         |

| Control ID               | Control Name                                                                                                                   | Type           | IG Level | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | -------------- | -------- | -------------- |
| **PS-05**                | Data Sharing Agreements                                                                                                        | Organizational | IG1      | —              |
| **Description**          | Formal data sharing agreements and NDAs with contractual safeguards and retention clauses required for external parties.       |
| **Verification Method**  | Review executed data sharing agreements; verify NDA coverage; confirm retention and destruction clauses; check legal approval. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                |
| **Evidence/Findings**    |                                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                 |

| Control ID               | Control Name                                                                                                               | Type           | IG Level | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------- | -------- | -------------- |
| **PS-06**                | DHIS2 User Offboarding Procedure                                                                                           | Organizational | IG1      | 5.3            |
| **Description**          | Immediate deprovisioning workflow for departing users integrated with HR offboarding process.                              |
| **Verification Method**  | Review offboarding procedures; verify integration with HR; test deprovisioning timeline; check recent offboarding tickets. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                            |
| **Evidence/Findings**    |                                                                                                                            |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***             |

| Control ID               | Control Name                                                                                                                | Type           | IG Level | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | -------------- | -------- | -------------- |
| **PS-07**                | OS User Offboarding Procedure                                                                                               | Organizational | IG1      | 5.3            |
| **Description**          | System access revocation upon termination; prompt removal from sudoers and privileged groups.                               |
| **Verification Method**  | Review OS offboarding procedures; verify timeline compliance; check removal from groups/sudoers; audit recent offboardings. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                             |
| **Evidence/Findings**    |                                                                                                                             |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***              |

| Control ID               | Control Name                                                                                                                    | Type           | IG Level | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------- | -------------- |
| **PS-08**                | Risk Assessment Program                                                                                                         | Organizational | IG2      | —              |
| **Description**          | Periodic risk assessments conducted with documented findings and mitigation tracking.                                           |
| **Verification Method**  | Review most recent risk assessment; verify assessment methodology; check mitigation plan and status; confirm periodic schedule. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                 |
| **Evidence/Findings**    |                                                                                                                                 |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                  |

| Control ID               | Control Name                                                                                                                      | Type           | IG Level | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------- | -------------- |
| **PS-09**                | Internal Security Audits                                                                                                          | Organizational | IG2      | —              |
| **Description**          | Scheduled internal security audits with documented findings, assigned owners, and remediation deadlines.                          |
| **Verification Method**  | Review internal audit schedule and reports; verify finding closure tracking; confirm owner assignments; check remediation status. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                   |
| **Evidence/Findings**    |                                                                                                                                   |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                    |

| Control ID               | Control Name                                                                                                                          | Type           | IG Level | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------- | -------------- |
| **PS-10**                | External Security Audits                                                                                                              | Organizational | IG3      | —              |
| **Description**          | Periodic third-party security audits and penetration testing conducted by qualified assessors.                                        |
| **Verification Method**  | Review external audit reports from past 12 months; verify assessor qualifications; check remediation of findings; confirm test scope. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                       |
| **Evidence/Findings**    |                                                                                                                                       |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                        |

| Control ID               | Control Name                                                                                                   | Type           | IG Level | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------- | -------- | -------------- |
| **PS-11**                | Incident Response Plan                                                                                         | Organizational | IG2      | 17.1-17.9      |
| **Description**          | Incident response plan in place                                                                                |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                |
| **Evidence/Findings**    |                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\*** |

| Control ID               | Control Name                                                                                                      | Type           | IG Level | CIS v8 Mapping |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------- | -------- | -------------- |
| **PS-12**                | Security Metrics and KPIs                                                                                         | Organizational | IG3      | —              |
| **Description**          | Key security and compliance metrics tracked and reported to management at least quarterly.                        |
| **Verification Method**  | Review KPI dashboard; verify metrics definition; check reporting frequency to leadership; confirm trend analysis. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                   |
| **Evidence/Findings**    |                                                                                                                   |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***    |

---

## Appendix A: Control Testing Evidence

_Attach supporting documentation, screenshots, configuration files, logs, and other evidence collected during the assessment._

---

## Appendix B: References

- CIS Controls v8: https://www.cisecurity.org/controls/v8
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- ISO/IEC 27001:2022: Information Security Management

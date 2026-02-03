# DHIS2 Server Certification Controls

This document contains the list of controls for a system claiming compliance to the DSCP.
Each control is listed together with

- a control identifier
- mapping to CIS control
- a name
- a description/justification
- requirement/evidence for compliance
- control group (DSCP1 = baseline, IG2 = intermediate)

## Checklist

**Document Version:** 1.0  
**Assessment Date:** **\*\*\*\***\_**\*\*\*\***  
**Assessor Name:** **\*\*\*\***\_**\*\*\*\***  
**Organization:** **\*\*\*\***\_**\*\*\*\***  
**System/Environment:** **\*\*\*\***\_**\*\*\*\***

---

## Assessment Overview

### Control Group Definitions

| Group     | Description        | Target Organization Profile                                                                             |
| --------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| **DSCP1** | Baseline Security  | All organizations; foundational security controls for DHIS2 server certification                        |

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

### How to Interpret Control Groups

- DSCP1 is the baseline for certification. Subjects must satisfy all DSCP1 technical controls to achieve the DSCP certificate. Organizational controls inform risk posture unless explicitly marked normative.

---

## Control Domains

### 1. POSTGRESQL DATABASE CONTROLS

| Control ID               | Control Name                                                                                                                             | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DB-01**                | Regular Automated Database Backup                                                                                                        | Technical | DSCP1         | 11.2           |
| **Description**          | Automated daily backups must be configured with defined retention policies and integrity verification mechanisms.                        |
| **Verification Method**  | Review backup configuration files; verify backup logs from past 30 days; confirm retention policy documentation; test backup integrity checksums. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                          |
| **Evidence/Findings**    |                                                                                                                                          |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                           |

| Control ID               | Control Name                                                                                                                                  | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DB-02**                | Database Backup Restore Testing                                                                                                               | Technical | DSCP1         | 11.5           |
| **Description**          | Periodic restore tests must be performed to a non-production environment to validate backup integrity and recovery procedures.                |
| **Verification Method**  | Review restore test documentation or logs from past 3 months; verify test results and lessons learned; confirm non-production test environment exists. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                               |
| **Evidence/Findings**    |                                                                                                                                               |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                                |

| Control ID               | Control Name                                                                                                   | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DB-03**                | Off-Site Backup Storage                                                                                        | Technical | DSCP1         | 11.4           |
| **Description**          | Backup copies must be stored off-site or in a separate region/account to protect against site-wide disasters.  |
| **Verification Method**  | Verify off-site backup location and access controls.                                                           |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                |
| **Evidence/Findings**    |                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\*** |

| Control ID               | Control Name                                                                                                                                    | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DB-04**                | Database Least Privilege Access                                                                                                                 | Technical | DSCP1         | 5.4            |
| **Description**          | Database users must be assigned minimum necessary privileges; administrative and service accounts must be separated; regular access reviews required. |
| **Verification Method**  | Review database user roles and permissions; verify the DHIS2 user only has access to the required DHIS2 database, and from the DHIS2 IP address. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                                 |
| **Evidence/Findings**    |                                                                                                                                                 |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                                  |

| Control ID               | Control Name                                                                                                                    | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DB-05**                | Database Backup File Permissions                                                                                                | Technical | DSCP1         | —              |
| **Description**          | Backup artifacts must inherit restrictive permissions (Unix mode 660) and must not be world-readable.                           |
| **Verification Method**  | Audit backup file permissions; verify backup scripts include proper permission settings; check for world-readable backup files. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                 |
| **Evidence/Findings**    |                                                                                                                                 |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                  |

| Control ID               | Control Name                                                                                                          | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DB-06**                | Database Encryption at Rest                                                                                           | Technical | DSCP1         | 3.11           |
| **Description**          | Full-disk encryption is enabled with secure key management practices separate from data storage.                      |
| **Verification Method**  | Verify encryption configuration; review key management procedures; confirm encryption status of all database volumes. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                       |
| **Evidence/Findings**    |                                                                                                                       |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***        |

| Control ID               | Control Name                                                                                                     | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DB-07**                | Backup Encryption at Rest                                                                                        | Technical | DSCP1         | 3.11           |
| **Description**          | Backups must be encrypted at rest with encryption keys managed separately from the backup storage location.      |
| **Verification Method**  | Verify backup encryption configuration; confirm key storage separation; test encrypted backup restore procedure. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                  |
| **Evidence/Findings**    |                                                                                                                  |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***   |

| Control ID               | Control Name                                                                                                                                                                                                     | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DB-08**                | PostgreSQL Host-Based Access Control                                                                                                                                                                             | Technical | DSCP1         | 5.1            |
| **Description**          | pg_hba.conf must restrict host-based access, enforce TLS connections, and use SCRAM-SHA-256 authentication over MD5.                                                                                            |
| **Verification Method**  | Review pg_hba.conf file; ensure the DHIS2 instance user only has access to the DHIS2 database, and from the DHIS2 IP address. Verify TLS enforcement; confirm SCRAM authentication enabled; check for MD5 usage. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                                                                                                  |
| **Evidence/Findings**    |                                                                                                                                                                                                                  |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                                                                                                   |

| Control ID               | Control Name                                                                                                                                        | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DB-09**                | Supported PostgreSQL Version (Non-EOL)                                                                                                              | Technical | DSCP1         | —              |
| **Description**          | PostgreSQL must be a supported version that is not past end-of-life as per the official PostgreSQL support schedule at the time of assessment.     |
| **Verification Method**  | Run `SELECT version();` and capture output; compare against the PostgreSQL version support/EOL matrix; review OS package source and pinned version. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                                     |
| **Evidence/Findings**    |                                                                                                                                                     |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                                      |

| Control ID               | Control Name                                                                                                                                                                         | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------- | -------------- |
| **DB-10**                | PostgreSQL Tuning Baseline                                                                                                                                                           | Technical | DSCP1         | —              |
| **Description**          | PostgreSQL configuration must be optimized with max_connections, shared_buffers, work_mem, maintenance_work_mem, effective_cache_size, max_locks_per_transaction set to reasonable values based on the server capacity. |
| **Verification Method**  | Run `SHOW jit;` (expect off) and verify corresponding entries in postgresql.conf and effective reload/restart logs.                                                                  |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                                                                      |
| **Evidence/Findings**    |                                                                                                                                                                                      |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                                                                       |

---

### 2. REVERSE PROXY CONTROLS

| Control ID               | Control Name                                                                                                                           | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DP-01**                | Reverse Proxy Deployment                                                                                                               | Technical | DSCP1         | —              |
| **Description**          | A reverse proxy (e.g., Nginx, Apache, HAProxy) must be deployed in front of the DHIS2 application server (tomcat) to handle incoming traffic. |
| **Verification Method**  | Review network architecture documentation (if any); verify reverse proxy installation and configuration; confirm traffic routing through proxy. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                        |
| **Evidence/Findings**    |                                                                                                                                        |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                         |

| Control ID               | Control Name                                                                                                    | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DP-02**                | TLS/SSL Configuration                                                                                           | Technical | DSCP1         | 3.1            |
| **Description**          | TLS 1.2 or higher with modern cipher suites must be enforced; HSTS enabled; SSL Labs rating of A or A+ required. |
| **Verification Method**  | Run SSL Labs scan; verify TLS version and cipher configuration; review certificate validity.                    |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                 |
| **Evidence/Findings**    |                                                                                                                 |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***  |

| Control ID               | Control Name                                                                                                                          | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DP-03**                | Reverse Proxy Access Control                                                                                                          | Technical | DSCP1         | 4.4            |
| **Description**          | Reverse proxy must restrict access to only required DHIS2 services and endpoints; default-deny policy enforced.                       |
| **Verification Method**  | Review reverse proxy configuration; perform external port scan; verify only necessary endpoints accessible; check default-deny rules. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                       |
| **Evidence/Findings**    |                                                                                                                                       |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                        |

| Control ID               | Control Name                                                                                                                    | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DP-04**                | Reverse Proxy Access Logging                                                                                                    | Technical | DSCP1         | 8.1            |
| **Description**          | Comprehensive access logging must be enabled on the reverse proxy with log retention and integrity protection.                  |
| **Verification Method**  | Review logging configuration; verify log retention policy; check log integrity mechanisms; confirm log review procedures.       |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                 |
| **Evidence/Findings**    |                                                                                                                                 |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                  |

| Control ID               | Control Name                                                                                                   | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DP-05**                | Reverse Proxy Least Privilege                                                                                  | Technical | DSCP1         | 5.4            |
| **Description**          | Reverse proxy service must run under a dedicated non-root user with minimal privileges.                        |
| **Verification Method**  | Check reverse proxy process ownership; verify service account configuration; confirm absence of root privileges. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                |
| **Evidence/Findings**    |                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\*** |

| Control ID               | Control Name                                                                                                   | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DP-06**                | Reverse Proxy Security Updates                                                                                 | Technical | DSCP1         | —              |
| **Description**          | Reverse proxy software must be kept up-to-date with security patches; version must not be end-of-life.         |
| **Verification Method**  | Check reverse proxy version; compare against vendor EOL schedule.                                              |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                |
| **Evidence/Findings**    |                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\*** |

| Control ID               | Control Name                                                                                                                                       | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **DP-07**                | Reverse Proxy Security Headers                                                                                                                     | Technical | DSCP1         | —              |
| **Description**          | Security headers such as X-Frame-Options, X-Content-Type-Options, HSTS and Referrer-Policy must be configured (if not set on the DHIS2 backend). |
| **Verification Method**  | Review reverse proxy configuration for security headers; test header presence using browser developer tools; verify correct values.                |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                                    |
| **Evidence/Findings**    |                                                                                                                                                    |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                                     |

---

### 3. OPERATING SYSTEM SECURITY

| Control ID               | Control Name                                                                                                        | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **OS-01**                | Disable Direct Root SSH Access                                                                                      | Technical | DSCP1         | 5.4            |
| **Description**          | Direct root login via SSH must be disabled; sudo with individual named accounts required for administrative access. |
| **Verification Method**  | Review sshd_config for PermitRootLogin setting; verify sudo configuration; check for individual admin accounts.     |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                     |
| **Evidence/Findings**    |                                                                                                                     |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***      |

| Control ID               | Control Name                                                                                                                      | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **OS-02**                | SSH Key-Based Authentication                                                                                                      | Technical | DSCP1         | 5.2.17         |
| **Description**          | SSH key-based authentication must be enforced; keys must be rotated regularly; weak algorithms disabled.                          |
| **Verification Method**  | Verify SSH key configuration; check for password authentication disabled; review authorized_keys; confirm algorithm restrictions. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                   |
| **Evidence/Findings**    |                                                                                                                                   |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                    |

| Control ID               | Control Name                                                                                                                | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **OS-03**                | SSH Password Authentication Disabled                                                                                        | Technical | DSCP1         | 5.2.8          |
| **Description**          | SSH password authentication must be disabled (PasswordAuthentication no); strong key exchange and MAC algorithms enforced.  |
| **Verification Method**  | Review sshd_config for PasswordAuthentication, KexAlgorithms, and MACs settings; test password login attempt (should fail). |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                             |
| **Evidence/Findings**    |                                                                                                                             |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***              |

| Control ID               | Control Name                                                                                                   | Type      | Control Group | CIS v8 Mapping      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------- | ------------- | ------------------- |
| **OS-04**                | SSH Configuration File Permissions                                                                             | Technical | DSCP1         | 5.3.1, 5.3.2, 5.3.3 |
| **Description**          | SSH configuration and key files must have restrictive permissions (600/640/660) with proper ownership.         |
| **Verification Method**  | Audit permissions on /etc/ssh/sshd_config, private keys, authorized_keys; verify ownership; check umask.       |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                |
| **Evidence/Findings**    |                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\*** |

| Control ID               | Control Name                                                                                                         | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **OS-05**                | Multiple Administrative Accounts                                                                                     | Technical | DSCP1         | 5.4            |
| **Description**          | Multiple break-glass admin accounts required (2-3 not more than 4); usage must be monitored and logged.              |
| **Verification Method**  | Verify number of admin accounts; review admin account usage logs; confirm monitoring and alerting on admin activity. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                      |
| **Evidence/Findings**    |                                                                                                                      |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***       |

| Control ID               | Control Name                                                                                                            | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **OS-06**                | Individual SSH Account Accountability                                                                                   | Technical | DSCP1         | 5.2            |
| **Description**          | Each SSH user must have a unique, named account; shared credentials prohibited; MFA enforced where possible.            |
| **Verification Method**  | Review /etc/passwd for user accounts; verify no shared accounts exist; check SSH authentication methods and MFA status. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                         |
| **Evidence/Findings**    |                                                                                                                         |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***          |

| Control ID               | Control Name                                                                                                                | Type           | Control Group | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------- | -------------- |
| **OS-07**                | OS User Offboarding Procedure                                                                                               | Organizational | DSCP1         | 5.3            |
| **Description**          | System access revocation upon termination; prompt removal from sudoers and privileged groups.                               |
| **Verification Method**  | Review OS offboarding procedures; verify timeline compliance; check removal from groups/sudoers.                            |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                             |
| **Evidence/Findings**    |                                                                                                                             |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***              |

| Control ID               | Control Name                                                                                                        | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **OS-08**                | User Home Directory Hygiene                                                                                         | Technical | DSCP1         | 6.1            |
| **Description**          | User home directories must not contain sensitive data or unprotected keys; proper permissions enforced.             |
| **Verification Method**  | Audit home directories for sensitive files; check for SSH keys, credentials, configs; verify directory permissions. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                     |
| **Evidence/Findings**    |                                                                                                                     |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***      |

| Control ID               | Control Name                                                                                                   | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **OS-09**                | Automated Security Patching                                                                                    | Technical | DSCP1         | 7.3            |
| **Description**          | Unattended security updates must be enabled; patch status monitoring required.                                 |
| **Verification Method**  | Verify unattended-upgrades or equivalent service; review patch logs; confirm reboot policy.                    |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                |
| **Evidence/Findings**    |                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\*** |

| Control ID               | Control Name                                                                                                                     | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **OS-11**                | System Monitoring and Alerting                                                                                                   | Technical | DSCP1         | —              |
| **Description**          | Host and service monitoring must be implemented for CPU, memory, disk, web proxy, and database with alerting thresholds.         |
| **Verification Method**  | Review monitoring platform configuration; verify alert rules and thresholds; confirm notification channels; test alert delivery. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                  |
| **Evidence/Findings**    |                                                                                                                                  |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                   |

| Control ID               | Control Name                                                                                                        | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **OS-12**                | Operating System Encryption at Rest                                                                                 | Technical | DSCP1         | 3.11           |
| **Description**          | Full-disk encryption is enabled on servers and volumes (LUKS/FileVault/BitLocker or equivalent).                    |
| **Verification Method**  | Verify encryption status of system volumes; review key management procedures; confirm encryption is active at boot. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                     |
| **Evidence/Findings**    |                                                                                                                     |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***      |

| Control ID               | Control Name                                                                                                 | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ | --------- | ------------- | -------------- |
| **OS-13**                | Operating System Least Privilege                                                                             | Technical | DSCP1         | 5.4            |
| **Description**          | OS users must be assigned minimum necessary privileges with role separation; periodic access reviews required. |
| **Verification Method**  | Review user accounts and group memberships; verify sudo configurations.                                      |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                              |
| **Evidence/Findings**    |                                                                                                              |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***|

| Control ID               | Control Name                                                                                                                    | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **OS-14**                | Network Service Exposure Control                                                                                                | Technical | DSCP1         | 4.4            |
| **Description**          | Host and network firewalls must implement default-deny ingress; only required services/ports exposed to internet.               |
| **Verification Method**  | Review firewall rules; perform port scan from external network; verify only necessary ports accessible; check default policies. |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                 |
| **Evidence/Findings**    |                                                                                                                                 |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                  |

| Control ID               | Control Name                                                                                                                 | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **OS-15**                | Minimal Service Footprint                                                                                                    | Technical | DSCP1         | 2.2            |
| **Description**          | Only required services and daemons must be active; unnecessary services removed/disabled; validation after system updates.   |
| **Verification Method**  | List running services; compare against approved baseline; verify service necessity.                                          |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                              |
| **Evidence/Findings**    |                                                                                                                              |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***               |

---

### 4. DHIS2 APPLICATION SECURITY

| Control ID               | Control Name                                                                                                                    | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **AP-01**                | Default Admin Account Security                                                                                                  | Technical | DSCP1         | —              |
| **Description**          | DHIS2 default 'admin' account must be disabled/renamed; unique superuser credentials with strong authentication required.       |
| **Verification Method**  | Verify default admin account status; confirm unique superuser usernames; review password complexity requirements.               |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                 |
| **Evidence/Findings**    |                                                                                                                                 |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                  |

| Control ID               | Control Name                                                                                                                | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **AP-02**                | Superuser Access Limitation                                                                                                 | Technical | DSCP1         | —              |
| **Description**          | DHIS2 superusers must be limited to approximately 1% of total user population; quarterly access reviews required.           |
| **Verification Method**  | Query superuser role assignments; calculate percentage of superusers.                                                       |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                             |
| **Evidence/Findings**    |                                                                                                                             |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***              |

| Control ID               | Control Name                                                                                                   | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **AP-03**                | Multi-Factor Authentication (Superuser accounts)                                                               | Technical | DSCP1         | —              |
| **Description**          | MFA must be enforced for all DHIS2 superuser accounts; hardware or app-based tokens preferred.                 |
| **Verification Method**  | Verify MFA configuration for admin accounts; review MFA enrollment status; test MFA enforcement at login.      |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                |
| **Evidence/Findings**    |                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\*** |

---

### 5. DHIS2 TOMCAT APPLICATION SERVER

| Control ID               | Control Name                                                                                                   | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **TC-01**                | Tomcat Service Account                                                                                         | Technical | DSCP1         | 10.17          |
| **Description**          | Tomcat must run under a dedicated service account with minimal privileges; must not run as root.               |
| **Verification Method**  | Check Tomcat process ownership; verify service account configuration; confirm absence of root privileges.      |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                |
| **Evidence/Findings**    |                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\*** |

| Control ID               | Control Name                                                                                                   | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **TC-02**                | Tomcat Shutdown Port Security                                                                                  | Technical | DSCP1         | 3.2            |
| **Description**          | Tomcat SHUTDOWN port must be disabled or firewalled; if required, restrict to localhost only.                  |
| **Verification Method**  | Review server.xml for SHUTDOWN port configuration; verify firewall rules; test external accessibility.         |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                |
| **Evidence/Findings**    |                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\*** |

| Control ID               | Control Name                                                                                                     | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **TC-03**                | Application Auto-Deployment Disabled                                                                             | Technical | DSCP1         | 9.2            |
| **Description**          | Tomcat auto-deployment must be disabled.                                                                         |
| **Verification Method**  | Review server.xml and Host configuration for autoDeploy setting.                                                 |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                  |
| **Evidence/Findings**    |                                                                                                                  |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***   |

| Control ID               | Control Name                                                                                                    | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **TC-04**                | Webapp Modification Prevention                                                                                  | Technical | DSCP1         | 4.7            |
| **Description**          | File permissions must prevent Tomcat runtime from modifying deployed application artifacts (webapps directory). |
| **Verification Method**  | Audit webapps directory permissions; verify Tomcat user cannot write to deployment directories.                 |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                 |
| **Evidence/Findings**    |                                                                                                                 |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***  |

---

### 6. NETWORK SECURITY

| Control ID               | Control Name                                                                                                                                 | Type      | Control Group | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------- | -------------- |
| **FW-01**                | Layered Firewall Architecture                                                                                                                | Technical | DSCP1         | 9.1            |
| **Description**          | Defense-in-depth firewall strategy required: perimeter, host-based, and container-based; default-deny.                                       |
| **Verification Method**  | Review firewall architecture documentation; verify multiple firewall layers; confirm default-deny policies.                                  |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                              |
| **Evidence/Findings**    |                                                                                                                                              |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                               |

---

### 7. GOVERNANCE & PROCESSES

| Control ID               | Control Name                                                                                                           | Type           | Control Group | CIS v8 Mapping |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------- | ------------- | -------------- |
| **PS-01**                | Incident Response Plan                                                                                                 | Organizational | DSCP1         | 17.1-17.9      |
| **Description**          | Documented incident response plan with defined roles, runbooks, communication procedures.                              |
| **Verification Method**  | Review IR plan documentation; verify contact lists current; check runbooks for common scenarios.                       |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                        |
| **Evidence/Findings**    |                                                                                                                        |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***         |

| Control ID               | Control Name                                                                                                                   | Type           | Control Group | CIS v8 Mapping |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------- | -------------- |
| **PS-02**                | Data Sharing Agreements                                                                                                        | Organizational | DSCP1         | —              |
| **Description**          | Formal data sharing agreements and NDAs with contractual safeguards and retention clauses required for external parties.       |
| **Verification Method**  | Review executed data sharing agreements; verify NDA coverage; confirm retention and destruction clauses.                       |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                                |
| **Evidence/Findings**    |                                                                                                                                |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***                 |

| Control ID               | Control Name                                                                                                               | Type           | Control Group | CIS v8 Mapping |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------- | -------------- |
| **PS-03**                | DHIS2 User Offboarding Procedure                                                                                           | Organizational | DSCP1         | 5.3            |
| **Description**          | Immediate deprovisioning workflow for departing users.                                                                     |
| **Verification Method**  | Review offboarding procedures.                                                                                             |
| **Assessment Result**    | ☐ Compliant ☐ Partially Compliant ☐ Non-Compliant ☐ Not Applicable ☐ Not Tested                                            |
| **Evidence/Findings**    |                                                                                                                            |
| **Remediation Required** | ☐ Yes ☐ No &nbsp;&nbsp;&nbsp; **Target Date:** \***\*\_\_\*\*** &nbsp;&nbsp;&nbsp; **Owner:** \***\*\_\_\*\***             |

---

## Appendix A: Control Testing Evidence

_Attach supporting documentation, screenshots, configuration files, logs, and other evidence collected during the assessment._

---


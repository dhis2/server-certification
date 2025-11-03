# DSCP Field Scoring Template

## Assessment Metadata

- Organization:
- System/Environment:
- Assessment Date:
- Assessors (2):
- POC:
- Evidence Repository Link:

---

## IG1 Baseline Controls (Base Certification)

> All IG1 technical controls must be Compliant for certification (organizational controls are informative unless marked normative). Refer to `controls.md` for full descriptions and verification methods.

### Database

- [ ] DB-01 Regular Automated Database Backup — Status: \_\_\_\_ Notes:
- [ ] DB-02 Database Backup Restore Testing — Status: \_\_\_\_ Notes:
- [ ] DB-04 Database Least Privilege Access — Status: \_\_\_\_ Notes:
- [ ] DB-06 Database Backup File Permissions — Status: \_\_\_\_ Notes:
- [ ] DB-09 PostgreSQL Host-Based Access Control — Status: \_\_\_\_ Notes:
- [ ] DB-10 Supported PostgreSQL Version (Non‑EOL) — Status: \_\_\_\_ Notes:
- [ ] DB-11 PostgreSQL Tuning Baseline (JIT off; max_locks_per_transaction=128) — Status: \_\_\_\_ Notes:

### Deployment/TLS

- [ ] DT-02 TLS/SSL Configuration — Status: \_\_\_\_ Notes:
- [ ] DT-03 Pre-Production Testing Environment (informative) — Status: \_\_\_\_ Notes:

### Operating System Security

- [ ] OS-01 Disable Direct Root SSH Access — Status: \_\_\_\_ Notes:
- [ ] OS-02 SSH Key-Based Authentication — Status: \_\_\_\_ Notes:
- [ ] OS-03 SSH Password Authentication Disabled — Status: \_\_\_\_ Notes:
- [ ] OS-04 SSH Configuration File Permissions — Status: \_\_\_\_ Notes:
- [ ] OS-05 Automated Security Patching — Status: \_\_\_\_ Notes:
- [ ] OS-06 DHIS2 Application File Permissions — Status: \_\_\_\_ Notes:
- [ ] OS-07 System Monitoring and Alerting — Status: \_\_\_\_ Notes:
- [ ] OS-09 Operating System Least Privilege — Status: \_\_\_\_ Notes:
- [ ] OS-10 Network Service Exposure Control — Status: \_\_\_\_ Notes:
- [ ] OS-14 Minimal Service Footprint — Status: \_\_\_\_ Notes:

### DHIS2 Application Security

- [ ] AP-01 Default Admin Account Security — Status: \_\_\_\_ Notes:
- [ ] AP-02 Administrative Access Limitation — Status: \_\_\_\_ Notes:
- [ ] AP-03 Multi-Factor Authentication (Admins) — Status: \_\_\_\_ Notes:

### Network Security

- [ ] FW-01 Layered Firewall Architecture — Status: \_\_\_\_ Notes:

### Access Control

- [ ] AC-01 Multiple Administrative Accounts — Status: \_\_\_\_ Notes:
- [ ] AC-02 Individual SSH Account Accountability — Status: \_\_\_\_ Notes:
- [ ] AC-03 User Home Directory Hygiene — Status: \_\_\_\_ Notes:

### Governance & Processes (Informative unless normative)

- [ ] PS-03 Enterprise Asset Inventory — Status: \_\_\_\_ Notes:
- [ ] PS-04 Incident Response Plan — Status: \_\_\_\_ Notes:
- [ ] PS-05 Data Sharing Agreements — Status: \_\_\_\_ Notes:
- [ ] PS-06 DHIS2 User Offboarding Procedure — Status: \_\_\_\_ Notes:
- [ ] PS-07 OS User Offboarding Procedure — Status: \_\_\_\_ Notes:

---

## IG2 Additional Controls

> Required for IG2 certification in addition to all IG1 controls.

### Database

- [ ] DB-03 Off-Site Backup Storage — Status: \_\_\_\_ Notes:

### DHIS2 Application Security

- [ ] AP-04 Multi-Factor Authentication (Users) — Status: \_\_\_\_ Notes:

### Application Server

- [ ] TC-02 Tomcat Shutdown Port Security — Status: \_\_\_\_ Notes:
- [ ] TC-03 Application Auto-Deployment Disabled — Status: \_\_\_\_ Notes:

### Logging & Monitoring

- [ ] OS-11 Centralized Security Event Logging — Status: \_\_\_\_ Notes:

### Governance & Risk (Informative unless normative)

- [ ] PS-08 Risk Assessment Program — Status: \_\_\_\_ Notes:
- [ ] PS-09 Internal Security Audits — Status: \_\_\_\_ Notes:
- [ ] PS-11 Incident Response Plan — Status: \_\_\_\_ Notes:

---

## IG3 Advanced Controls

> Required for IG3 certification in addition to IG1 and IG2 controls.

### Encryption & Detection

- [ ] DB-07 Database Encryption at Rest — Status: \_\_\_\_ Notes:
- [ ] DB-08 Backup Encryption at Rest — Status: \_\_\_\_ Notes:
- [ ] OS-08 Operating System Encryption at Rest — Status: \_\_\_\_ Notes:
- [ ] OS-12 Host-Based Intrusion Detection — Status: \_\_\_\_ Notes:
- [ ] OS-13 Network-Based Intrusion Detection — Status: \_\_\_\_ Notes:

### Governance (Informative unless normative)

- [ ] PS-01 Security Leadership Accountability — Status: \_\_\_\_ Notes:
- [ ] PS-02 Security Program Development — Status: \_\_\_\_ Notes:
- [ ] PS-10 External Security Audits — Status: \_\_\_\_ Notes:
- [ ] PS-12 Security Metrics and KPIs — Status: \_\_\_\_ Notes:

---

## Tally and Determination

- IG1 Technical Controls Compliant: **_ / _** → %: \_\_\_\_
- IG2 Technical Controls Compliant: **_ / _** → %: \_\_\_\_
- IG3 Technical Controls Compliant: **_ / _** → %: \_\_\_\_

Certification Decision:

- [ ] PASS (IG1 baseline achieved)
- [ ] PASS (IG2)
- [ ] PASS (IG3)
- [ ] FAIL
- [ ] CONDITIONAL (minor gaps with accepted plan)

Notes and Critical Findings:

-
-
-

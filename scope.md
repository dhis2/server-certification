# DSCP Assessment Scope

## Purpose

Define the scope for assessing DHIS2 Server Certification Program (DSCP) controls, ensuring clear boundaries, inclusions, exclusions, and methods aligned to industry standards. The scope of this assessment is restricted to a particular instance of DHIS2.

## In-Scope Components

- DHIS2 application (production) and supporting services
- Pre-production environments used for deployment validation and backup/restore testing
- Application server hosting DHIS2
- PostgreSQL database configurations, backups, and recovery procedures
- Operating systems hosting DHIS2 components
- Reverse proxy and TLS termination for DHIS2
- Network security controls protecting DHIS2 (host/container firewalls, segmentation)
- Security monitoring and detection: centralized logging/SIEM, HIDS/EDR, NIDS
- Identity and access controls for OS, SSH, and DHIS2 administrative access
- Governance/process controls directly supporting the environment (e.g., IR, vulnerability management, asset inventory, offboarding)
- Backup storage (including off-site) and key management related to DHIS2 data

## Out of Scope

- DHIS2 business functionality, data quality/semantics, and application feature validation
- Enterprise systems not providing services to the DHIS2 environment
- Third-party vendor internal controls beyond contractual assurances and integration points
- End-user devices except as covered by Device controls DV-01 to DV-03
- Physical facility security unless explicitly included by engagement
- Network infrastructure not involved in DHIS2 traffic paths

## Assessment Boundaries and Period

- Point-in-time assessment as of the assessment date.
- Configuration/state validation for production.

## Methods and Evidence

- Document and configuration reviews (files, policies, diagrams)
- Command outputs, logs, and screenshots
- Automated scans (e.g., TLS configuration), and restore/deployment test evidence
- Interviews with responsible personnel
- Sampling based on risk and Implementation Group (IG) level

## Control Framework Alignment

- CIS Controls v8 with Implementation Group mapping (IG1/IG2/IG3) as defined in controls.md
- References: NIST Cybersecurity Framework, ISO/IEC 27001

## Certification Criteria

- Scoring per controls.md: technical controls are normative; organizational controls are informative.
- Certification decisions and thresholds are defined in the assessment method and applied to in-scope components only.

## Assumptions and Dependencies

- Timely access to environments, documentation, and personnel
- Accurate asset inventories and network/service lists
- Change freeze during assessment window or complete change logs provided

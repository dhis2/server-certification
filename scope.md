# DSCP Assessment Scope
## Purpose

The purpose of the DHIS2 Server Certification Program (DSCP) is for implementors to demonstrate that their DHIS2 server has been installed in a way which meets reasonable standards of good practice. This assurance is intended to be valuable to donors and system owners. It is not designed to be a comprehensive security assessment - there are other tools and standards for that, for example CIS benchmarks and NIST frameworks.  There are three main drivers for this program:
- it is focussed on DHIS2 server installations in particular, rather than generic systems
- it is based on many years experience and understanding of common mistakes or deficiencies found in the field
- the scope is intentionally limited to allow for rapid, low cost and remote assessment

Importantly, what is being certified is an installed system rather than the organisation which owns or installed the system.

The assessment is targetted at minimum requirements for an acceptable DHIS2 production system.  An aim of the program is to ensure that all systems can reach this minimum standard.  

The assessment is linked to a particular point in time.  There is no sense of a validity period.  The certificate is awarded based on the state of the system at the time it is assessed.  Typically we expect this assessment to be sought soon after installation as well as periodically afterwards.
## Target Environments

This scope applies to organizations operating DHIS2 in production, whether self‑hosted on‑premises, hosted by a national/regional data center, or managed in a cloud environment. Typical deployments include:

- Reverse proxy/TLS termination (e.g., NGINX or equivalent)
- Application server running DHIS2 (e.g., Tomcat or equivalent Java application runtime)
- PostgreSQL database server with regular backups and restore procedures
- System monitoring

Currently the scope is limited to systems running on linux using physical hardware, virtual machines and/or containers.

## In-Scope Components

- Operating systems hosting DHIS2 components
- DHIS2 application service (typically apache tomcat) 
- PostgreSQL database configurations, backups, and recovery procedures
- Reverse proxy and TLS termination for DHIS2
- Network security controls protecting DHIS2 (host/container firewalls, segmentation)
- Governance/process controls directly supporting the environment (e.g., IR, vulnerability management, asset inventory, offboarding)
- Backup process (including off-site) related to DHIS2 data

## Out of Scope

- DHIS2 application level configuration
- End-user devices used to access the application on the server
- Physical facility controls and data centre management 

## Methods and Evidence

- Document and configuration reviews (files, policies, diagrams)
- Command outputs, logs, and screenshots
- Automated scans (e.g., TLS configuration), and restore/deployment test evidence
- Interviews with responsible personnel
- Sampling based on risk and Implementation Group (IG) level

## Access Expectations

- Two assessors will be assigned by the assessing organization. Each assessor will use an individual, named account.
- SSH key‑based access with sudo rights is expected for configuration verification (or custodian‑run commands where sudo cannot be granted).
- Evidence will be exchanged via a secure, pre‑agreed channel per the method in `method.md`.

## Control Framework Alignment

- CIS Controls v8 with Implementation Group mapping (IG1/IG2/IG3) as defined in controls.md
- References: NIST Cybersecurity Framework, ISO/IEC 27001

## Certification Criteria

- Scoring per controls.md: technical controls are normative; organizational controls are informative.
- Certification decisions and thresholds are defined in the assessment method and applied to in-scope components only.

## Dependencies and Assumptions

- Timely access to environments, documentation, and personnel
- Accurate asset inventories and network/service lists
- Change freeze during assessment window or complete change logs provided

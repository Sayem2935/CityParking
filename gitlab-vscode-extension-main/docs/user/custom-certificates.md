---
stage: AI-powered
group: Editor Extensions
info: To determine the technical writer assigned to the Stage/Group associated with this page, see https://about.gitlab.com/handbook/product/ux/technical-writing/#assignments
---

# Configuring Custom Certificate Authority

This guide helps users in enterprise environments configure the GitLab for VS Code extension to work with custom Certificate Authorities (CAS).

## Overview

In controlled enterprise environments, organizations often use custom Certificate Authorities. The GitLab for VS Code extension needs to trust these certificates to communicate with your GitLab instance.

## Important: Download the Full Certificate Chain

WARNING:
Downloading only the end-entity certificate will not work.

**Correct Approach:** You must download the **complete certificate chain**, including:

- Root CA certificate
- Any intermediate CA certificates
- Server certificate (optional, usually handled automatically)

### How to Get the Full Certificate Chain

#### Method 1: From Your IT/Security Team (Recommended)

Contact your IT or security team and request:

- The complete certificate chain in PEM format
- Or individual CA certificates (root + intermediates)

#### Method 2: Export from Browser

**Chrome/Edge:**

1. Navigate to your GitLab instance
1. Click the padlock icon in the address bar
1. Click "Connection is secure" > "Certificate is valid"
1. Go to the "Certification Path" tab
1. Export each certificate in the chain starting from the root

**Firefox:**

1. Navigate to your GitLab instance
1. Click the padlock > "Connection secure" > "More information"
1. Click "View Certificate"
1. Download each certificate in the chain (PEM format)

## Configuration Methods

### Option 1: System Certificate Store (Easiest)

**Prerequisites:**

- Your GitLab Workflow extension version is 6.51.1 or later.
- Your VS Code version is 1.101.2 (May 2025) or later.
- The `gitlab.ca` setting is not used.

If your organization installs trusted Certificate Authorities at the operating system level, the GitLab for VS Code extension will automatically trust them through the underlying Node.js and VS Code runtime.

No additional GitLab extension settings are required in this case.

**When this works well:**

- Corporate-managed devices with pre-installed root and intermediate CAS
- Environments where other HTTPS tools already work without custom CA configuration

If certificate errors persist, use the `gitlab.ca` setting described below.

### Option 2: Custom Certificate File

Specify a certificate file directly:

**VS Code Settings:**

```json
{
  "gitlab.ca": "/path/to/ca-bundle.pem"
}
```

**Certificate Bundle Format:**

Your `ca-bundle.pem` should contain all certificates in the chain:

```plaintext
-----BEGIN CERTIFICATE-----
[Root CA Certificate]
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
[Intermediate CA Certificate]
-----END CERTIFICATE-----
```

**Platform-Specific Paths:**

**Windows:**

```json
{
  "gitlab.ca": "C:\\certs\\ca-bundle.pem"
}
```

**macOS/Linux:**

```json
{
  "gitlab.ca": "/etc/ssl/certs/ca-bundle.pem"
}
```

### Option 3: Disable Certificate Verification (Not Recommended)

WARNING:
Disabling certificate verification is a security risk. You should only disable verification for testing or development.

```json
{
  "gitlab.ignoreCertificateErrors": true
}
```

## Troubleshooting Certificate Issues

### Error: "unable to verify the first certificate"

**Cause:** Missing intermediate certificates in the chain

**Solution:**

1. Verify you have the **complete certificate chain**
1. Ensure all certificates are in PEM format
1. Check that certificates are concatenated in the correct order (root > intermediate > leaf)

### Error: "self signed certificate in certificate chain"

**Cause:** VS Code doesn't trust your organization's root CA

**Solution:**

Add your root CA to the certificate bundle or enable the system certificate store if the CA is installed system-wide.

### Error: "certificate has expired"

**Cause:** One or more certificates in the chain have expired

**Solution:**

1. Request updated certificates from your IT team
1. Check expiration dates: `openssl x509 -in certificate.pem -noout -dates`

### Verify Certificate Configuration

Check if your certificates are valid:

```shell
# Test connection with custom CA
curl --cacert /path/to/ca-bundle.pem "https://your-gitlab-instance.com"

# Check certificate details
openssl x509 -in ca-bundle.pem -text -noout

# Verify certificate chain (replace server-cert.pem with your server's certificate)
openssl verify -CAfile ca-bundle.pem server-cert.pem

```

Enable detailed logging to diagnose issues:

**VS Code Settings:**

```json
{
  "gitlab.debug": true
}
```

**View logs:**

1. Open Command Palette (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> or <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>)
1. Type "GitLab: Show Extension Logs"
1. Look for certificate-related errors

## Common Enterprise Scenarios

### Scenario 1: Corporate Proxy with SSL Inspection

If your organization uses a proxy that performs SSL inspection:

1. Get the proxy's CA certificate from IT
1. Add to your certificate bundle
1. Configure proxy settings in VS Code if needed

### Scenario 2: GitLab Self-Managed with Internal CA

For GitLab Self-Managed instances with internal CAS:

1. Export the complete certificate chain from GitLab server
1. Add to certificate bundle
1. Use the `gitlab.ca` setting

### Scenario 3: Multiple GitLab Instances with Different CAS

If you work with multiple GitLab instances:

1. Create a certificate bundle with all necessary CA certificates
1. All CAS can be in the same PEM file
1. Point `gitlab.ca` to this bundle

## Getting Help

If you continue experiencing issues:

1. **Check Extension Logs:**
   1. Open Command Palette (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> or <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>)
   1. Type "GitLab: Show Extension Logs"
   1. Look for certificate errors with details

1. **Verify Certificate Chain:**
   - Use `openssl` commands shown above
   - Ensure chain is complete and valid

1. **Community Support:**
   - [GitLab Forum](https://forum.gitlab.com)
   - [GitLab Discord](https://discord.gg/gitlab) - #vscode-extension channel
   - [Open an issue](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues)

1. **Enterprise Support:**
   - Contact your GitLab account team
   - Include extension logs and certificate verification output

## Related topics

- [Using the VS Code extension with self-signed certificates](https://docs.gitlab.com/editor_extensions/visual_studio_code/ssl/)
- [VS Code Network Settings](https://code.visualstudio.com/docs/setup/network)
- [OpenSSL Documentation](https://www.openssl.org/docs/)
- [GitLab SSL Configuration](https://docs.gitlab.com/omnibus/settings/ssl.html)

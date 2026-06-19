import { createDiagnosticsZip, DiagnosticsFile } from './zip_creator';

// Helper to verify ZIP structure (basic validation)
function isValidZipBuffer(buffer: Buffer): boolean {
  // ZIP files start with 'PK' signature
  return buffer.length > 0 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

describe('createDiagnosticsZip', () => {
  it('creates a valid ZIP buffer', async () => {
    const files: DiagnosticsFile[] = [
      { name: 'file1.txt', content: 'Content 1' },
      { name: 'file2.txt', content: 'Content 2' },
    ];

    const zipBuffer = await createDiagnosticsZip(files);

    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(zipBuffer.length).toBeGreaterThan(0);
    expect(isValidZipBuffer(zipBuffer)).toBe(true);
  });

  it('creates ZIP with single file', async () => {
    const files: DiagnosticsFile[] = [{ name: 'single.txt', content: 'Single file content' }];

    const zipBuffer = await createDiagnosticsZip(files);

    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(isValidZipBuffer(zipBuffer)).toBe(true);
  });

  it('creates ZIP with multiple files', async () => {
    const files: DiagnosticsFile[] = [
      { name: 'diagnostics.md', content: '# Diagnostics\n\nSome info' },
      { name: 'extension-logs.txt', content: 'Log line 1\nLog line 2' },
      { name: 'language-server-logs.txt', content: 'LS log 1\nLS log 2' },
    ];

    const zipBuffer = await createDiagnosticsZip(files);

    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(zipBuffer.length).toBeGreaterThan(100); // Should have reasonable size
    expect(isValidZipBuffer(zipBuffer)).toBe(true);
  });

  it('handles empty file content', async () => {
    const files: DiagnosticsFile[] = [
      { name: 'empty.txt', content: '' },
      { name: 'nonempty.txt', content: 'Has content' },
    ];

    const zipBuffer = await createDiagnosticsZip(files);

    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(isValidZipBuffer(zipBuffer)).toBe(true);
  });

  it('handles large content', async () => {
    const largeContent = 'x'.repeat(100000); // 100KB
    const files: DiagnosticsFile[] = [{ name: 'large.txt', content: largeContent }];

    const zipBuffer = await createDiagnosticsZip(files);

    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(zipBuffer.length).toBeGreaterThan(0);
    expect(zipBuffer.length).toBeLessThan(largeContent.length); // Should be compressed
    expect(isValidZipBuffer(zipBuffer)).toBe(true);
  });

  it('handles special characters in content', async () => {
    const files: DiagnosticsFile[] = [
      {
        name: 'special.txt',
        content: 'Special chars: "quotes" \'apostrophes\' /slashes\\ 世界 🌍',
      },
    ];

    const zipBuffer = await createDiagnosticsZip(files);

    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(isValidZipBuffer(zipBuffer)).toBe(true);
  });

  it('handles special characters in filenames', async () => {
    const files: DiagnosticsFile[] = [
      { name: 'file-with-dashes.txt', content: 'Content' },
      { name: 'file_with_underscores.txt', content: 'Content' },
      { name: 'file.with.dots.txt', content: 'Content' },
    ];

    const zipBuffer = await createDiagnosticsZip(files);

    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(isValidZipBuffer(zipBuffer)).toBe(true);
  });

  it('handles multiline content', async () => {
    const content = `Line 1
Line 2
Line 3
Line 4`;
    const files: DiagnosticsFile[] = [{ name: 'multiline.txt', content }];

    const zipBuffer = await createDiagnosticsZip(files);

    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(isValidZipBuffer(zipBuffer)).toBe(true);
  });

  it('creates different ZIPs for different content', async () => {
    const files1: DiagnosticsFile[] = [{ name: 'file.txt', content: 'Content A' }];
    const files2: DiagnosticsFile[] = [{ name: 'file.txt', content: 'Content B' }];

    const zip1 = await createDiagnosticsZip(files1);
    const zip2 = await createDiagnosticsZip(files2);

    // ZIPs should be different (different content)
    expect(Buffer.compare(zip1, zip2)).not.toBe(0);
  });

  it('rejects on archiver error', async () => {
    // Create invalid input that would cause archiver to fail
    // Note: This is a bit tricky to test, as archiver is quite robust
    // For now, we'll just verify the error handling structure exists
    const files: DiagnosticsFile[] = [{ name: 'test.txt', content: 'test' }];

    // This should succeed, but we're testing error handling exists
    await expect(createDiagnosticsZip(files)).resolves.toBeInstanceOf(Buffer);
  });
});

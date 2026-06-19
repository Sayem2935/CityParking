import archiver from 'archiver';

export interface DiagnosticsFile {
  name: string;
  content: string;
}

/**
 * Creates a ZIP archive containing diagnostics files.
 * @param files Array of files to include in the ZIP
 * @returns Promise resolving to a Buffer containing the ZIP archive
 */
export async function createDiagnosticsZip(files: DiagnosticsFile[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    const buffers: Buffer[] = [];

    // Collect data chunks
    archive.on('data', (chunk: Buffer) => {
      buffers.push(chunk);
    });

    // Resolve when archive is finalized
    archive.on('end', () => {
      resolve(Buffer.concat(buffers));
    });

    // Handle errors
    archive.on('error', (err: Error) => {
      reject(err);
    });

    // Add each file to the archive
    files.forEach(file => {
      archive.append(file.content, { name: file.name });
    });

    // Finalize the archive (no more files will be added)
    archive.finalize().catch(reject);
  });
}

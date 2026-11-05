/** Small, bounded ZIP reader. It never extracts files or evaluates archive contents. */
export const maxSpikeArchiveBytes = 10_000_000;
const maxExpandedBytes = 16_000_000;
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
export function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export class ZipReader {
  private entries = new Map<string, { method: number; size: number; compressed: number; offset: number; crc: number }>();
  constructor(private bytes: Uint8Array) {
    if (bytes.length < 22 || bytes.length > maxSpikeArchiveBytes) throw new Error('ZIP size');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let end = bytes.length - 22;
    while (end >= Math.max(0, bytes.length - 65557) && view.getUint32(end, true) !== 0x06054b50) end--;
    if (end < 0 || view.getUint32(end, true) !== 0x06054b50 || end + 22 + view.getUint16(end + 20, true) !== bytes.length) throw new Error('ZIP directory');
    const count = view.getUint16(end + 10, true);
    if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || count > 1000 || count !== view.getUint16(end + 8, true)) throw new Error('ZIP volume');
    let cursor = view.getUint32(end + 16, true), expanded = 0;
    const directoryEnd = cursor + view.getUint32(end + 12, true);
    if (directoryEnd > end) throw new Error('ZIP bounds');
    for (let index = 0; index < count; index++) {
      if (cursor + 46 > directoryEnd || view.getUint32(cursor, true) !== 0x02014b50) throw new Error('ZIP entry');
      const flags = view.getUint16(cursor + 8, true), method = view.getUint16(cursor + 10, true);
      const compressed = view.getUint32(cursor + 20, true), size = view.getUint32(cursor + 24, true);
      const nameLength = view.getUint16(cursor + 28, true), extra = view.getUint16(cursor + 30, true), comment = view.getUint16(cursor + 32, true);
      const offset = view.getUint32(cursor + 42, true);
      if (flags & 1 || ![0, 8].includes(method) || (expanded += size) > maxExpandedBytes || cursor + 46 + nameLength + extra + comment > directoryEnd || offset + 30 > cursor) throw new Error('ZIP limits');
      const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
      if (this.entries.has(name) || name.includes('..') || name.startsWith('/') || name.includes('\\')) throw new Error('ZIP name');
      this.entries.set(name, { method, compressed, size, offset, crc: view.getUint32(cursor + 16, true) });
      cursor += 46 + nameLength + extra + comment;
    }
    if (cursor !== directoryEnd) throw new Error('ZIP directory length');
  }
  has(name: string) { return this.entries.has(name); }
  async read(name: string, limit = maxExpandedBytes): Promise<Uint8Array> {
    const entry = this.entries.get(name);
    if (!entry || entry.size > limit) throw new Error('ZIP missing or oversized entry');
    const view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
    if (view.getUint32(entry.offset, true) !== 0x04034b50 || view.getUint16(entry.offset + 8, true) !== entry.method) throw new Error('ZIP header');
    const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true);
    if (start + entry.compressed > this.bytes.length) throw new Error('ZIP data bounds');
    const compressed = this.bytes.slice(start, start + entry.compressed);
    let output: Uint8Array;
    if (entry.method === 0) output = compressed;
    else {
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      const reader = stream.getReader(), chunks: Uint8Array[] = [];
      let length = 0;
      try {
        for (;;) {
          const { value, done } = await reader.read(); if (done) break;
          length += value.length;
          if (length > entry.size || length > limit) { await reader.cancel(); throw new Error('ZIP expansion limit'); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      output = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
    }
    if (output.length !== entry.size || crc32(output) !== entry.crc) throw new Error('ZIP checksum');
    return output;
  }
  async json(name: string): Promise<unknown> { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await this.read(name, 3_000_000))); }
}

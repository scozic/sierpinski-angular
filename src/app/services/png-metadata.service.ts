import { Injectable } from '@angular/core';

/**
 * Service to handle PNG metadata injection and extraction.
 * It uses the 'tEXt' chunk to store fractal JSON data.
 */
@Injectable({
  providedIn: 'root'
})
export class PngMetadataService {

  private readonly PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  /**
   * Injects a JSON string into a PNG blob as a 'tEXt' chunk.
   */
  async writeMetadata(blob: Blob, key: string, value: string): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const originalBuffer = new Uint8Array(arrayBuffer);

    // Prepare tEXt chunk data
    const keyBytes = new TextEncoder().encode(key);
    const valueBytes = new TextEncoder().encode(value);
    const chunkData = new Uint8Array(keyBytes.length + 1 + valueBytes.length);
    chunkData.set(keyBytes);
    chunkData[keyBytes.length] = 0; // Null separator
    chunkData.set(valueBytes, keyBytes.length + 1);

    const typeBytes = new TextEncoder().encode('tEXt');
    const chunkLength = chunkData.length;
    const fullChunkLength = 4 + 4 + chunkLength + 4; // Length(4) + Type(4) + Data(N) + CRC(4)

    const newBuffer = new Uint8Array(originalBuffer.length + fullChunkLength);

    // 1. Copy signature
    newBuffer.set(this.PNG_SIGNATURE);

    // 2. Insert new chunk after IHDR (the first chunk)
    // Find end of IHDR
    let offset = 8;
    const ihdrLength = this.readUint32(originalBuffer, offset);
    const ihdrEnd = offset + 4 + 4 + ihdrLength + 4;

    // Copy everything up to IHDR end
    newBuffer.set(originalBuffer.subarray(0, ihdrEnd));

    // Write new chunk
    let writeOffset = ihdrEnd;
    this.writeUint32(newBuffer, writeOffset, chunkLength);
    writeOffset += 4;
    newBuffer.set(typeBytes, writeOffset);
    writeOffset += 4;
    newBuffer.set(chunkData, writeOffset);
    writeOffset += chunkLength;
    
    // Calculate CRC
    const crcData = new Uint8Array(4 + chunkLength);
    crcData.set(typeBytes);
    crcData.set(chunkData, 4);
    this.writeUint32(newBuffer, writeOffset, this.calculateCrc(crcData));
    writeOffset += 4;

    // Copy remaining original data
    newBuffer.set(originalBuffer.subarray(ihdrEnd), writeOffset);

    return new Blob([newBuffer], { type: 'image/png' });
  }

  /**
   * Reads metadata from a PNG blob by searching for a specific key in 'tEXt' chunks.
   */
  async readMetadata(blob: Blob, key: string): Promise<string | null> {
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Check PNG signature
    for (let i = 0; i < 8; i++) {
      if (buffer[i] !== this.PNG_SIGNATURE[i]) return null;
    }

    let offset = 8;
    while (offset < buffer.length) {
      const length = this.readUint32(buffer, offset);
      const type = new TextDecoder().decode(buffer.subarray(offset + 4, offset + 8));
      
      if (type === 'tEXt') {
        const chunkData = buffer.subarray(offset + 8, offset + 8 + length);
        const nullIndex = chunkData.indexOf(0);
        if (nullIndex !== -1) {
          const foundKey = new TextDecoder().decode(chunkData.subarray(0, nullIndex));
          if (foundKey === key) {
            return new TextDecoder().decode(chunkData.subarray(nullIndex + 1));
          }
        }
      }

      if (type === 'IEND') break;
      offset += 12 + length;
    }

    return null;
  }

  private readUint32(buffer: Uint8Array, offset: number): number {
    return (buffer[offset] << 24 | buffer[offset + 1] << 16 | buffer[offset + 2] << 8 | buffer[offset + 3]) >>> 0;
  }

  private writeUint32(buffer: Uint8Array, offset: number, value: number): void {
    buffer[offset] = (value >>> 24) & 0xFF;
    buffer[offset + 1] = (value >>> 16) & 0xFF;
    buffer[offset + 2] = (value >>> 8) & 0xFF;
    buffer[offset + 3] = value & 0xFF;
  }

  private calculateCrc(data: Uint8Array): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
}

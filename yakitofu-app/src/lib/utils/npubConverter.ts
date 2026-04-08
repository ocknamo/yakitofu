// npub <-> hex converter using nostr-tools bech32 encoding

const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) {
        chk ^= GEN[i];
      }
    }
  }
  return chk;
}

function bech32HrpExpand(hrp: string): number[] {
  const ret: number[] = [];
  for (let i = 0; i < hrp.length; i++) {
    ret.push(hrp.charCodeAt(i) >> 5);
  }
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) {
    ret.push(hrp.charCodeAt(i) & 31);
  }
  return ret;
}

function bech32CreateChecksum(hrp: string, data: number[]): number[] {
  const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = bech32Polymod(values) ^ 1;
  const ret: number[] = [];
  for (let i = 0; i < 6; i++) {
    ret.push((mod >> (5 * (5 - i))) & 31);
  }
  return ret;
}

function bech32Encode(hrp: string, data: number[]): string {
  const combined = data.concat(bech32CreateChecksum(hrp, data));
  let ret = hrp + '1';
  for (const d of combined) {
    ret += BECH32_CHARSET.charAt(d);
  }
  return ret;
}

function bech32Decode(bechString: string): { hrp: string; data: number[] } | null {
  const pos = bechString.lastIndexOf('1');
  if (pos < 1 || pos + 7 > bechString.length || bechString.length > 90) {
    return null;
  }

  const hrp = bechString.substring(0, pos);
  const data: number[] = [];

  for (let i = pos + 1; i < bechString.length; i++) {
    const d = BECH32_CHARSET.indexOf(bechString.charAt(i));
    if (d === -1) {
      return null;
    }
    data.push(d);
  }

  if (bech32Polymod(bech32HrpExpand(hrp).concat(data)) !== 1) {
    return null;
  }

  return { hrp, data: data.slice(0, -6) };
}

function convertBits(
  data: number[],
  fromBits: number,
  toBits: number,
  pad: boolean
): number[] | null {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toBits) - 1;

  for (const value of data) {
    if (value < 0 || value >> fromBits !== 0) {
      return null;
    }
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }

  if (pad) {
    if (bits > 0) {
      ret.push((acc << (toBits - bits)) & maxv);
    }
  } else if (bits >= fromBits || (acc << (toBits - bits)) & maxv) {
    return null;
  }

  return ret;
}

export function npubToHex(npub: string): string {
  const decoded = bech32Decode(npub);
  if (!decoded || decoded.hrp !== 'npub') {
    throw new Error('Invalid npub format');
  }

  const bytes = convertBits(decoded.data, 5, 8, false);
  if (!bytes) {
    throw new Error('Failed to convert npub to hex');
  }

  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToNpub(hex: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }

  const data = convertBits(bytes, 8, 5, true);
  if (!data) {
    throw new Error('Failed to convert hex to npub');
  }

  return bech32Encode('npub', data);
}

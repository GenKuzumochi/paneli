import { readFile } from "fs/promises";
import { subtle } from "node:crypto";

export async function readFileText(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, { flag: "r", encoding: "utf-8" });
  } catch {
    return;
  }
}

export async function readFileBuffer(path: string): Promise<Buffer | undefined> {
    try {
      return await readFile(path);
    } catch {
      return;
    }
  }
  
export  async function digest(data: string | Buffer, algorithm = 'SHA-256') {
    const ec = new TextEncoder();
    let digest: ArrayBuffer;
    if (typeof data === "string")
        digest = await subtle.digest(algorithm, ec.encode(data));
    else
        digest = await subtle.digest(algorithm, data);

    const hashArray = Array.from(new Uint8Array(digest));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


export async function readJSON(filename: string) {
  try {
      const file = await readFile(filename, 'utf8');
      return JSON.parse(file)
  } catch (e) { }
}

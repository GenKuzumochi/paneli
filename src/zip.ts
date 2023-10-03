import { readFile, readdir, writeFile } from "fs/promises";
import JSZip from "jszip";
import path from "path";

export async function zipAction(dir , dist = null) {
    const zip = new JSZip()
    const list = await readdir(dir)
    for (const f of list) {
        zip.file(f,await readFile(path.resolve(dir,f)))
    }
    if(!dist) dist = dir + ".zip"
    await writeFile( path.resolve(dir + ".zip") , await zip.generateAsync({type:"uint8array"}))
}
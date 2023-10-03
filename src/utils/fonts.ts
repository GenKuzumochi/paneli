import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import * as path from "path";
import { ConfigProgress, MIME_TABLE } from "../loader.js";

export type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
type WeightName = 'normal' | 'bold'
export type Style = 'normal' | 'italic'
export interface FontOptions {
    data: Buffer | ArrayBuffer | string
    name: string
    weight?: Weight
    style?: Style
    lang?: string
}

// フォントを読み込む
export async function loadFontUrl(obj: FontOptions, cacheDir: string): Promise<FontOptions> {
    // Buffer or ArrayBufferならそのままでOK
    if (typeof obj.data !== "string") return obj

    const lower = obj.data.toLowerCase();
    // Google Font(未実装)
    if (lower.startsWith("gfonts://")) {

    }

    if (!(lower.startsWith("http://") || lower.startsWith("https://"))) return
    const name = path.basename(new URL(obj.data).pathname)
    const file = path.resolve(cacheDir, name)

    const hit = existsSync(file);
    console.log("[Cache]", file, hit)

    if (hit)
        return {
            ...obj,
            data: await readFile(file)
        }
    else {
        await mkdir(path.dirname(file), { recursive: true })
        const d = await fetch(obj.data).then(x => x.arrayBuffer())
        await writeFile(file, new Uint8Array(d)) //キャッシュ
        return {
            ...obj,
            data: d
        }
    }
}

export const MIME_TABLE2 = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/svg+xml": "svg",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/webp": "webp",
}


// 絵文字画像を取得します
export async function loadGraphemeImages(key: string, url: string, config: ConfigProgress): Promise<string> {
    const cacheDir = config.distdir + "__cache";
    const lower = url.toLowerCase();
    const http = lower.startsWith("http://") || lower.startsWith("https://");

    const file = path.resolve(cacheDir, key);
    for (const ext of Object.keys(MIME_TABLE)) {
        if (existsSync(file + "." + ext)) {
            return `data:${MIME_TABLE[ext]};base64,${(await readFile(file + "." + ext)).toString("base64")}`;
        }
    }
    await mkdir(path.dirname(file), { recursive: true });
    let ext = undefined;
    let d = null;
    if (http) {
        d = await fetch(url).then(x => {
            ext = MIME_TABLE2[x.headers.get("Content-Type").split(";")[0]];
            return x.arrayBuffer();
        });
    } else {
        console.log(config.basedir, url);
        // read from local file
        d = await readFile(path.resolve(config.basedir, url)).then(x => {
            ext = path.extname(url).substring(1);
            return x.buffer;
        });
    }

    const ary = new Uint8Array(d);
    await writeFile(file + "." + ext, ary);
    return `data:${MIME_TABLE[ext]};base64,${Buffer.from(ary).toString("base64")}`;
}

// {string:string}

// 同名のディレクトリから、絵文字データを読み込みます。ファイル名は絵文字を表す文字列です。
export async function loadGraphemeImagesFromDir(config: ConfigProgress): Promise<{ [key: string]: string }> {
    const { basedir, confName } = config;
    const ret = {};
    const dir2 = path.resolve(basedir, "emojis");
    if (existsSync(dir2)) {
        //console.log("Emoji dir found    : ", dir2);
        for (const file of await readdir(dir2)) {
            const key = path.basename(file, path.extname(file));
            let ext
            const d = await readFile(path.resolve(dir2, file)).then(x => {
                ext = path.extname(file).substring(1);
                return x.buffer;
            });
            const ary = new Uint8Array(d);
            ret[key] = `data:${MIME_TABLE[ext]};base64,${Buffer.from(ary).toString("base64")}`;
        }
    }

    const dir1 = path.resolve(basedir, confName + ".emojis");
    if (existsSync(dir1)) {
        //console.log("Emoji dir found    : ", dir1);
        for (const file of await readdir(dir1)) {
            const key = path.basename(file, path.extname(file));
            let ext;
            const d = await readFile(path.resolve(dir1, file)).then(x => {
                ext = path.extname(file).substring(1);
                return x.buffer;
            });
            const ary = new Uint8Array(d);
            ret[key] = `data:${MIME_TABLE[ext]};base64,${Buffer.from(ary).toString("base64")}`;
        }
    }
    return ret;
}
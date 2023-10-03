
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { map } from "zod";
import { generateElement } from "./utils/transpile.js";
import satori from "satori";
import { Component } from "react";
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, fstat, readFileSync } from "node:fs";
import { subtle } from "node:crypto";
import { CreateScreenPanel, DataJson, Resource, ScreenPanel } from "./ccfolia.js";

//@ts-ignore
import { default as Papa } from 'papaparse';
import { nanoid, urlAlphabet } from "nanoid";
import { optimize } from "svgo";
import { Resvg } from "@resvg/resvg-js";
import { FontOptions, loadFontUrl, loadGraphemeImages, loadGraphemeImagesFromDir } from "./utils/fonts.js";
import { extend } from "./utils/extend.js"
import { digest, readFileBuffer, readFileText, readJSON } from "./utils/util.js";
import {merge} from "lodash-es"

const __dirname = new URL(import.meta.url).pathname;


type ImageInput = {
    type: "jsx" | "svg",
    value: string
} | {
    type: "file",
    filename: string,
    value: Buffer
} | {
    type: "empty"
}

// スクリーンパネルのオブジェクトを生成します
function createScreenPanel(data, order: number, config: ConfigProgress): CreateScreenPanel {
    const val = {
        x: +(data._x ?? config.x ?? 0),
        y: +(data._y ?? config.y ?? 0),
        z: +(data._z ?? config.z ?? 0),
        angle: +(data._angle ?? 0),
        width: +(data._ccfoliaWidth ?? data._width ?? 0),
        height: +(data._ccfoliaHeight ?? data._height ?? 0),
        locked: data._locked,
        active: data._active,
        memo: data._memo,
        imageUrl: data._imageUrl ?? null,
        coverImageUrl: data._coverImageUrl ?? null,
        id: nanoid(20),
        order
    }
    return CreateScreenPanel.parse(val)
}


export const MIME_TABLE = {
    "jpeg": "image/jpeg",
    "jpe": "image/jpeg",
    "png": "image/png",
    "svg": "image/svg+xml",
    "gif": "image/gif",
    "avif": "image/avif",
    "webp": "image/webp",
}


interface Config {
    width: number,
    height: number,
    x?: number,
    y?: number,
    z?: number,
    ccfoliaWidth: number,
    ccfoliaHeight: number,
    data: any[],   // データ
    image: ImageInput,
    coverImage: ImageInput
    outputType: "png" | "svg",
    preprocess: (record: Object, config: Config) => Object | Object[], // 入力データを処理する
    //presatori: x=>x,  // satori直前
    postprocess: (panel: CreateScreenPanel) => CreateScreenPanel,
    postsvg: (svg: string) => string, // SVG生成後
    fonts: FontOptions[],
    satoriOptions: {} // Vercel/satoriのオプション
    graphemeImages: { [K: string]: string } // 絵文字画像
}

export interface ConfigProgress extends Config {
    basedir: string,
    distdir: string,
    confName: string,
}




async function createResourceList(distDir: string): Promise<{ [K: string]: Resource }> {
    const files = await readdir(distDir)
    const res: { [K: string]: Resource } = {}
    for (const f of files) {
        const mime = MIME_TABLE[path.extname(f).substring(1)];
        res[f] = { type: mime }
    }
    return res;
}

// Load Fonts fron fontDir
async function loadLocalFonts(fontDir: string) {
    if (!existsSync(fontDir)) return []
    const files = await readdir(fontDir)

    return await Promise.all(files.map(async f => ({
        name: path.basename(f.replace(/^\d+_/, "")).replace(/\.[^/.]+$/, ""),
        data: await readFile(path.resolve(fontDir, f))
    }))
    )
}

// フォントを準備します
async function preprocessFont(config:ConfigProgress) {
    async function load(x) {
        return {
            ...x,
            data: await readFile(path.resolve(config.basedir, x.data))
        }
    }

    //let fon = config.fonts ? await Promise.all(config.fonts.map(x => { return load(x) })) : []
    //console.log({fon});
    const fon = []
    config.fonts ??= []

    for (const obj of config.fonts) {
        fon.push(await loadFontUrl(obj, config.distdir + "__cache"))
    }

    const graphemeImages = await loadGraphemeImagesFromDir(config)
    if (config.graphemeImages) {
        for (const [k, v] of Object.entries(config.graphemeImages)) {
            graphemeImages[k] = await loadGraphemeImages(k, v as any, config)
        }
    }

    const res = { fonts: [...fon, ...(await loadLocalFonts(config.basedir + "/fonts")), ...(await loadLocalFonts("fonts"))], graphemeImages };
    return res;
}

export async function load(srcdir: string, distdir: string) {
    let order = 1;
    const files = await readdir(srcdir)
    for (const f of files) {
        const items = [];
        // *.config.jsを読み込む
        if (!f.endsWith(".config.js")) continue;

        const p = path.resolve(srcdir, f)
        console.log("Loading " + f)
        const config = (await importDefault(p)) as ConfigProgress
        config.confName = path.basename(f, ".config.js");
        config.basedir = path.dirname(p)
        config.distdir = path.resolve(distdir, config.confName)
        console.log("Dist dir is " + config.distdir)
        config.preprocess ??= x => x;
        config.postprocess ??= x => x;
        config.postsvg ??= x => x;

        await mkdir(config.distdir, { recursive: true })

        const basename = path.resolve(p, "..", config.confName)
        
        // data読み込み
        if( typeof config.data === "number") config.data = new Array(config.data).fill(0).map(() => ({}))
        config.data ??= await loadData(basename)
        // Preprocess
        config.data = config.data.flatMap(x => config.preprocess(x, config))

        config.image ??= await loadJSX(basename)
        config.coverImage ??= await loadJSX(basename + ".cover")

        config.outputType ??= "png"

        for (const r of config.data) {
            r.type ??= config.outputType

            if (r._file) {
                const buff = await readFileBuffer(config.basedir + "/" + r._file);
                if (buff) {
                    const hash = digest(buff)
                    const ext = path.extname(r._file)
                    r._imageUrl =  hash + "." + ext;
                    if (!existsSync(config.distdir + "/" + r._imageUrl)) await writeFile(config.distdir + "/" + r._imageUrl, buff)
                }
            } else if (config.image.type === "file") {
                r._imageUrl = config.image.filename;
                if (!existsSync(config.distdir + "/" + r._imageUrl)) await writeFile(config.distdir + "/" + r._imageUrl, config.image.value)
            } else {

                let res;
                if (config.image.type === "empty") { }
                else if (config.image.type === "svg") {
                    // JSXを生成
                    const jsx = generateElement({ code: config.image.value, scope: r, enableTypeScript: false }, e => console.error(e));
                    const elem = jsx.prototype.render();
                    res = optimize(renderToStaticMarkup(elem))
                } else { //JSX
                    // JSXを生成
                    const jsx = generateElement({ code: config.image.value, scope: r, enableTypeScript: false }, e => console.error(e))
                    // Satori+最適化
                    res = optimize(await satoriJSX(jsx, r, config)).data
                }
                res = config.postsvg(res);
                if (r.type === "svg") {
                    r._imageUrl = await digest(res) + ".svg"
                    await writeFile(config.distdir + "/" + r._imageUrl, res)
                } else if (r.type === "png") {
                    const resvg = new Resvg(res).render().asPng()
                    r._imageUrl = await digest(resvg) + ".png"
                    await writeFile(config.distdir + "/" + r._imageUrl, resvg)
                }
            }
            const panel = config.postprocess ? config.postprocess(createScreenPanel(r, order++,config)) : createScreenPanel(r, order++,config);
            items.push(panel)
        }
        await writeFile(config.distdir + "/__data.json", JSON.stringify(createDataJson(items)));
        await writeFile(config.distdir + "/.token", "0.0");
    }
}
function createDataJson(items: CreateScreenPanel[]): DataJson {

    const resources = {}
    for (const i of items) {
        if (i.imageUrl) resources[i.imageUrl] = { type: MIME_TABLE[path.extname(i.imageUrl).substring(1)] }
        if (i.coverImageUrl) resources[i.coverImageUrl] = { type: MIME_TABLE[path.extname(i.coverImageUrl).substring(1)] }
    }

    return {
        "meta": {
            version: "1.1.0"
        },
        "entities": {
            "room": {},
            "items": Object.fromEntries(items.map((x) => {
                const { id, ...rest } = x;
                return [id ?? nanoid(20), rest]
            })),
            "decks": {},
            "notes": {},
            "characters": {},
            "effects": {},
            "scenes": {}
        },
        resources: resources
    }

}

async function importDefault(filename: string) {
    try {
        return (await import(filename)).default
    } catch (e) {
        return;
    }
}

// データソースを読み込みます。
async function loadData(basepath: string): Promise<any[]> {
    const a = await importDefault(basepath + ".data.js") ?? await readJSON(basepath + ".data.json")
    if (a) return a;
    const csvText = await readFile(basepath + ".data.csv", "utf8")
    const csv = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true
    }).data
    return csv
}

// 画像ソースを読み込みます
async function loadJSX(basepath: string): Promise<ImageInput | undefined> {
    const jsx = await readFileText(basepath + ".jsx")
    if (jsx) return { type: "jsx", value: jsx }
    const svg = await readFileText(basepath + ".svg")
    if (svg) return { type: "svg", value: svg }

    async function readImage(basepath: string, ext: string): Promise<ImageInput | undefined> {
        const data = await readFileBuffer(basepath + "." + ext)
        if (!data) return;
        const hash = await digest(data)
        return {
            type: "file",
            filename: hash + "." + ext,
            value: data
        }
    }

    return await readImage(basepath, "png") ?? await readImage(basepath, "jpg") ?? await readImage(basepath, "gif") ?? await readImage(basepath, "webp")
}





// SVGを生成します。
async function satoriJSX(jsx: Function, data: any, config) {
    const { fonts, graphemeImages } = await preprocessFont(config)

    config.satoriOptions ??= {};
    config.satoriOptions.fonts = fonts;
    config.satoriOptions.graphemeImages = graphemeImages

    const ele = jsx.prototype.render();

    data._width ??= config.width
    data._height ??= config.height
    data._ccfoliaWidth ??= config.ccfoliaWidth
    data._ccfoliaHeight ??= config.ccfoliaHeight


    // if( !ele.props.style.width && ele.props.ccw )ele.props.style.width = ele.props.ccw * 24
    // if( !ele.props.style.height && ele.props.cch )ele.props.style.height = ele.props.cch * 24
    //console.log(config.satoriOptions)
    const c = {
        ...config.satoriOptions,
        width: typeof data._width === 'number' ? data._width * 24 : data._width,
        height: typeof data._height === 'number' ? data._height * 24 : data._height
    }
    return await satori(ele, c);
}


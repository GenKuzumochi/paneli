import * as fs from 'fs'
import * as path from 'path';
import satori from "satori";
import { load } from './loader.js';
import { Command } from 'commander';
import { zipAction } from './zip.js';
import { copyFile, mkdir, readdir, stat, writeFile } from 'fs/promises';
import { readJSON } from './utils/util.js';
import { merge } from 'lodash-es';
const __dirname = new URL(import.meta.url).pathname;

const program = new Command();

program
  .name('paneri')
  .description('Ccfolia Screen Panel Generator')
  .version('0.0.1');

program.command("get")

program.command('noto')
  .description("Google FontからNotoSansJPを./fontsにダウンロードします。")
  .action(() => {
    fs.mkdirSync("fonts",{recursive:true})
    fetch("http://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75vY0rw-oME.ttf").then( x=>x.arrayBuffer()).then(x => writeFile("./fonts/0_NotoSansJP.ttf",new Uint8Array(x)))
  })

program.command('build <srcdir>')
  .description('パネルデータを生成します')
  .option('-d, --dist <distdir>', "生成したデータのディレクトリ(デフォルト temp/<srcdir>)")
  .option('-t, --temp <tempdir>', "一時ファイルディレクトリ", "./temp")
  .option('-r, --removedist', "distディレクトリを削除します", true)
  .action((srcdir, options) => {
    options.dist ??= "temp/" + srcdir
    if(options.removedist) fs.rmSync(options.dist, { recursive: true, force: true })
    load(srcdir, options.dist)
  });

program.command("merge <srcdir>")
  .option('-d, --dist <distdir>', "生成したデータのディレクトリ(デフォルト <srcdir>.merged)")
  .description('マージします')
  .action((srcdir, opt) => {
    mergeRooms(srcdir,opt.dist ?? srcdir + ".merged")
  });

program.command("zip <srcdir>")
  .description("ZIPを生成します")
  .option("-d, --dist <distfile>", "生成するZIPファイルの位置")
  .action(async (srcdir, opt) => {
    console.log("opt",opt)
    await zipAction(srcdir, opt.dist)
  })

  program.command("clean")
  .description("一時ファイルを削除します")
  .option("-d, --dist <distfile>", "生成するZIPファイルの位置","./temp")
  .option("-t, --temp <tempdir>", "一時ファイルディレクトリ", "./temp")
  .action(async (opt) => {
    fs.rmSync(opt.dist, { recursive: true, force: true })
    fs.rmSync(opt.temp, { recursive: true, force: true })
  })

program.parse();

export async function mergeRooms(srcdir: string, distdir: string) {
  const files = await readdir(srcdir)
  console.log(`Merging ${srcdir} (${files.join(",")}) to ${distdir}`)
  await mkdir(path.resolve(distdir), { recursive: true })
  let data;
  for (const f of files) {
      if (f.endsWith("__cache")) continue;
      if (f.endsWith("__temp")) continue;
      if (f.endsWith(".zip")) continue;
      const p = path.resolve(srcdir, f)
      const s = await stat(p);
      if (!s.isDirectory()) continue;
      for (const x of await readdir(p)) {
          const xf = path.resolve(p, x)
          if (x === ".token") continue;
          if (x === "__data.json") {
              if (!data) data = await readJSON(xf)
              else data = merge(data, await readJSON(xf))
          }
          copyFile(xf, path.resolve(distdir, x))
      }
  }
  await writeFile(path.resolve(distdir, "__data.json"), JSON.stringify(data))
  await writeFile(path.resolve(distdir, ".token"), "0.0")
}
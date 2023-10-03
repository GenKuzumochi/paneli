# How to use
ココフォリア用のスクリーンパネルを生成するツールです。

## Supports
Linuxのみ動作確認しています。(WSL含む)

## 準備
npmでも動作しますが、Bunでも挙動確認しています。
https://bun.sh/

```
$ bun install
$ bun src/index.ts build adt-cards
$ bun src/index.ts merge temp/adt-cards
$ bun src/index.ts zip temp/adt-cards.merged
```

コマンドの内容等は変更になる可能性があります。

---

同類のカードごとに.config.jsを作成→ディレクトリをマージ→zip化の流れで一つのスクリーンパネルZIPを生成する流れになります。

/adt-cards
* card.config.js
* joker.config.js
* joker2.config.js

# (1) .config.js読み込み
```
{
    width: 4,   // 生成時の横幅
    height: 6,  // 生成時の高さ
    x: 0,       // 生成時のxのデフォルト
    y: 0,       // 生成時のyのデフォルト
    z: 0,       // 生成時のzのデフォルト
    ccfoliaWidth: 2, // ココフォリアの横幅
    ccfoliaHeight: 3, // ココフォリアの高さ
    data: [{test:"aa"},{test:"bbb"}}],   // データ
    image: "",
    outputType: "png",
    preprocess: x=>x, // 入力データを処理する
    presatori: x=>x,  // satori直前
    postprocess: x=>x, 
    postsvg: x=>x, // SVG生成後
    fonts: [{

    }]
    satoriOptions: {} // Vercel/satoriのオプション
}
```

sample.config.jsというファイル名があった場合、「sample」を以下basenameと呼びます。

## width, height
生成する画像のサイズを指定します。  
Hint: PNGにする場合、ココフォリアのサイズより大きくしないとジャギが目立ちます。

### 整数の場合
整数を指定した場合、ココフォリアの1マスとして扱います。
ココフォリアでは24pxを1マスとして扱っています。それに合わせてwidthやheightがnumber型の場合はn=n*24pxと変換されます。

### 文字列
CSSのサイズとして扱います。
"1em"や"30px"等を指定できます。

## ccfoliaWidth, ccfoliaHeight
ココフォリア上に配置する際のサイズを指定します。1=24pxです。
widthやheightと異なり、文字列等を指定することはできません。

## data
処理のもととなるデータソースとして、配列を指定します。関数が指定された場合、その戻り値がデータソースとなります。

### デフォルト
1. config.jsにdataフィールドがある場合、そちらが優先されます。
2. dataフィールドが存在しない場合、自動的にファイルを検索して読み込みます。
    1. basename.data.js 読み込んで戻り値をデータソースとします。
    2. basename.data.json JSONとして値を解釈し、データソースとします。
    3. basename.data.csv CSVとして値を解釈し、データソースとします。1行目をデータフィールドとします。

## 2. preprocess
データソースを変換します。戻り値はflatMapされます。

`dataSource.flatMap(preprocess)`

### デフォルト
何も変換しません。
（x=>xを指定したのと同様です。）

### 関数
`(record:Object,config:Config) => Object|Object[]`

## 3. image
以下のオブジェクト、またはオブジェクトを返す関数を指定します。


### デフォルト
以下のような順序で読み込みます。
1. basename.jsx // JSXとして解釈されます
1. basename.svg
1. basename.png
1. basename.jpg
1. basename.gif
1. basename.webp

### オブジェクト

```typescript
string | {
    type: "jsx" | "svg" | "file",
    value: string | React.FC,
} | {
    type: "jsx" | "svg" | "file",
    file: string
}
```

---
type: jsx
JSXを指定します。

type: svg, png, jpg
それぞれの拡張子の画像を指定します。

拡張子付きのfile、または、適切なMIME typeが指定されている場合は省略可能です。
こちらの指定が優先されます。

---
valueかfileのどちらかを指定します。両方指定するとエラー。

value:
値を直接指定します。JSX、SVGは文字列で直接指定できます。画像の場合はdataURLを指定できます。
Functional Componentでも構いません。

file:
ローカルファイル。または、http://かhttps://から始まるURL
UTF-8以外は許容されません。

---

関数を指定する場合：
data 各リソースのオブジェクト
config このconfigファイル

戻り値として、imageオブジェクトを返します。Promiseである場合は解決されます。



## 4. 裏面
imageと同様です。デフォルトでは、basename.cover.jsxのように、.coverを追加したものを読み込みます。

## 5. outputType
出力の種類

"svg" | "png"

### デフォルト
"png"


## fonts
satori/vercelでは以下のように定義されています。
```
export interface FontOptions {
  data: Buffer | ArrayBuffer
  name: string
  weight?: Weight
  style?: Style
  lang?: string
}
```

dataに以下のものを指定できます。
1. ローカルファイル
2. httpかhttpsから始まる場合はダウンロードします。
   * https://github.com/から始まる場合、rawを補おうとします

### 自動読み込み
fontsディレクトリにあるものを以下のように解釈します。config.jsの同nameが優先されます。
`1_test.ttf`
```
{
    data: 中身,
    name: "test"
}
```

## graphemeImages 
```
{
    "🌍":"https://ja.wikipedia.org/static/images/icons/wikipedia.png",
    "♡":"https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f92f.svg"
}
```

satoriと違い、指定されたURLをダウンロードし、dataURLに変換し埋め込みます。（ローカルファイルは指定できません。)

### デフォルト
以下のディレクトリから自動で絵文字を読み込みます。emojis→basename.emojis→graphemeImagesの順に優先されます。
* /emojis
* /<basename>.emojis 

★.svgというファイル名があった場合、以下のように解釈されます。

```
{
    "★": "data:～"
}
```


## postsvg
`(src:string) => string`

生成されたSVGデータを変換します。戻り値はstringで返します。



# dataオブジェクトの特別処理
_から始まるデータは、生成時用に予約されています。

_x _y _z _angle _ccfoliaWidth _width _ccfoliaHeight _height _locked _active _memo _imageUrl _coverImageUrl それぞれスクリーンパネルのフィールドを表します。
_file 指定された固定画像を使用します。絶対パス or config.jsからの相対パス or URLを指定します。

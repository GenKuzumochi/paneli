export default {
    "width": 4,
    "height": 6,
    "ccfoliaWidth": 2,
    "ccfoliaHeight": 3,
    "outputType": "svg",
    "z": 50,
    preprocess: (x, config) => ({ ...x, z:50, dist: x.num + ".svg" }),
    prestori: (x, config) => ({ ...x, }),
    postprocess: (c, config) => ({ ...c })
}
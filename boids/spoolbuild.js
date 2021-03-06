const CAMERA_ROTATION_SPEED = 0.05,
    CAMERA_FOLLOW_SPEED = 0.4,
    CAMERA_SCALE_SPEED = 0.02,
    CAMERA_MINIMAL_SCALE = 0.5,
    CAMERA_MAXIMAL_SCALE = 1,
    CAMERA_MAXIMAL_SCALE_HANDLEVEL = 35;
var Client = (e) => {
        var t = {
            keyToConstructor: {},
            spoolKeyToConstructor: {
                SPL_POINT: { const: Point },
                SPL_LINE: { const: Line },
                SPL_RECT: { const: Rectangle },
            },
            onMouseEvent: (e) => {},
            onKeyEvent: (e) => {},
            lastTime: 0,
            frameCounter: 0,
            chunkSize: 1e3,
            FPS: 60,
            pureLocalClient: !1,
            updateOnLoop: !1,
            serverSideLoading: !1,
            clientSideLoading: !1,
            ...e,
        };
        return (
            (t.frameTime = 1e3 / t.FPS),
            (t.clientId = void 0),
            (t.clientObject = void 0),
            (t.width = window.innerWidth),
            (t.height = window.innerHeight),
            (t.gameArea = GameArea(t.width, t.height)),
            (t.camera = Camera({
                width: t.width,
                height: t.height,
                canvasWidth: t.width,
                canvasHeight: t.height,
            })),
            (t.handler = ClientHandler(t.chunkSize, t, t.pureLocalClient)),
            (t.uiHandler = SpoolUIHandler()),
            (t.objectServer = ClientObjectServer(t)),
            (t.socketInit = () => {
                t.pureLocalClient &&
                    console.warn(
                        "You've set the pureLocalClient flag to true, but are initializing sockets."
                    ),
                    (t.socket = io()),
                    t.socket.on(MessageCodes.SM_PACK_INIT, (e) => {
                        for (key in (e.resetHandler &&
                            (t.handler.reset(), (t.clientObject = void 0)),
                        e))
                            if ("resetHandler" != key) {
                                var r = void 0;
                                if (
                                    (key in t.keyToConstructor
                                        ? (r = t.keyToConstructor[key])
                                        : key in t.spoolKeyToConstructor &&
                                          (r = t.spoolKeyToConstructor[key]),
                                    r)
                                )
                                    for (var o = 0; o < e[key].length; o++) {
                                        r.const ||
                                            console.warn(
                                                `Spool: ${key} has invalid constructor function`
                                            );
                                        var n = r.const({
                                            ...r.defs,
                                            ...e[key][o],
                                        });
                                        n ||
                                            console.error(
                                                `Object ${key} doesn't return anything, check if constructor returns self.`
                                            ),
                                            (n.clientInstance = t),
                                            t.handler.add(n);
                                    }
                                else
                                    console.error(
                                        `Object ${key} doesn't have a constructor`
                                    );
                            }
                        t.firstInit ||
                            (t.onFirstLoad && t.onFirstLoad(t),
                            (t.firstInit = !0));
                    }),
                    t.socket.on(MessageCodes.SM_RESET, (e) => {
                        t.client.handler.reset();
                    }),
                    t.socket.on(MessageCodes.ASIGN_CLIENT_ID, (e) => {
                        (t.clientId = e.clientId),
                            (t.clientObjectFingerprint = e.clientObject);
                    }),
                    t.socket.on(MessageCodes.SERVER_LOADING, (e) => {
                        console.log(e),
                            (t.serverSideLoading = e.loading),
                            (t.serverSideLoadingData = e);
                    }),
                    t.socket.on(MessageCodes.SM_PACK_UPDATE, (e) => {
                        t.handler.update(e),
                            t.camera.update(),
                            t.clientId &&
                                !t.clientObject &&
                                ((t.clientObject = t.handler.getObject(
                                    t.clientObjectFingerprint.objectType,
                                    t.clientObjectFingerprint.id
                                )),
                                (t.camera.followObject = t.clientObject),
                                t.onClientObjectAssigned &&
                                    t.onClientObjectAssigned(t.clientObject));
                    }),
                    t.socket.on(MessageCodes.SM_PACK_REMOVE, (e) => {
                        console.log(), t.handler.removeBulk(e);
                    }),
                    t.objectServer.init(t.socket);
            }),
            (t.emit = (e, r) => {
                t.socket.emit(e, r);
            }),
            (t.startGameLoop = () => {
                (t.lastMillisTimer = Date.now()),
                    (t.lastMillis = Date.now()),
                    (t.lastFrameTime = Date.now()),
                    t.loop();
            }),
            (t.render = () => {
                try {
                    t.background && t.background(t.gameArea.ctx, t.camera),
                        t.preHandler && t.preHandler(t.gameArea.ctx, t.camera),
                        t.handler.render(t.gameArea.ctx, t.camera),
                        t.postHandler &&
                            t.postHandler(t.gameArea.ctx, t.camera),
                        t.uiHandler && t.uiHandler.render(t.gameArea.ctx),
                        t.postUi && t.postUi(t.gameArea.ctx, t.camera);
                } catch (e) {
                    console.error(e.stack);
                }
            }),
            (t.loop = () => {
                let e = Date.now();
                if (e - t.lastFrameTime >= t.frameTime) {
                    t.lastFrameTime;
                    (t.lastFrameTime = e),
                        t.gameArea.clear(),
                        t.loopUpdateCall &&
                            (t.handler.update(), t.camera.update()),
                        t.render(),
                        Date.now() - t.lastMillisTimer >= 1e3
                            ? ((t.frameCounter = 0),
                              (t.lastMillisTimer = Date.now()))
                            : (t.frameCounter += 1);
                }
                setTimeout(t.loop);
            }),
            (t.initResizeListener = () => {
                window.onresize = (e) => {
                    (t.width = window.innerWidth),
                        (t.height = window.innerHeight),
                        t.gameArea.resize(t.width, t.height),
                        (t.camera.width = t.width),
                        (t.camera.height = t.height);
                };
            }),
            t
        );
    },
    GameArea = (e = 500, t = 500) => {
        var r = {};
        return (
            (r.canvas = document.createElement("CANVAS")),
            (r.resize = (e, t) => {
                (r.width = e),
                    (r.height = t),
                    (r.canvas.width = e),
                    (r.canvas.height = t);
            }),
            r.resize(e, t),
            document.body.appendChild(r.canvas),
            (r.canvas.oncontextmenu = function (e) {
                e.preventDefault();
            }),
            (r.ctx = r.canvas.getContext("2d")),
            (SpoolRenderer.ctx = r.ctx),
            (SpoolRenderer.camera = r.camera),
            (r.clear = () => {
                r.ctx.clearRect(0, 0, r.canvas.width, r.canvas.height),
                    r.renderBackground();
            }),
            (r.renderBackground = () => {
                r.ctx.beginPath(),
                    r.ctx.rect(0, 0, r.canvas.width, r.canvas.height),
                    (r.ctx.fillStyle = "white"),
                    r.ctx.fill();
            }),
            r
        );
    },
    TextureManager = (e, t) => {
        var r = {
            spriteSheetInitObject: e,
            objectSheetInitObject: t,
            spriteSheets: {},
            objectSheets: {},
            onLoad: null,
            loadCounter: 0,
            targetLoad: 0,
            chunkBlankSize: 500,
            chunkBlankImage: null,
            load: () => {
                r.textures = {};
                var e = Object.keys(r.spriteSheetInitObject);
                (r.targetLoad = e.length),
                    e.forEach((e) => {
                        var t = new Image();
                        (t.onload = () => {
                            var o = (S = document.createElement(
                                    "canvas"
                                )).getContext("2d"),
                                n = r.spriteSheetInitObject[e].r
                                    ? r.spriteSheetInitObject[e].r
                                    : 1,
                                a = r.spriteSheetInitObject[e].c
                                    ? r.spriteSheetInitObject[e].c
                                    : 1,
                                i = t.width / a,
                                l = t.height / n;
                            (S.width = i), (S.height = l);
                            for (var s = [], c = [], h = 0; h < n; h++)
                                for (var d = 0; d < a; d++) {
                                    o.clearRect(0, 0, i, l),
                                        (o.imageSmoothingEnabled = !1),
                                        o.drawImage(
                                            t,
                                            d * i,
                                            h * l,
                                            i,
                                            l,
                                            0,
                                            0,
                                            i,
                                            l
                                        );
                                    var u = new Image();
                                    (u.src = S.toDataURL("image/png")),
                                        s.push(u);
                                    for (
                                        var p = new Image(),
                                            y = o.getImageData(
                                                0,
                                                0,
                                                S.width,
                                                S.height
                                            ),
                                            g = y.data,
                                            m = [],
                                            v = S.height - 1;
                                        v > -1;
                                        v--
                                    ) {
                                        for (
                                            var f = [], x = 0;
                                            x < S.width;
                                            x++
                                        )
                                            f.push(
                                                0,
                                                0,
                                                0,
                                                g[v * S.width * 4 + 4 * x + 3] /
                                                    2
                                            );
                                        m.push(...f);
                                    }
                                    for (var b = 0, k = g.length; b < k; b++)
                                        g[b] = m[b];
                                    o.putImageData(y, 0, 0),
                                        (p.src = S.toDataURL("image/png")),
                                        c.push(p);
                                }
                            (r.spriteSheets[e] = {
                                title: e,
                                textureMap: t,
                                rows: n,
                                columns: a,
                                sprites: s,
                                shadowSprites: c,
                            }),
                                (r.loadCounter += 1),
                                r.loadCounter >= r.targetLoad &&
                                    r.onLoad &&
                                    r.prepareChunkImage();
                            var S;
                            o = (S = document.createElement(
                                "canvas"
                            )).getContext("2d");
                        }),
                            (t.src = r.spriteSheetInitObject[e].src);
                    });
            },
            getSubSpriteSheet: (e, t, o, n, a) => {
                var i = n - t + 1,
                    l = a - o + 1,
                    s = [],
                    c = [],
                    h = r.spriteSheets[e];
                if (!h)
                    return (
                        console.error(`${e} is not in the texture manager`),
                        null
                    );
                for (var d = o; d <= a; d++)
                    for (var u = t; u <= n; u++) {
                        var p = d * h.columns + u;
                        s.push(h.sprites[p]), c.push(h.shadowSprites[p]);
                    }
                return {
                    textureMap: h.textureMap,
                    rows: l,
                    columns: i,
                    sprites: s,
                    shadowSprites: c,
                };
            },
            getSprite: (e, t = 0, o = 0) =>
                r.spriteSheets[e]
                    ? r.spriteSheets[e].sprites[
                          o * r.spriteSheets[e].columns + t
                      ]
                    : (console.error(
                          `@TextureManager: ${e} is not in spritesheets`
                      ),
                      null),
            getSprites: (e) =>
                r.spriteSheets[e]
                    ? r.spriteSheets[e].sprites
                    : (console.error(
                          `@TextureManager: ${e} is not in spritesheets`
                      ),
                      null),
            prepareChunkImage: () => {
                var e = document.createElement("canvas");
                e.getContext("2d");
                (e.width = r.chunkBlankSize), (e.height = r.chunkBlankSize);
                var t = new Image();
                (t.src = e.toDataURL("image/png")),
                    (r.chunkBlankImage = t),
                    r.prepareObjectSheets();
            },
            prepareObjectSheets: () => {
                r.objectSheetInitObject ||
                    console.error("Spool: Invalid objectSheetInitObject");
                var e = Object.keys(r.objectSheetInitObject);
                (r.targetLoad = e.length),
                    e.forEach((e) => {
                        var o = t[e],
                            n = r.spriteSheets[o.src],
                            a = SpoolMath.numberDefined(o.x) ? o.x : 0,
                            i = SpoolMath.numberDefined(o.y) ? o.y : 0,
                            l = SpoolMath.numberDefined(o.xx)
                                ? o.xx
                                : n.columns - 1,
                            s = SpoolMath.numberDefined(o.yy)
                                ? o.yy
                                : n.rows - 1,
                            c = l - a + 1,
                            h = s - i + 1;
                        o.variantBox &&
                            ((c = o.variantBox.c), (h = o.variantBox.r));
                        for (var d = [], u = i; u <= s; u += h)
                            for (var p = a; p <= l; p += c) {
                                var y = r.getSubSpriteSheet(
                                    o.src,
                                    p,
                                    u,
                                    p + c - 1,
                                    u + h - 1
                                );
                                (y.title = e), d.push(y);
                            }
                        r.objectSheets[e] = d;
                    }),
                    r.onLoad();
            },
            textureObj: (e) => {
                var t = r.objectSheets[e.objectType];
                if (t) {
                    tid = e.textureId ? e.textureId : 0;
                    var o = t[SpoolMath.randomInt(0, t.length - 1)];
                    (e.sprite = o.sprites[tid % o.sprites.length]),
                        (e.shadowSprite =
                            o.shadowSprites[tid % o.sprites.length]),
                        (e.texture = o);
                } else
                    "SPL_CHUNK" == e.objectType &&
                        (e.sprite = r.chunkBlankImage);
            },
            resizeSprite: (e, t, r, o) => {
                var n = document.createElement("canvas"),
                    a = n.getContext("2d");
                (n.width = t),
                    (n.height = r),
                    (a.imageSmoothingEnabled = !1),
                    a.drawImage(e, 0, 0, t, r);
                var i = new Image();
                (i.src = n.toDataURL("image/png")),
                    (i.onload = () => {
                        o(i);
                    });
            },
            resizeSprites: (e, t, r, o) => {
                (t && r) ||
                    console.warn(
                        "@textureManager resizedSprite: Width and height error"
                    );
                for (var n = 0, a = [], i = e.length; i--; ) a.push(1);
                var l = 0,
                    s = document.createElement("canvas"),
                    c = s.getContext("2d");
                (s.width = t),
                    (s.height = r),
                    e.forEach((i) => {
                        c.clearRect(0, 0, t, r),
                            (c.imageSmoothingEnabled = !1),
                            c.drawImage(i, 0, 0, t, r);
                        var h = new Image();
                        (h.posInList = n),
                            (h.src = s.toDataURL("image/png")),
                            (h.onload = (t) => {
                                (a[t.target.posInList] = h),
                                    (l += 1) == e.length && o(a);
                            }),
                            n++;
                    });
            },
            bakeIn: (e, t, r, o, n = null) => {
                var a = document.createElement("canvas"),
                    i = a.getContext("2d");
                (a.width = e.width),
                    (a.height = e.height),
                    (i.imageSmoothingEnabled = !1),
                    i.drawImage(e, 0, 0),
                    i.drawImage(t, r.x, r.y, r.width, r.height);
                var l = new Image();
                (l.src = a.toDataURL("image/png")),
                    (l.onload = () => {
                        o(l, n);
                    });
            },
            bakeBatch: (e, t, r, o) => {
                var n = document.createElement("canvas"),
                    a = n.getContext("2d");
                (n.width = e.width),
                    (n.height = e.height),
                    (a.imageSmoothingEnabled = !1),
                    a.drawImage(e, 0, 0),
                    t.forEach((e) => {
                        a.drawImage(
                            e.bakedTexture,
                            e.dBounds.x,
                            e.dBounds.y,
                            e.dBounds.width,
                            e.dBounds.height
                        );
                    });
                var i = new Image();
                (i.src = n.toDataURL("image/png")),
                    (i.onload = () => {
                        r(i, o);
                    });
            },
        };
        return r;
    };
cameraContainsEntity = (e, t) => {
    let r = ({ x: x, y: y, width: width, height: height } = e.transformBounds(
        t.x,
        t.y,
        2 * t.radius,
        2 * t.radius
    ));
    return (
        0 <= r.x + r.width / 2 &&
        r.x - r.width / 2 <= e.width * e.scale &&
        0 <= r.y + r.height / 2 &&
        r.y - r.height / 2 <= e.height * e.scale
    );
};
var Grid = () => {
        var e = {
            rowGap: 200,
            columnGap: 200,
            render: (t, r) => {
                for (
                    var o = r.x - r.width * CAMERA.scale,
                        n = r.y - r.width * CAMERA.scale;
                    o < (r.x + r.width) / CAMERA.scale;

                ) {
                    var a = r.y - r.width,
                        i = r.y + r.width,
                        l = o + (-r.x % e.columnGap),
                        s = o + (-r.x % e.columnGap);
                    let n = ({ x: x, y: y } = r.transformPoint(l, a));
                    (l = n.x), (a = n.y);
                    let c = ({ x: x, y: y } = r.transformPoint(s, i));
                    (s = c.x),
                        (i = c.y),
                        t.beginPath(),
                        t.moveTo(l, a),
                        (t.strokeStyle = "gray"),
                        (t.lineWidth = 1),
                        t.lineTo(s, i),
                        t.stroke(),
                        (o += e.columnGap);
                }
                for (; n < (r.y + r.width) / CAMERA.scale; ) {
                    var c = n + (-r.y % e.rowGap),
                        h = n + (-r.y % e.rowGap),
                        d = r.x - r.width,
                        u = r.x + r.width;
                    let o = ({ x: x, y: y } = r.transformPoint(d, c));
                    (d = o.x), (c = o.y);
                    let a = ({ x: x, y: y } = r.transformPoint(u, h));
                    (u = a.x),
                        (h = a.y),
                        t.beginPath(),
                        t.moveTo(d, c),
                        (t.strokeStyle = "gray"),
                        t.lineTo(u, h),
                        t.stroke(),
                        (n += e.rowGap);
                }
            },
        };
        return e;
    },
    ObjectRadar = (e, t, r, o) => {
        var n = {
            handler: e,
            camera: t,
            objectType: r,
            radius: o,
            render: (e) => {
                if (t.followObject && n.objectType in n.handler.objects) {
                    var o = n.handler.objects[r];
                    for (id in o) {
                        if (id == t.followObject.id) continue;
                        var a = o[id];
                        if (cameraContainsEntity(t, a)) continue;
                        var i =
                            2 * Math.PI -
                            SpoolMath.objGlobalAngle(t.followObject, a) +
                            t.rotation;
                        e.fillStyle = a.color;
                        let r = ({ x: x, y: y } = SpoolMath.polarPoint(
                            (t.width / 2) * t.scale,
                            (t.height / 2) * t.scale,
                            200,
                            i
                        ));
                        var l = r.x,
                            s = r.y;
                        let n = ({ x: x, y: y } = SpoolMath.polarPoint(
                                r.x,
                                r.y,
                                20,
                                i + (3 * Math.PI) / 4
                            )),
                            c = ({ x: x, y: y } = SpoolMath.polarPoint(
                                l,
                                s,
                                20,
                                i + (5 * Math.PI) / 4
                            ));
                        e.beginPath(),
                            e.moveTo(r.x, r.y),
                            e.lineTo(n.x, n.y),
                            e.lineTo(c.x, c.y),
                            e.closePath(),
                            e.fill();
                    }
                }
            },
        };
        return n;
    },
    ClientObjectServer = (e, t = []) => {
        var r = {
            client: e,
            objects: {},
            init: () => {
                r.client.socket.on(MessageCodes.OS_SEND_OBJ, (e) => {
                    r.add(e);
                });
            },
            load: (e) => {
                r.client.socket.emit(MessageCodes.OS_GET_OBJ, e);
            },
            getObject: (e) => {
                var t = e.objectType,
                    o = e.id,
                    n = r.objects[t];
                if (n) {
                    var a = n[o];
                    if (a) return a;
                }
                return null;
            },
            add: (e) => {
                e.objectType in r.objects || (r.objects[e.objectType] = {}),
                    r.objects[e.objectType][e.id]
                        ? Object.assign(r.objects[e.objectType][e.id], e)
                        : (r.objects[e.objectType][e.id] = e);
            },
            remove: (e, t) => {
                e in r.objects && delete r.objects[e][t];
            },
        };
        return r;
    },
    ClientHandler = (e, t, r = !1) => {
        var o = Handler({
                client: t,
                chunkSize: e,
                chunkConstructor: ClientChunk,
            }),
            n = { add: o.add };
        return (
            r ||
                (o.update = (e) => {
                    for (key in e)
                        if (o.objects[key])
                            for (var t = 0; t < e[key].length; t++) {
                                var r = e[key][t];
                                if (o.objects[key][r.id]) {
                                    var n = { ...r };
                                    delete n.id,
                                        o.objects[key][r.id].update(n),
                                        o.updateObjectsChunk(
                                            o.objects[key][r.id]
                                        );
                                }
                            }
                }),
            (o.onChunkCreated = (e) => {
                o.textureManager && o.textureManager.textureObj(e);
            }),
            (o.render = (e, t) => {
                var r = Math.floor((t.x - t.width / 2 - 100) / o.chunkSize),
                    n = Math.floor((t.y - t.height / 2 - 100) / o.chunkSize),
                    a = Math.floor((t.x + t.width / 2 + 100) / o.chunkSize),
                    i = Math.floor((t.y + t.height / 2 + 100) / o.chunkSize),
                    l = o.getChunks(r, n, a, i),
                    s = {},
                    c = {};
                for (chunkKey in l) {
                    var h = l[chunkKey],
                        d = h.objects;
                    if (h.sprite) {
                        var u = t.transformBounds(
                            h.x * o.chunkSize,
                            (h.y + 1) * o.chunkSize,
                            o.chunkSize,
                            o.chunkSize
                        );
                        e.drawImage(h.sprite, u.x, u.y, u.width, u.height);
                    }
                    for (key in d)
                        for (id in d[key]) {
                            var p = h.objects[key][id];
                            if (p.bakeIn) {
                                if (!p.bakedIn || !p.bakedIn.includes(h.key)) {
                                    var y = p.getRenderBounds(),
                                        g = h.sprite.width / o.chunkSize,
                                        m = h.sprite.height / o.chunkSize,
                                        v = {
                                            bakedTexture: p.sprite,
                                            dBounds: {
                                                x:
                                                    (y.x - h.x * o.chunkSize) *
                                                    g,
                                                y:
                                                    (o.chunkSize -
                                                        (y.y -
                                                            h.y * o.chunkSize) -
                                                        y.height) *
                                                    m,
                                                width: y.width * g,
                                                height: y.height * m,
                                            },
                                            attributes: { obj: p, chunk: h },
                                            callback: (e, t, r) => {
                                                (e.attributes.chunk.sprite = t),
                                                    (e.attributes.obj.bakedIn = !0);
                                            },
                                        },
                                        f = h.key;
                                    f in c || (c[f] = {}),
                                        p.layer in c[f] || (c[f][p.layer] = []),
                                        c[f][p.layer].push(v);
                                }
                            } else
                                p.layer in s
                                    ? (s[p.layer][id] = p)
                                    : (s[p.layer] = { id: p });
                        }
                }
                for (key in c)
                    if (key in o.chunks) {
                        var x = [],
                            b = [];
                        Object.keys(c[key])
                            .sort((e, t) => parseInt(e) - parseInt(t))
                            .forEach((e) => {
                                c[key][e].forEach((e) => {
                                    x.push({
                                        bakedTexture: e.bakedTexture,
                                        dBounds: e.dBounds,
                                    }),
                                        b.push(e.attributes.obj);
                                });
                            }),
                            (callback = (e, t) => {
                                (o.chunks[t.key].sprite = e),
                                    b.forEach((e) => {
                                        e.bakedIn
                                            ? e.bakedIn.push(t.key)
                                            : (e.bakedIn = [t.key]);
                                    });
                            }),
                            o.textureManager.bakeBatch(
                                o.chunks[key].sprite,
                                x,
                                callback,
                                { key: key }
                            );
                    } else console.warn("invalid chunk added to baking:", key);
                Object.keys(s)
                    .sort((e, t) => parseInt(e) - parseInt(t))
                    .forEach((r) => {
                        Object.keys(s[r])
                            .sort((e, t) => s[r][t].y - s[r][e].y)
                            .forEach((o) => {
                                s[r][o].render(e, t);
                            });
                    });
            }),
            (o.preBake = () => {
                var e = o.chunks,
                    t = {};
                for (chunkKey in e) {
                    var r = e[chunkKey],
                        n = r.objects;
                    for (key in n)
                        for (id in n[key]) {
                            var a = r.objects[key][id];
                            if (
                                (o.updateObjectsChunk(a),
                                a.bakeIn &&
                                    (!a.bakedIn || !a.bakedIn.includes(r.key)))
                            ) {
                                var i = a.getRenderBounds(),
                                    l = r.sprite.width / o.chunkSize,
                                    s = r.sprite.height / o.chunkSize,
                                    c = {
                                        bakedTexture: a.sprite,
                                        dBounds: {
                                            x: (i.x - r.x * o.chunkSize) * l,
                                            y:
                                                (o.chunkSize -
                                                    (i.y - r.y * o.chunkSize) -
                                                    i.height) *
                                                s,
                                            width: i.width * l,
                                            height: i.height * s,
                                        },
                                        callback: (e, t) => {
                                            (t.chunk.sprite = e),
                                                (t.obj.bakedIn = !0);
                                        },
                                        attributes: { obj: a, chunk: r },
                                    },
                                    h = r.key;
                                h in t || (t[h] = {}),
                                    a.layer in t[h] || (t[h][a.layer] = []),
                                    t[h][a.layer].push(c);
                            }
                        }
                }
                for (key in t)
                    if (key in o.chunks) {
                        var d = [],
                            u = [];
                        Object.keys(t[key])
                            .sort((e, t) => parseInt(e) - parseInt(t))
                            .forEach((e) => {
                                t[key][e].forEach((e) => {
                                    d.push({
                                        bakedTexture: e.bakedTexture,
                                        dBounds: e.dBounds,
                                    }),
                                        u.push(e.attributes.obj);
                                });
                            }),
                            (callback = (e, t) => {
                                (o.chunks[t.key].sprite = e),
                                    t.waitingList.forEach((e) => {
                                        e.bakedIn
                                            ? e.bakedIn.push(t.key)
                                            : (e.bakedIn = [t.key]);
                                    });
                            }),
                            o.textureManager.bakeBatch(
                                o.chunks[key].sprite,
                                d,
                                callback,
                                { key: key, waitingList: u }
                            );
                    } else console.warn("invalid chunk added to baking");
            }),
            (o.add = (e) => {
                n.add(e), o.textureManager && o.textureManager.textureObj(e);
            }),
            (o.removeBulk = (e) => {
                for (key in e)
                    if (key in o.objects)
                        for (var t = 0; t < e[key].length; t++)
                            e[key][t] in o.objects[key] &&
                                o.remove(o.objects[key][e[key][t]]);
            }),
            (o.reset = () => {
                var r = {
                    objects: {},
                    objectsById: {},
                    chunks: {},
                    client: t,
                    chunkSize: e,
                };
                Object.keys(r).forEach((e) => {
                    delete o.key;
                }),
                    Object.assign(o, r);
            }),
            o
        );
    },
    ClientChunk = (e, t) => {
        return Chunk({ objectType: "SPL_CHUNK", ...e }, t);
    },
    Camera = (e = {}) => {
        var t = {
            x: 0,
            y: 0,
            rotation: 0,
            width: 0,
            height: 0,
            canvasWidth: 0,
            canvasHeight: 0,
            scaleX: 1,
            scaleY: 1,
            followSpeed: 0.4,
            rotationSpeed: 0.05,
            followObject: null,
            offsetX: 0,
            offsetY: 0,
            ...e,
            update: () => {
                if (t.followObject) {
                    if (
                        (t.lerpRotation &&
                            (t.rotation = SpoolMath.lerpRotation(
                                t.rotation,
                                t.followObject.rotation - Math.PI / 2,
                                t.rotationSpeed
                            )),
                        t.lerpSpeedToScale)
                    )
                        t.followObject.velocity && t.followObject.velocity;
                    (t.width = t.canvasWidth / t.scaleX),
                        (t.height = t.canvasHeight / t.scaleY),
                        t.lerp &&
                            ((t.x = SpoolMath.lerp(
                                t.x,
                                t.followObject.x + t.offsetX,
                                t.followSpeed
                            )),
                            (t.y = SpoolMath.lerp(
                                t.y,
                                t.followObject.y + t.offsetY,
                                t.followSpeed
                            )));
                } else
                    t.followObject &&
                        ((t.x = t.followObject.x + t.offsetX),
                        (t.y = t.followObject.y + t.offsetY));
                t.onUpdate && t.onUpdate(t);
            },
            transformBounds: (e, r, o, n) => {
                let a = ({ x: e, y: r } = t.transformPoint(e, r));
                return {
                    x: a.x,
                    y: a.y,
                    width: o * t.scaleX,
                    height: n * t.scaleY,
                };
            },
            transformPoint: (e, r) => {
                var o = Math.sin(t.rotation),
                    n = Math.cos(t.rotation);
                return {
                    x:
                        t.scaleX *
                        ((e - t.x) * n - (-r + t.y) * o + t.width / 2),
                    y:
                        t.scaleY *
                        ((e - t.x) * o + (-r + t.y) * n + t.height / 2),
                };
            },
            transformDimension: (e) => t.scaleX * e,
            clickTransfer: (e, r) => {
                var o = SpoolMath.distance(e, r, t.width / 2, t.height / 2),
                    n =
                        t.rotation +
                        Math.atan2(r - t.height / 2, e - t.width / 2);
                return { x: t.x + Math.cos(n) * o, y: t.y + Math.sin(n) * o };
            },
            inverseTransformPoint: (e, r) => {
                var o = Math.sin(t.rotation),
                    n = Math.cos(t.rotation),
                    a =
                        t.y -
                        (-o * (e / t.scaleX - t.width / 2) +
                            n * (r / t.scaleY - t.height / 2));
                return {
                    x:
                        n * (e / t.scaleX - t.width / 2) +
                        o * (r / t.scaleY - t.height / 2) +
                        t.x,
                    y: a,
                };
            },
            setFollowObject: (e) => {
                e && ((t.followObject = e), (t.angle = e.angle));
            },
        };
        return t;
    },
    ClientEntity = (e, t = null) => {
        var r = {
            x: 0,
            y: 0,
            rotation: 0,
            radius: 10,
            color: "red",
            layer: 10,
            animationCounter: 0,
            animationTime: 0,
            animationFrame: 0,
            animationSize: 0,
            ...e,
        };
        if (t) var o = t(r);
        else o = r;
        return (
            (o.update = (e) => {
                Object.assign(o, e);
            }),
            (o.render = (e, t) => {
                o.renderOval(e, t);
            }),
            (o.renderOval = (e, t, r = o.color) => {
                e.fillStyle = r;
                var n = t.transformBounds(o.x, o.y, o.width, o.height);
                SpoolRenderer.fillInscribedOval(
                    SpoolRect(
                        n.x - n.width / 2,
                        n.y - n.height / 2,
                        n.width,
                        n.height
                    )
                );
            }),
            (o.renderNtagon = (e, t, r, n, a = 0, i = o.color) => {
                (e.fillStyle = i), e.beginPath();
                var l = t.transformBounds(o.x, o.y, n, n),
                    s = l.width;
                e.moveTo(l.x - s * Math.cos(a), l.y - s * Math.sin(a));
                for (var c = 1; c < r; c++)
                    (angle = a + ((2 * Math.PI) / r) * c),
                        e.lineTo(
                            l.x - s * Math.cos(angle),
                            l.y - s * Math.sin(angle)
                        );
                e.closePath(), e.fill();
            }),
            (o.renderRectangle = (e, t, r = o.color) => {
                var n = t.transformBounds(o.x, o.y, o.width, o.height);
                e.beginPath(),
                    (e.lineWidth = "1"),
                    e.rect(
                        Math.floor(n.x - n.width / 2),
                        Math.floor(n.y - n.height / 2),
                        n.width,
                        n.height
                    ),
                    (e.fillStyle = r),
                    e.fill();
            }),
            (o.renderSprite = (e, t, r = o.sprite, n = null) => {
                if (r) {
                    var a;
                    if (n) a = n;
                    else {
                        var i = o.width,
                            l = o.height,
                            s = o.x,
                            c = o.y;
                        o.clientWidth && (i = o.clientWidth),
                            o.clientHeight && (l = o.clientHeight);
                        var h = t.transformBounds(s, c, i, l),
                            d = o.width / 2,
                            u = o.height / 2;
                        o.clientOffsetX && (d = o.clientOffsetX),
                            o.clientOffsetY && (u = o.clientOffsetY);
                        var p = t.transformBounds(s, c, d, u);
                        (e.imageSmoothingEnabled = !1),
                            (a = {
                                x: h.x - p.width,
                                y: h.y - p.height,
                                width: h.width,
                                height: h.height,
                            });
                    }
                    return (
                        e.drawImage(r, a.x, a.y, a.width, a.height),
                        o.showBounds && o.renderRectangle(e, t, o.color),
                        a
                    );
                }
                return o.renderRectangle(e, t, "violet"), null;
            }),
            (o.renderRotatedSprite = (e, t, r, o, n, a, i) => {
                e.save();
                var l = t.transformPoint(r, o);
                e.translate(l.x, l.y),
                    e.rotate(n),
                    e.drawImage(a, i.x, i.y, i.width, i.height),
                    e.restore();
            }),
            (o.getMovementAnimationSpriteIndex = (
                e = o.moving,
                t = o.movementAngle
            ) => {
                var r = o.texture.rows - 1;
                if (e) {
                    var n = t;
                    n < 0 && (n += 2 * Math.PI),
                        (n = n / Math.PI / 2 + 1 / r / 2) < 0 && (n += 1),
                        (n %= 1);
                    var a = (Math.floor(n * r) % r) + 1;
                } else a = 0;
                return a * o.texture.columns + o.animationFrame;
            }),
            (o.renderMovementAnimation = (e, t, r = null) => {
                if (r) var n = r;
                else n = o.getMovementAnimationSpriteIndex();
                return (
                    o.animationCounter == o.animationTime
                        ? (o.texture &&
                              ((o.animationFrame += 1),
                              o.animationFrame == o.texture.columns &&
                                  (o.animationFrame = 0)),
                          (o.animationCounter = 0))
                        : (o.animationCounter += 1),
                    [o.renderSprite(e, t, o.texture.sprites[n]), n]
                );
            }),
            (o.getRenderBounds = (e = null) => {
                if (e) {
                    (s = o.width), (c = o.height);
                    var t = o.x,
                        r = o.y;
                    o.clientWidth && (s = o.clientWidth),
                        o.clientHeight && (c = o.clientHeight);
                    (l = e.transformBounds(t, r, s, c)),
                        (a = o.width / 2),
                        (i = o.height / 2);
                    o.clientOffsetX && (a = o.clientOffsetX),
                        o.clientOffsetY && (i = o.clientOffsetY);
                    var n = e.transformBounds(t, r, a, i);
                    return (
                        (ctx.imageSmoothingEnabled = !1),
                        (finalBounds = {
                            x: l.x - n.width,
                            y: l.y - n.height,
                            width: l.width,
                            height: l.height,
                        }),
                        finalBounds
                    );
                }
                var a = o.width / 2,
                    i = o.height / 2;
                o.clientOffsetX && (a = o.clientOffsetX),
                    o.clientOffsetY && (i = o.clientOffsetY);
                var l,
                    s = o.width,
                    c = o.height;
                return (
                    o.clientWidth && (s = o.clientWidth),
                    o.clientHeight && (c = o.clientHeight),
                    (l = { x: o.x - a, y: o.y - i, width: s, height: c })
                );
            }),
            o
        );
    },
    RectangleEntity = (e) => {
        var t = ClientEntity(e);
        return (
            (t.render = (e, r) => {
                t.renderRectangle(e, r);
            }),
            t
        );
    },
    SpriteEntity = (e) => {
        var t = ClientEntity(e);
        return (
            (t.render = (e, r) => {
                t.renderSprite(e, r);
            }),
            t
        );
    },
    MovementAnimationEntity = (e) => {
        var t = ClientEntity({ ...e, animationTime: 5 });
        return (
            (t.render = (e, r) => {
                t.renderMovementAnimation(e, r);
            }),
            t
        );
    },
    Point = (e) => {
        var t = {
            x: 0,
            y: 0,
            xx: 0,
            yy: 0,
            color: "green",
            ...e,
            update: (e) => {
                Object.assign(t, e);
            },
            render: (e, r) => {
                (e.fillStyle = t.color), e.beginPath();
                let { x: o, y: n, width: a } = r.transformBounds(
                    t.x,
                    t.y,
                    3,
                    3
                );
                e.arc(o, n, a, 0, 360), e.stroke();
            },
        };
        return t;
    },
    Line = (e) => {
        var t = Entity({ x: 0, y: 0, xx: 0, yy: 0, color: "green", ...e });
        return (
            (t.render = (e, r) => {
                let o = r.transformPoint(t.x, t.y);
                var n = r.transformPoint(t.xx, t.yy);
                (e.strokeStyle = t.color),
                    e.beginPath(),
                    e.moveTo(o.x, o.y),
                    e.lineTo(n.x, n.y),
                    e.stroke();
            }),
            t
        );
    },
    Rectangle = (e) => {
        var t = {
            x: 0,
            y: 0,
            xx: 0,
            yy: 0,
            color: "green",
            ...e,
            update: (e) => {
                Object.assign(t, e);
            },
            render: (e, r) => {
                let o = r.transformPoint(t.x, t.y);
                var n = r.transformPoint(t.xx, t.yy);
                e.beginPath(),
                    (e.lineWidth = "1"),
                    e.rect(o.x, o.y, n.x - o.x, n.y - o.y),
                    t.fill
                        ? ((e.fillStyle = t.color), e.fill())
                        : ((e.strokeStyle = t.color), e.stroke());
            },
        };
        return t;
    },
    KeyboardListener = (e, t) => {
        var r = {
            client: e,
            keyListeners: {
                65: {
                    inputMessage: MessageCodes.KI_MOV_LEFT,
                    parameter: "pressedLeft",
                },
                87: {
                    inputMessage: MessageCodes.KI_MOV_UP,
                    parameter: "pressedUp",
                },
                68: {
                    inputMessage: MessageCodes.KI_MOV_RIGHT,
                    parameter: "pressedRight",
                },
                83: {
                    inputMessage: MessageCodes.KI_MOV_DOWN,
                    parameter: "pressedDown",
                },
            },
            additionalKeyListeners: {},
            activeTypes: ["keydown", "keyup"],
            ...t,
        };
        return (
            (r.handleKeyDown = r.activeTypes.includes("keydown")),
            (r.handleKeyUp = r.activeTypes.includes("keyup")),
            Object.assign(r.keyListeners, r.additionalKeyListeners),
            (r.onEvent = (e, t) => {
                e.keyCode in r.keyListeners &&
                    ((listener = r.keyListeners[e.keyCode]),
                    r.client.pureLocalClient
                        ? r.client.clientObject &&
                          (r.client.clientObject[listener.parameter] = t)
                        : r.client.socket.emit(MessageCodes.SM_KEY_PRESS, {
                              inputId: listener.inputMessage,
                              value: t,
                          }));
            }),
            (r.initListener = () => {
                (document.onkeydown = (e) => {
                    r.handleKeyDown && r.onEvent(e, !0),
                        r.onKeyDown && r.onKeyDown(e);
                }),
                    (document.onkeyup = (e) => {
                        r.handleKeyUp && r.onEvent(e, !1),
                            r.onKeyUp && r.onKeyUp(e);
                    });
            }),
            r
        );
    },
    MouseListener = (e, t) => {
        var r = {
            client: e,
            mouseCoordTransformation: null,
            activeButtons: [0, 2],
            activeTypes: ["mousedown", "mouseup"],
            ...t,
            onMouseButtonEvent: (t, o, n) => {
                r.client.uiHandler.mouseEvent(t) ||
                    (r.gamePlaneMouseButtonEvent(t, o, n),
                    r.client.onMouseEvent(t, e));
            },
            gamePlaneMouseButtonEvent: (t, o, n) => {
                if (
                    r.activeButtons.includes(t.button) &&
                    r.activeTypes.includes(t.type)
                ) {
                    var a =
                        "mousedown" == t.type || ("mouseup" != t.type && null);
                    if (null === a)
                        return void console.error(
                            "@MouseListener, event value is null"
                        );
                    r.client.pureLocalClient
                        ? e.clientObject.mouseEventInWorld &&
                          e.clientObject.mouseEventInWorld(o, n, a)
                        : r.client.socket.emit(MessageCodes.SM_MOUSE_INPUT, {
                              x: o,
                              y: n,
                              value: a,
                              type: t.type,
                          });
                }
            },
            initListener: () => {
                (document.onmousedown = (e) => {
                    var t = e.clientX,
                        o = e.clientY;
                    if (r.mouseCoordTransformation) {
                        var n = r.mouseCoordTransformation(t, o);
                        (t = n.x), (o = n.y);
                    }
                    r.onMouseDown && r.onMouseDown(e, t, o),
                        r.onMouseButtonEvent(e, t, o);
                }),
                    (document.onmouseup = (e) => {
                        var t = e.clientX,
                            o = e.clientY;
                        if (r.mouseCoordTransformation) {
                            var n = r.mouseCoordTransformation(t, o);
                            (t = n.x), (o = n.y);
                        }
                        r.onMouseUp && r.onMouseUp(e, t, o),
                            r.onMouseButtonEvent(e, t, o);
                    }),
                    (document.onmousemove = (e) => {
                        r.client.onMouseMove && r.client.onMouseMove(e),
                            r.client.uiHandler.mouseMove(e);
                    });
            },
        };
        return r;
    };
var Chunk = (e, t) => {
        var r = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            handler: t,
            objects: {},
            ...e,
            add: (e) => {
                e.objectType in r.objects || (r.objects[e.objectType] = {}),
                    (r.objects[e.objectType][e.id] = e);
            },
            removeSignature: (e, t) => {
                e in r.objects && delete r.objects[e][t];
            },
            remove: (e) => {
                r.removeSignature(e.objectType, e.id);
            },
            getClosestObject: (e, t, o) => {
                var n = null;
                for (key in r.objects)
                    if (!o || !o.whitelist || o.whitelist.includes(key))
                        for (id in r.objects[key]) {
                            var a = r.objects[key][id],
                                i = SpoolMath.distance(e, t, a.x, a.y);
                            (!n || i < n.distance) &&
                                (n = { object: a, distance: i });
                        }
                return n;
            },
        };
        return r;
    },
    Handler = (e = {}) => {
        var t = {
            objectsById: {},
            objects: {},
            chunks: {},
            staticKeys: [],
            preManagers: [],
            managers: [],
            chunkSize: 300,
            chunkConstructor: Chunk,
            ...e,
            resetObjects: () => {
                Object.assign(t, { objectsById: {}, objects: {}, chunks: {} });
            },
            updateObjectsChunk: (e) => {
                var r = !1,
                    o = Math.floor((e.x - e.width / 2) / t.chunkSize),
                    n = Math.floor((e.y - e.height / 2) / t.chunkSize),
                    a = Math.floor((e.x + e.width / 2) / t.chunkSize),
                    i = Math.floor((e.y + e.height / 2) / t.chunkSize);
                if (e.chunks)
                    if (0 == e.chunks.length) r = !0;
                    else {
                        if (
                            o == e.chunksX &&
                            n == e.chunksY &&
                            a == e.chunksXX &&
                            i == e.chunksYY
                        )
                            return;
                        (r = !0),
                            e.chunks.forEach((t) => {
                                t.remove(e);
                            });
                    }
                else r = !0;
                if (
                    r &&
                    ((e.chunksX = o),
                    (e.chunksY = n),
                    (e.chunksXX = a),
                    (e.chunksYY = i),
                    (e.chunks = []),
                    r)
                )
                    for (var l = o; l < a + 1; l++)
                        for (var s = n; s < i + 1; s++) {
                            var c = `[${l};${s}]`,
                                h = void 0;
                            c in t.chunks
                                ? (h = t.chunks[c])
                                : ((h = t.chunkConstructor(
                                      {
                                          x: l,
                                          y: s,
                                          width: t.chunkSize,
                                          height: t.chunkSize,
                                          key: c,
                                          color: SpoolMath.randomHsvColor(
                                              0.5,
                                              0.8
                                          ),
                                      },
                                      t
                                  )),
                                  (t.chunks[c] = h),
                                  t.onChunkCreated && t.onChunkCreated(h)),
                                h.add(e),
                                e.chunks.push(h),
                                (e.chunkColor = h.color);
                        }
            },
            update: () => {
                for (key in t.objects)
                    if (!t.staticKeys.includes(key)) {
                        var e = t.objects[key];
                        for (objKey in e) {
                            var r = e[objKey];
                            if (!r.static) {
                                for (var o = 0; o < t.preManagers.length; o++)
                                    t.preManagers[o].update(r);
                                r.update(), t.updateObjectsChunk(r);
                                for (o = 0; o < t.managers.length; o++)
                                    t.managers[o].update(r);
                            }
                        }
                    }
                for (o = 0; o < t.managers.length; o++)
                    t.managers[o].handlerUpdate &&
                        t.managers[o].handlerUpdate();
            },
            add: (e) => {
                e.objectType in t.objects || (t.objects[e.objectType] = {}),
                    (t.objects[e.objectType][e.id] = e),
                    (t.objectsById[e.id] = e),
                    t.updateObjectsChunk(e);
            },
            removeSignature: (e, r) => {
                e in t.objects &&
                    (t.objects[e][r] &&
                        t.objects[e][r].chunks &&
                        t.objects[e][r].chunks.forEach((o) => {
                            o.remove(t.objects[e][r]);
                        }),
                    delete t.objects[e][r]),
                    delete t.objectsById[r];
            },
            remove: (e) => {
                t.removeSignature(e.objectType, e.id);
            },
            emptyObjectType: (e) => {
                if (e in t.objects) {
                    var r = t.objects[e];
                    Object.keys(r).forEach((r) => {
                        t.remove(e, r);
                    });
                }
            },
            getObject: (e, r) =>
                t.objects[e] && t.objects[e][r] ? t.objects[e][r] : null,
            getClosestObject: (e, r, o) => {
                var n = Math.floor(e / t.chunkSize),
                    a = Math.floor(r / t.chunkSize),
                    i = null;
                if (
                    (t.getChunks(n, a, n, a).forEach((t) => {
                        var n = t.getClosestObject(e, r, o);
                        n && (!i || n.distance < i.distance) && (i = n);
                    }),
                    !i)
                )
                    for (key in t.chunks) {
                        var l = t.chunks[key].getClosestObject(e, r, o);
                        l && (!i || l.distance < i.distance) && (i = l);
                    }
                return i;
            },
            addManager: (e) => {
                t.managers.push(e);
            },
            addPreManager: (e) => {
                t.preManagers.push(e);
            },
            getChunks: (e, r, o, n) => {
                result = [];
                for (var a = e; a <= o; a++)
                    for (var i = r; i <= n; i++) {
                        var l = `[${a};${i}]`;
                        l in t.chunks && result.push(t.chunks[l]);
                    }
                return result;
            },
        };
        return t;
    },
    CollisionManager = (e, t) => {
        var r = { handler: t, ...e };
        return (
            r.colPairs.forEach((e) => {
                e.a.forEach((t) => {
                    e.b.forEach((o) => {
                        r.colPairs.push({
                            a: t,
                            b: o,
                            func: e.func,
                            exception: e.exception,
                            solid: void 0 === e.solid || e.solid,
                            solidException: e.solidException,
                        });
                    });
                });
            }),
            (r.getNeededChunks = (e) => {
                if (e.x > e.px)
                    var t = e.px - e.width / 2,
                        o = e.x + e.width / 2;
                else (t = e.x - e.width / 2), (o = e.px + e.width / 2);
                if (e.y > e.py)
                    var n = e.py - e.height / 2,
                        a = e.y + e.height / 2;
                else (n = e.y - e.height / 2), (a = e.py + e.height / 2);
                return r.handler.getChunks(
                    Math.floor(t / r.handler.chunkSize),
                    Math.floor(n / r.handler.chunkSize),
                    Math.floor(o / r.handler.chunkSize),
                    Math.floor(a / r.handler.chunkSize)
                );
            }),
            (r.update = (e) => {
                var o = e.objectType;
                if (o in t.objects)
                    for (var n = 0; n < r.colPairs.length; n++) {
                        var a = r.colPairs[n].a,
                            i = r.colPairs[n].harsh;
                        if (o == a)
                            for (
                                var l = r.colPairs[n].b,
                                    s = r.getNeededChunks(e),
                                    c = 0;
                                c < s.length;
                                c++
                            ) {
                                var h = s[c];
                                if (l in h.objects)
                                    for (bKey in h.objects[l]) {
                                        var d = e,
                                            u = h.objects[l][bKey];
                                        if (
                                            !(
                                                (d.objectType == u.objectType &&
                                                    d.id == u.id) ||
                                                (r.colPairs[n].exception &&
                                                    r.colPairs[n].exception(
                                                        d,
                                                        u
                                                    ))
                                            )
                                        ) {
                                            if (
                                                "oval" == d.bodyType &&
                                                "oval" == u.bodyType
                                            )
                                                var p = r.objectOvalCollision;
                                            else p = r.objectRectCollision;
                                            var y = p(d, u, i);
                                            y &&
                                                y.result &&
                                                (r.colPairs[n].solid &&
                                                    y.point &&
                                                    ((r.colPairs[n]
                                                        .solidException &&
                                                        r.colPairs[
                                                            n
                                                        ].solidException(
                                                            d,
                                                            u
                                                        )) ||
                                                        ((d.x = Math.round(
                                                            y.point.x
                                                        )),
                                                        (d.y = Math.round(
                                                            y.point.y
                                                        )))),
                                                r.colPairs[n].func &&
                                                    r.colPairs[n].func(
                                                        d,
                                                        u,
                                                        y
                                                    ));
                                        }
                                    }
                            }
                    }
            }),
            (r.objectOvalCollision = (e, t) => {
                if (
                    ((aradius = Math.max(e.width, e.height) / 2),
                    (bradius = Math.max(t.width, t.height) / 2),
                    SpoolMath.distance(e.x, e.y, t.x, t.y) < aradius + bradius)
                ) {
                    var r,
                        o = parseInt(e.px),
                        n = parseInt(e.py),
                        a = parseInt(e.x),
                        i = parseInt(e.y),
                        l = bradius + aradius,
                        s = parseInt(t.x),
                        c = parseInt(t.y),
                        h = 0;
                    if (o != a) {
                        var d = (i - n) / (a - o),
                            u = n - o * d,
                            p = u - c,
                            y = d * d + 1,
                            g = p * p + s * s - l * l,
                            m =
                                (-(b = 2 * d * p - 2 * s) +
                                    (k = Math.sqrt(
                                        Math.pow(b, 2) - 4 * y * g
                                    ))) /
                                (2 * y),
                            v = (-b - k) / (2 * y),
                            f = d * m + u,
                            x = d * v + u;
                        SpoolMath.distance(m, f, o, n) <
                        SpoolMath.distance(v, x, o, n)
                            ? ((r = m), (h = f))
                            : ((r = v), (h = x));
                    } else {
                        var b,
                            k,
                            S = o;
                        (y = 1),
                            (g = c * c + s * s - l * l + S * S - 2 * s * S),
                            (f =
                                (-(b = -2 * c) +
                                    (k = Math.sqrt(b * b - 4 * y * g))) /
                                (2 * y)),
                            (x = (-b - k) / (2 * y));
                        SpoolMath.distance(S, f, o, n) <
                        SpoolMath.distance(S, x, o, n)
                            ? ((r = S), (h = f))
                            : ((r = S), (h = x));
                    }
                    return { result: !0, x: r, y: h };
                }
                return null;
            }),
            (r.objMovementLine = (e) => ({
                x: e.px,
                y: e.py,
                xx: e.x,
                yy: e.y,
            })),
            (r.objectRectCollision = (e, t, o = !1) => {
                var n = parseInt(t.x - t.width / 2 - e.width / 2),
                    a = parseInt(t.y - t.height / 2 - e.height / 2),
                    i = parseInt(t.x + t.width / 2 + e.width / 2),
                    l = parseInt(t.y + t.height / 2 + e.height / 2),
                    s = r.objMovementLine(e),
                    c = { result: n < e.x && e.x < i && a < e.y && e.y < l };
                if (
                    Math.abs(e.x - t.x) >= Math.abs(e.px - t.x) &&
                    Math.abs(e.y - t.y) >= Math.abs(e.py - t.y)
                )
                    return c;
                var h = [],
                    d = [
                        { x: n, y: a, xx: n, yy: l },
                        { x: i, y: a, xx: i, yy: l },
                        { x: n, y: l, xx: i, yy: l },
                        { x: n, y: a, xx: i, yy: a },
                    ],
                    u = ["right", "left", "bottom", "top"],
                    p = [
                        t.leftColIgnore,
                        t.rightColIgnore,
                        t.topColIgnore,
                        t.bottomColIgnore,
                    ],
                    y = 0;
                d.forEach((e) => {
                    if (p[y]) h.push(null);
                    else {
                        var t = r.lineIntersection(e, s);
                        t && (t.direction = u[y]), h.push(t);
                    }
                    y++;
                });
                var g = null,
                    m = null,
                    v = null;
                return (
                    (y = 0),
                    h.forEach((t) => {
                        if (t) {
                            var r = SpoolMath.distance(e.px, e.py, t.x, t.y);
                            (!m || r < m) && ((v = y), (m = r), (g = t));
                        }
                        y++;
                    }),
                    g
                        ? (v <= 1 ? (g.y = e.y) : (g.x = e.x),
                          (c.point = { x: g.x, y: g.y }),
                          (c.direction = g.direction),
                          c)
                        : (o && (c.point = { x: e.px, y: e.py }), c)
                );
            }),
            (r.lineIntersection = (e, t) => {
                var r = e.x,
                    o = e.xx,
                    n = e.y,
                    a = e.yy,
                    i = t.x,
                    l = t.xx,
                    s = t.y,
                    c = t.yy,
                    h = (r - o) * (s - c) - (n - a) * (i - l);
                if (0 == h) return null;
                var d =
                        ((r * a - n * o) * (i - l) -
                            (r - o) * (i * c - s * l)) /
                        h,
                    u =
                        ((r * a - n * o) * (s - c) -
                            (n - a) * (i * c - s * l)) /
                        h;
                return SpoolMath.inInterval(d, r, o, 2) &&
                    SpoolMath.inInterval(d, i, l, 2) &&
                    SpoolMath.inInterval(u, n, a, 2) &&
                    SpoolMath.inInterval(u, s, c, 2)
                    ? { x: d, y: u }
                    : null;
            }),
            r
        );
    },
    OuterWorldManager = (e, t) => {
        var r = {
            handler: e,
            validObjects: t,
            update: (e) => {
                if (
                    r.validObjects.includes(e.objectType) &&
                    e.objectType in r.handler.objects
                ) {
                    var t = SpoolMath.distance(e.x, e.y, 0, 0);
                    t > OUTER_EDGE
                        ? e.setAcc(
                              "outer-world",
                              t / 500,
                              SpoolMath.globalAngle(e.x, e.y, 0, 0)
                          )
                        : e.setAcc("outer-world", 0, 0);
                }
            },
        };
        return r;
    },
    GravityManager = (e, t) => {
        var r = {
            handler: t,
            gravityType: "homogenous",
            G: 2,
            colPairs: [],
            ...e,
            update: (e) => {
                "homogenous" == r.gravityType
                    ? r.homGravity(e)
                    : r.vecGravity(e);
            },
            vecGravity: (e) => {
                var o = e.objectType,
                    n = e.accelerations.gravity
                        ? e.accelerations.gravity.angle
                        : 0;
                if (
                    (e.setAcc("gravity", 0, n),
                    !e.ground && !e.gravityLock && o in t.objects)
                )
                    for (var a = 0; a < r.colPairs.length; a++) {
                        if (o == r.colPairs[a].a) {
                            var i = r.colPairs[a].b;
                            if (i in t.objects)
                                for (bKey in t.objects[i]) {
                                    var l = e,
                                        s = t.objects[i][bKey];
                                    SpoolMath.objDistance(l, s) <
                                        bradius * GRAVITY_RADIUS_COEF &&
                                        l.addToAcc(
                                            "gravity",
                                            r.objectGravity(l, s),
                                            SpoolMath.objGlobalAngle(l, s)
                                        );
                                }
                        }
                    }
                e.rotation = e.accelerations.gravity.angle + Math.PI;
            },
            objectGravity: (e, t) => {
                var o =
                    (r.G * e.mass * t.mass) /
                    Math.pow(SpoolMath.objDistance(e, t), GRAVITY_RADIUS_POW);
                return (gravity = o / e.mass);
            },
            homGravity: (e) => {
                e.gravityIgnore || e.setAcc("gravity", r.G, (Math.PI / 2) * 3);
            },
        };
        return r;
    },
    SpoolTimer = (e, t, r = null) => {
        var o = {
            startTime: Date.now(),
            duration: e,
            event: t,
            object: r,
            active: !0,
            timeLeft: 0,
            update: () => {
                (o.timeLeft = o.startTime + o.duration - Date.now()),
                    o.timeLeft < 0 && o.active && (o.event(r), (o.active = !1));
            },
            stop: () => {
                o.active = !1;
            },
        };
        return o;
    },
    ObjectSpawner = (e, t, r = {}) => {
        var o = {
            keyToConstAndDefs: t,
            handler: e,
            ...r,
            zones: {},
            zoneCounters: {},
            currentZoneMap: null,
            gx: 10,
            gy: 10,
            mapPxWidth: 0,
            mapPxHeight: 0,
            colTexturingMap: [
                [!0, !0, !0, !0],
                [!0, !1, !0, !1],
                [!1, !0, !1, !0],
                [!1, !0, !0, !0],
                [!0, !0, !1, !1],
                [!1, !0, !1, !1],
                [!1, !0, !0, !1],
                [!0, !1, !0, !0],
                [!0, !1, !1, !1],
                [!1, !1, !1, !1],
                [!1, !1, !0, !1],
                [!0, !0, !1, !0],
                [!0, !1, !1, !0],
                [!1, !1, !1, !0],
                [!1, !1, !0, !0],
                [!0, !0, !0, !1],
            ],
            reset: () => {
                Object.assign(o, { zones: {}, zoneCounters: {} });
            },
            spawn: (e, r, n) => {
                if (e in o.keyToConstAndDefs) {
                    var a = t[e],
                        i = a.const({ ...a.defs, x: r, y: n });
                    return o.handler.add(i), i;
                }
            },
            spawnInRadius: (e, r, n, a = 0, i = 0) => {
                if (e in o.keyToConstAndDefs)
                    for (var l = t[e], s = 0; s < r; s++) {
                        var c = Math.random() * Math.PI * 2,
                            h = Math.random() * n,
                            d = a + h * Math.cos(c),
                            u = i + h * Math.sin(c),
                            p = l.const({ ...l.defs, x: d, y: u });
                        o.handler.add(p);
                    }
            },
            spawnInRectangle: (e, r, n, a, i, l) => {
                if (e in o.keyToConstAndDefs)
                    for (var s = t[e], c = 0; c < r; c++) {
                        var h = n + i * Math.random(),
                            d = a + l * Math.random(),
                            u = s.const({ ...s.defs, x: h, y: d });
                        o.handler.add(u);
                    }
            },
            zoneStep: (e, t, r, n) => {
                if (o.currentZoneMap[t][e]) {
                    var a = o.currentZoneMap[t][e];
                    a.key == r.key &&
                        a.color == r.color &&
                        ((o.zoneMap[t][e][r.key] = n),
                        o.zones[r.key] || (o.zones[r.key] = {}),
                        o.zones[r.key][n] || (o.zones[r.key][n] = []),
                        o.zones[r.key][n].push([e, t]),
                        (o.currentZoneMap[t][e] = null),
                        o.zoneStep(e - 1, t, r, n),
                        o.zoneStep(e + 1, t, r, n),
                        o.zoneStep(e, t - 1, r, n),
                        o.zoneStep(e, t + 1, r, n));
                }
            },
            addZonesFromImageArray: (e, t, r) => {
                o.addZones(e[0], t, () => {
                    var n = e.slice(1);
                    0 == n.length ? r() : o.addZonesArray(n, t, r);
                });
            },
            addZonesFromImage: (e, t, r) => {
                FileReader.readImage(e, (e) => {
                    var n = [],
                        a = e.data;
                    if (!o.zoneMap) {
                        for (var i = [], l = 0; l < e.height; l++) {
                            for (var s = [], c = 0; c < e.width; c++)
                                s.push({});
                            i.push(s);
                        }
                        o.zoneMap = i;
                    }
                    for (l = 0; l < e.height; l++) {
                        var h = [];
                        for (c = 0; c < e.width; c++) {
                            var d = (l * e.width + c) * e.pixelSize,
                                u = a[d],
                                p = a[d + 1],
                                y = a[d + 2],
                                g = t[SpoolMath.rgbToHex(u, p, y)];
                            g
                                ? h.push({
                                      key: g,
                                      color: SpoolMath.rgbToHex(u, p, y),
                                  })
                                : h.push(null);
                        }
                        n.push(h);
                    }
                    (o.mapPxWidth = e.width), (o.mapPxHeight = e.height);
                    var m = o.zoneCounters;
                    o.currentZoneMap = n;
                    for (l = 0; l < o.currentZoneMap.length; l++)
                        for (c = 0; c < o.currentZoneMap[l].length; c++) {
                            var v = o.currentZoneMap[l][c];
                            v &&
                                (v.key in m || (m[v.key] = 0),
                                o.zoneStep(c, l, v, m[v.key]),
                                (m[v.key] += 1));
                        }
                    (o.zoneCounters = m), r && r();
                });
            },
            spawnFromKeyArray: (e, r = o.gx, n = o.gy, a = null) => {
                for (var i = 0; i < e.length; i++)
                    for (var l = 0; l < e[i].length; l++)
                        if (e[i][l]) {
                            var s = t[e[i][l]];
                            if (s) {
                                var c = {};
                                s.dependantConst &&
                                    (c = s.dependantConst(
                                        o,
                                        a ? a[i][l] : null
                                    ));
                                var h = s.const({
                                        ...s.defs,
                                        x: parseInt((l - e[i].length / 2) * r),
                                        y: parseInt((-i + e.length / 2) * n),
                                        gridX: l,
                                        gridY: i,
                                        ...c,
                                    }),
                                    d = [e[i][l]];
                                if (
                                    (s.gridColRemovalSiblings &&
                                        (d = [
                                            e[i][l],
                                            ...s.gridColRemovalSiblings,
                                        ]),
                                    h.gridColRemoval)
                                ) {
                                    l > 0 &&
                                        d.includes(e[i][l - 1]) &&
                                        (h.leftColIgnore = !0),
                                        l < e[i].length - 1 &&
                                            d.includes(e[i][l + 1]) &&
                                            (h.rightColIgnore = !0),
                                        i > 0 &&
                                            d.includes(e[i - 1][l]) &&
                                            (h.topColIgnore = !0),
                                        i < e.length - 1 &&
                                            d.includes(e[i + 1][l]) &&
                                            (h.bottomColIgnore = !0);
                                    var u = o.getColTextureId([
                                        !h.leftColIgnore,
                                        !h.topColIgnore,
                                        !h.rightColIgnore,
                                        !h.bottomColIgnore,
                                    ]);
                                    (h.textureId = u),
                                        h.onGridColRemoval &&
                                            h.onGridColRemoval();
                                }
                                o.zoneMap &&
                                    Object.keys(o.zoneMap[i][l]).forEach(
                                        (e) => {
                                            h.zones[e] = o.zoneMap[i][l][e];
                                        }
                                    ),
                                    o.handler.add(h);
                            }
                        }
            },
            getColTextureId: (e) => {
                for (var t = 0; t < o.colTexturingMap.length; t++) {
                    for (
                        var r = o.colTexturingMap[t], n = !1, a = 0;
                        a < e.length;
                        a++
                    )
                        if (r[a] !== e[a]) {
                            n = !0;
                            break;
                        }
                    if (!n) return t;
                }
                return 0;
            },
            spawnFromIndexMap: (e, t = o.gx, r, n = " ", a = "\r\n") => {
                FileReader.readFile(e, (e) => {
                    var i = [],
                        l = Object.keys(o.keyToConstAndDefs);
                    e.split(a).forEach((e) => {
                        var t = e.split(n);
                        xPointer = 0;
                        var r = [];
                        t.forEach((e) => {
                            o.keyToConstAndDefs[l[parseInt(e) - 1]]
                                ? r.push(l[parseInt(e) - 1])
                                : r.push(null);
                        }),
                            i.push(r);
                    }),
                        o.spawnFromKeyArray(i, t, r);
                });
            },
            spawnFromImageMap: (e, t, r, n = o.gx, a = o.gy) => {
                FileReader.readImage(e, (e) => {
                    for (
                        var i = [],
                            l = (Object.keys(o.keyToConstAndDefs), e.data),
                            s = t["non-black"],
                            c = [],
                            h = 0;
                        h < e.height;
                        h++
                    ) {
                        for (var d = [], u = [], p = 0; p < e.width; p++) {
                            var y = (h * e.width + p) * e.pixelSize,
                                g = l[y],
                                m = l[y + 1],
                                v = l[y + 2],
                                f = SpoolMath.rgbToHex(g, m, v),
                                x = t[f];
                            !s || x || (0 == g && 0 == m && 0 == v) || (x = s),
                                x ? d.push(x) : d.push(null),
                                u.push([g, m, v, f]);
                        }
                        i.push(d), c.push(u);
                    }
                    o.spawnFromKeyArray(i, n, a, c), r && r();
                });
            },
            spawnRPGWorld: (e, t, r = o.gx, n = o.gy) => {
                o.spawnFromImageMap(e.ground, t, r, n),
                    o.spawnFromImageMap(e.objects, t, r, n);
            },
            spawnInZone: (e, r, n, a = null) => {
                if (e in o.keyToConstAndDefs) {
                    var i = t[e];
                    if (o.zones[n])
                        for (var l = 0; l < r; l++) {
                            var s = a;
                            if (void 0 == s || null == s) {
                                var c = Object.keys(o.zones[n]);
                                s =
                                    c[
                                        Math.round(
                                            Math.random() * (c.length - 1)
                                        )
                                    ];
                            }
                            var h = o.zones[n][s];
                            if (h) {
                                var d =
                                        h[
                                            Math.round(
                                                Math.random() * (h.length - 1)
                                            )
                                        ],
                                    u =
                                        (d[0] - o.mapPxWidth / 2) * o.gx +
                                        Math.round(Math.random() * o.gx),
                                    p =
                                        (-d[1] + o.mapPxWidth / 2) * o.gy +
                                        Math.round(Math.random() * o.gy),
                                    y = i.const({ ...i.defs, x: u, y: p });
                                o.handler.add(y);
                            }
                        }
                } else
                    console.log(
                        "@ObjectSpawner: Object key is not in known by object spawner: " +
                            e
                    );
            },
            getRandomPositionInZone: (e, t = null) => {
                var r = t;
                if (!r) {
                    var n = Object.keys(o.zones[e]);
                    r = n[Math.round(Math.random() * (n.length - 1))];
                }
                var a = o.zones[e][r];
                if (a) {
                    var i = a[Math.round(Math.random() * (a.length - 1))];
                    return {
                        x:
                            (i[0] - o.mapPxWidth / 2) * o.gx +
                            Math.round(Math.random() * o.gx),
                        y:
                            (-i[1] + o.mapPxHeight / 2) * o.gy +
                            Math.round(Math.random() * o.gy),
                    };
                }
                return null;
            },
        };
        return o;
    },
    Entity = (e = {}, t = null) => {
        var r = {
            asyncUpdatePackage: {},
            asyncUpdateNeeded: !1,
            x: 0,
            y: 0,
            velX: 0,
            velY: 0,
            calculatedVelX: 0,
            calculatedVelY: 0,
            movementAngle: 0,
            rotation: 0,
            accelerations: {},
            velocities: {},
            chunks: [],
            chunksX: 0,
            chunksY: 0,
            chunksXX: 0,
            chunksYY: 0,
            color: "red",
            zones: {},
            ...GravityParameters,
            ...CollisionParameters,
            ...OvalBodyParameters,
            id: Math.random(),
            objectType: "BLANK_ENTITY",
            ...e,
        };
        if (t) var o = t(r);
        else o = r;
        return (
            (o.getEntityId = () => objectType + ":" + id),
            (o.update = () => {
                var e = !1;
                return (
                    o.updateVel(), (e |= o.updatePos()) ? o.updatePack() : null
                );
            }),
            (o.initPack = () => {
                var e = {};
                return (
                    void 0 !== o.textureId && (e.textureId = o.textureId),
                    {
                        ...o.updatePack(),
                        objectType: o.objectType,
                        width: o.width,
                        height: o.height,
                        bodyType: o.bodyType,
                        color: o.color,
                        ...e,
                    }
                );
            }),
            (o.updatePack = () => ({
                x: o.x,
                y: o.y,
                color: o.color,
                rotation: o.rotation,
                id: o.id,
                movementAngle: o.movementAngle,
                moving: o.moving,
                ...o.asyncUpdatePackage,
            })),
            (o.authorizedUpdatePack = () => null),
            (o.setAsyncUpdateValue = (e, t) => {
                (o.asyncUpdatePackage[e] = t), (o.asyncUpdateNeeded = !0);
            }),
            (o.addAsyncUpdatePackage = (e) => {
                Object.assign(o.asyncUpdatePackage, e),
                    (o.asyncUpdateNeeded = !0);
            }),
            (o.updatePos = () => {
                for (velKey in ((o.px = o.x),
                (o.py = o.y),
                (o.x += o.velX),
                (o.y += o.velY),
                (o.calculatedVelX = 0),
                (o.calculatedVelY = 0),
                o.velocities)) {
                    var e = o.velocities[velKey],
                        t = SpoolMath.coordVelsFromVel(e.vel, e.angle);
                    (o.x += t.x),
                        (o.y += t.y),
                        (o.calculatedVelX += t.x),
                        (o.calculatedVelY += t.y);
                }
                return o.px != o.x || o.py != o.y
                    ? ((o.movementAngle = SpoolMath.globalAngle(
                          o.px,
                          o.py,
                          o.x,
                          o.y
                      )),
                      (o.moving = !0),
                      !0)
                    : ((o.moving = !1), !0);
            }),
            (o.impulse = (e, t) => {
                var r = SpoolMath.coordVelsFromVel(e, t);
                (o.velX += r.x), (o.velY += r.y);
            }),
            (o.vectorImpulse = (e, t) => {
                (o.velX += e), (o.velY += t);
            }),
            (o.updateVel = () => {
                for (acckey in o.accelerations) {
                    var e = o.accelerations[acckey],
                        t = SpoolMath.coordVelsFromVel(e.acc, e.angle);
                    (o.velX += t.x), (o.velY += t.y);
                }
            }),
            (o.setAcc = (e, t, r) => {
                o.accelerations[e] = { acc: t, angle: r };
            }),
            (o.addToAcc = (e, t, r) => {
                var n = { ...o.accelerations[e] },
                    a = n.acc * Math.cos(n.angle) + t * Math.cos(r),
                    i = n.acc * Math.sin(n.angle) + t * Math.sin(r);
                (newAcc = Math.sqrt(a * a + i * i)),
                    (newAngle = Math.atan2(i, a)),
                    o.setAcc(e, newAcc, newAngle);
            }),
            (o.removeAcc = (e) => {
                delete o.accelerations[e];
            }),
            (o.setVel = (e, t, r) => {
                o.velocities[e] = { vel: t, angle: r };
            }),
            (o.setVelVector = (e, t) => {
                o.velocities[e] = {
                    vel: SpoolMath.distance(0, 0, t[0], t[1]),
                    angle: SpoolMath.globalAngle(0, 0, t[0], t[1]),
                };
            }),
            (o.removeVel = (e) => {
                delete o.velocities[e];
            }),
            (o.addToHandler = (e) => {
                e.add(o);
            }),
            (o.vectorFromVel = () => ({
                angle: Math.atan2(o.velY, o.velX),
                value: SpoolMath.distance(o.velX, o.velY, 0, 0),
            })),
            (o.vectorFromVels = (e, t) => ({
                angle: Math.atan2(t, e),
                value: SpoolMath.distance(e, t, 0, 0),
            })),
            o
        );
    },
    InputManager = () => {},
    KeyInputParameters = {
        pressedLeft: !1,
        pressedUp: !1,
        pressedRight: !1,
        pressedDown: !1,
    },
    GravityParameters = { mass: 1, gravityLock: !1 },
    CollisionParameters = { px: 0, py: 0 },
    OvalBodyParameters = { bodyType: "oval", width: 10, height: 10 },
    RectangleBodyParameters = { bodyType: "rect", width: 10, height: 10 };
try {
    module.exports = {
        Handler: Handler,
        Chunk: Chunk,
        CollisionManager: CollisionManager,
        GravityManager: GravityManager,
        OuterWorldManager: OuterWorldManager,
        InputManager: InputManager,
        ObjectSpawner: ObjectSpawner,
        Entity: Entity,
        KeyInputParameters: KeyInputParameters,
        GravityParameters: GravityParameters,
        CollisionParameters: CollisionParameters,
        OvalBodyParameters: OvalBodyParameters,
        RectangleBodyParameters: RectangleBodyParameters,
        SpoolTimer: SpoolTimer,
        SpoolMath: SpoolMath,
        SpoolUtils: SpoolUtils,
        Perlin: Perlin,
    };
} catch (e) {
    "undefined" == typeof module
        ? console.log(
              "Modules are not present, you are probably on client, make sure this script is included before the files that require it"
          )
        : console.error(e);
}
const SpoolMath = {
    coordVelsFromVel: (e, t) => ({ x: Math.cos(t) * e, y: Math.sin(t) * e }),
    globalAngle: (e, t, r, o) => Math.atan2(o - t, r - e),
    objGlobalAngle: (e, t) => this.globalAngle(e.x, e.y, t.x, t.y),
    angleDistance: (e, t) => {
        var r = (t - e) % (2 * Math.PI);
        return r > 0
            ? r > Math.PI
                ? -(2 * Math.PI - r)
                : r
            : r < -Math.PI
            ? -(-2 * Math.PI - r)
            : r;
    },
    distance: (e, t, r, o) =>
        Math.sqrt(Math.pow(r - e, 2) + Math.pow(o - t, 2)),
    objDistance: (e, t) =>
        Math.sqrt(Math.pow(e.x - t.x, 2) + Math.pow(e.y - t.y, 2)),
    polarPoint: (e, t, r, o) => ({
        x: e + r * Math.cos(o),
        y: t + r * Math.sin(o),
    }),
    rotatePoint: (e, t, r, o, n) => {
        var a = Math.sin(n),
            i = Math.cos(n);
        return { x: (e -= r) * i - (t -= o) * a + r, y: e * a + t * i + o };
    },
    rotatePoints: (e, t, r, o) => {
        for (
            var n = Math.sin(o), a = Math.cos(o), i = [], l = 0;
            l < e.length;
            l++
        ) {
            var s = e[l][0] - t,
                c = e[l][1] - r;
            i.push([s * a - c * n + t, s * n + c * a + r]);
        }
        return i;
    },
    transformPoints: (e, t, r) => {
        for (var o = [], n = 0; n < e.length; n++)
            o.push([e[n][0] + t, e[n][1] + r]);
        return o;
    },
    randomColor: (e, t) =>
        `rgb(${Math.floor(Math.random() * (t - e) + e)},${Math.floor(
            Math.random() * (t - e) + e
        )},${Math.floor(Math.random() * (t - e) + e)})`,
    randomHsvColor: (e, t) => SpoolMath.HSVtoColor(Math.random(), e, t),
    HSVtoColor: (e, t, r) => {
        let { r: o, g: n, b: a } = SpoolMath.HSVtoRGB(e, t, r);
        return `rgb(${o}, ${n}, ${a})`;
    },
    HSVtoRGB: (e, t = null, r = null) => {
        var o, n, a, i, l, s, c, h;
        switch (
            (!e || t || r || ((t = e.s), (r = e.v), (e = e.h)),
            (s = r * (1 - t)),
            (c = r * (1 - (l = 6 * e - (i = Math.floor(6 * e))) * t)),
            (h = r * (1 - (1 - l) * t)),
            i % 6)
        ) {
            case 0:
                (o = r), (n = h), (a = s);
                break;
            case 1:
                (o = c), (n = r), (a = s);
                break;
            case 2:
                (o = s), (n = r), (a = h);
                break;
            case 3:
                (o = s), (n = c), (a = r);
                break;
            case 4:
                (o = h), (n = s), (a = r);
                break;
            case 5:
                (o = r), (n = s), (a = c);
        }
        return {
            r: Math.round(255 * o),
            g: Math.round(255 * n),
            b: Math.round(255 * a),
        };
    },
    lerp: (e, t, r) => e + (t - e) * (r = r > 1 ? 1 : r < 0 ? 0 : r),
    lerpRotation: (e, t, r) => {
        return (
            e +
            (((((((t - e) % (2 * Math.PI)) + (Math.PI / 180) * 540) %
                (2 * Math.PI)) -
                Math.PI) *
                r) %
                (2 * Math.PI))
        );
    },
    randomInt: (e, t) => e + Math.round(Math.random() * (t - e)),
    randomChoice: (e) =>
        0 == e.length ? null : e[SpoolMath.randomInt(0, e.length - 1)],
    toHex: (e) => {
        var t = Number(e).toString(16);
        return t.length < 2 && (t = "0" + t), t;
    },
    rgbToHex: (e, t, r) =>
        SpoolMath.toHex(e) + SpoolMath.toHex(t) + SpoolMath.toHex(r),
    divideColor: (e, t) => {
        elements = e.substring(4).split(",");
        for (var r = 0; r < elements.length; r++)
            elements[r] = parseInt(parseInt(elements[r]) / t);
        return SpoolMath.rgbToHex(elements[0], elements[1], elements[2]);
    },
    inInterval: (e, t, r, o = 0) => {
        if (t < r)
            var n = t,
                a = r;
        else (n = r), (a = t);
        return n - o <= e && e <= a + o;
    },
    numberDefined: (e) => void 0 !== e && null !== e,
    getYFromCircle: (e, t) => {
        if (e <= t && e >= -t)
            var r = Math.sqrt(Math.pow(t, 2) - Math.pow(e, 2));
        return -r;
    },
    getYFromMovedCircle: (e, t, r, o) => (
        (movY = SpoolMath.getYFromCircle(r, o) + t),
        (movX = r + e),
        (pos = [movX, movY]),
        pos
    ),
    getAngleFromCircle: (e, t) => {
        return Math.acos(t / e) - Math.PI / 2;
    },
    rectangleMouseCollision: (e, t, r, o, n, a) =>
        n >= e && n <= e + r && a <= t && a >= t - o,
    rotatePoint: (e, t, r, o, n) => {
        var a = SpoolMath.distance(e, t, r, o),
            i = SpoolMath.globalAngle(e, -t, r, -o) - n,
            l = Math.cos(i) * a + e,
            s = -Math.sin(i) * a + t;
        return (pos = [l, s]), pos;
    },
    getUnitVector: (e) => [Math.cos(e), Math.sin(e)],
    scaleVector: (e, t) => e.map((e) => e * t),
    addVectors: (e, t) => {
        res = [];
        for (var r = 0; r < e.length; r++) res.push(e[r] + t[r]);
        return res;
    },
    averageVectors: (e) => {
        if (0 == e.length) return null;
        temp = e[0];
        for (var t = 1; t < e.length; t++)
            temp = SpoolMath.addVectors(temp, e[t]);
        return SpoolMath.scaleVector(temp, 1 / e.length);
    },
    average: (e) => {
        if (0 == e.length) return 0;
        for (var t = 0, r = 0; r < e.length; r++) t += e[r];
        return t / e.length;
    },
    weightedAverage: (e, t) => {
        for (var r = 0, o = 0, n = 0; n < e.length; n++)
            (r += e[n] * t[n]), (o += t[n]);
        return 0 == o ? 0 : r / o;
    },
    sigmoid: (e) => 1 / (1 + Math.exp(-e)),
};
var SpoolRect = (e, t, r, o) => ({
    x: e,
    y: t,
    width: r,
    height: o,
    cx: e + r / 2,
    cy: t + o / 2,
    contains: (n, a) => e <= n && n <= e + r && t <= a && a <= t + o,
});
try {
    module.exports = { SpoolMath: SpoolMath, SpoolRect: SpoolRect };
} catch (e) {
    "undefined" == typeof module
        ? console.log(
              "Modules are not present, you are probably on client, make sure this script is included before the files that require it"
          )
        : console.error(e);
}
var MessageCodes = {
    SM_RESET: "reset",
    SM_PACK_INIT: "init-pack",
    SM_PACK_UPDATE: "update-pack",
    SM_PACK_REMOVE: "remove-pack",
    OS_GET_OBJ: "get-obj",
    OS_SEND_OBJ: "send-obj",
    ASIGN_CLIENT_ID: "asign-id",
    SM_KEY_PRESS: "key-press",
    SM_MOUSE_INPUT: "mouse-clicked",
    KI_MOV_LEFT: "MOV_LEFT",
    KI_MOV_RIGHT: "MOV_RIGHT",
    KI_MOV_UP: "KI_MOV_UP",
    KI_MOV_DOWN: "KI_MOV_DOWN",
    SERVER_LOADING: "SERVER_LOADING",
};
try {
    module.exports = { ...MessageCodes };
} catch (e) {
    console.warn(
        "Module exporting is not present. If you are in client make sure you include files correctly in you index file."
    );
}
var SpoolRenderer = {
    ctx: null,
    camera: null,
    setColor: (e) => {
        SpoolRenderer.ctx.fillStyle = e;
    },
    setFont: (e, t) => {
        SpoolRenderer.ctx.font = `${t}px ${e}`;
    },
    drawInscribedOval: (e) => {
        SpoolRenderer.ctx.beginPath(),
            SpoolRenderer.ctx.ellipse(
                e.cx,
                e.cy,
                e.width / 2,
                e.height / 2,
                0,
                0,
                360
            ),
            SpoolRenderer.ctx.stroke();
    },
    fillInscribedOval: (e) => {
        SpoolRenderer.ctx.beginPath(),
            SpoolRenderer.ctx.ellipse(
                e.cx,
                e.cy,
                e.width / 2,
                e.height / 2,
                0,
                0,
                360
            ),
            SpoolRenderer.ctx.fill();
    },
    drawLine: (e, t, r, o) => {
        SpoolRenderer.ctx.beginPath(),
            SpoolRenderer.ctx.moveTo(e, t),
            SpoolRenderer.ctx.lineTo(r, o),
            SpoolRenderer.ctx.stroke();
    },
    fillInscribedOvalPercentFull: (e, t) => {
        if ((SpoolRenderer.ctx.beginPath(), t > 0.5)) {
            var r = t - 0.5,
                o = Math.asin(2 * r);
            SpoolRenderer.ctx.ellipse(
                e.cx,
                e.cy,
                e.width / 2,
                e.height / 2,
                0,
                -o,
                Math.PI + o
            );
        } else {
            o = Math.asin(2 * (0.5 - t));
            SpoolRenderer.ctx.ellipse(
                e.cx,
                e.cy,
                e.width / 2,
                e.height / 2,
                0,
                o,
                Math.PI - o
            );
        }
        SpoolRenderer.ctx.fill();
    },
    drawOval: (e, t, r) => {
        SpoolRenderer.ctx.beginPath(),
            SpoolRenderer.ctx.arc(e, t, r, 0, 360),
            SpoolRenderer.ctx.stroke();
    },
    fillOval: (e, t, r) => {
        SpoolRenderer.ctx.beginPath(),
            SpoolRenderer.ctx.arc(e, t, r, 0, 360),
            SpoolRenderer.ctx.fill();
    },
    linePolygon: (e) => {
        SpoolRenderer.ctx.beginPath(),
            SpoolRenderer.ctx.moveTo(e[0][0], e[0][1]);
        for (var t = 1; t < e.length; t++)
            SpoolRenderer.ctx.lineTo(e[t][0], e[t][1]);
        SpoolRenderer.ctx.closePath();
    },
    fillPolygon: (e) => {
        SpoolRenderer.linePolygon(e), SpoolRenderer.ctx.fill();
    },
    renderRotatedSprite: (e, t, r, o, n) => {
        SpoolRenderer.ctx.save(),
            SpoolRenderer.ctx.translate(r, o),
            SpoolRenderer.ctx.rotate(-t),
            SpoolRenderer.ctx.drawImage(e, n.x, n.y, n.width, n.height),
            SpoolRenderer.ctx.restore();
    },
    drawRect: (e, t, r, o) => {
        SpoolRenderer.ctx.drawRect(e, t, r, o);
    },
    fillRect: (e, t, r, o) => {
        SpoolRenderer.ctx.fillRect(e, t, r, o);
    },
    fillSplRect: (e) => {
        SpoolRenderer.ctx.fillRect(e.x, e.y, e.width, e.height);
    },
    fillRoundRect(e, t, r, o, n, a = 0, i = !0, l = !1) {
        if ((void 0 === a && (a = 5), "number" == typeof a))
            a = { tl: a, tr: a, br: a, bl: a };
        else {
            var s = { tl: 0, tr: 0, br: 0, bl: 0 };
            for (var c in s) a[c] = a[c] || s[c];
        }
        e.beginPath(),
            e.moveTo(t + a.tl, r),
            e.lineTo(t + o - a.tr, r),
            e.quadraticCurveTo(t + o, r, t + o, r + a.tr),
            e.lineTo(t + o, r + n - a.br),
            e.quadraticCurveTo(t + o, r + n, t + o - a.br, r + n),
            e.lineTo(t + a.bl, r + n),
            e.quadraticCurveTo(t, r + n, t, r + n - a.bl),
            e.lineTo(t, r + a.tl),
            e.quadraticCurveTo(t, r, t + a.tl, r),
            e.closePath(),
            i && e.fill(),
            l && e.stroke();
    },
    multiLineText: (e, t, r, o = 0.33, n = null) => {
        var a = [];
        e.split("\n").forEach((e) => {
            var t = e.split(" "),
                o = "";
            (SpoolRenderer.ctx.textAlign = "center"),
                t.forEach((e, t) => {
                    SpoolRenderer.ctx.measureText(o + e).width >= r
                        ? (a.push(o.trim()), (o = e))
                        : (o += " " + e);
                }),
                o && a.push(o.trim());
        });
        var i = parseInt(SpoolRenderer.ctx.font) + 3;
        a.forEach((e, r) => {
            var l = t.x + t.width / 2,
                s =
                    t.y +
                    t.height / 2 -
                    ((a.length - 1) / 2) * i +
                    r * i +
                    i * o;
            n &&
                ((SpoolRenderer.ctx.lineWidth = n),
                SpoolRenderer.ctx.strokeText(e, l, s)),
                SpoolRenderer.ctx.fillText(e, l, s);
        });
    },
    simpleText: (e, t, r, o = null) => {
        o &&
            ((SpoolRenderer.ctx.lineWidth = o),
            SpoolRenderer.ctx.strokeText(e, t, r)),
            SpoolRenderer.ctx.fillText(e, t, r);
    },
};
console.log("loaded");
var SpoolUIElement = (e) => {
        var t = {
            elements: {},
            layerKeys: [],
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            layer: 10,
            visible: !0,
            bgColor: null,
            fgColor: null,
            strokeColor: null,
            textMargin: 10,
            id: Math.random(),
            lineHeight: 10,
            bindedMouseEvent: null,
            mouseUp: !1,
            mouseDown: !0,
            ...e,
        };
        return (
            (t.left = t.x),
            (t.top = t.y),
            (t.right = t.x + t.width),
            (t.bottom = t.y + t.height),
            (t.update = () => {}),
            (t.render = (e) => {
                t.renderBounds(e),
                    t.renderSprite(e),
                    t.renderText(e),
                    t.layerKeys.forEach((r) => {
                        r.ids.forEach((o) => {
                            t.elements[r.key][o].update(),
                                t.elements[r.key][o].visible &&
                                    t.elements[r.key][o].render(e);
                        });
                    });
            }),
            (t.renderBounds = (e) => {
                t.radius
                    ? (t.bgColor && (e.fillStyle = t.bgColor),
                      t.strokeColor && (e.strokeStyle = t.strokeColor),
                      drawRoundRect(
                          e,
                          t.x,
                          t.y,
                          t.width,
                          t.height,
                          t.radius,
                          t.bgColor,
                          t.strokeColor
                      ))
                    : (e.beginPath(),
                      (e.lineWidth = "1"),
                      e.rect(t.x, t.y, t.width, t.height),
                      t.bgColor &&
                          (1 != t.bgOpacity
                              ? ((e.globalAlpha = t.bgOpacity),
                                (e.fillStyle = t.bgColor),
                                e.fill(),
                                (e.globalAlpha = 1))
                              : ((e.fillStyle = t.bgColor), e.fill())));
            }),
            (t.renderText = (e) => {
                if (t.text)
                    if (
                        (t.disabled
                            ? (e.fillStyle = "gray")
                            : t.fgColor
                            ? (e.fillStyle = fgColor)
                            : (e.fillStyle = "white"),
                        t.font && (e.font = t.font),
                        (e.textAlign = "center"),
                        t.multiLine)
                    ) {
                        if (
                            !t.linesSplit ||
                            !t.textLines ||
                            t.linesSplit != t.text
                        ) {
                            var r = "",
                                o = [];
                            t.text.split(" ").forEach((n, a) => {
                                e.measureText(r + n).width >=
                                t.width - 2 * t.textMargin
                                    ? (o.push(r), (r = n))
                                    : (r += " " + n);
                            }),
                                r && o.push(r),
                                (t.lineHeight = parseInt(e.font) + 3),
                                (t.textLines = o);
                        }
                        t.textLines.forEach((r, o) => {
                            e.fillText(
                                r,
                                t.x + t.width / 2,
                                t.y +
                                    t.height / 2 -
                                    (t.textLines.length / 2) * t.lineHeight +
                                    o * t.lineHeight
                            );
                        }),
                            (t.linesSplit = t.text);
                    } else
                        e.fillText(
                            t.text,
                            t.x + t.width / 2,
                            t.y + t.height / 2
                        );
            }),
            (t.renderSprite = (e, r = t.sprite, o = 1) => {
                r &&
                    e.drawImage(
                        r,
                        t.x + t.width / 2 - (t.width / 2) * o,
                        t.y + t.height / 2 - (t.height / 2) * o,
                        t.width * o,
                        t.height * o
                    );
            }),
            (t.mouseEvent = (e, r = t.mouseUp, o = t.mouseDown) => {
                var n = !1;
                if (t.disabled) return !1;
                if (
                    (t.layerKeys.forEach((r) => {
                        r.ids.forEach((o) => {
                            t.elements[r.key][o].visible &&
                                (n |= t.elements[r.key][o].mouseEvent(e));
                        });
                    }),
                    n)
                )
                    return n;
                if (
                    ((recognizedEvent =
                        ("mouseup" == e.type && r) ||
                        ("mousedown" == e.type && o)),
                    t.bindedMouseEvent && recognizedEvent)
                ) {
                    if (t.x <= e.x && e.x <= t.x + t.width)
                        if (t.y <= e.y && e.y <= t.y + t.width)
                            if (!1 !== (n = t.bindedMouseEvent(e, t)))
                                return !0;
                    return !1;
                }
                return !1;
            }),
            (t.mouseMove = (e) => {
                (t.mx = e.clientX), (t.my = e.clientY);
                var r = !1,
                    o = !1;
                t.layerKeys.forEach((r) => {
                    r.ids.forEach((n) => {
                        t.elements[r.key][n].visible &&
                            (o |= t.elements[r.key][n].mouseMove(e));
                    });
                });
                var n = t.mouseOn,
                    a = t.mouseIn;
                return (
                    o
                        ? ((n = !1), (a = !0), (r = !1))
                        : (t.x <= e.x &&
                              e.x <= t.x + t.width &&
                              t.y <= e.y &&
                              e.y <= t.y + t.width &&
                              (r = !0),
                          (n = r),
                          (a = r)),
                    n != t.mouseOn &&
                        (n && t.onMouseEnter
                            ? t.onMouseEnter(e, t)
                            : !n && t.onMouseLeave && t.onMouseLeave(e, t),
                        (t.mouseOn = n)),
                    (t.mouseOn = a),
                    r
                );
            }),
            (t.add = (e) => {
                t.elements[e.layer] || (t.elements[e.layer] = {}),
                    (t.elements[e.layer][e.id] = e),
                    t.refreshKeys();
            }),
            (t.remove = (e) => {
                delete t.elements[e], t.refreshKeys();
            }),
            (t.forEachElement = (e) => {
                t.layerKeys.forEach((r) => {
                    r.ids.forEach((o) => {
                        e(t.elements[r.key][o]);
                    });
                });
            }),
            (t.removeAll = () => {
                (t.elements = {}), (t.layerKeys = []);
            }),
            (t.refreshKeys = () => {
                var e = Object.keys(t.elements).sort(
                    (e, t) => parseInt(e) - parseInt(t)
                );
                (t.layerKeys = []),
                    e.forEach((e) => {
                        t.layerKeys.push({
                            key: e,
                            ids: Object.keys(t.elements[e]),
                        });
                    });
            }),
            (t.alignItems = (e, r, o) => {
                var n = null,
                    a = null,
                    i = null,
                    l = null;
                t.layerKeys.forEach((e) => {
                    e.ids.forEach((r) => {
                        var o = t.elements[e.key][r];
                        (!n || o.x < n) && (n = o.x),
                            (!i || o.y < i) && (i = o.y),
                            (!a || o.x + o.width > a) && (a = o.x + o.width),
                            (!l || o.y + o.height > l) && (l = o.y + o.height);
                    });
                });
                var s = r - (n + a) / 2,
                    c = o - (i + l) / 2;
                console.log(s, c),
                    t.layerKeys.forEach((e) => {
                        e.ids.forEach((r) => {
                            (t.elements[e.key][r].x += s),
                                (t.elements[e.key][r].y += c);
                        });
                    });
            }),
            (t.getElementBounds = () => {
                var e = null,
                    r = null,
                    o = null,
                    n = null;
                return (
                    t.layerKeys.forEach((a) => {
                        a.ids.forEach((i) => {
                            var l = t.elements[a.key][i];
                            (!e || l.x < e) && (e = l.x),
                                (!o || l.y < o) && (o = l.y),
                                (!r || l.x + l.width > r) &&
                                    (r = l.x + l.width),
                                (!n || l.y + l.height > n) &&
                                    (n = l.y + l.height);
                        });
                    }),
                    {
                        x: e,
                        y: o,
                        width: r - e,
                        height: n - o,
                        left: e,
                        right: r,
                        top: o,
                        bottom: n,
                    }
                );
            }),
            (t.pack = () => {
                var e = t.getElementBounds();
                (t.x = e.x),
                    (t.y = e.y),
                    (t.width = e.width),
                    (t.height = e.height);
            }),
            t
        );
    },
    SpoolUIHandler = (e) => {
        return SpoolUIElement({ initObject: e });
    },
    SpoolUIButton = (e) => {
        return SpoolUIElement({ ...e });
    },
    SpoolUIButtonList = (e, t, r = SpoolUIButton) => {
        var o = SpoolUIElement({
            rows: 1,
            columns: 1,
            margin: 10,
            buttonWidth: 50,
            buttonHeight: 50,
            offsetX: 0.5,
            offsetY: 0.5,
            ...e,
        });
        (o.width = (o.margin + o.buttonWidth) * o.columns),
            (o.height = (o.margin + o.buttonHeight) * o.rows);
        var n = o.x - o.width * o.offsetX,
            a = o.y - o.height * o.offsetY,
            i = 0;
        return (
            (o.left = n),
            (o.up = a),
            (o.right = n + o.width),
            (o.bottom = a + o.height),
            (o.buttons = []),
            t.forEach((e) => {
                var t = r({
                    x: n + (i % o.columns) * (o.buttonWidth + o.margin),
                    y:
                        a +
                        Math.floor(i / o.columns) * (o.buttonWidth + o.margin),
                    width: o.buttonWidth,
                    height: o.buttonHeight,
                    ...e,
                });
                (i += 1), o.buttons.push(t), o.add(t);
            }),
            o
        );
    },
    LoadingUI = (e, t) => {
        var r = SpoolUIElement({
            client: e,
            x: e.gameArea.width - 60,
            y: e.gameArea.height - 60,
            width: 50,
            height: 50,
            overlay: !1,
            overlayColor: "white",
            ...t,
        });
        return (
            (r.animationFrame = 0),
            (r.bounds = SpoolRect(r.x, r.y, r.width, r.height)),
            (r.render = (t) => {
                (r.animationFrame += 1),
                    (r.client.serverSideLoading ||
                        r.client.clientSideLoading) &&
                        (r.overlay &&
                            (SpoolRenderer.setColor(r.overlayColor),
                            SpoolRenderer.fillRect(
                                0,
                                0,
                                r.client.gameArea.width,
                                r.client.gameArea.height
                            ),
                            SpoolRenderer.setColor("black"),
                            SpoolRenderer.setFont("Arial", 50),
                            e.serverSideLoadingData &&
                            e.serverSideLoadingData.message
                                ? ((t.textAlign = "center"),
                                  SpoolRenderer.simpleText(
                                      e.serverSideLoadingData.message,
                                      r.client.gameArea.width / 2,
                                      r.client.gameArea.height / 2
                                  ),
                                  (t.textAlign = "right"),
                                  SpoolRenderer.simpleText(
                                      "Loading",
                                      r.bounds.cx - 2 * r.bounds.width,
                                      r.bounds.cy
                                  ))
                                : ((t.textAlign = "center"),
                                  SpoolRenderer.simpleText(
                                      "Loading",
                                      r.client.gameArea.width / 2,
                                      r.client.gameArea.height / 2
                                  ))),
                        SpoolRenderer.setColor("black"),
                        SpoolRenderer.drawInscribedOval("black"),
                        SpoolRenderer.fillInscribedOvalPercentFull(
                            r.bounds,
                            r.animationFrame / 30
                        ),
                        r.animationFrame > 30 && (r.animationFrame = 0));
            }),
            r
        );
    };
const SpoolUtils = {
    forEachInObject: (e, t) => {
        Object.keys(e).forEach((r) => {
            t(e[r], r);
        });
    },
    shuffle: (e) => {
        e.sort(() => Math.random() - 0.5);
    },
    subarray: (e, t, r) => (r <= t ? [] : e.filter((e, o) => o >= t && o < r)),
};
try {
    module.exports = { SpoolUtils: SpoolUtils };
} catch (e) {
    "undefined" == typeof module
        ? console.log(
              "Modules are not present, you are probably on client, make sure this script is included before the files that require it"
          )
        : console.error(e);
}

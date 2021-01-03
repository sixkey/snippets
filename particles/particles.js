/// COORDINATOR

let coordinator = new Coordinator();

/// CLOCK

let browserClock = new BrowserClock(function (ts) {
    canvas.clear();
    coordinator.update(ts);
});

let periodicLogger = new PeriodicLogger(browserClock);

/// UI

let devContainer = {
    n: 1.7,
    e: 250,
    sigma: 110,
    timeSpeed: 50,
    forceBounds: 6.3,
};

let devui = new DevUI("spool-root", devContainer);

devui.addRange("n", 0, 10, 0.1);
devui.addRange("e", 0, 1000, 20);
devui.addRange("sigma", 0, 200, 5);
devui.addRange("timeSpeed", 0, 100, 5);
devui.addRange("forceBounds", 0, 20, 0.1);

devui.addButton("restart", (e) => {
    coordinator.removeAll();
});

devui.addButton('preset - "Real"', (e) => {
    Object.assign(devContainer, {
        n: 6,
        e: 160,
        sigma: 95,
        timeSpeed: 50,
        forceBounds: 20,
    });
    devui.refresh();
});

devui.addButton("preset - star", (e) => {
    Object.assign(devContainer, {
        n: 1.7,
        e: 250,
        sigma: 110,
        timeSpeed: 50,
        forceBounds: 6.3,
    });
    devui.refresh();
});

devui.addButton("preset - orbits", (e) => {
    Object.assign(devContainer, {
        n: 0.3,
        e: 1000,
        sigma: 135,
        timeSpeed: 30,
        forceBounds: 10,
    });
    devui.refresh();
});

/// RENDERING

let canvas = new Canvas("spool-root");
canvas.fullScreen();

let canvasRect = SPTensors.vector([
    -canvas.width / 2,
    -canvas.height / 2,
    canvas.width,
    canvas.height,
]);

let renderer = new Renderer2D(canvas);
let camera = new Camera([canvas.width, canvas.height]);

let renderingSystem = new RenderingSystem(coordinator, renderer);
renderingSystem.addTo(coordinator);
renderingSystem.transformer = camera;

/// PHYSICS

const ParticleComponent = defineComponent("particle", (mass) => ({
    mass,
}));

function forceFunction(r, a, b) {
    const coef = Math.log2(1 + a + b);
    const e = devContainer.e * coef;
    const s = devContainer.sigma * coef;

    const n = devContainer.n;

    const C = Math.pow(s / r, n);

    return SPMath.clamp(
        (4 * e * (C * C - C)) / 300,
        -devContainer.forceBounds,
        devContainer.forceBounds
    );
}

function particleRadius(mass) {
    return Math.sqrt((mass * 40) / Math.PI);
}

function particleUpdate(ts) {
    var ents = new Set(this.entities);

    for (let aid of ents) {
        var entity = this.coordinator.entities[aid];
        var rad = entity.rig.rad;
        var pos = entity.tran.pos;
        renderer.setColor(entity.particle.fixed ? "red" : "black");

        // var area = posRadToBounds(
        //     pos,
        //     SPTensors.vector([forceFunctionCoef * 300, forceFunctionCoef * 300])
        // );

        // var bObjects = chunkSystem.getObjectsInRect(area.pos, area.dims);

        for (let bid of this.entities) {
            // for (connectedParticle of bObjects) {
            var connectedParticle = this.coordinator.entities[bid];
            if (
                !connectedParticle.particle.fixed &&
                connectedParticle.id != entity.id
            ) {
                var con = connectedParticle.tran.pos;
                var cRad = connectedParticle.rig.rad;

                var distance = SPMath.distance(pos, con);

                if (distance < rad.values[0] + cRad.values[0]) {
                    this.coordinator.remove(entity);

                    con.values[0] =
                        (con.values[0] * connectedParticle.particle.mass +
                            pos.values[0] * entity.particle.mass) /
                        (connectedParticle.particle.mass +
                            entity.particle.mass);
                    con.values[1] =
                        (con.values[1] * connectedParticle.particle.mass +
                            pos.values[1] * entity.particle.mass) /
                        (connectedParticle.particle.mass +
                            entity.particle.mass);

                    connectedParticle.particle.mass =
                        connectedParticle.particle.mass + entity.particle.mass;
                    cRad.apply((x) =>
                        particleRadius(connectedParticle.particle.mass)
                    );

                    break;
                } else {
                    var force = forceFunction(
                        distance,
                        entity.particle.mass,
                        connectedParticle.particle.mass
                    );

                    var newDistance =
                        distance +
                        (force * devContainer.timeSpeed) /
                            100 /
                            Math.log2(connectedParticle.particle.mass + 1);

                    var coef = newDistance / distance;

                    con.values[0] =
                        (con.values[0] - pos.values[0]) * coef + pos.values[0];
                    con.values[1] =
                        (con.values[1] - pos.values[1]) * coef + pos.values[1];
                }
            }
        }
    }
}

const ParticleSystem = defineSystem(
    ["tran", "rig", "particle"],
    particleUpdate
);

const chunkSystem = new ChunkSystem(coordinator);
coordinator.addSystem(chunkSystem);

const particleSystem = new ParticleSystem(coordinator);
coordinator.addSystem(particleSystem);

/// SPAWNING

const spawningRect = SPMath.rect(-1, -1, 2, 2);

function spawnParticle(mass = 1) {
    let radius = particleRadius(mass);
    let particle = constructObject(
        new Transform(
            SPMath.randPointInRect(
                SPTensors.div(
                    SPTensors.mult(
                        spawningRect,
                        (canvasRect.width + canvasRect.height) / 4
                    ),
                    camera.scale,
                    true
                )
            ).values
        ),
        new RigidBody([radius, radius], "circle"),
        new Material("red"),
        new ParticleComponent(mass),
        new Meta("particle")
    );
    particle.addTo(coordinator);

    return particle;
}

const mouseListener = new MouseListener(canvas.canvas).initListener();

const CameraMovementSystem = defineSystem(
    null,
    function (ts) {
        if (this.mouseListener.pressedButtons[0]) {
            camera.pos.x += -this.mouseListener.dm.x / camera.scale.x;
            camera.pos.y += this.mouseListener.dm.y / camera.scale.y;
        } else if (this.mouseListener.pressedButtons[2]) {
            camera.scale.x *= 1 + this.mouseListener.dm.y / 100.0;
            camera.scale.y *= 1 + this.mouseListener.dm.y / 100.0;
        }

        this.mouseListener.dm.x = 0;
        this.mouseListener.dm.y = 0;
    },
    (mouseListener) => ({
        mouseListener,
    })
);

coordinator.addSystem(new CameraMovementSystem(coordinator, mouseListener));

// const worldFoldingSystem = new WorldFoldingSystem(coordinator, canvasRect);
// coordinator.addSystem(worldFoldingSystem);

// const hardBoundsSystem = new (defineSystem(["tran"], function (ts) {
//     for (let entity of this.getEntities()) {
//         entity.tran.pos.x = SPMath.clamp(entity.tran.pos.x, 0, canvas.width);
//         entity.tran.pos.y = SPMath.clamp(entity.tran.pos.y, 0, canvas.height);
//     }
// }))(coordinator).addTo(coordinator);

const SpawningSystem = defineSystem(
    null,
    function (ts) {
        if (this.browserClock.tickCounter % 2 == 0) {
            spawnParticle();
        }
    },
    (mouseListener, browserClock) => ({
        mouseListener,
        browserClock,
    })
);

coordinator.addSystem(
    new SpawningSystem(coordinator, mouseListener, browserClock)
);

//#region GRAPHING

const GraphSystem = defineSystem(
    null,
    function (ts) {
        this.renderer.drawFunction(
            (x) => forceFunction(x, 1, 1),
            0,
            800,
            5,
            SPMath.rect(20, 20, 200, 100)
        );
    },
    (renderer) => ({
        renderer,
    })
);

coordinator.addSystem(new GraphSystem(coordinator, renderer));

//#endregion

/// START

browserClock.start();

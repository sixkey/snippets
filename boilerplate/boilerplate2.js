/// COORDINATOR

let coordinator = new Coordinator();

/// CLOCK

let browserClock = new BrowserClock(function (ts) {
    canvas.clear();
    coordinator.update(ts);
});

let periodicLogger = new PeriodicLogger(browserClock);

let PATH = [];

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

/// MOUSE LISTENER

const mouseListener = new MouseListener(canvas.canvas);
mouseListener.initListener();

/// GRAPH

const FooComponent = defineComponent("fooComp", (anotherColor) => ({
    anotherColor,
}));

function fooUpdate(ts) {
    for (let entity of this.getEntities()) {
        entity.tran.pos.add(SPTensors.mult(entity.mov.vel, ts));
        entity.mat.color = entity.fooComp.anotherColor;
    }
}

const FooSystem = defineSystem(["tran", "mov", "meta", "fooComp"], fooUpdate);

const fooSystem = new FooSystem(coordinator);
fooSystem.addTo(coordinator);

const foo = function (color) {
    let res = constructObject(
        new Transform(SPMath.randPointInRect(canvasRect).values),
        new RigidBody([5, 5], "circle"),
        new Movement([1, 0], [0, 0]),
        new Material(color),
        new FooComponent("blue"),
        new Meta("foo")
    );
    res.addTo(coordinator);
};

for (var i = 0; i < 10; i++) {
    foo("red");
}

/// START

browserClock.start();

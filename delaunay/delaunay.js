/// CONSTS

const CAR_COUNT = 20;

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

var minWidth = 800;
var minHeight = 800;

var scaleWidth = canvas.width / minWidth;
var scaleHeight = canvas.height / minHeight;

var finalScale = Math.min(scaleWidth, scaleHeight);

camera.scale = SPTensors.vector([finalScale, finalScale]);

let renderingSystem = new RenderingSystem(coordinator, renderer);
renderingSystem.addTo(coordinator);
renderingSystem.transformer = camera;

let transformedRenderer = new TransformedRenderer2D(canvas, camera);

/// DELAUNAY SYSTEM

function delaunayUpdate(ts) {
    
    for (let entity of this.getEntities()) {
        periodicLogger.log(entity);
    }
}

const DelaunaySystem = defineSystem(["tran", "meta"], delaunayUpdate);

coordinator.addSystem(new DelaunaySystem(coordinator));

/// MOUSE LISTENER

const mouseListener = new MouseListener(canvas.canvas);
mouseListener.initListener();

const Draggable = defineComponent("draggable", () => ({}));

function mouseDraggingUpdate(ts) {
    for (let entity of this.getEntities()) {
        entity.tran.pos = camera.inverseTransformPoint(mouseListener.m);
    }
}

const MouseDraggingSystem = defineSystem(
    ["tran", "draggable"],
    mouseDraggingUpdate
);

coordinator.addSystem(new MouseDraggingSystem(coordinator));

///

const point = (draggable = false) => {
    var pointObj = constructObject(
        new Transform(SPMath.randPointInRect(canvasRect).values),
        new Movement([0, 0], [0, 0]),
        new RigidBody([3, 3]),
        new Meta("point"),
        new Material("red")
    );

    if (draggable) {
        new Draggable().addTo(pointObj);
    }

    pointObj.addTo(coordinator);
    return pointObj;
};

for (var i = 0; i < 3; i++) {
    point();
}

var mousePoint = point(true);

//#endregion

/// START

browserClock.start();

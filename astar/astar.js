/// COORDINATOR

let coordinator = new Coordinator();

/// CLOCK

let browserClock = new IntervalClock(function (ts) {
    canvas.clear();
    coordinator.update(ts);
}, 30);

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

const TravelerComponent = defineComponent("traveler", (target) => {
    target;
});

const TowerComponent = defineComponent("tower", () => ({}));

function travellingUpdate(ts) {
    for (let entity of this.getEntities()) {
    }

    // for (var i = 0; i < towers.length; i++) {
    //     var object = graph.nodes[i];

    //     for (var j = 0; j < graph.connections[object.gid].length; j++) {
    //         var pair = graph.connections[object.gid][j];
    //         var objectB = graph.nodes[pair[0]];

    //         renderer.setColor("#11111105");
    //         renderer.drawLine(
    //             camera.transformPoint(object.tran.pos),
    //             camera.transformPoint(objectB.tran.pos)
    //         );
    //     }
    // }

    // if (path) {
    //     renderer.setColor("red");
    //     for (var i = 0; i < path.length - 1; i++) {
    //         var object = graph.nodes[path[i]];
    //         var objectB = graph.nodes[path[i + 1]];
    //         renderer.drawLine(
    //             camera.transformPoint(object.tran.pos),
    //             camera.transformPoint(objectB.tran.pos)
    //         );
    //     }
    // }
}

const TravellingSystem = defineSystem(
    ["tran", "meta", "traveler"],
    travellingUpdate
);

const travellingSystem = new TravellingSystem(coordinator);
travellingSystem.addTo(coordinator);

const aStarH = (a, b) => {
    return SPTensors.abs(SPTensors.sub(a.tran.pos, b.tran.pos));
};

function towerUpdate(ts) {
    var closestTower = null;
    var closestDistance = null;

    var inversedMouse = camera.inverseTransformPoint(mouseListener.m);

    for (let entity of this.getEntities()) {
        var object = entity;

        for (var j = 0; j < graph.connections[object.gid].length; j++) {
            var pair = graph.connections[object.gid][j];
            var objectB = graph.nodes[pair[0]];

            renderer.setColor("#11111105");
            renderer.drawLine(
                camera.transformPoint(object.tran.pos),
                camera.transformPoint(objectB.tran.pos)
            );
        }
        let distanceFromMouse = SPMath.distance(object.tran.pos, inversedMouse);
        if (!closestTower || distanceFromMouse < closestDistance) {
            closestTower = object;
            closestDistance = distanceFromMouse;
        }
    }
    renderer.setColor("red");
    renderer.fillCircle(camera.transformPoint(closestTower.tran.pos), 10);
    renderer.fillCircle(camera.transformPoint(graph.nodes[0].tran.pos), 10);

    PATH = aStar(graph, 0, closestTower.gid, aStarH);

    if (PATH) {
        for (var i = 0; i < PATH.length - 1; i++) {
            var object = graph.nodes[PATH[i]];
            var objectB = graph.nodes[PATH[i + 1]];
            renderer.drawLine(
                camera.transformPoint(object.tran.pos),
                camera.transformPoint(objectB.tran.pos)
            );
        }
    }
}

const TowerSystem = defineSystem(["tran", "meta", "tower"], towerUpdate);

const towerSystem = new TowerSystem(coordinator);
towerSystem.addTo(coordinator);

var graph = new Graph();

const boidPolygon = SPTensors.tensor([3, 2], [-1, -1, -1, 1, 1, 0]);
const traveler = function () {
    let res = constructObject(
        new Transform(SPMath.randPointInRect(canvasRect).values),
        new RigidBody([8, 5], "polygon", boidPolygon),
        new Meta("traveler"),
        new Material("blue"),
        new TravelerComponent(3)
    );
    res.addTo(coordinator);
};

// for (var i = 0; i < 10; i++) {
//     traveler();
// }

var TOWER_COUNT = 300;

function spawnTowers() {
    var towers = [];
    const tower = function (color) {
        let res = constructObject(
            new Transform(SPMath.randPointInRect(canvasRect).values),
            new RigidBody([5, 5], "circle"),
            new Material(color),
            new Meta("tower"),
            new TowerComponent()
        );
        res.gid = graph.addNode(res);
        towers.push(res);
        res.addTo(coordinator);
    };

    for (var i = 0; i < TOWER_COUNT; i++) {
        tower("transparent");
    }

    for (var i = 0; i < towers.length; i++) {
        for (var j = 0; j < towers.length; j++) {
            if (i == j) {
                continue;
            }
            distance = aStarH(towers[i], towers[j]);

            if (distance < 150) {
                graph.connect(i, j, distance);
            }
        }
    }
}

spawnTowers();

/// START

browserClock.start();

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

/// EYES

//#region EyeSystem

function CarEyeSystem(coordinator) {
    System.call(this, coordinator, ["tran", "meta", "eyes"]);
}

CarEyeSystem.prototype = Object.create(System.prototype);

CarEyeSystem.prototype.update = function (ts) {
    for (let entity of this.getEntities()) {
        var eyes = [];

        var min = entity.tran.pos.copy();
        var max = entity.tran.pos.copy();

        var eyes = SPMath.polarPoints(
            entity.eyes.count,
            entity.tran.pos,
            entity.eyes.radius,
            entity.tran.rot,
            entity.eyes.angle
        );

        eyes.forEach((point) => {
            if (!min.x || point.x < min.x) {
                min.x = point.x;
            }
            if (!min.y || point.y < min.y) {
                min.y = point.y;
            }

            if (!max.x || point.x > max.x) {
                max.x = point.x;
            }
            if (!max.y || point.y > max.y) {
                max.y = point.y;
            }
        });

        entity.eyes.output = [];

        eyes.forEach((eye, eyeIndex) => {
            let line = SPTensors.link([entity.tran.pos, eye], [2, 2]);
            var lineValue = 0;
            [ROAD.innerPolygon, ROAD.outerPolygon].forEach((polygon) => {
                var intersections = SPMath.polygonLineIntersection(
                    line,
                    polygon
                );

                intersections.forEach((intersection) => {
                    var value =
                        1 -
                        SPMath.distance(entity.tran.pos, intersection) /
                            entity.eyes.radius;
                    if (value > lineValue) {
                        lineValue = value;
                    }
                });
            });
            entity.eyes.output.push(lineValue);
            if (lineValue > 0) {
                transformedRenderer.setColor(`rgb(0, 0, 0, ${lineValue / 2})`);
                transformedRenderer.drawLine(entity.tran.pos, eye);
            }
        });
    }
};

var carEyeSystem = new CarEyeSystem(coordinator);
carEyeSystem.addTo(coordinator);

//#endregion

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

var velocitySystem = new VelocitySystem(coordinator);
coordinator.addSystem(velocitySystem);

/// MOUSE LISTENER

const mouseListener = new MouseListener(canvas.canvas);
mouseListener.initListener();

/// GRAPH

const CarComponent = defineComponent("car", () => ({}));

function carSystemUpdate(ts) {
    for (let entity of this.getEntities()) {
        if (entity.eyes.output == null) {
            continue;
        }

        var output = entity.dnn.network.forward(
            SPTensors.vector(entity.eyes.output).reshape([1, 20])
        );

        if (
            SPMath.polygonContains(ROAD.outerPolygon, entity.tran.pos) &&
            !SPMath.polygonContains(ROAD.innerPolygon, entity.tran.pos)
        ) {
            var distanceFromStart = SPMath.distance(
                entity.tran.pos,
                entity.car.start
            );

            entity.evolution.fitness += distanceFromStart;
        } else {
            entity.evolution.fitness = 0;
        }

        var r = SPMath.sigmoid(entity.evolution.fitness / 1000);
        var color = getColor(r, 0, 0);
        //periodicLogger.log(color);
        entity.mat.color = color;

        entity.tran.rot += (output.x - 0.5) * ts;
        entity.mov.vel = SPMath.unitVector(entity.tran.rot).mult(3);
    }
}

const CarSystem = defineSystem(["tran", "car", "dnn"], carSystemUpdate);

const carSystem = new CarSystem(coordinator);
carSystem.addTo(coordinator);

function fitnessFunction(entity) {}

function onGenerationEnds(entities) {
    if (entities.length == 0) {
        return;
    }

    var parents = entities.slice(0, 4);

    coordinator.removeAll();
    ROAD = spawnRoad(ROAD_POINTS_NUMBER);
    for (var i = 0; i < CAR_COUNT; i++) {
        car(
            SPTensors.copy(
                SPTensors.vector(parents[i % 4].genome.genes),
                (x) => x + SPMath.randRange(-0.15, 0.15)
            ).getValues(),
            "red"
        );
    }
}

var evolutionSystem = new EvolutionSystem(coordinator, {
    car: { fitnessFunction, onGenerationEnds },
});
evolutionSystem.addTo(coordinator);
evolutionSystem.period = 7000;

const boidPolygon = SPTensors.tensor([3, 2], [-1, -1, -1, 1, 1, 0]);

const car = (genes = null, color) => {
    var car = constructObject(
        new Transform(
            SPTensors.copy(
                ROAD.start,
                (x) => x + SPMath.randRange(-5, 5)
            ).values,
            Math.PI / 2
        ),
        new Movement([0, 0], [0, 0]),
        new RigidBody([8, 5], "polygon", boidPolygon),
        new Meta("car"),
        new Eyes(20, 100, 0.1, ["food"]),
        new DNNComponent(20, 1, 15, 1, genes),
        new Material(color),
        new EvolutionComponent("car")
    );

    car.addComponent("car", {
        start: SPTensors.copy(car.tran.pos),
    });

    new Genome(car.dnn.network.vectorize().getValues()).addTo(car);
    car.addTo(coordinator);
};

//#region BUILDING ROAD

const ROAD_POINTS_NUMBER = 10;

var ROAD = null;

function roadUpdate(ts) {
    if (ROAD) {
        var point = camera.inverseTransformPoint(mouseListener.m);

        transformedRenderer.setColor("gray");

        transformedRenderer.drawPolygon(ROAD.innerPolygon, true);
        transformedRenderer.drawPolygon(ROAD.outerPolygon, true);
    }
}

var roadSystem = new (defineSystem(null, roadUpdate))(coordinator);
coordinator.addSystem(roadSystem);

const spawnRoad = function (
    numberOfPoints,
    minDistance = 100,
    maxDistance = 250,
    roadWidth = 120
) {
    const points = [];
    const pointsOuter = [];
    const roadAngle = (Math.PI / numberOfPoints) * 2;
    for (let i of SPMath.range(0, numberOfPoints)) {
        var distance = SPMath.randRange(minDistance, maxDistance);
        points.push(
            SPMath.polarPoint(SPTensors.vector([0, 0]), distance, roadAngle * i)
        );
        pointsOuter.push(
            SPMath.polarPoint(
                SPTensors.vector([0, 0]),
                distance + roadWidth,
                roadAngle * i
            )
        );
    }
    var polygon = SPTensors.concat(points, [numberOfPoints, 2]);
    var polygonOuter = SPTensors.concat(pointsOuter, [numberOfPoints, 2]);

    var start = SPTensors.add(points[0], pointsOuter[0]).div(2);

    return {
        innerPolygon: polygon,
        outerPolygon: polygonOuter,
        start,
    };
};

ROAD = spawnRoad(ROAD_POINTS_NUMBER);

for (let _ of SPMath.range(0, CAR_COUNT)) {
    car(null, "red");
}

//#endregion

/// START

browserClock.start();

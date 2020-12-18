var coordinator = new Coordinator();

var canvas = new Canvas("spool-root");
canvas.fullScreen();
var screenRect = SPTensors.vector([0, 0, canvas.width, canvas.height]);

var renderer = new Renderer2D(canvas);

var mouseListener = new MouseListener();
mouseListener.initListener();

clock = new BrowserClock((ts) => {
    canvas.clear();
    coordinator.update(ts);
});

periodicLogger = new PeriodicLogger(clock);

var renderingSystem = new RenderingSystem(coordinator, renderer);
coordinator.addSystem(renderingSystem);

var velocitySystem = new VelocitySystem(coordinator);
coordinator.addSystem(velocitySystem);

var chunkSystem = new ChunkSystem(coordinator);
coordinator.addSystem(chunkSystem);

var eyeSystem = new EyeSystem(coordinator, chunkSystem);
coordinator.addSystem(eyeSystem);

var worldFoldingSystem = new WorldFoldingSystem(coordinator, screenRect);
coordinator.addSystem(worldFoldingSystem);

function onCollision(a, b) {
    if (a.meta.type == "hunter" && b.meta.type == "food") {
        a.evolution.fitness += 10;
        coordinator.remove(b);
    }
}

var collisionSystem = new CollisionSystem(
    coordinator,
    chunkSystem,
    onCollision
);
coordinator.addSystem(collisionSystem);

function fitnessFunction(entity) {
    if (!entity.evolution.dead) {
        entity.evolution.LTFound.apply((v, i) =>
            Math.min(v, entity.tran.pos.get(i))
        );
        entity.evolution.RBFound.apply((v, i) =>
            Math.max(v, entity.tran.pos.get(i))
        );
        var box = SPTensors.sub(
            entity.evolution.RBFound,
            entity.evolution.LTFound
        );
        renderer.setColor("black");
        renderer.drawLine(entity.tran.pos, entity.evolution.LTFound);
        renderer.drawLine(entity.tran.pos, entity.evolution.RBFound);
        renderer.drawLine(entity.evolution.RBFound, entity.evolution.LTFound);
        entity.fitness = box.getValues().reduce((a, b) => a * b) * entity;
    }
}

function onGenerationEnds(entities) {
    if (entities.length == 0) {
        return;
    }

    var parents = entities.slice(0, 4);

    coordinator.removeAll();
    spawnFood();
    for (var i = 0; i < BOID_COUNT; i++) {
        spawnHunter(parents[i % 4].genome.genes);
    }
}

var evolutionSystem = new EvolutionSystem(coordinator, {
    hunter: { fitnessFunction, onGenerationEnds },
}).addTo(coordinator);
evolutionSystem.period = 10000;

const BoidComponent = defineComponent(
    "hunter",
    (avoidence, cohesion, alignment) => ({
        avoidence: avoidence,
        cohesion: cohesion,
        alignment: alignment,
    })
);

const huntersSystem = new (defineSystem(
    ["tran", "hunter", "dnn"],
    [],
    function (ts) {
        for (let entity of this.getEntities()) {
            if (entity.eyes.output == null) {
                continue;
            }

            var output = entity.dnn.network.forward(
                SPTensors.vector(entity.eyes.output).reshape([1, 20])
            );

            entity.tran.rot += (output.x - 0.5) * ts;
            entity.mov.vel = SPMath.unitVector(entity.tran.rot).mult(3);
        }
    }
))(coordinator).addTo(coordinator);

const boidPolygon = SPTensors.tensor([3, 2], [-1, -1, -1, 1, 1, 0]);

const BOID_COUNT = 20;

const spawnHunter = (genes = null) => {
    var hunter = constructObject(
        new Transform([
            SPMath.randRange(0, canvas.width),
            SPMath.randRange(0, canvas.height),
        ]),
        new Movement([0, 0], [0, 0]),
        new RigidBody([8, 5], "polygon", boidPolygon),
        new Meta("hunter"),
        new Eyes(20, 100, 0.1, ["food"]),
        new DNNComponent(20, 1, 15, 1, genes),
        new Material("black"),
        new EvolutionComponent("hunter")
    );

    hunter.addComponent("hunter", {
        energy: 0,
    });

    hunter.evolution.LTFound = hunter.tran.pos;
    hunter.evolution.RBFound = hunter.tran.pos;

    new Genome(hunter.dnn.network.vectorize().getValues()).addTo(hunter);
    hunter.addTo(coordinator);
};

for (let _ of SPMath.range(0, BOID_COUNT)) {
    spawnHunter();
}

const spawnFood = () => {
    for (let _ of SPMath.range(0, 200)) {
        var food = constructObject(
            new Transform([
                SPMath.randRange(0, canvas.width),
                SPMath.randRange(0, canvas.height),
            ]),
            new Movement([0, 0], [0, 0]),
            new RigidBody([5, 5], "circle"),
            new Meta("food"),
            new Material("red")
        ).addTo(coordinator);
    }
};

spawnFood();

clock.start();

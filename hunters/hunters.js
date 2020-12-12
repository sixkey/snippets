var GLOBAL_COUNTERS = [];
var HIGHEST_GENERATION = 0;
var EXTENDED_RENDERING = true;

// Initializing client
var client = Client({
    keyToConstructor: null,
    loopUpdateCall: true,
    FPS: 60, // default also 60, just wanted to brag that there is this feature
    pureLocalClient: true, // tell the client that there isn't any server that will do the calculations
});

var Ball = (initPack = {}) => {
    var self = Entity(
        {
            x: 0,
            y: 0,
            width: 10,
            height: 10,
            radius: 10,
            energy: 300,
            color: "red",
            objectType: "BALL",
            ...initPack,
        },
        ClientEntity
    );

    return self;
};

var Cell = (initPack = {}) => {
    var self = Entity(
        {
            width: 12,
            height: 10,

            eyesNumber: 25,
            eyeAngle: 3,
            energy: 300,

            radius: 12,

            counter: 0,
            generation: 0,

            vision: 200,
            objectType: "CELL",
            rotation: Math.PI / 2,
            color: SpoolMath.randomHsvColor(0.5, 0.8),

            ...initPack,
        },
        ClientEntity
    );

    if (self.generation > HIGHEST_GENERATION) {
        HIGHEST_GENERATION = self.generation;
    }

    if (!self.dnn) {
        self.dnn = new dnn(self.eyesNumber, 10, 1, 1);
    }
    var superSelf = {
        update: self.update,
    };

    self.render = (ctx, camera) => {
        var bounds = camera.transformBounds(
            self.x,
            self.y,
            self.width,
            self.height
        );

        var points = [
            [-bounds.width / 2, -bounds.height / 2],
            [-bounds.width / 2, bounds.height / 2],
            [bounds.width / 2, 0],
        ];

        var rotated = SpoolMath.rotatePoints(points, 0, 0, -self.rotation);

        var transformed = SpoolMath.transformPoints(
            rotated,
            bounds.x,
            bounds.y
        );

        SpoolRenderer.setColor("black");
        SpoolRenderer.fillPolygon(transformed);
    };

    self.update = (ctx, camera) => {
        //self.setVelVector("movement", SpoolMath.scaleVector(vec, 3));
        superSelf.update();

        var visionArea = RadiusRect(self.x, self.y, self.vision, self.vision);

        self.energy -= self.radius / 10;
        if (self.energy < 0) {
            client.handler.remove(self);
            return;
        }

        self.counter++;

        GLOBAL_COUNTERS.push(self.counter);

        var lines = SpoolMath.generateLines(
            (i) => {
                return new SpoolPoint(self.x, self.y);
            },
            (i) => {
                var point = SpoolMath.polarPoint(
                    self.x,
                    self.y,
                    self.vision,
                    (((i - (self.eyesNumber - 1) / 2) * self.eyeAngle) / 180) *
                        Math.PI *
                        2 +
                        self.rotation
                );

                return new SpoolPoint(point.x, point.y);
            },
            self.eyesNumber
        );

        var objects = client.handler.getObjectsInRect(visionArea);

        var inputs = [];
        var inVision = [];

        objects.forEach((object) => {
            if (object.objectType == "BALL" && object.id != self.id) {
                if (
                    object.radius < self.radius &&
                    object.parent != self &&
                    self.getBounds().collision(object.getBounds())
                ) {
                    client.handler.remove(object);

                    self.energy += object.energy;

                    client.handler.add(
                        Cell({
                            x: self.x,
                            y: self.y,
                            dnn: self.dnn.mutate(),
                            parent: self,
                            generation: self.generation + 1,
                        })
                    );
                } else {
                    inVision.push(object);
                }
            }
        });

        lines.forEach((line) => {
            var points = [];
            inVision.forEach((object) => {
                var point = SpoolMath.lineRectCollision(
                    object.getBounds(),
                    line
                );

                if (point) {
                    point.weight = self.radius - object.radius;
                    points.push(point);
                }
            });

            var color = "rgba(0,0,0,0)";

            var input = 0;

            if (points.length > 0) {
                smallestPoint = points.reduce((a, b) =>
                    SpoolMath.distance(line.x, line.y, a.x, a.y) <
                    SpoolMath.distance(line.x, line.y, b.x, b.y)
                        ? a
                        : b
                );
                input =
                    SpoolMath.distance(
                        line.x,
                        line.y,
                        smallestPoint.x,
                        smallestPoint.y
                    ) / self.vision;

                if (EXTENDED_RENDERING) {
                    color = `rgba(0, 0, 0, ${1 - input})`;
                    SpoolRenderer.setColor(color);
                    SpoolRenderer.tDrawLine(
                        line.x,
                        line.y,
                        smallestPoint.x,
                        smallestPoint.y
                    );
                }
            }
            inputs.push(input);
        });

        var output = self.dnn
            .forward(new Tensor([1, self.eyesNumber], inputs))
            .get(0);

        if (self.generation > HIGHEST_GENERATION) {
            HIGHEST_GENERATION = self.generation;
        }

        var steering = output - 0.5;
        self.energy -= Math.abs(steering);
        self.rotation += steering;
        var vec = SpoolMath.getUnitVector(self.rotation);
        self.setVelVector("movement", SpoolMath.scaleVector(vec, 2));
    };

    return self;
};

var Player = (initPack = {}) => {
    var self = Entity(
        {
            maxAcc: 10,

            x: 0,
            y: 0,
            width: 50,
            height: 50,
            counter: 0,
            objectType: "PLAYER",

            rotation: Math.PI / 2,
            color: "black",

            ...initPack,
        },
        ClientEntity
    );

    // Creating superself for overriding
    var superSelf = {
        update: self.update,
        updatePack: self.updatePack,
        render: self.render,
    };

    /**
     * Updates velocities from keyboard input
     */
    self.updateInputVel = () => {
        // setting the basic values
        if (!self.standStill) {
            xVelocity = 0;
            yVelocity = 0;

            // These parameters are created every time and if the KeyListener is present on the client side, should work
            if (
                self.pressedLeft ||
                self.pressedRight ||
                self.pressedUp ||
                self.pressedDown
            ) {
                if (self.pressedLeft) {
                    xVelocity -= self.maxAcc;
                }
                if (self.pressedRight) {
                    xVelocity += self.maxAcc;
                }
                if (self.pressedUp) {
                    yVelocity += self.maxAcc;
                }
                if (self.pressedDown) {
                    yVelocity -= self.maxAcc;
                }
            }

            // Spool is mainly based on vectors that are created from angle and size but can take normal vectors
            // the reason why our system is based on angles is that the game that spool is based on was based on angles heavily, could change in future
            // If you set velocity vector on object it acts on the object every update and can be removed or set to zero (see below)
            // Spool supports velocities, accelerations but also .velX and .velY for more simple implementations
            self.setVelVector("movement", [xVelocity, yVelocity]);
        } else {
            self.setVelVector("movement", [0, 0]);
        }
    };

    self.mouseEventInWorld = (x, y, value) => {
        self.x = x;
        self.y = y;
        console.log(value);
    };

    // Overriding the entity update function
    self.update = () => {
        self.updateInputVel();
        superSelf.update();

        self.area = RadiusRect(self.x, self.y, self.width, self.height);
        self.color = "red";

        if (self.counter % 30 == 0) {
            objectSpawner.spawnInRectangle(
                "BALL",
                1,
                -client.width / 2,
                -client.height / 2,
                client.width,
                client.height
            );
            self.counter = 0;
        }
        self.counter++;
    };

    self.render = (ctx, camera) => {
        SpoolRenderer.setColor("black");
        var res = HIGHEST_GENERATION.toString();
        SpoolRenderer.setFont("Arial", 15);
        SpoolRenderer.simpleText(res, 10, 20);

        HIGHEST_GENERATION = 0;
        GLOBAL_COUNTERS = [];
    };

    return self;
};

var FoldingSystem = (initPack = {}, handler) => {
    var self = {
        left: -client.width / 2,
        right: client.width / 2,
        bottom: -client.height / 2,
        top: client.height / 2,
        width: client.width,
        height: client.height,

        ...initPack,
    };

    self.update = (object) => {
        object.x = ((object.x - self.left) % self.width) + self.left;
        object.y = ((object.y - self.bottom) % self.height) + self.bottom;
        if (object.x < self.left) {
            object.x += self.width;
        }
        if (object.y < self.bottom) {
            object.y += self.height;
        }
    };

    return self;
};

client.handler.addManager(FoldingSystem());

keysToConstructors = {
    PLAYER: {
        const: Player,
    },

    BALL: {
        const: Ball,
    },

    CELL: {
        const: Cell,
    },
};

var objectSpawner = ObjectSpawner(client.handler, keysToConstructors);

var colPairs = [
    {
        a: ["PLAYER"],
        b: ["BOX"],
        func: (a, b) => {
            console.log("collision");
        },
    },
];

var player = Player({
    x: 0,
    y: 0,
});

objectSpawner.spawnInRectangle(
    "BALL",
    200,
    -client.width / 2,
    -client.height / 2,
    client.width,
    client.height
);
objectSpawner.spawnInRectangle(
    "CELL",
    50,
    -client.width / 2,
    -client.height / 2,
    client.width,
    client.height
);

player.handler = client.handler;

client.handler.add(player);
client.clientObject = player;

// Setting up the camera, you can enable lerp for more smooth camera following
client.camera.lerp = true;

// For the basic movement described in the boilerserver this is enough, you can set your own events if you want
keyListener = KeyboardListener(client);
keyListener.initListener();
keyListener.onKeyDown = (e) => {
    if (e.keyCode == 32) {
        EXTENDED_RENDERING = !EXTENDED_RENDERING;
    }
};

mouseListener = MouseListener(client, {
    activeTypes: ["mousedown", "mousemove"],
});
mouseListener.mouseCoordTransformation = client.camera.inverseTransformPoint;
mouseListener.initListener();
mouseListener.onMouseEvent = (e) => {};

mouseListener.onMouseMove = (e) => {
    if (mouseListener.pressed) {
        let { x, y } = mouseListener.mouseCoordTransformation(
            e.clientX,
            e.clientY
        );

        player.x = x;
        player.y = y;
    }
};

SpoolRenderer.camera = client.camera;

// You need to start your gameloop manually, with simple game this may seem dumb, but for game with textures that need to load first it makes sense i guess
client.startGameLoop();

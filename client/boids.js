// Initializing client
var client = Client({
    keyToConstructor: null,
    loopUpdateCall: true,
    FPS: 60, // default also 60, just wanted to brag that there is this feature
    pureLocalClient: true, // tell the client that there isn't any server that will do the calculations
});

//// BOIDS ////

var RENDER_LINES = false;

var Boid = (initPack = {}) => {
    var self = Entity(
        {
            width: 12,
            height: 10,

            objectType: "BOID",
            rotation: Math.PI / 2,
            color: SpoolMath.randomHsvColor(0.5, 0.8),

            ...initPack,
        },
        ClientEntity
    );

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
        var vec = SpoolMath.getUnitVector(self.rotation);
        self.setVelVector("movement", SpoolMath.scaleVector(vec, 3));
        superSelf.update();
    };

    return self;
};

var BoidManager = (initPack, handler) => {
    var self = {
        handler,

        vision: 100,
        cohesionCoef: 0.2,
        alignmentCoef: 0.1,
        avoidanceCoef: 0.2,

        ...initPack,
    };

    self.avoid = (object, x, y, distance, weight) => {
        var ox = object.x;
        var oy = object.y;

        var angle = SpoolMath.globalAngle(ox, oy, x, y);

        var d = SpoolMath.angleDistance(object.rotation, angle);

        var angle = 0;

        if (d > 0) {
            angle = Math.PI - d;
        } else {
            angle = -Math.PI - d;
        }

        return -((1 - distance) * angle) * self.avoidanceCoef * weight;
    };

    self.cohesion = (object, points) => {
        var average = SpoolMath.averageVectors(points);

        if (!average) {
            return 0;
        }

        var angle = SpoolMath.globalAngle(
            object.x,
            object.y,
            average[0],
            average[1]
        );

        var d = SpoolMath.angleDistance(object.rotation, angle);

        return d * self.cohesionCoef;
    };

    self.alignment = (object, angles) => {
        if (angles.length == 0) {
            return 0;
        }

        var d = SpoolMath.angleDistance(
            object.rotation,
            SpoolMath.average(angles)
        );

        return d * self.alignmentCoef;
    };

    self.update = (object) => {
        if (object.objectType != "BOID") {
            return;
        }

        var steering = 0;

        var otherBoids = [];
        var blocks = [];

        var bounds = [];
        var angles = [];

        var boundPoints = [
            [-self.handler.client.width / 2, -self.handler.client.height / 2],
            [-self.handler.client.width / 2, +self.handler.client.height / 2],
            [+self.handler.client.width / 2, -self.handler.client.height / 2],
            [+self.handler.client.width / 2, +self.handler.client.height / 2],

            [-self.handler.client.width / 2, object.y],
            [+self.handler.client.width / 2, object.y],
            [object.x, -self.handler.client.height / 2],
            [object.x, +self.handler.client.height / 2],
        ];

        for (var i = 0; i < boundPoints.length; i++) {
            var point = boundPoints[i];

            var distance = SpoolMath.distance(
                object.x,
                object.y,
                point[0],
                point[1]
            );

            if (distance < self.vision * 1.2) {
                bounds.push([
                    point[0],
                    point[1],
                    distance / (self.vision * 1.2),
                    4,
                ]);
            }
        }

        for (type in handler.objects) {
            for (key in handler.objects[type]) {
                var a = object;
                var b = handler.objects[type][key];

                if (a != b) {
                    var distance = SpoolMath.objDistance(a, b);
                    distance = Math.max(0, distance - b.width - a.width);

                    if (distance < self.vision) {
                        var rec = [
                            b.x,
                            b.y,
                            distance / self.vision,
                            b.objectType == "BOID" ? 1 : 4,
                        ];

                        if (b.objectType == "BOID") {
                            angles.push(b.rotation);
                            otherBoids.push(rec);
                        }
                        blocks.push(rec);
                    }
                }
            }
        }

        var allPoints = blocks.concat(bounds);

        if (RENDER_LINES) {
            allPoints.forEach((point) => {
                var ta = SpoolRenderer.camera.transformPoint(a.x, a.y);
                var tb = SpoolRenderer.camera.transformPoint(
                    point[0],
                    point[1]
                );

                SpoolRenderer.ctx.lineWidth = 2;
                SpoolRenderer.ctx.strokeStyle = `rgba(0, 0, 0, ${
                    (1 - point[2]) / 2
                })`;

                SpoolRenderer.drawLine(ta.x, ta.y, tb.x, tb.y);
            });
        }

        allPoints.forEach((point) => {
            steering += self.avoid(
                object,
                point[0],
                point[1],
                point[2],
                point[3]
            );
        });

        steering += self.cohesion(object, otherBoids);

        steering += self.alignment(object, angles);

        object.rotation += (SpoolMath.sigmoid(steering) - 0.5) * 1.7;
    };

    return self;
};

client.handler.addManager(BoidManager({}, client.handler));

var BouncingManager = (initPack, handler) => {
    var self = {
        handler,
        ...initPack,
    };

    self.update = (object) => {
        if (object.objectType != "BOID") {
            return;
        }

        var worldWidth = self.handler.client.width;
        var worldHeight = self.handler.client.height;
        var velX = object.calculatedVelX;
        var velY = object.calculatedVelY;

        console.log();

        if (object.y < -worldHeight / 2) {
            object.y = -worldHeight - object.y;
            object.setVelVector("movement", object.vectorFromVels(velX, -velY));
            object.rotation = Math.atan2(-velY, velX);
        }

        if (object.y > worldHeight / 2) {
            object.y = worldHeight - object.y;
            object.setVelVector("movement", object.vectorFromVels(velX, -velY));
            object.rotation = Math.atan2(-velY, velX);
        }

        if (object.x < -worldWidth / 2) {
            object.x = -worldWidth - object.x;
            object.setVelVector("movement", object.vectorFromVels(-velX, velY));
            object.rotation = Math.atan2(velY, -velX);
        }

        if (object.x > worldWidth / 2) {
            object.x = worldWidth - object.x;
            object.setVelVector("movement", object.vectorFromVels(-velX, velY));
            object.rotation = Math.atan2(velY, -velX);
        }
    };

    return self;
};

client.handler.addManager(BouncingManager({}, client.handler));

//// PLAYER ////

var Player = (initPack = {}) => {
    var self = Entity(
        {
            maxAcc: 10,

            x: 0,
            y: 0,
            width: 100,
            height: 100,

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

    self.mouseEventInWorld = (x, y) => {
        client.handler.add(
            Boid({
                x,
                y,
            })
        );
    };

    // Overriding the entity update function
    self.update = () => {
        self.updateInputVel();
        superSelf.update();
    };

    self.render = (ctx, camera) => {
        superSelf.render(ctx, camera);
    };

    return self;
};

keysToConstructors = {
    player: {
        const: Player,
    },
    boid: {
        const: Boid,
    },
};

var objectSpawner = ObjectSpawner(client.handler, keysToConstructors);

var player = Player({
    x: 0,
    y: 0,
});

client.handler.add(player);
client.clientObject = player;

// Setting up the camera, you can enable lerp for more smooth camera following
client.camera.lerp = true;

// For the basic movement described in the boilerserver this is enough, you can set your own events if you want
keyListener = KeyboardListener(client);
keyListener.initListener();
keyListener.onKeyDown = (e) => {
    if (e.keyCode == 32) {
        RENDER_LINES = !RENDER_LINES;
    }
};

mouseListener = MouseListener(client, { activeTypes: ["mousedown"] });
mouseListener.mouseCoordTransformation = client.camera.inverseTransformPoint;
mouseListener.initListener();
mouseListener.onMouseEvent = (e) => {
    console.log(e);
};

objectSpawner.spawnInRectangle(
    "boid",
    120,
    -client.width / 2,
    -client.height / 2,
    client.width,
    client.height
);

SpoolRenderer.camera = client.camera;

// You need to start your gameloop manually, with simple game this may seem dumb, but for game with textures that need to load first it makes sense i guess
client.startGameLoop();

// Initializing client
var client = Client({
    keyToConstructor: null,
    loopUpdateCall: true,
    FPS: 60, // default also 60, just wanted to brag that there is this feature
    pureLocalClient: true, // tell the client that there isn't any server that will do the calculations
});

var Player = (initPack = {}) => {
    var self = Entity(
        {
            maxAcc: 10,

            x: 0,
            y: 0,
            width: 100,
            height: 100,
            radius: 50,

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
    ball: {
        const: Ball,
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

SpoolRenderer.camera = client.camera;

// You need to start your gameloop manually, with simple game this may seem dumb, but for game with textures that need to load first it makes sense i guess
client.startGameLoop();

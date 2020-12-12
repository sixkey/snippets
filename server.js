////// BASICS //////

// we need to include all the important spool elements
var {
    Server, // Server is the basic object, and contains the whole server said application
} = require("./spool/spoolserver.js");

//// Fist we need to initialize the spool server instance ////

// all the directories that contain public data like sprites or client side scripts, html or css
var publicDirectiories = ["/hunters", "/nn", "/public", "/textures", "/maps"];

// Server object is made up of initObject (object assigned to self on creation) that is the first argument
// Second is the position of the root folder, and then public directories relative to this root folder

// We don't need to define anything that updates object or serves objects to clientside because the server is just a express public files server nothing more
var server = Server({}, __dirname, publicDirectiories);

// Check your console to see if express initialized correctly and your folders are served correctly
////// STARTING THE SERVER //////

// start() -> starting the whole web server thingy and setting up express, and it's static public folders
server.start();

////// FIN ///////

/////////////////////////////////////////////////////////////////////
// This module is the starting point of the http server
/////////////////////////////////////////////////////////////////////
import APIServer from "./api-server.js";

import RouteRegister from './router.js';
RouteRegister.add('GET', 'Bookmarks', 'list');
RouteRegister.add('HEAD', 'Posts');
RouteRegister.add('GET', 'Posts');
RouteRegister.add('POST', 'Posts');
RouteRegister.add('PUT', 'Posts');
RouteRegister.add('DELETE', 'Posts', 'remove');

let server = new APIServer();
server.start();
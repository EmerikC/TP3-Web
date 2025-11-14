/////////////////////////////////////////////////////////////////////
// This module define a middleware that serve static resources
/////////////////////////////////////////////////////////////////////
// Author : Nicolas Chourot
// Lionel-Groulx College
/////////////////////////////////////////////////////////////////////

import path from 'path';
import fs from 'fs';
import mimes from './mimes.js';

global.wwwroot = 'wwwroot';
let defaultResource = 'index.html';

function isDirectory(url) {
    let extension = path.extname(url).replace('.', '');
    return extension == '';
}

function requestedStaticResource(url) {
    let isDir = isDirectory(url);
    url += isDir ? (url.slice(-1) != '/' ? '/' : '') : '';
    let resourceName = isDir ? url + defaultResource : url;
    let resourcePath = path.join(process.cwd(), wwwroot, resourceName);
    return resourcePath;
}

function extToContentType(filePath) {
    let extension = path.extname(filePath).replace('.', '');
    let contentType = mimes(extension);
    if (contentType !== undefined)
        return contentType;
    return 'text/html';
}

export function handleStaticResourceRequest(HttpContext) {
    let url;
    // handling static html API help pages 
    if (HttpContext.path.queryString == '?') {
        url = "api-help-pages/" + `api-${HttpContext.path.model}-help.html`;
    } else {
        // normalize the request URL: strip query string, decode and remove leading '/'
        url = (HttpContext.req.url || '').split('?')[0];
        try { url = decodeURIComponent(url); } catch (e) { /* ignore */ }
        if (url.startsWith('/')) url = url.slice(1);
    }
    let filePath = requestedStaticResource(url);
    let contentType = extToContentType(filePath);
    try {
        let content = fs.readFileSync(filePath);
        console.log(FgCyan,"Static resource: ", contentType, filePath);
        return HttpContext.response.content(contentType, content);
    } catch (error) {
        if (error.code === 'ENOENT')
            return false;
        else
            return HttpContext.response.internalError(`Server error: ${error.code}`);
    }
    
}
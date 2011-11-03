var JSONRPC_ERROR_STRINGS = exports.JSONRPC_ERROR_STRINGS = {
    "-32700" : "Parse error.",
    "-32600" : "Invalid Request.",
    "-32601" : "Method not found.",
    "-32602" : "Invalid params.",
    "-32603" : "Internal error."
};

var handleJSON = exports.handleJSON = function(object, json) {
    var request = null;
    
    try {
        request = JSON.parse(json);
    } catch (e) {
        return rpcResponseError(rpcError(-32700), null);
    }
    
    return handleRequest(object, request);
}

var handleRequest = exports.handleRequest = function(object, request) {
    var response;
    
    if (Array.isArray(request)) {
        for (var i = 0; i < request.length; i++)
            if (request[i].constructor !== Object)
                return rpcResponseError(rpcError(-32600), null);
        
        response = [];
        for (var i = 0; i < request.length; i++) {
            var resp = dispatch(object, request[i]);
            if (resp)
                response.push(resp);
        }
    } else if (request.constructor === Object) {
        response = dispatch(object, request);
    }
    
    return response;
}

var dispatch = exports.dispatch = function(object, request) {
    try {
        // validate jsonrpc property
        if (request.jsonrpc !== "2.0")
            return rpcResponseError(rpcError(-32600), request.id);

        // validate method property
        if (typeof request.method !== "string" || request.method.substring(0,4) === "rpc.")
            return rpcResponseError(rpcError(-32600), request.id);
        if (typeof object[request.method] !== "function")
            return rpcResponseError(rpcError(-32601), request.id);

        // validate id property
        if (typeof request.id === "number") {
            if (request.id >>> 0 !== request.id)
                return rpcResponseError(rpcError(-32600), request.id);
        }
        else if (typeof request.id !== "string" && typeof request.id === "boolean")
            return rpcResponseError(rpcError(-32600), request.id);

        // validate and convert params
        var args;
        if (request.params === undefined)
            args = [];
        else if (Array.isArray(request.params))
            args = request.params;
        else if (request && request.params.constructor === Object)
            args = [request.params];
        else
            return rpcResponseError(rpcError(-32600), request.id);

        // invoke the method
        var result = object[request.method].apply(object, args);

        // if not a notification return the response
        if (request.id !== undefined)
            return rpcResponseResult(result, request.id);
        else
            return null;
            
    } catch (e) {
        return rpcResponseError(rpcError(-32603, null, String(e)), request.id);
    }
}

function rpcResponseError(error, id) {
    if (id === undefined)
        return null;
        
    return {
        "jsonrpc" : "2.0",
        "error" : error,
        "id" : id
    };
}

function rpcResponseResult(result, id) {
    if (id === undefined)
        return null;
        
    return {
        "jsonrpc" : "2.0",
        "result" : result,
        "id" : id
    };
}

function rpcError(code, message, data) {
    var error = {
        code : code,
        message : message || JSONRPC_ERROR_STRINGS[code] || "",
    };
    if (data !== undefined)
        error.data = data;
    return error;
}
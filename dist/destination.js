"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAxiosError = exports.readSubaccountDestination = exports.readDestination = void 0;
const axios_1 = __importDefault(require("axios"));
const xsenv = __importStar(require("@sap/xsenv"));
const tokenCache = __importStar(require("./tokenCache"));
const destinationCache = __importStar(require("./destinationCache"));
function readDestination(destinationName, authorizationHeader, subscribedSubdomain) {
    return __awaiter(this, void 0, void 0, function* () {
        const access_token = yield createToken(getService(), subscribedSubdomain);
        // if we have a JWT token, we send it to the destination service to generate the new authorization header
        const jwtToken = /bearer /i.test(authorizationHeader || "") ? (authorizationHeader || "").replace(/bearer /i, "") : null;
        return getDestination(access_token, destinationName, getService(), jwtToken);
    });
}
exports.readDestination = readDestination;
function readSubaccountDestination(destinationName, authorizationHeader, subscribedSubdomain) {
    return __awaiter(this, void 0, void 0, function* () {
        const access_token = yield createToken(getService(), subscribedSubdomain);
        // if we have a JWT token, we send it to the destination service to generate the new authorization header
        const jwtToken = /bearer /i.test(authorizationHeader || "") ? (authorizationHeader || "").replace(/bearer /i, "") : null;
        return getSubaccountDestination(access_token, destinationName, getService(), jwtToken);
    });
}
exports.readSubaccountDestination = readSubaccountDestination;
function getDestination(access_token, destinationName, ds, jwtToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const cacheKey = `${destinationName}__${access_token}__${jwtToken}`;
        const cacheDest = destinationCache.get(cacheKey);
        if (cacheDest) {
            return cacheDest;
        }
        try {
            const destinationPromise = fetchDestination(access_token, destinationName, ds, jwtToken);
            destinationCache.set(cacheKey, destinationPromise);
            return destinationPromise;
            /*
            destinationCache.set(cacheKey, response)
            return (await response).data;
            */
        }
        catch (e) {
            logAxiosError(e);
            throw `Unable to read the destination ${destinationName}`;
        }
    });
}
function getSubaccountDestination(access_token, destinationName, ds, jwtToken) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default({
                url: `${ds.uri}/destination-configuration/v1/subaccountDestinations/${destinationName}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'X-user-token': jwtToken
                },
                responseType: 'json',
            });
            return response.data;
        }
        catch (e) {
            logAxiosError(e);
            throw `Unable to read the subaccount destination ${destinationName}`;
        }
    });
}
function createToken(ds, subscribedSubdomain = "") {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const cacheKey = `${ds.clientid}__${subscribedSubdomain}`;
            const cacheToken = tokenCache.getToken(cacheKey);
            if (!cacheToken) {
                const tokenPromise = fetchToken(subscribedSubdomain, ds);
                tokenCache.setToken(cacheKey, tokenPromise);
                return (yield tokenPromise).access_token;
            }
            return (yield cacheToken).access_token;
        }
        catch (e) {
            logAxiosError(e);
            throw 'unable to fetch oauth token for destination service';
        }
    });
}
;
function getService() {
    const { destination } = xsenv.getServices({
        destination: {
            tag: 'destination'
        }
    });
    if (!destination) {
        throw ('No destination service available');
    }
    return destination;
}
function fetchDestination(access_token, destinationName, ds, jwtToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const destination = (yield axios_1.default({
            url: `${ds.uri}/destination-configuration/v1/destinations/${destinationName}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'X-user-token': jwtToken
            },
            responseType: 'json',
        })).data;
        // console.log(destination);
        return destination;
    });
}
function fetchToken(subscribedSubdomain, ds) {
    return __awaiter(this, void 0, void 0, function* () {
        const tokenBaseUrl = subscribedSubdomain ? `https://${subscribedSubdomain}.${ds.uaadomain}` : ds.url;
        const token = (yield axios_1.default({
            url: `${tokenBaseUrl}/oauth/token`,
            method: 'POST',
            responseType: 'json',
            data: `client_id=${encodeURIComponent(ds.clientid)}&grant_type=client_credentials`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            auth: {
                username: ds.clientid,
                password: ds.clientsecret
            }
        })).data;
        return token;
    });
}
function logAxiosError(error) {
    console.log(`---------- begin sap-cf-destconn ---------`);
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error(error.response.data);
        console.error(error.response.status);
        console.error(error.response.headers);
    }
    else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.error(JSON.parse(error.request));
    }
    else if (error.message) {
        // Something happened in setting up the request that triggered an Error
        console.error('Error', error.message);
    }
    else {
        try {
            console.error(JSON.parse(error));
        }
        catch (err) {
            console.error(error);
        }
    }
    if (error.config) {
        console.error(error.config);
    }
    console.log(`---------- end sap-cf-destconn ---------`);
}
exports.logAxiosError = logAxiosError;

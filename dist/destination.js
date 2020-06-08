"use strict";
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const xsenv = __importStar(require("@sap/xsenv"));
const tokenCache = __importStar(require("./tokenCache"));
const destinationCache = __importStar(require("./destinationCache"));
function readDestination(destinationName, authorizationHeader) {
    return __awaiter(this, void 0, void 0, function* () {
        const access_token = yield createToken(getService());
        // if we have a JWT token, we send it to the destination service to generate the new authorization header
        const jwtToken = /bearer /i.test(authorizationHeader || "") ? (authorizationHeader || "").replace(/bearer /i, "") : null;
        return getDestination(access_token, destinationName, getService(), jwtToken);
    });
}
exports.readDestination = readDestination;
function getDestination(access_token, destinationName, ds, jwtToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const cacheKey = `${destinationName}__${access_token}__${jwtToken}`;
        const cacheDest = destinationCache.get(cacheKey);
        if (cacheDest) {
            return cacheDest.value;
        }
        try {
            const response = yield axios_1.default({
                url: `${ds.uri}/destination-configuration/v1/destinations/${destinationName}`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'X-user-token': jwtToken
                },
                responseType: 'json',
            });
            destinationCache.set(cacheKey, response.data);
            return response.data;
        }
        catch (e) {
            console.error(`Unable to read the destination ${destinationName}`, e);
            throw e;
        }
    });
}
function createToken(ds) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const cacheToken = tokenCache.getToken(ds.clientid);
            if (!cacheToken) {
                const response = yield axios_1.default({
                    url: `${ds.url}/oauth/token`,
                    method: 'POST',
                    responseType: 'json',
                    data: `client_id=${encodeURIComponent(ds.clientid)}&grant_type=client_credentials`,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    auth: {
                        username: ds.clientid,
                        password: ds.clientsecret
                    }
                });
                tokenCache.setToken(ds.clientid, response.data);
                return response.data.access_token;
            }
            return cacheToken.access_token;
        }
        catch (e) {
            console.error('unable to fetch oauth token for destination service', e);
            throw e;
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

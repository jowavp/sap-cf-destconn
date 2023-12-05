"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAxiosError = exports.readSubaccountDestinations = exports.readSubaccountDestination = exports.readDestination = void 0;
const axios_1 = __importDefault(require("axios"));
const xsenv = __importStar(require("@sap/xsenv"));
const tokenCache = __importStar(require("./tokenCache"));
const destinationCache = __importStar(require("./destinationCache"));
async function readDestination(destinationName, authorizationHeader, subscribedSubdomain) {
    const access_token = await createToken(getService(), subscribedSubdomain);
    // if we have a JWT token, we send it to the destination service to generate the new authorization header
    const jwtToken = /bearer /i.test(authorizationHeader || "")
        ? (authorizationHeader || "").replace(/bearer /i, "")
        : undefined;
    return getDestination(access_token, destinationName, getService(), jwtToken);
}
exports.readDestination = readDestination;
async function readSubaccountDestination(destinationName, authorizationHeader, subscribedSubdomain) {
    const access_token = await createToken(getService(), subscribedSubdomain);
    // if we have a JWT token, we send it to the destination service to generate the new authorization header
    const jwtToken = /bearer /i.test(authorizationHeader || "")
        ? (authorizationHeader || "").replace(/bearer /i, "")
        : undefined;
    return getSubaccountDestination(access_token, destinationName, getService(), jwtToken);
}
exports.readSubaccountDestination = readSubaccountDestination;
async function readSubaccountDestinations(authorizationHeader, subscribedSubdomain, regex) {
    const access_token = await createToken(getService(), subscribedSubdomain);
    // if we have a JWT token, we send it to the destination service to generate the new authorization header
    const jwtToken = /bearer /i.test(authorizationHeader || "")
        ? (authorizationHeader || "").replace(/bearer /i, "")
        : undefined;
    return getSubaccountDestinations(access_token, getService(), jwtToken, regex);
}
exports.readSubaccountDestinations = readSubaccountDestinations;
class MockDestination {
    constructor(o, token) {
        this.name = o.name;
        this.url = o.url;
        if (token) {
            this.token = token;
        }
        Object.entries(o).forEach(([key, value]) => {
            //@ts-ignore
            this[key.toLowerCase()] = value;
        });
    }
    getAuthenthicationType() {
        if (this.username && this.password) {
            return "BasicAuthentication";
        }
        if (this.forwardauthtoken) {
            return "OAuth2UserTokenExchange";
        }
        return "NoAuthentication";
        // | "BasicAuthentication" | "OAuth2UserTokenExchange" | "OAuth2SAMLBearerAssertion" | "PrincipalPropagation" | "OAuth2ClientCredentials"
    }
    getAuthTokens() {
        if (this.getAuthenthicationType() === "BasicAuthentication") {
            return [
                {
                    type: "Basic",
                    value: Buffer.from(this.username + ":" + this.password).toString("base64"),
                },
            ];
        }
        if (this.getAuthenthicationType() === "OAuth2UserTokenExchange" &&
            this.token) {
            return [
                {
                    type: "Bearer",
                    value: this.token.replace("Bearer", "").replace("bearer", ""),
                },
            ];
        }
        return [];
    }
    getDestination() {
        return {
            owner: {
                SubaccountId: "local",
                InstanceId: "Local",
            },
            destinationConfiguration: {
                URL: this.url,
                Authentication: this.getAuthenthicationType(),
                ProxyType: "Internet",
                // CloudConnectorLocationId: string;
                Description: this.description + "",
                User: this.username || "",
                Password: this.password || "",
                tokenServiceURLType: "",
                clientId: "",
                saml2_audience: "",
                tokenServiceURL: "",
                clientSecret: "",
                CloudConnectorLocationId: "",
                Name: this.name,
                Type: "HTTP",
                WebIDEUsage: "odata",
                WebIDEEnabled: "false",
            },
            authTokens: this.getAuthTokens(),
        };
    }
}
async function getDestination(access_token, destinationName, ds, jwtToken) {
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
}
async function getSubaccountDestinations(access_token, ds, jwtToken, regex) {
    try {
        const headers = {
            Authorization: `Bearer ${access_token}`,
        };
        if (jwtToken)
            headers["X-user-token"] = jwtToken;
        const response = await (0, axios_1.default)({
            url: `${ds.uri}/destination-configuration/v1/subaccountDestinations`,
            method: "GET",
            headers,
            responseType: "json",
        });
        if (regex) {
            response.data = response.data.filter((destination) => destination.Name.match(regex));
        }
        return response.data;
    }
    catch (e) {
        logAxiosError(e);
        throw `Unable to read the subaccount destinations`;
    }
}
async function getSubaccountDestination(access_token, destinationName, ds, jwtToken) {
    try {
        const headers = {
            Authorization: `Bearer ${access_token}`,
        };
        if (jwtToken)
            headers["X-user-token"] = jwtToken;
        const response = await (0, axios_1.default)({
            url: `${ds.uri}/destination-configuration/v1/subaccountDestinations/${destinationName}`,
            method: "GET",
            headers,
            responseType: "json",
        });
        return response.data;
    }
    catch (e) {
        logAxiosError(e);
        throw `Unable to read the subaccount destination ${destinationName}`;
    }
}
async function createToken(ds, subscribedSubdomain = "") {
    try {
        const cacheKey = `${ds.clientid}__${subscribedSubdomain}`;
        const cacheToken = tokenCache.getToken(cacheKey);
        if (!cacheToken) {
            const tokenPromise = fetchToken(subscribedSubdomain, ds);
            const token = await tokenCache.setToken(cacheKey, tokenPromise);
            if (!token) {
                throw "unable to fetch oauth token for destination service";
            }
            return token.access_token;
        }
        return cacheToken.access_token;
    }
    catch (e) {
        logAxiosError(e);
        throw "unable to fetch oauth token for destination service";
    }
}
function getService() {
    const { destination } = xsenv.getServices({
        destination: {
            tag: "destination",
        },
    });
    if (!destination) {
        throw "No destination service available";
    }
    return destination;
}
async function fetchDestination(access_token, destinationName, ds, jwtToken) {
    if (process.env.destinations) {
        var destinations = JSON.parse(process.env.destinations);
        if (destinations && Array.isArray(destinations)) {
            const destination = destinations.find((d) => d.name === destinationName);
            if (destination) {
                return new MockDestination(destination, access_token).getDestination();
            }
        }
    }
    const headers = {
        Authorization: `Bearer ${access_token}`,
    };
    if (jwtToken) {
        headers["X-user-token"] = jwtToken;
    }
    const destination = (await (0, axios_1.default)({
        url: `${ds.uri}/destination-configuration/v1/destinations/${destinationName}`,
        method: "GET",
        headers,
        responseType: "json",
    })).data;
    // console.log(destination);
    return destination;
}
async function fetchDestinations(access_token, ds, jwtToken) {
    const headers = {
        Authorization: `Bearer ${access_token}`,
    };
    if (jwtToken) {
        headers["X-user-token"] = jwtToken;
    }
    const destinations = (await (0, axios_1.default)({
        url: `${ds.uri}/destination-configuration/v1/subaccountDestinations`,
        method: "GET",
        headers,
        responseType: "json",
    })).data;
    // console.log(destination);
    return destinations;
}
async function fetchToken(subscribedSubdomain, ds) {
    const tokenBaseUrl = subscribedSubdomain
        ? `https://${subscribedSubdomain}.${ds.uaadomain}`
        : ds.url;
    const token = (await (0, axios_1.default)({
        url: `${tokenBaseUrl}/oauth/token`,
        method: "POST",
        responseType: "json",
        data: `client_id=${encodeURIComponent(ds.clientid)}&grant_type=client_credentials`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        auth: {
            username: ds.clientid,
            password: ds.clientsecret,
        },
    })).data;
    return token;
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
        console.error("Error", error.message);
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

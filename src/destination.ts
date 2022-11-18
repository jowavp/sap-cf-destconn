
import axios, { AxiosPromise } from 'axios';
import * as xsenv from '@sap/xsenv';
import * as tokenCache from './tokenCache';
import * as destinationCache from './destinationCache';

export async function readDestination<T extends IDestinationConfiguration>(destinationName: string, authorizationHeader?: string, subscribedSubdomain?: string) {
    const access_token = await createToken(getService(), subscribedSubdomain);

    // if we have a JWT token, we send it to the destination service to generate the new authorization header
    const jwtToken = /bearer /i.test(authorizationHeader || "") ? (authorizationHeader || "").replace(/bearer /i, "") : undefined;
    return getDestination<T>(access_token, destinationName, getService(), jwtToken);
}

export async function readSubaccountDestination<T extends IDestinationConfiguration>(destinationName: string, authorizationHeader?: string, subscribedSubdomain?: string) {
    const access_token = await createToken(getService(), subscribedSubdomain);

    // if we have a JWT token, we send it to the destination service to generate the new authorization header
    const jwtToken = /bearer /i.test(authorizationHeader || "") ? (authorizationHeader || "").replace(/bearer /i, "") : undefined;
    return getSubaccountDestination<T>(access_token, destinationName, getService(), jwtToken);
}

export async function readSubaccountDestinations<T extends IDestinationConfiguration>(authorizationHeader?: string, subscribedSubdomain?: string, regex?: string): Promise<T[]> {
    const access_token = await createToken(getService(), subscribedSubdomain);

    // if we have a JWT token, we send it to the destination service to generate the new authorization header
    const jwtToken = /bearer /i.test(authorizationHeader || "") ? (authorizationHeader || "").replace(/bearer /i, "") : undefined;
    return getSubaccountDestinations<T>(access_token, getService(), jwtToken, regex);
}

export interface IDestinationData<T extends IDestinationConfiguration> {
    name?: string,
    owner: {
        SubaccountId: string;
        InstanceId: string;
    },
    destinationConfiguration: T,
    authTokens:
    {
        type: string;
        value: string;
        expires_in?: string;
        error?: string;
    }[]
}

export interface IDestinationConfiguration {
    Name: string;
    Type: string;
    ProxyType: string;
    CloudConnectorLocationId: string;

}

export interface IMockDestinationConfiguration {
    name: string;
    url: string;

    strictssl?: boolean;
    forwardauthtoken?: boolean;
    username?: string;
    password?: string;

    [key: string]: any;
}

class MockDestination implements IMockDestinationConfiguration {
    constructor(o: IMockDestinationConfiguration, token?: string) {
        this.name = o.name;
        this.url = o.url;
        if (token) {
            this.token = token;
        }

        Object.entries(o).forEach(([key, value]) => {
            //@ts-ignore
            this[key.toLowerCase()] = value;
        })
    }

    public getAuthenthicationType() {
        if (this.username && this.password) {
            return "BasicAuthentication";
        }
        if (this.forwardauthtoken) {
            return "OAuth2UserTokenExchange"
        }
        return "NoAuthentication";
        // | "BasicAuthentication" | "OAuth2UserTokenExchange" | "OAuth2SAMLBearerAssertion" | "PrincipalPropagation" | "OAuth2ClientCredentials"

    }

    private getAuthTokens() {
        if (this.getAuthenthicationType() === "BasicAuthentication") {
            return [{
                type: "Basic",
                value: Buffer.from(this.username + ":" + this.password).toString("base64")
            }]
        }
        if (this.getAuthenthicationType() === "OAuth2UserTokenExchange" && this.token) {
            return [{
                type: "Bearer",
                value: this.token.replace('Bearer', '').replace('bearer', '')
            }]
        }
        return [];
    }

    public getDestination(): IDestinationData<IHTTPDestinationConfiguration> {
        return {
            owner: {
                SubaccountId: "local",
                InstanceId: "Local"
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
                WebIDEEnabled: "false"
            },
            authTokens: this.getAuthTokens()
        }
    }

    name: string;
    url: string;
    strictssl?: boolean;
    forwardauthtoken?: boolean;
    username?: string;
    password?: string;
    [key: string]: any;

}

export interface IHTTPDestinationConfiguration extends IDestinationConfiguration {
    URL: string;
    Authentication: "NoAuthentication" | "BasicAuthentication" | "OAuth2UserTokenExchange" | "OAuth2SAMLBearerAssertion" | "PrincipalPropagation" | "OAuth2ClientCredentials";
    Description: string;

    User: string;
    Password: string;

    tokenServiceURLType: string;
    clientId: string;
    saml2_audience: string;
    tokenServiceURL: string;
    clientSecret: string;
    scope?: string;
    Scope?: string;
    oauth_audience?: string;

    WebIDEUsage: string;
    WebIDEEnabled: string;

}

export interface IMailDestinationConfiguration extends IDestinationConfiguration {
    "mail.password": string;
    "mail.user": string;
    "mail.smtp"?: string;
    "mail.port"?: string;
    "mail.from"?: string;

    "mail.smtp.host": string;
    "mail.smtp.port": string;
    "mail.smtp.from"?: string;
}

export interface IDestinationService {
    // url for authentication
    url: string;
    // url for destination configuration
    uri: string;
    clientid: string;
    clientsecret: string;
    uaadomain: string;
}

async function getDestination<T extends IDestinationConfiguration>(access_token: string, destinationName: string, ds: IDestinationService, jwtToken: string | undefined): Promise<IDestinationData<T>> {
    const cacheKey = `${destinationName}__${access_token}__${jwtToken}`;
    const cacheDest = destinationCache.get(cacheKey);

    if (cacheDest) {
        return cacheDest;
    }

    try {

        const destinationPromise = fetchDestination<T>(access_token, destinationName, ds, jwtToken);
        destinationCache.set(cacheKey, destinationPromise);
        return destinationPromise;

        /*
        destinationCache.set(cacheKey, response)
        return (await response).data;
        */
    } catch (e) {
        logAxiosError(e);
        throw `Unable to read the destination ${destinationName}`;
    }
}


async function getSubaccountDestinations<T extends IDestinationConfiguration>(access_token: string, ds: IDestinationService, jwtToken: string | undefined, regex?: string): Promise<T[]> {
    try {

        const headers: { [key: string]: string } = {
            'Authorization': `Bearer ${access_token}`,
        }

        if (jwtToken) headers['X-user-token'] = jwtToken;

        const response = await axios({
            url: `${ds.uri}/destination-configuration/v1/subaccountDestinations`,
            method: 'GET',
            headers,
            responseType: 'json',
        });

        if (regex) {
            response.data = response.data.filter((destination: IDestinationConfiguration) => (destination.Name.match(regex)));
        }
        return response.data;
    } catch (e) {
        logAxiosError(e);
        throw `Unable to read the subaccount destinations`;
    }
}

async function getSubaccountDestination<T extends IDestinationConfiguration>(access_token: string, destinationName: string, ds: IDestinationService, jwtToken: string | undefined): Promise<T> {
    try {

        const headers: { [key: string]: string } = {
            'Authorization': `Bearer ${access_token}`,
        }

        if (jwtToken) headers['X-user-token'] = jwtToken;

        const response = await axios({
            url: `${ds.uri}/destination-configuration/v1/subaccountDestinations/${destinationName}`,
            method: 'GET',
            headers,
            responseType: 'json',
        });
        return response.data;
    } catch (e) {
        logAxiosError(e);
        throw `Unable to read the subaccount destination ${destinationName}`;
    }
}

async function createToken(ds: IDestinationService, subscribedSubdomain: string = ""): Promise<string> {
    try {
        const cacheKey = `${ds.clientid}__${subscribedSubdomain}`;
        const cacheToken = tokenCache.getToken(cacheKey);

        if (!cacheToken) {
            const tokenPromise = fetchToken(subscribedSubdomain, ds);
            const token = await tokenCache.setToken(cacheKey, tokenPromise);
            if (!token) {
                throw 'unable to fetch oauth token for destination service';
            }
            return token.access_token
        }
        return cacheToken.access_token;
    } catch (e) {
        logAxiosError(e);
        throw 'unable to fetch oauth token for destination service';
    }
};

function getService(): IDestinationService {
    const { destination } = xsenv.getServices({
        destination: {
            tag: 'destination'
        }
    });

    if (!destination) {
        throw ('No destination service available');
    }

    return <IDestinationService>destination;
}

async function fetchDestination<T extends IDestinationConfiguration>(access_token: string, destinationName: string, ds: IDestinationService, jwtToken: string | undefined) {

    if (process.env.destinations) {
        var destinations: { destinations: IMockDestinationConfiguration[] } = JSON.parse(process.env.destinations);
        if (destinations && Array.isArray(destinations)) {
            const destination = destinations.find((d) => d.name === destinationName);
            if (destination) {
                //@ts-ignore
                return new Promise<IDestinationData<T>>((resolve) => resolve(new MockDestination(destination, access_token).getDestination()));
            }
        }
    }

    const headers: { [key: string]: string } = {
        'Authorization': `Bearer ${access_token}`
    }

    if (jwtToken) {
        headers['X-user-token'] = jwtToken;
    }

    const destination: IDestinationData<T> = (await axios({
        url: `${ds.uri}/destination-configuration/v1/destinations/${destinationName}`,
        method: 'GET',
        headers,
        responseType: 'json',
    })).data;

    // console.log(destination);
    return destination;
}


async function fetchDestinations<T extends IDestinationConfiguration>(access_token: string, ds: IDestinationService, jwtToken: string | undefined) {


    const headers: { [key: string]: string } = {
        'Authorization': `Bearer ${access_token}`
    }

    if (jwtToken) {
        headers['X-user-token'] = jwtToken;
    }

    const destinations: IDestinationData<T> = (await axios({
        url: `${ds.uri}/destination-configuration/v1/subaccountDestinations`,
        method: 'GET',
        headers,
        responseType: 'json',
    })).data;

    // console.log(destination);
    return destinations;
}

async function fetchToken(subscribedSubdomain: string, ds: IDestinationService) {
    const tokenBaseUrl = subscribedSubdomain ? `https://${subscribedSubdomain}.${ds.uaadomain}` : ds.url;
    const token: tokenCache.IOauthToken = (await axios({
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
}

export function logAxiosError(error: any) {
    console.log(`---------- begin sap-cf-destconn ---------`);
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error(error.response.data);
        console.error(error.response.status);
        console.error(error.response.headers);
    } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.error(JSON.parse(error.request));
    } else if (error.message) {
        // Something happened in setting up the request that triggered an Error
        console.error('Error', error.message);
    } else {
        try {
            console.error(JSON.parse(error));
        } catch (err) {
            console.error(error);
        }
    }
    if (error.config) {
        console.error(error.config);
    }
    console.log(`---------- end sap-cf-destconn ---------`);
}